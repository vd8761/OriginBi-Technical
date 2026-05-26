package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

// codingLanguageConfig mirrors the coding_language_configs table. Counts are
// authoritative; `InputMode` is a UI hint for how the admin last entered them.
type codingLanguageConfig struct {
	LanguageSlug        string   `json:"languageSlug"`
	TotalQuestions      int      `json:"totalQuestions"`
	EasyCount           int      `json:"easyCount"`
	MediumCount         int      `json:"mediumCount"`
	HardCount           int      `json:"hardCount"`
	InputMode           string   `json:"inputMode"`
	AllowSpillover      bool     `json:"allowSpillover"`
	IncludeTags         []string `json:"includeTags"`
	TimeSecondsOverride *int     `json:"timeSecondsOverride,omitempty"`
	UpdatedAt           *string  `json:"updatedAt,omitempty"`
}

// bankCounts describes how many active coding-bank questions match a given
// language, broken down by difficulty bucket. The list endpoint returns this
// alongside the config so the UI can render bank-health badges.
type bankCounts struct {
	Total  int `json:"total"`
	Easy   int `json:"easy"`
	Medium int `json:"medium"`
	Hard   int `json:"hard"`
}

type codingLanguageEntry struct {
	Slug   string                `json:"slug"`
	Name   string                `json:"name"`
	Config *codingLanguageConfig `json:"config,omitempty"`
	Bank   bankCounts            `json:"bank"`
}

type codingLanguageListResponse struct {
	Languages []codingLanguageEntry `json:"languages"`
}

type codingConfigUpsertRequest struct {
	TotalQuestions      int      `json:"totalQuestions"`
	EasyCount           int      `json:"easyCount"`
	MediumCount         int      `json:"mediumCount"`
	HardCount           int      `json:"hardCount"`
	InputMode           string   `json:"inputMode"`
	AllowSpillover      bool     `json:"allowSpillover"`
	IncludeTags         []string `json:"includeTags"`
	TimeSecondsOverride *int     `json:"timeSecondsOverride"`
}

// listAdminCodingLanguages returns one entry per registered language plugin,
// each enriched with its current config row (if any) and live bank counts.
// GET /v1/admin/coding/languages
func (s *Server) listAdminCodingLanguages(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	langs, err := s.fetchLanguagePlugins(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "language plugin lookup failed")
		return
	}

	configs, err := s.fetchAllCodingConfigs(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "config lookup failed")
		return
	}

	resp := codingLanguageListResponse{Languages: make([]codingLanguageEntry, 0, len(langs))}
	for _, l := range langs {
		entry := codingLanguageEntry{Slug: l.slug, Name: l.name}
		if cfg, ok := configs[l.slug]; ok {
			c := cfg
			entry.Config = &c
		}
		counts, err := s.bankCountsForLanguage(ctx, l.slug, entry.Config)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "bank lookup failed")
			return
		}
		entry.Bank = counts
		resp.Languages = append(resp.Languages, entry)
	}
	writeJSON(w, http.StatusOK, resp)
}

// getAdminCodingLanguageConfig returns the single-language config + bank counts.
// GET /v1/admin/coding/languages/{slug}/config
func (s *Server) getAdminCodingLanguageConfig(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	slug, ok := s.validatedLanguageSlug(w, r)
	if !ok {
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	cfg, err := s.fetchCodingConfig(ctx, slug)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusInternalServerError, "config lookup failed")
		return
	}
	var cfgPtr *codingLanguageConfig
	if err == nil {
		c := cfg
		cfgPtr = &c
	}
	counts, err := s.bankCountsForLanguage(ctx, slug, cfgPtr)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "bank lookup failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"slug":   slug,
		"config": cfgPtr,
		"bank":   counts,
	})
}

// putAdminCodingLanguageConfig upserts the per-language config.
// PUT /v1/admin/coding/languages/{slug}/config
func (s *Server) putAdminCodingLanguageConfig(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requireAdminPrincipal(w, r)
	if !ok {
		return
	}
	slug, ok := s.validatedLanguageSlug(w, r)
	if !ok {
		return
	}
	var req codingConfigUpsertRequest
	if !decodeJSON(w, r, &req, 1<<14) {
		return
	}
	if msg := validateConfigRequest(req); msg != "" {
		writeError(w, http.StatusUnprocessableEntity, msg)
		return
	}
	tagsJSON, err := json.Marshal(req.IncludeTags)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid includeTags")
		return
	}

	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	mode := strings.ToLower(strings.TrimSpace(req.InputMode))
	if mode != "count" && mode != "percent" {
		mode = "count"
	}

	_, err = s.pool.Exec(ctx, `
		INSERT INTO coding_language_configs (
		    language_slug, total_questions, easy_count, medium_count, hard_count,
		    input_mode, allow_spillover, include_tags, time_seconds_override,
		    updated_at, updated_by
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, now(), $10)
		ON CONFLICT (language_slug) DO UPDATE
		SET total_questions       = EXCLUDED.total_questions,
		    easy_count            = EXCLUDED.easy_count,
		    medium_count          = EXCLUDED.medium_count,
		    hard_count            = EXCLUDED.hard_count,
		    input_mode            = EXCLUDED.input_mode,
		    allow_spillover       = EXCLUDED.allow_spillover,
		    include_tags          = EXCLUDED.include_tags,
		    time_seconds_override = EXCLUDED.time_seconds_override,
		    updated_at            = now(),
		    updated_by            = EXCLUDED.updated_by
	`,
		slug, req.TotalQuestions, req.EasyCount, req.MediumCount, req.HardCount,
		mode, req.AllowSpillover, tagsJSON, req.TimeSecondsOverride,
		principal.UserID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("config write failed: %v", err))
		return
	}

	cfg, err := s.fetchCodingConfig(ctx, slug)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "config readback failed")
		return
	}
	writeJSON(w, http.StatusOK, cfg)
}

// deleteAdminCodingLanguageConfig drops the config row, reverting to the
// default-all policy for the language.
// DELETE /v1/admin/coding/languages/{slug}/config
func (s *Server) deleteAdminCodingLanguageConfig(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	slug, ok := s.validatedLanguageSlug(w, r)
	if !ok {
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	if _, err := s.pool.Exec(ctx, `DELETE FROM coding_language_configs WHERE language_slug = $1`, slug); err != nil {
		writeError(w, http.StatusInternalServerError, "config delete failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// previewAdminCodingLanguageConfig runs the builder in dry-run mode and
// returns the list of question titles a candidate would receive RIGHT NOW.
// No DB writes; the caller can re-roll by re-hitting the endpoint.
// POST /v1/admin/coding/languages/{slug}/preview
func (s *Server) previewAdminCodingLanguageConfig(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	slug, ok := s.validatedLanguageSlug(w, r)
	if !ok {
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	pick, spillover, err := s.pickCodingQuestions(ctx, s.pool, slug)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	items := make([]map[string]any, 0, len(pick))
	for _, p := range pick {
		items = append(items, map[string]any{
			"questionVersionId": p.questionVersionID.String(),
			"title":             p.title,
			"difficulty":        p.difficulty,
			"bucket":            difficultyBucket(p.difficulty),
			"score":             p.score,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"languageSlug": slug,
		"picked":       items,
		"spillover":    spillover,
	})
}

// ─── Helpers ────────────────────────────────────────────────────────────────

type languageRow struct {
	slug string
	name string
}

func (s *Server) fetchLanguagePlugins(ctx context.Context) ([]languageRow, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT slug, name
		FROM plugins
		WHERE category = 'language'
		ORDER BY name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []languageRow{}
	seen := map[string]bool{}
	for rows.Next() {
		var l languageRow
		if err := rows.Scan(&l.slug, &l.name); err != nil {
			return nil, err
		}
		// plugins is keyed (slug, version) so the same slug may appear multiple
		// times — keep the first one (lowest version_seq via name order is fine
		// for our purposes since name is identical across versions).
		if seen[l.slug] {
			continue
		}
		seen[l.slug] = true
		out = append(out, l)
	}
	return out, rows.Err()
}

func (s *Server) fetchAllCodingConfigs(ctx context.Context) (map[string]codingLanguageConfig, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT language_slug, total_questions, easy_count, medium_count, hard_count,
		       input_mode, allow_spillover, include_tags, time_seconds_override,
		       updated_at
		FROM coding_language_configs
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]codingLanguageConfig{}
	for rows.Next() {
		var c codingLanguageConfig
		var tags []byte
		var updatedAt time.Time
		if err := rows.Scan(
			&c.LanguageSlug, &c.TotalQuestions, &c.EasyCount, &c.MediumCount, &c.HardCount,
			&c.InputMode, &c.AllowSpillover, &tags, &c.TimeSecondsOverride, &updatedAt,
		); err != nil {
			return nil, err
		}
		if len(tags) > 0 {
			_ = json.Unmarshal(tags, &c.IncludeTags)
		}
		if c.IncludeTags == nil {
			c.IncludeTags = []string{}
		}
		ts := updatedAt.UTC().Format(time.RFC3339)
		c.UpdatedAt = &ts
		out[c.LanguageSlug] = c
	}
	return out, rows.Err()
}

func (s *Server) fetchCodingConfig(ctx context.Context, slug string) (codingLanguageConfig, error) {
	var c codingLanguageConfig
	var tags []byte
	var updatedAt time.Time
	err := s.pool.QueryRow(ctx, `
		SELECT language_slug, total_questions, easy_count, medium_count, hard_count,
		       input_mode, allow_spillover, include_tags, time_seconds_override,
		       updated_at
		FROM coding_language_configs WHERE language_slug = $1
	`, slug).Scan(
		&c.LanguageSlug, &c.TotalQuestions, &c.EasyCount, &c.MediumCount, &c.HardCount,
		&c.InputMode, &c.AllowSpillover, &tags, &c.TimeSecondsOverride, &updatedAt,
	)
	if err != nil {
		return codingLanguageConfig{}, err
	}
	if len(tags) > 0 {
		_ = json.Unmarshal(tags, &c.IncludeTags)
	}
	if c.IncludeTags == nil {
		c.IncludeTags = []string{}
	}
	ts := updatedAt.UTC().Format(time.RFC3339)
	c.UpdatedAt = &ts
	return c, nil
}

// bankCountsForLanguage reports how many active coding-bank questions match
// the given language slug, broken down by difficulty bucket. When a config
// with includeTags is supplied, the same JSONB containment filter the builder
// uses is applied here too so the admin sees the *eligible* pool, not the
// raw language pool.
func (s *Server) bankCountsForLanguage(ctx context.Context, slug string, cfg *codingLanguageConfig) (bankCounts, error) {
	var includeTagsJSON []byte
	if cfg != nil && len(cfg.IncludeTags) > 0 {
		j, err := json.Marshal(cfg.IncludeTags)
		if err == nil {
			includeTagsJSON = j
		}
	}
	var counts bankCounts
	err := s.pool.QueryRow(ctx, `
		WITH eligible AS (
		    SELECT qv.difficulty
		    FROM questions q
		    JOIN question_versions qv ON qv.id = q.current_version_id
		    JOIN plugins p ON p.id = q.plugin_id
		    WHERE p.slug = 'assessment.coding'
		      AND q.is_archived = false
		      AND COALESCE(qv.body->>'mode', 'main') = 'main'
		      AND qv.body->'allowedLanguages' ? $1
		      AND (
		          $2::jsonb IS NULL
		          OR jsonb_array_length($2::jsonb) = 0
		          OR EXISTS (
		              SELECT 1 FROM jsonb_array_elements_text($2::jsonb) t
		              WHERE qv.body->'tags' ? t.value
		          )
		      )
		)
		SELECT
		    COUNT(*)::int AS total,
		    COUNT(*) FILTER (WHERE difficulty BETWEEN 1 AND 2)::int AS easy,
		    COUNT(*) FILTER (WHERE difficulty BETWEEN 3 AND 4)::int AS medium,
		    COUNT(*) FILTER (WHERE difficulty >= 5)::int AS hard
		FROM eligible
	`, slug, includeTagsJSON).Scan(&counts.Total, &counts.Easy, &counts.Medium, &counts.Hard)
	if err != nil {
		return bankCounts{}, err
	}
	return counts, nil
}

func validateConfigRequest(req codingConfigUpsertRequest) string {
	if req.TotalQuestions < 1 {
		return "totalQuestions must be >= 1"
	}
	if req.EasyCount < 0 || req.MediumCount < 0 || req.HardCount < 0 {
		return "difficulty counts must be >= 0"
	}
	if req.EasyCount+req.MediumCount+req.HardCount != req.TotalQuestions {
		return "easyCount + mediumCount + hardCount must equal totalQuestions"
	}
	if req.TimeSecondsOverride != nil && *req.TimeSecondsOverride <= 0 {
		return "timeSecondsOverride must be > 0 when set"
	}
	for _, t := range req.IncludeTags {
		if strings.TrimSpace(t) == "" {
			return "includeTags must not contain empty strings"
		}
	}
	return ""
}

// validatedLanguageSlug extracts and sanity-checks the slug URL param. We
// accept either the full plugin slug ('language.python') or the bare form
// ('python') and normalize to the full one.
func (s *Server) validatedLanguageSlug(w http.ResponseWriter, r *http.Request) (string, bool) {
	raw := strings.ToLower(strings.TrimSpace(chi.URLParam(r, "slug")))
	if raw == "" {
		writeError(w, http.StatusBadRequest, "missing language slug")
		return "", false
	}
	if !strings.HasPrefix(raw, "language.") {
		raw = "language." + raw
	}
	return raw, true
}

// difficultyBucket maps the integer difficulty stored on question_versions to
// the three product-level buckets the builder uses.
func difficultyBucket(difficulty int) string {
	switch {
	case difficulty <= 2:
		return "easy"
	case difficulty <= 4:
		return "medium"
	default:
		return "hard"
	}
}
