package server

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/originbi/exam-engine/internal/pluginhost"
	assessmentcoding "github.com/originbi/exam-engine/plugins/assessment-coding"
	runnerjudge0 "github.com/originbi/exam-engine/plugins/runner-judge0"
)

type adminExamPackageDTO struct {
	ID               string          `json:"id"`
	CurrentVersionID string          `json:"currentVersionId"`
	Title            string          `json:"title"`
	Slug             string          `json:"slug"`
	Description      string          `json:"description,omitempty"`
	Status           string          `json:"status"`
	TotalTimeSeconds int             `json:"totalTimeSeconds"`
	MaxScore         float64         `json:"maxScore"`
	Settings         json.RawMessage `json:"settings"`
	CreatedAt        time.Time       `json:"createdAt"`
}

type adminExamPackageRequest struct {
	Title            string   `json:"title"`
	Slug             string   `json:"slug"`
	Description      string   `json:"description"`
	TotalTimeSeconds int      `json:"total_time_seconds"`
	MaxScore         float64  `json:"max_score"`
	Languages        []string `json:"languages"`
	PriceCents       *int     `json:"price_cents"`
	Currency         string   `json:"currency"`
}


func (s *Server) listExamPackages(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	rows, err := s.pool.Query(ctx, `
		SELECT e.id, e.current_version_id, e.title, e.slug, COALESCE(e.description, ''),
		       ev.status::text, ev.total_time_seconds, ev.max_score::float8, ev.settings, e.created_at
		FROM exams e
		JOIN exam_versions ev ON ev.id = e.current_version_id
		WHERE e.deleted_at IS NULL
		ORDER BY e.created_at DESC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "exam package lookup failed")
		return
	}
	defer rows.Close()
	out := []adminExamPackageDTO{}
	for rows.Next() {
		pkg, err := scanExamPackage(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "exam package scan failed")
			return
		}
		out = append(out, pkg)
	}
	writeJSON(w, http.StatusOK, map[string]any{"examPackages": out})
}

func (s *Server) createExamPackage(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requireAdminPrincipal(w, r)
	if !ok {
		return
	}
	var req adminExamPackageRequest
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	req.Slug = strings.TrimSpace(req.Slug)
	if req.Title == "" || req.Slug == "" {
		writeError(w, http.StatusBadRequest, "title and slug are required")
		return
	}
	if req.TotalTimeSeconds <= 0 {
		req.TotalTimeSeconds = 5400
	}
	settings, _ := json.Marshal(map[string]any{
		"allowed_languages": req.Languages,
		"assignment_refs":   legacyRefsForLanguages(s.plugins, req.Languages),
	})
	sectionConfig, _ := json.Marshal(map[string]any{"languages": req.Languages})
	ctx, cancel := contextWithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db unavailable")
		return
	}
	defer func() { _ = tx.Rollback(ctx) }()
	examID := uuid.New()
	versionID := uuid.New()
	if _, err := tx.Exec(ctx, `
		INSERT INTO exams (id, org_id, audience, title, slug, description, created_by)
		VALUES ($1, $2, 'individual', $3, $4, $5, $6)
	`, examID, s.systemOrgID(), req.Title, req.Slug, nullEmpty(req.Description), principal.UserID); err != nil {
		writeError(w, http.StatusInternalServerError, "exam create failed")
		return
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO exam_versions (
		    id, exam_id, version_number, status, total_time_seconds, max_score,
		    settings, published_at
		)
		VALUES ($1, $2, 1, 'draft', $3, $4, $5::jsonb, NULL)
	`, versionID, examID, req.TotalTimeSeconds, req.MaxScore, settings); err != nil {
		writeError(w, http.StatusInternalServerError, "exam version create failed")
		return
	}
	if _, err := tx.Exec(ctx, `
		UPDATE exams SET current_version_id = $2 WHERE id = $1
	`, examID, versionID); err != nil {
		writeError(w, http.StatusInternalServerError, "exam current version update failed")
		return
	}
	var codingPluginID uuid.UUID
	if s.plugins != nil && s.plugins.BySlug(assessmentcoding.Slug) != nil {
		codingPluginID = s.plugins.BySlug(assessmentcoding.Slug).ID
	}
	if codingPluginID != uuid.Nil {
		if _, err := tx.Exec(ctx, `
			INSERT INTO exam_sections (id, exam_version_id, plugin_id, ordinal, name, config)
			VALUES ($1, $2, $3, 1, 'Coding', $4::jsonb)
		`, uuid.New(), versionID, codingPluginID, sectionConfig); err != nil {
			writeError(w, http.StatusInternalServerError, "exam section create failed")
			return
		}
	}
	// NOTE: pricing_items table was removed in migration 025.
	// Price info is no longer stored here.
	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "commit failed")
		return
	}
	pkg, _ := s.fetchExamPackage(ctx, examID)
	writeJSON(w, http.StatusCreated, pkg)
}

func (s *Server) getExamPackage(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	examID, err := uuid.Parse(chi.URLParam(r, "pkg_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid package id")
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	pkg, err := s.fetchExamPackage(ctx, examID)
	if err == pgx.ErrNoRows {
		writeError(w, http.StatusNotFound, "exam package not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "exam package lookup failed")
		return
	}
	writeJSON(w, http.StatusOK, pkg)
}

func (s *Server) updateExamPackage(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	examID, err := uuid.Parse(chi.URLParam(r, "pkg_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid package id")
		return
	}
	var req adminExamPackageRequest
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	hasSettings := req.Languages != nil
	var settings []byte
	if hasSettings {
		settings, _ = json.Marshal(map[string]any{
			"allowed_languages": req.Languages,
			"assignment_refs":   legacyRefsForLanguages(s.plugins, req.Languages),
		})
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db unavailable")
		return
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE exams
		SET title = COALESCE(NULLIF($2, ''), title),
		    slug = COALESCE(NULLIF($3, ''), slug),
		    description = COALESCE(NULLIF($4, ''), description)
		WHERE id = $1 AND deleted_at IS NULL
	`, examID, req.Title, req.Slug, req.Description)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "exam package update failed")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "exam package not found")
		return
	}

	if _, err := tx.Exec(ctx, `
		UPDATE exam_versions
		SET total_time_seconds = CASE WHEN $2::int > 0 THEN $2 ELSE total_time_seconds END,
		    max_score          = CASE WHEN $3::float8 > 0 THEN $3 ELSE max_score END,
		    settings           = CASE WHEN $4::bool THEN $5::jsonb ELSE settings END
		WHERE id = (SELECT current_version_id FROM exams WHERE id = $1)
	`, examID, req.TotalTimeSeconds, req.MaxScore, hasSettings, settings); err != nil {
		writeError(w, http.StatusInternalServerError, "exam version update failed")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "commit failed")
		return
	}

	pkg, _ := s.fetchExamPackage(ctx, examID)
	writeJSON(w, http.StatusOK, pkg)
}

func (s *Server) createPricingItem(w http.ResponseWriter, r *http.Request) {
	// pricing_items table was removed in migration 025.
	writeError(w, http.StatusGone, "pricing_items table has been removed")
}

func (s *Server) fetchExamPackage(ctx context.Context, examID uuid.UUID) (adminExamPackageDTO, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT e.id, e.current_version_id, e.title, e.slug, COALESCE(e.description, ''),
		       ev.status::text, ev.total_time_seconds, ev.max_score::float8, ev.settings, e.created_at
		FROM exams e
		JOIN exam_versions ev ON ev.id = e.current_version_id
		WHERE e.id = $1 AND e.deleted_at IS NULL
	`, examID)
	return scanExamPackage(row)
}

func scanExamPackage(row sqlScanner) (adminExamPackageDTO, error) {
	var pkg adminExamPackageDTO
	var id, versionID uuid.UUID
	var settings []byte
	if err := row.Scan(&id, &versionID, &pkg.Title, &pkg.Slug, &pkg.Description,
		&pkg.Status, &pkg.TotalTimeSeconds, &pkg.MaxScore, &settings, &pkg.CreatedAt); err != nil {
		return adminExamPackageDTO{}, err
	}
	pkg.ID = id.String()
	pkg.CurrentVersionID = versionID.String()
	pkg.Settings = json.RawMessage(settings)
	return pkg, nil
}

func legacyRefsForLanguages(reg interface {
	BySlug(string) *pluginhost.Manifest
}, languages []string) []string {
	out := []string{}
	for _, lang := range languages {
		slug := runnerjudge0.NormalizeLanguageSlug(lang)
		if reg == nil {
			out = append(out, "coding:"+strings.TrimPrefix(slug, "language."))
			continue
		}
		m := reg.BySlug(slug)
		if m == nil {
			continue
		}
		cfg, err := m.DecodeLanguageConfig()
		if err != nil {
			continue
		}
		if ref := runnerjudge0.LegacyItemRef(cfg); ref != "" {
			out = append(out, ref)
		}
	}
	return out
}
