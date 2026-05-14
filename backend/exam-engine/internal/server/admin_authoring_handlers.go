package server

import (
	"context"
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/originbi/exam-engine/internal/auth"
	assessmentcoding "github.com/originbi/exam-engine/plugins/assessment-coding"
	runnerjudge0 "github.com/originbi/exam-engine/plugins/runner-judge0"
)

const maxStarterBytes = 64 << 10

type adminQuestionDTO struct {
	ID                   string          `json:"id"`
	PluginID             string          `json:"pluginId"`
	PluginSlug           string          `json:"pluginSlug"`
	Title                string          `json:"title"`
	IsArchived           bool            `json:"isArchived"`
	CurrentVersionID     string          `json:"currentVersionId"`
	VersionNumber        int             `json:"versionNumber"`
	Difficulty           int             `json:"difficulty"`
	EstimatedTimeSeconds *int            `json:"estimatedTimeSeconds,omitempty"`
	Body                 json.RawMessage `json:"body"`
	MaxScore             float64         `json:"maxScore"`
	IsNegativeMarked     bool            `json:"isNegativeMarked"`
	NegativeScore        float64         `json:"negativeScore"`
	CreatedAt            time.Time       `json:"createdAt"`
}

type adminQuestionListResponse struct {
	Questions []adminQuestionDTO `json:"questions"`
}

type adminQuestionRequest struct {
	Title                string               `json:"title"`
	PluginSlug           string               `json:"plugin_slug"`
	Body                 json.RawMessage      `json:"body"`
	TestCases            []adminTestCaseInput `json:"test_cases"`
	MaxScore             float64              `json:"max_score"`
	IsNegativeMarked     bool                 `json:"is_negative_marked"`
	NegativeScore        float64              `json:"negative_score"`
	Difficulty           int                  `json:"difficulty"`
	EstimatedTimeSeconds *int                 `json:"estimated_time_seconds"`
}

type adminTestCaseInput struct {
	Name             string          `json:"name"`
	IsSample         bool            `json:"is_sample"`
	IsHidden         bool            `json:"is_hidden"`
	Weight           float64         `json:"weight"`
	Stdin            string          `json:"stdin"`
	ExpectedStdout   string          `json:"expected_stdout"`
	Comparator       string          `json:"comparator"`
	ComparatorConfig json.RawMessage `json:"comparator_config"`
}

type adminTestCaseDTO struct {
	ID                string          `json:"id"`
	QuestionVersionID string          `json:"questionVersionId"`
	Ordinal           int             `json:"ordinal"`
	Name              string          `json:"name"`
	IsSample          bool            `json:"isSample"`
	IsHidden          bool            `json:"isHidden"`
	Weight            float64         `json:"weight"`
	Stdin             string          `json:"stdin"`
	ExpectedStdout    string          `json:"expectedStdout"`
	Comparator        string          `json:"comparator"`
	ComparatorConfig  json.RawMessage `json:"comparatorConfig"`
}

type adminTestCasesResponse struct {
	TestCases []adminTestCaseDTO `json:"testCases"`
}

func (s *Server) listAdminQuestions(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	pluginSlug := strings.TrimSpace(r.URL.Query().Get("plugin_slug"))
	search := strings.TrimSpace(r.URL.Query().Get("search"))
	difficulty, _ := strconv.Atoi(strings.TrimSpace(r.URL.Query().Get("difficulty")))
	archivedRaw := strings.TrimSpace(r.URL.Query().Get("archived"))
	includeArchived := archivedRaw == "true" || archivedRaw == "1"

	rows, err := s.pool.Query(ctx, `
		SELECT q.id, q.plugin_id, p.slug, q.title, q.is_archived,
		       q.current_version_id, qv.version_number, qv.difficulty,
		       qv.estimated_time_seconds, qv.body,
		       qv.max_score::float8, qv.is_negative_marked, qv.negative_score::float8,
		       q.created_at
		FROM questions q
		JOIN plugins p ON p.id = q.plugin_id
		JOIN question_versions qv ON qv.id = q.current_version_id
		WHERE q.deleted_at IS NULL
		  AND ($1 = '' OR p.slug = $1)
		  AND ($2 = '' OR q.title ILIKE '%' || $2 || '%' OR qv.body::text ILIKE '%' || $2 || '%')
		  AND ($3 = 0 OR qv.difficulty = $3)
		  AND ($4 OR q.is_archived = false)
		ORDER BY q.created_at DESC
	`, pluginSlug, search, difficulty, includeArchived)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "question lookup failed")
		return
	}
	defer rows.Close()
	resp := adminQuestionListResponse{Questions: []adminQuestionDTO{}}
	for rows.Next() {
		q, err := scanAdminQuestion(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "question scan failed")
			return
		}
		resp.Questions = append(resp.Questions, q)
	}
	if rows.Err() != nil {
		writeError(w, http.StatusInternalServerError, "question rows failed")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) createAdminQuestion(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requireAdminPrincipal(w, r)
	if !ok {
		return
	}
	var req adminQuestionRequest
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}
	result, err := s.createQuestion(r.Context(), principal.UserID, req)
	if err != nil {
		writeAdminAuthoringErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, result)
}

func (s *Server) getAdminQuestion(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	questionID, err := uuid.Parse(chi.URLParam(r, "question_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid question_id")
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	q, err := s.fetchAdminQuestion(ctx, questionID)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "question not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "question lookup failed")
		return
	}
	writeJSON(w, http.StatusOK, q)
}

func (s *Server) updateAdminQuestion(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requireAdminPrincipal(w, r)
	if !ok {
		return
	}
	questionID, err := uuid.Parse(chi.URLParam(r, "question_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid question_id")
		return
	}
	var req adminQuestionRequest
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}
	result, err := s.publishQuestionVersion(r.Context(), principal.UserID, questionID, req)
	if err != nil {
		writeAdminAuthoringErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) deleteAdminQuestion(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requireAdminPrincipal(w, r)
	if !ok {
		return
	}
	questionID, err := uuid.Parse(chi.URLParam(r, "question_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid question_id")
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	tag, err := s.pool.Exec(ctx, `
		UPDATE questions
		SET is_archived = true, deleted_at = COALESCE(deleted_at, now())
		WHERE id = $1
	`, questionID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "question delete failed")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "question not found")
		return
	}
	_ = principal
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (s *Server) listAdminQuestionTestCases(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	questionID, err := uuid.Parse(chi.URLParam(r, "question_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid question_id")
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	tcs, err := s.testCasesForCurrentVersion(ctx, questionID)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "question not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "test case lookup failed")
		return
	}
	writeJSON(w, http.StatusOK, adminTestCasesResponse{TestCases: tcs})
}

func (s *Server) appendAdminQuestionTestCase(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requireAdminPrincipal(w, r)
	if !ok {
		return
	}
	questionID, err := uuid.Parse(chi.URLParam(r, "question_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid question_id")
		return
	}
	var req adminTestCaseInput
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	tc, err := s.appendTestCase(ctx, questionID, req)
	if err != nil {
		writeAdminAuthoringErr(w, err)
		return
	}
	_ = principal
	writeJSON(w, http.StatusCreated, tc)
}

func (s *Server) updateAdminQuestionTestCase(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	questionID, err := uuid.Parse(chi.URLParam(r, "question_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid question_id")
		return
	}
	tcID, err := uuid.Parse(chi.URLParam(r, "tc_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid test case id")
		return
	}
	var req adminTestCaseInput
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	tc, err := s.updateTestCase(ctx, questionID, tcID, req)
	if err != nil {
		writeAdminAuthoringErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, tc)
}

func (s *Server) deleteAdminQuestionTestCase(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}
	questionID, err := uuid.Parse(chi.URLParam(r, "question_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid question_id")
		return
	}
	tcID, err := uuid.Parse(chi.URLParam(r, "tc_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid test case id")
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	versionID, err := s.currentQuestionVersionID(ctx, questionID)
	if err != nil {
		writeAdminAuthoringErr(w, err)
		return
	}
	tag, err := s.pool.Exec(ctx, `
		DELETE FROM question_test_cases
		WHERE id = $1 AND question_version_id = $2
	`, tcID, versionID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "test case delete failed")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "test case not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (s *Server) bulkImportAdminQuestions(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requireAdminPrincipal(w, r)
	if !ok {
		return
	}
	imports, err := decodeQuestionImports(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if len(imports) == 0 {
		writeError(w, http.StatusBadRequest, "no rows to import")
		return
	}
	type rowErr struct {
		Row   int    `json:"row"`
		Error string `json:"error"`
	}
	errs := []rowErr{}
	for i, req := range imports {
		if err := s.validateQuestionRequest(req); err != nil {
			errs = append(errs, rowErr{Row: i + 1, Error: err.Error()})
		}
	}
	if len(errs) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": errs})
		return
	}
	created := []map[string]any{}
	for _, req := range imports {
		result, err := s.createQuestion(r.Context(), principal.UserID, req)
		if err != nil {
			writeAdminAuthoringErr(w, err)
			return
		}
		created = append(created, result)
	}
	writeJSON(w, http.StatusCreated, map[string]any{"created": created})
}

func (s *Server) createQuestion(ctxParent context.Context, userID int64, req adminQuestionRequest) (map[string]any, error) {
	ctx, cancel := contextWithTimeout(ctxParent, 10*time.Second)
	defer cancel()
	req = normalizeQuestionRequest(req)
	if err := s.validateQuestionRequest(req); err != nil {
		return nil, err
	}
	pluginID := s.plugins.BySlug(req.PluginSlug).ID
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	questionID := uuid.New()
	versionID := uuid.New()
	if _, err := tx.Exec(ctx, `
		INSERT INTO questions (id, org_id, plugin_id, created_by, title)
		VALUES ($1, $2, $3, $4, $5)
	`, questionID, s.systemOrgID(), pluginID, userID, strings.TrimSpace(req.Title)); err != nil {
		return nil, err
	}
	if err := insertQuestionVersion(ctx, tx, versionID, questionID, 1, userID, req); err != nil {
		return nil, err
	}
	if err := insertQuestionTestCases(ctx, tx, versionID, req.TestCases); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE questions SET current_version_id = $2 WHERE id = $1
	`, questionID, versionID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return map[string]any{
		"id":                 questionID.String(),
		"current_version_id": versionID.String(),
		"version_number":     1,
	}, nil
}

func (s *Server) publishQuestionVersion(ctxParent context.Context, userID int64, questionID uuid.UUID, req adminQuestionRequest) (map[string]any, error) {
	ctx, cancel := contextWithTimeout(ctxParent, 10*time.Second)
	defer cancel()
	req = normalizeQuestionRequest(req)
	if err := s.validateQuestionRequest(req); err != nil {
		return nil, err
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var versionNumber int
	if err := tx.QueryRow(ctx, `
		SELECT COALESCE(MAX(version_number), 0) + 1
		FROM question_versions
		WHERE question_id = $1
	`, questionID).Scan(&versionNumber); err != nil {
		return nil, err
	}
	if versionNumber == 1 {
		return nil, pgx.ErrNoRows
	}
	versionID := uuid.New()
	if err := insertQuestionVersion(ctx, tx, versionID, questionID, versionNumber, userID, req); err != nil {
		return nil, err
	}
	if err := insertQuestionTestCases(ctx, tx, versionID, req.TestCases); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE questions
		SET title = $2, current_version_id = $3
		WHERE id = $1
	`, questionID, strings.TrimSpace(req.Title), versionID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return map[string]any{
		"id":                 questionID.String(),
		"current_version_id": versionID.String(),
		"version_number":     versionNumber,
	}, nil
}

func (s *Server) validateQuestionRequest(req adminQuestionRequest) error {
	if s.plugins == nil {
		return errors.New("plugin registry unavailable")
	}
	if strings.TrimSpace(req.Title) == "" {
		return errors.New("title is required")
	}
	if strings.TrimSpace(req.PluginSlug) == "" {
		req.PluginSlug = assessmentcoding.Slug
	}
	m := s.plugins.BySlug(req.PluginSlug)
	if m == nil {
		return fmt.Errorf("plugin %s is not installed", req.PluginSlug)
	}
	if req.Difficulty < 1 || req.Difficulty > 5 {
		return errors.New("difficulty must be between 1 and 5")
	}
	if len(req.Body) == 0 {
		return errors.New("body is required")
	}
	if req.PluginSlug == assessmentcoding.Slug {
		if err := assessmentcoding.ValidateQuestionBody(req.Body, assessmentcoding.AuthoringContext{
			IsKnownLanguage: func(slug string) bool {
				m := s.plugins.BySlug(runnerjudge0.NormalizeLanguageSlug(slug))
				return m != nil && m.IsLanguage()
			},
			MaxStarterBytes: maxStarterBytes,
		}); err != nil {
			return err
		}
	}
	for i, tc := range req.TestCases {
		if tc.Weight < 0 {
			return fmt.Errorf("test_cases[%d].weight must be >= 0", i)
		}
		if strings.TrimSpace(tc.Comparator) == "" {
			continue
		}
		switch strings.ToLower(strings.TrimSpace(tc.Comparator)) {
		case "trim_equal", "strict", "json", "regex", "custom_checker":
		default:
			return fmt.Errorf("test_cases[%d].comparator is invalid", i)
		}
	}
	return nil
}

func normalizeQuestionRequest(req adminQuestionRequest) adminQuestionRequest {
	req.Title = strings.TrimSpace(req.Title)
	req.PluginSlug = strings.TrimSpace(req.PluginSlug)
	if req.PluginSlug == "" {
		req.PluginSlug = assessmentcoding.Slug
	}
	if req.Difficulty == 0 {
		req.Difficulty = 1
	}
	return req
}

func insertQuestionVersion(ctx context.Context, tx pgx.Tx, versionID uuid.UUID, questionID uuid.UUID, versionNumber int, userID int64, req adminQuestionRequest) error {
	difficulty := req.Difficulty
	if difficulty == 0 {
		difficulty = 1
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO question_versions (
		    id, question_id, version_number, difficulty, estimated_time_seconds,
		    body, max_score, is_negative_marked, negative_score, created_by
		)
		VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
	`, versionID, questionID, versionNumber, difficulty, req.EstimatedTimeSeconds,
		[]byte(req.Body), req.MaxScore, req.IsNegativeMarked, req.NegativeScore, userID); err != nil {
		return err
	}
	return nil
}

func insertQuestionTestCases(ctx context.Context, tx pgx.Tx, versionID uuid.UUID, cases []adminTestCaseInput) error {
	for i, tc := range cases {
		comparator := strings.ToLower(strings.TrimSpace(tc.Comparator))
		if comparator == "" {
			comparator = "trim_equal"
		}
		config := tc.ComparatorConfig
		if len(config) == 0 {
			config = json.RawMessage("{}")
		}
		weight := tc.Weight
		if weight == 0 {
			weight = 1
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO question_test_cases (
			    id, question_version_id, ordinal, name, is_sample, is_hidden,
			    weight, stdin, expected_stdout, comparator, comparator_config
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
		`, uuid.New(), versionID, i+1, nullEmpty(tc.Name), tc.IsSample, tc.IsHidden,
			weight, tc.Stdin, tc.ExpectedStdout, comparator, []byte(config)); err != nil {
			return err
		}
	}
	return nil
}

type sqlScanner interface {
	Scan(dest ...any) error
}

func scanAdminQuestion(row sqlScanner) (adminQuestionDTO, error) {
	var q adminQuestionDTO
	var id, pluginID, versionID uuid.UUID
	var estimated sql.NullInt32
	var body []byte
	if err := row.Scan(
		&id, &pluginID, &q.PluginSlug, &q.Title, &q.IsArchived,
		&versionID, &q.VersionNumber, &q.Difficulty,
		&estimated, &body, &q.MaxScore, &q.IsNegativeMarked, &q.NegativeScore, &q.CreatedAt,
	); err != nil {
		return adminQuestionDTO{}, err
	}
	q.ID = id.String()
	q.PluginID = pluginID.String()
	q.CurrentVersionID = versionID.String()
	if estimated.Valid {
		v := int(estimated.Int32)
		q.EstimatedTimeSeconds = &v
	}
	q.Body = json.RawMessage(body)
	return q, nil
}

func (s *Server) fetchAdminQuestion(ctx context.Context, questionID uuid.UUID) (adminQuestionDTO, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT q.id, q.plugin_id, p.slug, q.title, q.is_archived,
		       q.current_version_id, qv.version_number, qv.difficulty,
		       qv.estimated_time_seconds, qv.body,
		       qv.max_score::float8, qv.is_negative_marked, qv.negative_score::float8,
		       q.created_at
		FROM questions q
		JOIN plugins p ON p.id = q.plugin_id
		JOIN question_versions qv ON qv.id = q.current_version_id
		WHERE q.id = $1 AND q.deleted_at IS NULL
	`, questionID)
	return scanAdminQuestion(row)
}

func (s *Server) currentQuestionVersionID(ctx context.Context, questionID uuid.UUID) (uuid.UUID, error) {
	var versionID uuid.UUID
	err := s.pool.QueryRow(ctx, `
		SELECT current_version_id
		FROM questions
		WHERE id = $1 AND deleted_at IS NULL
	`, questionID).Scan(&versionID)
	return versionID, err
}

func (s *Server) testCasesForCurrentVersion(ctx context.Context, questionID uuid.UUID) ([]adminTestCaseDTO, error) {
	versionID, err := s.currentQuestionVersionID(ctx, questionID)
	if err != nil {
		return nil, err
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, question_version_id, ordinal, COALESCE(name, ''), is_sample, is_hidden,
		       weight::float8, stdin, expected_stdout, comparator, comparator_config
		FROM question_test_cases
		WHERE question_version_id = $1
		ORDER BY ordinal
	`, versionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []adminTestCaseDTO{}
	for rows.Next() {
		tc, err := scanAdminTestCase(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, tc)
	}
	return out, rows.Err()
}

func scanAdminTestCase(row sqlScanner) (adminTestCaseDTO, error) {
	var tc adminTestCaseDTO
	var id, versionID uuid.UUID
	var config []byte
	if err := row.Scan(
		&id, &versionID, &tc.Ordinal, &tc.Name, &tc.IsSample, &tc.IsHidden,
		&tc.Weight, &tc.Stdin, &tc.ExpectedStdout, &tc.Comparator, &config,
	); err != nil {
		return adminTestCaseDTO{}, err
	}
	tc.ID = id.String()
	tc.QuestionVersionID = versionID.String()
	tc.ComparatorConfig = json.RawMessage(config)
	return tc, nil
}

func (s *Server) appendTestCase(ctx context.Context, questionID uuid.UUID, req adminTestCaseInput) (adminTestCaseDTO, error) {
	versionID, err := s.currentQuestionVersionID(ctx, questionID)
	if err != nil {
		return adminTestCaseDTO{}, err
	}
	comparator := strings.ToLower(strings.TrimSpace(req.Comparator))
	if comparator == "" {
		comparator = "trim_equal"
	}
	config := req.ComparatorConfig
	if len(config) == 0 {
		config = json.RawMessage("{}")
	}
	weight := req.Weight
	if weight == 0 {
		weight = 1
	}
	row := s.pool.QueryRow(ctx, `
		INSERT INTO question_test_cases (
		    id, question_version_id, ordinal, name, is_sample, is_hidden,
		    weight, stdin, expected_stdout, comparator, comparator_config
		)
		SELECT $1, $2, COALESCE(MAX(ordinal), 0) + 1, $3, $4, $5, $6, $7, $8, $9, $10::jsonb
		FROM question_test_cases WHERE question_version_id = $2
		RETURNING id, question_version_id, ordinal, COALESCE(name, ''), is_sample, is_hidden,
		          weight::float8, stdin, expected_stdout, comparator, comparator_config
	`, uuid.New(), versionID, nullEmpty(req.Name), req.IsSample, req.IsHidden, weight,
		req.Stdin, req.ExpectedStdout, comparator, []byte(config))
	return scanAdminTestCase(row)
}

func (s *Server) updateTestCase(ctx context.Context, questionID uuid.UUID, tcID uuid.UUID, req adminTestCaseInput) (adminTestCaseDTO, error) {
	versionID, err := s.currentQuestionVersionID(ctx, questionID)
	if err != nil {
		return adminTestCaseDTO{}, err
	}
	comparator := strings.ToLower(strings.TrimSpace(req.Comparator))
	if comparator == "" {
		comparator = "trim_equal"
	}
	config := req.ComparatorConfig
	if len(config) == 0 {
		config = json.RawMessage("{}")
	}
	weight := req.Weight
	if weight == 0 {
		weight = 1
	}
	row := s.pool.QueryRow(ctx, `
		UPDATE question_test_cases
		SET name = $3, is_sample = $4, is_hidden = $5, weight = $6,
		    stdin = $7, expected_stdout = $8, comparator = $9, comparator_config = $10::jsonb
		WHERE id = $1 AND question_version_id = $2
		RETURNING id, question_version_id, ordinal, COALESCE(name, ''), is_sample, is_hidden,
		          weight::float8, stdin, expected_stdout, comparator, comparator_config
	`, tcID, versionID, nullEmpty(req.Name), req.IsSample, req.IsHidden, weight,
		req.Stdin, req.ExpectedStdout, comparator, []byte(config))
	return scanAdminTestCase(row)
}

func decodeQuestionImports(r *http.Request) ([]adminQuestionRequest, error) {
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/") {
		if err := r.ParseMultipartForm(maxRuntimeBodyBytes); err != nil {
			return nil, err
		}
		file, header, err := firstMultipartFile(r.MultipartForm)
		if err != nil {
			return nil, err
		}
		defer file.Close()
		if strings.HasSuffix(strings.ToLower(header.Filename), ".csv") {
			return decodeQuestionCSV(file)
		}
		return decodeQuestionJSON(file)
	}
	r.Body = http.MaxBytesReader(nilResponseWriter{}, r.Body, maxRuntimeBodyBytes)
	return decodeQuestionJSON(r.Body)
}

func firstMultipartFile(form *multipart.Form) (multipart.File, *multipart.FileHeader, error) {
	if form == nil {
		return nil, nil, errors.New("multipart form is empty")
	}
	for _, files := range form.File {
		if len(files) == 0 {
			continue
		}
		f, err := files[0].Open()
		return f, files[0], err
	}
	return nil, nil, errors.New("file is required")
}

func decodeQuestionJSON(r io.Reader) ([]adminQuestionRequest, error) {
	var wrapper struct {
		Questions []adminQuestionRequest `json:"questions"`
	}
	raw, err := io.ReadAll(io.LimitReader(r, maxRuntimeBodyBytes))
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &wrapper); err == nil && len(wrapper.Questions) > 0 {
		return wrapper.Questions, nil
	}
	var rows []adminQuestionRequest
	if err := json.Unmarshal(raw, &rows); err != nil {
		return nil, err
	}
	return rows, nil
}

func decodeQuestionCSV(r io.Reader) ([]adminQuestionRequest, error) {
	cr := csv.NewReader(r)
	cr.TrimLeadingSpace = true
	records, err := cr.ReadAll()
	if err != nil {
		return nil, err
	}
	if len(records) < 2 {
		return nil, errors.New("csv requires header and at least one row")
	}
	headers := map[string]int{}
	for i, h := range records[0] {
		headers[strings.ToLower(strings.TrimSpace(h))] = i
	}
	get := func(row []string, name string) string {
		i, ok := headers[name]
		if !ok || i >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[i])
	}
	out := []adminQuestionRequest{}
	for _, row := range records[1:] {
		title := get(row, "title")
		prompt := get(row, "prompt")
		difficulty, _ := strconv.Atoi(get(row, "difficulty"))
		maxScore, _ := strconv.ParseFloat(get(row, "max_score"), 64)
		langs := []string{}
		for _, lang := range strings.FieldsFunc(get(row, "allowed_languages"), func(r rune) bool { return r == ';' || r == ',' }) {
			if strings.TrimSpace(lang) != "" {
				langs = append(langs, runnerjudge0.NormalizeLanguageSlug(lang))
			}
		}
		body, _ := json.Marshal(assessmentcoding.QuestionBody{
			Type:             "coding",
			ResponseType:     "code",
			Title:            title,
			Prompt:           prompt,
			PromptFormat:     assessmentcoding.PromptFormatMarkdown,
			AllowedLanguages: langs,
		})
		out = append(out, adminQuestionRequest{
			Title:      title,
			PluginSlug: assessmentcoding.Slug,
			Body:       body,
			Difficulty: difficulty,
			MaxScore:   maxScore,
		})
	}
	return out, nil
}

type nilResponseWriter struct{}

func (nilResponseWriter) Header() http.Header       { return http.Header{} }
func (nilResponseWriter) Write([]byte) (int, error) { return 0, nil }
func (nilResponseWriter) WriteHeader(int)           {}

func (s *Server) requireAdmin(w http.ResponseWriter, r *http.Request) bool {
	_, ok := s.requireAdminPrincipal(w, r)
	return ok
}

func (s *Server) requireAdminPrincipal(w http.ResponseWriter, r *http.Request) (*auth.Principal, bool) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return nil, false
	}
	if !s.isAdmin(r.Context(), principal.UserID) {
		writeError(w, http.StatusForbidden, "admin required")
		return nil, false
	}
	return &principal, true
}

func writeAdminAuthoringErr(w http.ResponseWriter, err error) {
	var validationErrs assessmentcoding.ValidationErrors
	switch {
	case errors.As(err, &validationErrs):
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": validationErrs})
	case errors.Is(err, pgx.ErrNoRows):
		writeError(w, http.StatusNotFound, "not found")
	default:
		writeError(w, http.StatusBadRequest, err.Error())
	}
}

func (s *Server) systemOrgID() string {
	if strings.TrimSpace(s.defaultOrgID) != "" {
		return s.defaultOrgID
	}
	return systemOrgID
}

var languageSlugPattern = regexp.MustCompile(`^language\.[a-z][a-z0-9-]*$`)
