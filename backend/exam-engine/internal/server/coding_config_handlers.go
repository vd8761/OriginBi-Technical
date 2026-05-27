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

// QuestionType values stored in coding_language_configs.question_type (see
// migration 028). The 'coding' type has been the only one historically; mcq
// and fillblank were added alongside the dedicated per-language config page.
const (
	QuestionTypeCoding    = "coding"
	QuestionTypeMCQ       = "mcq"
	QuestionTypeFillBlank = "fillblank"
)

// pluginSlugForType maps the product-level question_type discriminator to the
// plugin slug rows are stored under in `questions.plugin_id -> plugins.slug`.
var pluginSlugForType = map[string]string{
	QuestionTypeCoding:    "assessment.coding",
	QuestionTypeMCQ:       "assessment.mcq",
	QuestionTypeFillBlank: "assessment.fillblank",
}

func isValidQuestionType(t string) bool {
	_, ok := pluginSlugForType[t]
	return ok
}

// codingLanguageConfig mirrors the coding_language_configs table. Counts are
// authoritative; `InputMode` is a UI hint for how the admin last entered them.
type codingLanguageConfig struct {
	LanguageSlug        string   `json:"languageSlug"`
	QuestionType        string   `json:"questionType"`
	Enabled             bool     `json:"enabled"`
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

// bankCounts describes how many active bank questions match a given language,
// broken down by difficulty bucket.
type bankCounts struct {
	Total  int `json:"total"`
	Easy   int `json:"easy"`
	Medium int `json:"medium"`
	Hard   int `json:"hard"`
}

// banksByType is the per-type bank breakdown returned in list/get responses.
type banksByType struct {
	Coding    bankCounts `json:"coding"`
	MCQ       bankCounts `json:"mcq"`
	FillBlank bankCounts `json:"fillblank"`
}

// configsByType is the per-type config map. nil values mean "no config row
// for this type yet" — render the default policy in the UI.
type configsByType struct {
	Coding    *codingLanguageConfig `json:"coding"`
	MCQ       *codingLanguageConfig `json:"mcq"`
	FillBlank *codingLanguageConfig `json:"fillblank"`
}

type codingLanguageEntry struct {
	Slug    string        `json:"slug"`
	Name    string        `json:"name"`
	Configs configsByType `json:"configs"`
	Banks   banksByType   `json:"banks"`
	// Config and Bank are retained for back-compat with the original
	// single-flavor (coding-only) UI; they mirror Configs.Coding / Banks.Coding.
	Config *codingLanguageConfig `json:"config,omitempty"`
	Bank   bankCounts            `json:"bank"`
}

type codingLanguageListResponse struct {
	Languages []codingLanguageEntry `json:"languages"`
}

type codingConfigUpsertRequest struct {
	Enabled             *bool    `json:"enabled,omitempty"`
	QuestionType        string   `json:"questionType,omitempty"`
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
// each enriched with its current config rows (one per type) and live bank counts.
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

	configs, err := s.fetchAllLanguageConfigs(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "config lookup failed")
		return
	}

	resp := codingLanguageListResponse{Languages: make([]codingLanguageEntry, 0, len(langs))}
	for _, l := range langs {
		entry := codingLanguageEntry{Slug: l.slug, Name: l.name}
		byType := configs[l.slug]
		entry.Configs = byType.toPublic()
		banks, err := s.allBankCountsForLanguage(ctx, l.slug, byType)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "bank lookup failed")
			return
		}
		entry.Banks = banks
		entry.Config = entry.Configs.Coding
		entry.Bank = entry.Banks.Coding
		resp.Languages = append(resp.Languages, entry)
	}
	writeJSON(w, http.StatusOK, resp)
}

// getAdminCodingLanguageConfig returns the per-type configs + per-type bank
// counts for a single language. Optional ?type=coding|mcq|fillblank narrows
// the response to a single type (useful for the per-language config page).
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

	byType, err := s.fetchLanguageConfigs(ctx, slug)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "config lookup failed")
		return
	}

	banks, err := s.allBankCountsForLanguage(ctx, slug, byType)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "bank lookup failed")
		return
	}

	// Narrow to a single type when ?type= is supplied so legacy callers keep
	// receiving the single-config shape they expect.
	if qt := r.URL.Query().Get("type"); qt != "" {
		if !isValidQuestionType(qt) {
			writeError(w, http.StatusBadRequest, "type must be coding|mcq|fillblank")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"slug":         slug,
			"questionType": qt,
			"config":       byType.byType(qt),
			"bank":         banks.byType(qt),
		})
		return
	}

	publicConfigs := byType.toPublic()
	writeJSON(w, http.StatusOK, map[string]any{
		"slug":    slug,
		"configs": publicConfigs,
		"banks":   banks,
		// back-compat
		"config": publicConfigs.Coding,
		"bank":   banks.Coding,
	})
}

// putAdminCodingLanguageConfig upserts the per-language, per-type config row.
// The question_type is taken from ?type= (preferred) or the body's
// questionType field; absence defaults to 'coding' for back-compat.
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
	qt := strings.TrimSpace(r.URL.Query().Get("type"))
	if qt == "" {
		qt = strings.TrimSpace(req.QuestionType)
	}
	if qt == "" {
		qt = QuestionTypeCoding
	}
	if !isValidQuestionType(qt) {
		writeError(w, http.StatusBadRequest, "type must be coding|mcq|fillblank")
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
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	_, err = s.pool.Exec(ctx, `
		INSERT INTO coding_language_configs (
		    language_slug, question_type, enabled,
		    total_questions, easy_count, medium_count, hard_count,
		    input_mode, allow_spillover, include_tags, time_seconds_override,
		    updated_at, updated_by
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, now(), $12)
		ON CONFLICT (language_slug, question_type) DO UPDATE
		SET enabled               = EXCLUDED.enabled,
		    total_questions       = EXCLUDED.total_questions,
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
		slug, qt, enabled,
		req.TotalQuestions, req.EasyCount, req.MediumCount, req.HardCount,
		mode, req.AllowSpillover, tagsJSON, req.TimeSecondsOverride,
		principal.UserID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("config write failed: %v", err))
		return
	}

	cfg, err := s.fetchLanguageConfigOne(ctx, slug, qt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "config readback failed")
		return
	}
	writeJSON(w, http.StatusOK, cfg)
}

// deleteAdminCodingLanguageConfig drops the config row for the given language
// + question_type, reverting it to the default-all policy. type defaults to
// 'coding' when omitted.
// DELETE /v1/admin/coding/languages/{slug}/config
func (s *Server) deleteAdminCodingLanguageConfig(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	slug, ok := s.validatedLanguageSlug(w, r)
	if !ok {
		return
	}
	qt := strings.TrimSpace(r.URL.Query().Get("type"))
	if qt == "" {
		qt = QuestionTypeCoding
	}
	if !isValidQuestionType(qt) {
		writeError(w, http.StatusBadRequest, "type must be coding|mcq|fillblank")
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	if _, err := s.pool.Exec(ctx, `
		DELETE FROM coding_language_configs WHERE language_slug = $1 AND question_type = $2
	`, slug, qt); err != nil {
		writeError(w, http.StatusInternalServerError, "config delete failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// previewAdminCodingLanguageConfig runs the coding-bank builder in dry-run
// mode. Preview for MCQ and Fill-in-the-Blank lives off the same selection
// algorithm parametrized by plugin slug; for now this remains coding-only —
// the per-language page falls back to a generic bank-count snapshot for the
// other types until the picker is extended.
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
		if seen[l.slug] {
			continue
		}
		seen[l.slug] = true
		out = append(out, l)
	}
	return out, rows.Err()
}

// langConfigsByType holds the three (possibly-nil) per-type configs for a
// single language slug. The toPublic / byType helpers normalize access.
type langConfigsByType struct {
	Coding    *codingLanguageConfig
	MCQ       *codingLanguageConfig
	FillBlank *codingLanguageConfig
}

func (l langConfigsByType) toPublic() configsByType {
	return configsByType{
		Coding:    l.Coding,
		MCQ:       l.MCQ,
		FillBlank: l.FillBlank,
	}
}

func (l langConfigsByType) byType(qt string) *codingLanguageConfig {
	switch qt {
	case QuestionTypeMCQ:
		return l.MCQ
	case QuestionTypeFillBlank:
		return l.FillBlank
	default:
		return l.Coding
	}
}

func (b banksByType) byType(qt string) bankCounts {
	switch qt {
	case QuestionTypeMCQ:
		return b.MCQ
	case QuestionTypeFillBlank:
		return b.FillBlank
	default:
		return b.Coding
	}
}

func scanLanguageConfigRow(rows pgx.Row) (codingLanguageConfig, error) {
	var c codingLanguageConfig
	var tags []byte
	var updatedAt time.Time
	if err := rows.Scan(
		&c.LanguageSlug, &c.QuestionType, &c.Enabled,
		&c.TotalQuestions, &c.EasyCount, &c.MediumCount, &c.HardCount,
		&c.InputMode, &c.AllowSpillover, &tags, &c.TimeSecondsOverride, &updatedAt,
	); err != nil {
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

// fetchAllLanguageConfigs returns every config row, grouped by language slug.
func (s *Server) fetchAllLanguageConfigs(ctx context.Context) (map[string]langConfigsByType, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT language_slug, question_type, enabled,
		       total_questions, easy_count, medium_count, hard_count,
		       input_mode, allow_spillover, include_tags, time_seconds_override,
		       updated_at
		FROM coding_language_configs
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]langConfigsByType{}
	for rows.Next() {
		c, err := scanLanguageConfigRow(rows)
		if err != nil {
			return nil, err
		}
		entry := out[c.LanguageSlug]
		switch c.QuestionType {
		case QuestionTypeMCQ:
			cc := c
			entry.MCQ = &cc
		case QuestionTypeFillBlank:
			cc := c
			entry.FillBlank = &cc
		default:
			cc := c
			entry.Coding = &cc
		}
		out[c.LanguageSlug] = entry
	}
	return out, rows.Err()
}

func (s *Server) fetchLanguageConfigs(ctx context.Context, slug string) (langConfigsByType, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT language_slug, question_type, enabled,
		       total_questions, easy_count, medium_count, hard_count,
		       input_mode, allow_spillover, include_tags, time_seconds_override,
		       updated_at
		FROM coding_language_configs WHERE language_slug = $1
	`, slug)
	if err != nil {
		return langConfigsByType{}, err
	}
	defer rows.Close()
	var out langConfigsByType
	for rows.Next() {
		c, err := scanLanguageConfigRow(rows)
		if err != nil {
			return langConfigsByType{}, err
		}
		switch c.QuestionType {
		case QuestionTypeMCQ:
			cc := c
			out.MCQ = &cc
		case QuestionTypeFillBlank:
			cc := c
			out.FillBlank = &cc
		default:
			cc := c
			out.Coding = &cc
		}
	}
	return out, rows.Err()
}

func (s *Server) fetchLanguageConfigOne(ctx context.Context, slug, qt string) (codingLanguageConfig, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT language_slug, question_type, enabled,
		       total_questions, easy_count, medium_count, hard_count,
		       input_mode, allow_spillover, include_tags, time_seconds_override,
		       updated_at
		FROM coding_language_configs
		WHERE language_slug = $1 AND question_type = $2
	`, slug, qt)
	c, err := scanLanguageConfigRow(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return codingLanguageConfig{}, err
		}
		return codingLanguageConfig{}, err
	}
	return c, nil
}

// allBankCountsForLanguage runs the bank-counts query once per type. The
// includeTags filter (when set on the per-type config) is applied so the UI
// sees the *eligible* pool, not the raw language pool.
func (s *Server) allBankCountsForLanguage(ctx context.Context, slug string, configs langConfigsByType) (banksByType, error) {
	var out banksByType
	var err error
	if out.Coding, err = s.bankCountsForLanguageByPlugin(ctx, slug, pluginSlugForType[QuestionTypeCoding], configs.Coding); err != nil {
		return banksByType{}, err
	}
	if out.MCQ, err = s.bankCountsForLanguageByPlugin(ctx, slug, pluginSlugForType[QuestionTypeMCQ], configs.MCQ); err != nil {
		return banksByType{}, err
	}
	if out.FillBlank, err = s.bankCountsForLanguageByPlugin(ctx, slug, pluginSlugForType[QuestionTypeFillBlank], configs.FillBlank); err != nil {
		return banksByType{}, err
	}
	return out, nil
}

// bankCountsForLanguageByPlugin reports how many active bank questions match
// the given language slug for a specific plugin slug ('assessment.coding' for
// the coding bank, 'assessment.mcq' for MCQs, 'assessment.fillblank' for
// fill-in-the-blanks). For coding the language filter inspects
// body->'allowedLanguages'; for the other types it inspects body->>'language'
// since those question types are scoped to a single language.
func (s *Server) bankCountsForLanguageByPlugin(ctx context.Context, slug, pluginSlug string, cfg *codingLanguageConfig) (bankCounts, error) {
	var includeTagsJSON []byte
	if cfg != nil && len(cfg.IncludeTags) > 0 {
		j, err := json.Marshal(cfg.IncludeTags)
		if err == nil {
			includeTagsJSON = j
		}
	}
	languageFilter := `qv.body->'allowedLanguages' ? $1`
	if pluginSlug != "assessment.coding" {
		languageFilter = `qv.body->>'language' = $1`
	}
	q := fmt.Sprintf(`
		WITH eligible AS (
		    SELECT qv.difficulty
		    FROM questions q
		    JOIN question_versions qv ON qv.id = q.current_version_id
		    JOIN plugins p ON p.id = q.plugin_id
		    WHERE p.slug = '%s'
		      AND q.is_archived = false
		      AND COALESCE(qv.body->>'mode', 'main') = 'main'
		      AND %s
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
	`, pluginSlug, languageFilter)

	var counts bankCounts
	if err := s.pool.QueryRow(ctx, q, slug, includeTagsJSON).Scan(&counts.Total, &counts.Easy, &counts.Medium, &counts.Hard); err != nil {
		return bankCounts{}, err
	}
	return counts, nil
}

// bankCountsForLanguage is the legacy single-flavor helper kept so older
// callers (coding_exam_builder.go) keep compiling. Coding-only.
func (s *Server) bankCountsForLanguage(ctx context.Context, slug string, cfg *codingLanguageConfig) (bankCounts, error) {
	return s.bankCountsForLanguageByPlugin(ctx, slug, "assessment.coding", cfg)
}

// fetchCodingConfig is a back-compat helper that returns the coding-type row
// for a language. Used by coding_exam_builder.go.
func (s *Server) fetchCodingConfig(ctx context.Context, slug string) (codingLanguageConfig, error) {
	return s.fetchLanguageConfigOne(ctx, slug, QuestionTypeCoding)
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

// validatedLanguageSlug extracts and sanity-checks the slug URL param. Accepts
// either the full plugin slug ('language.python') or the bare form ('python')
// and normalizes to the full one.
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
