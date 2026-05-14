package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/originbi/exam-engine/internal/pluginhost"
	evaluationllm "github.com/originbi/exam-engine/plugins/evaluation-llm"
	evaluatoranthropic "github.com/originbi/exam-engine/plugins/evaluator-anthropic"
	evaluatoropenai "github.com/originbi/exam-engine/plugins/evaluator-openai"
)

type pluginDTO struct {
	ID               string          `json:"id"`
	Kind             string          `json:"kind"`
	Slug             string          `json:"slug"`
	Name             string          `json:"name"`
	Version          string          `json:"version"`
	PluginType       string          `json:"pluginType"`
	Category         string          `json:"category"`
	Requires         json.RawMessage `json:"requires"`
	Extends          json.RawMessage `json:"extends"`
	Provides         json.RawMessage `json:"provides"`
	Schema           json.RawMessage `json:"schema"`
	ConfigSchema     json.RawMessage `json:"configSchema,omitempty"`
	RequiresLicense  bool            `json:"requiresLicense"`
	EnabledByDefault bool            `json:"enabledByDefault"`
	PlatformState    string          `json:"platformState"`
	PlatformConfig   json.RawMessage `json:"platformConfig"`
	Dependents       []string        `json:"dependents,omitempty"`
}

type pluginsResponse struct {
	Plugins []pluginDTO `json:"plugins"`
}

type updatePluginStateRequest struct {
	State  string          `json:"state"`
	Config json.RawMessage `json:"config"`
}

type createPluginRequest struct {
	Kind             string          `json:"kind"`
	Slug             string          `json:"slug"`
	Name             string          `json:"name"`
	Version          string          `json:"version"`
	Schema           json.RawMessage `json:"schema"`
	RequiresLicense  bool            `json:"requires_license"`
	EnabledByDefault bool            `json:"enabled_by_default"`
	PluginType       string          `json:"plugin_type"`
	Category         string          `json:"category"`
	Requires         []string        `json:"requires"`
	Extends          []string        `json:"extends"`
	Provides         []string        `json:"provides"`
}

type updatePluginMetaRequest struct {
	Name    string          `json:"name"`
	Version string          `json:"version"`
	Schema  json.RawMessage `json:"schema"`
}

func (s *Server) listPlugins(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}

	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	category := strings.TrimSpace(r.URL.Query().Get("category"))
	rows, err := s.pool.Query(ctx, `
		SELECT p.id,
		       p.kind::text,
		       p.slug,
		       p.name,
		       p.version,
		       COALESCE(p.plugin_type, ''),
		       COALESCE(p.category, ''),
		       p.requires,
		       p.extends,
		       p.provides,
		       p.schema,
		       p.requires_license,
		       p.enabled_by_default,
		       COALESCE(e.state::text, CASE WHEN p.enabled_by_default THEN 'enabled' ELSE 'disabled' END),
		       COALESCE(e.config, '{}'::jsonb)
		FROM plugins p
		LEFT JOIN platform_plugin_entitlements e ON e.plugin_id = p.id
		WHERE ($1 = '' OR p.category = $1)
		ORDER BY p.kind::text, p.slug
	`, category)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "plugin lookup failed")
		return
	}
	defer rows.Close()

	resp := pluginsResponse{Plugins: []pluginDTO{}}
	for rows.Next() {
		var p pluginDTO
		var id uuid.UUID
		var requires, extends, provides, schema, config []byte
		if err := rows.Scan(
			&id,
			&p.Kind,
			&p.Slug,
			&p.Name,
			&p.Version,
			&p.PluginType,
			&p.Category,
			&requires,
			&extends,
			&provides,
			&schema,
			&p.RequiresLicense,
			&p.EnabledByDefault,
			&p.PlatformState,
			&config,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "plugin scan failed")
			return
		}
		p.ID = id.String()
		p.Requires = json.RawMessage(requires)
		p.Extends = json.RawMessage(extends)
		p.Provides = json.RawMessage(provides)
		p.Schema = json.RawMessage(schema)
		p.ConfigSchema = configSchemaForPlugin(p.Slug)
		p.PlatformConfig = json.RawMessage(config)
		p.Dependents = s.pluginDependents(p.Slug)
		resp.Plugins = append(resp.Plugins, p)
	}
	if rows.Err() != nil {
		writeError(w, http.StatusInternalServerError, "plugin rows failed")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) getPlugin(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	pluginID, err := uuid.Parse(chi.URLParam(r, "plugin_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid plugin_id")
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	p, err := s.pluginByID(ctx, pluginID)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "plugin not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "plugin lookup failed")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (s *Server) createPlugin(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	var req createPluginRequest
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}
	if err := validatePluginCreate(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	pluginID := uuid.New()
	if len(req.Schema) == 0 {
		req.Schema = json.RawMessage("{}")
	}
	requires, _ := json.Marshal(req.Requires)
	extends, _ := json.Marshal(req.Extends)
	provides, _ := json.Marshal(req.Provides)
	if _, err := s.pool.Exec(ctx, `
		INSERT INTO plugins (
		    id, kind, slug, name, version, schema, requires_license,
		    enabled_by_default, plugin_type, category, requires, extends, provides
		)
		VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb)
	`, pluginID, req.Kind, req.Slug, req.Name, req.Version, []byte(req.Schema),
		req.RequiresLicense, req.EnabledByDefault, req.PluginType, req.Category,
		requires, extends, provides); err != nil {
		writeError(w, http.StatusInternalServerError, "plugin create failed")
		return
	}
	if s.plugins != nil {
		if err := s.plugins.Reload(ctx); err != nil {
			writeError(w, http.StatusInternalServerError, "plugin reload failed")
			return
		}
	}
	p, _ := s.pluginByID(ctx, pluginID)
	writeJSON(w, http.StatusCreated, p)
}

func (s *Server) updatePlugin(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	pluginID, err := uuid.Parse(chi.URLParam(r, "plugin_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid plugin_id")
		return
	}
	var req updatePluginMetaRequest
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}
	if strings.TrimSpace(req.Name) == "" && strings.TrimSpace(req.Version) == "" && len(req.Schema) == 0 {
		writeError(w, http.StatusBadRequest, "no plugin fields to update")
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	if len(req.Schema) == 0 {
		req.Schema = json.RawMessage("{}")
	}
	tag, err := s.pool.Exec(ctx, `
		UPDATE plugins
		SET name = COALESCE(NULLIF($2, ''), name),
		    version = COALESCE(NULLIF($3, ''), version),
		    schema = CASE WHEN $4::text = '{}' THEN schema ELSE $4::jsonb END
		WHERE id = $1
	`, pluginID, strings.TrimSpace(req.Name), strings.TrimSpace(req.Version), []byte(req.Schema))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "plugin update failed")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "plugin not found")
		return
	}
	if s.plugins != nil {
		_ = s.plugins.Reload(ctx)
	}
	p, _ := s.pluginByID(ctx, pluginID)
	writeJSON(w, http.StatusOK, p)
}

func (s *Server) updatePluginState(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requireAdminPrincipal(w, r)
	if !ok {
		return
	}
	pluginID, err := uuid.Parse(chi.URLParam(r, "plugin_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid plugin_id")
		return
	}
	var req updatePluginStateRequest
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}
	if !validPluginState(req.State) {
		writeError(w, http.StatusBadRequest, "invalid plugin state")
		return
	}
	if len(req.Config) == 0 {
		req.Config = json.RawMessage("{}")
	}

	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	if r.URL.Query().Get("preview") == "1" {
		p, err := s.pluginByID(ctx, pluginID)
		if err != nil {
			writeError(w, http.StatusNotFound, "plugin not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"plugin":     p,
			"dependents": s.pluginDependents(p.Slug),
			"preview":    true,
		})
		return
	}
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO platform_plugin_entitlements (plugin_id, state, config, updated_by, updated_at)
		VALUES ($1, $2, $3::jsonb, $4, now())
		ON CONFLICT (plugin_id) DO UPDATE
		SET state = EXCLUDED.state,
		    config = EXCLUDED.config,
		    updated_by = EXCLUDED.updated_by,
		    updated_at = now()
	`, pluginID, req.State, []byte(req.Config), principal.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "plugin update failed")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "plugin not found")
		return
	}
	if s.plugins != nil {
		_ = s.plugins.Reload(ctx)
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (s *Server) pluginDependentsHandler(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	pluginID, err := uuid.Parse(chi.URLParam(r, "plugin_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid plugin_id")
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	p, err := s.pluginByID(ctx, pluginID)
	if err != nil {
		writeError(w, http.StatusNotFound, "plugin not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"dependents": s.pluginDependents(p.Slug)})
}

func (s *Server) adminUserEntitlements(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	userID, err := strconv.ParseInt(chi.URLParam(r, "user_id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}
	if s.plugins == nil {
		writeError(w, http.StatusServiceUnavailable, "plugin registry unavailable")
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	ents, err := s.plugins.UserLanguagePlugins(ctx, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "entitlement lookup failed")
		return
	}
	out := []map[string]any{}
	for _, ent := range ents {
		cfg, _ := ent.Plugin.DecodeLanguageConfig()
		out = append(out, map[string]any{
			"slug":        ent.Plugin.Slug,
			"displayName": cfg.DisplayName,
			"source":      ent.Source,
			"itemRef":     ent.ItemRef,
			"orgId":       ent.OrgID,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"entitlements": out})
}

func validPluginState(v string) bool {
	switch v {
	case "disabled", "enabled", "restricted":
		return true
	default:
		return false
	}
}

func (s *Server) pluginByID(ctx context.Context, pluginID uuid.UUID) (pluginDTO, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT p.id,
		       p.kind::text,
		       p.slug,
		       p.name,
		       p.version,
		       COALESCE(p.plugin_type, ''),
		       COALESCE(p.category, ''),
		       p.requires,
		       p.extends,
		       p.provides,
		       p.schema,
		       p.requires_license,
		       p.enabled_by_default,
		       COALESCE(e.state::text, CASE WHEN p.enabled_by_default THEN 'enabled' ELSE 'disabled' END),
		       COALESCE(e.config, '{}'::jsonb)
		FROM plugins p
		LEFT JOIN platform_plugin_entitlements e ON e.plugin_id = p.id
		WHERE p.id = $1
	`, pluginID)
	var p pluginDTO
	var id uuid.UUID
	var requires, extends, provides, schema, config []byte
	if err := row.Scan(
		&id, &p.Kind, &p.Slug, &p.Name, &p.Version, &p.PluginType, &p.Category,
		&requires, &extends, &provides, &schema,
		&p.RequiresLicense, &p.EnabledByDefault, &p.PlatformState, &config,
	); err != nil {
		return pluginDTO{}, err
	}
	p.ID = id.String()
	p.Requires = json.RawMessage(requires)
	p.Extends = json.RawMessage(extends)
	p.Provides = json.RawMessage(provides)
	p.Schema = json.RawMessage(schema)
	p.ConfigSchema = configSchemaForPlugin(p.Slug)
	p.PlatformConfig = json.RawMessage(config)
	p.Dependents = s.pluginDependents(p.Slug)
	return p, nil
}

func (s *Server) pluginDependents(slug string) []string {
	if s.plugins == nil {
		return nil
	}
	out := []string{}
	for _, m := range s.plugins.All() {
		if m.Slug == slug {
			continue
		}
		if stringSliceContains(m.Requires, slug) || stringSliceContains(m.Extends, slug) || manifestRequiresProvidedBy(s.plugins, m, slug) {
			out = append(out, m.Slug)
		}
	}
	return out
}

func manifestRequiresProvidedBy(reg *pluginhost.Registry, m *pluginhost.Manifest, slug string) bool {
	target := reg.BySlug(slug)
	if target == nil {
		return false
	}
	for _, provided := range target.Provides {
		if stringSliceContains(m.Requires, provided) {
			return true
		}
	}
	return false
}

func stringSliceContains(xs []string, v string) bool {
	for _, x := range xs {
		if x == v {
			return true
		}
	}
	return false
}

func validatePluginCreate(req createPluginRequest) error {
	if strings.TrimSpace(req.Kind) == "" {
		return errors.New("kind is required")
	}
	if strings.TrimSpace(req.Slug) == "" {
		return errors.New("slug is required")
	}
	if strings.TrimSpace(req.Name) == "" {
		return errors.New("name is required")
	}
	if strings.TrimSpace(req.Version) == "" {
		return errors.New("version is required")
	}
	if req.Category == "language" || strings.HasPrefix(req.Slug, "language.") {
		if !languageSlugPattern.MatchString(req.Slug) {
			return errors.New("language slug must match language.<name>")
		}
		var cfg pluginhost.LanguageConfig
		if err := json.Unmarshal(req.Schema, &cfg); err != nil {
			return fmt.Errorf("invalid language schema: %w", err)
		}
		if cfg.DisplayName == "" || cfg.Judge0LanguageID <= 0 || cfg.FileExtension == "" || cfg.MonacoLanguageID == "" {
			return errors.New("language schema requires displayName, judge0LanguageId, fileExtension, and monacoLanguageId")
		}
	}
	if req.PluginType == "" {
		return errors.New("plugin_type is required")
	}
	if req.Category == "" {
		return errors.New("category is required")
	}
	return nil
}

func configSchemaForPlugin(slug string) json.RawMessage {
	var (
		raw json.RawMessage
		err error
	)
	switch slug {
	case evaluationllm.Slug:
		raw, err = evaluationllm.ConfigSchema()
	case evaluatoropenai.Slug:
		raw, err = evaluatoropenai.ConfigSchema()
	case evaluatoranthropic.Slug:
		raw, err = evaluatoranthropic.ConfigSchema()
	}
	if err != nil {
		return nil
	}
	return raw
}
