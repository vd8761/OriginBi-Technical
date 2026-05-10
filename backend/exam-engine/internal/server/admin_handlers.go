package server

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/originbi/exam-engine/internal/auth"
)

type pluginDTO struct {
	ID               string          `json:"id"`
	Kind             string          `json:"kind"`
	Slug             string          `json:"slug"`
	Name             string          `json:"name"`
	Version          string          `json:"version"`
	RequiresLicense  bool            `json:"requiresLicense"`
	EnabledByDefault bool            `json:"enabledByDefault"`
	PlatformState    string          `json:"platformState"`
	PlatformConfig   json.RawMessage `json:"platformConfig"`
}

type pluginsResponse struct {
	Plugins []pluginDTO `json:"plugins"`
}

type updatePluginRequest struct {
	State  string          `json:"state"`
	Config json.RawMessage `json:"config"`
}

func (s *Server) listPlugins(w http.ResponseWriter, r *http.Request) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	if !s.isAdmin(r.Context(), principal.UserID) {
		writeError(w, http.StatusForbidden, "admin required")
		return
	}

	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	rows, err := s.pool.Query(ctx, `
		SELECT p.id,
		       p.kind::text,
		       p.slug,
		       p.name,
		       p.version,
		       p.requires_license,
		       p.enabled_by_default,
		       COALESCE(e.state::text, CASE WHEN p.enabled_by_default THEN 'enabled' ELSE 'disabled' END),
		       COALESCE(e.config, '{}'::jsonb)
		FROM plugins p
		LEFT JOIN platform_plugin_entitlements e ON e.plugin_id = p.id
		ORDER BY p.kind::text, p.slug
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "plugin lookup failed")
		return
	}
	defer rows.Close()

	resp := pluginsResponse{Plugins: []pluginDTO{}}
	for rows.Next() {
		var p pluginDTO
		var id uuid.UUID
		var config []byte
		if err := rows.Scan(
			&id,
			&p.Kind,
			&p.Slug,
			&p.Name,
			&p.Version,
			&p.RequiresLicense,
			&p.EnabledByDefault,
			&p.PlatformState,
			&config,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "plugin scan failed")
			return
		}
		p.ID = id.String()
		p.PlatformConfig = json.RawMessage(config)
		resp.Plugins = append(resp.Plugins, p)
	}
	if rows.Err() != nil {
		writeError(w, http.StatusInternalServerError, "plugin rows failed")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) updatePlugin(w http.ResponseWriter, r *http.Request) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	if !s.isAdmin(r.Context(), principal.UserID) {
		writeError(w, http.StatusForbidden, "admin required")
		return
	}
	pluginID, err := uuid.Parse(chi.URLParam(r, "plugin_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid plugin_id")
		return
	}
	var req updatePluginRequest
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
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func validPluginState(v string) bool {
	switch v {
	case "disabled", "enabled", "restricted":
		return true
	default:
		return false
	}
}
