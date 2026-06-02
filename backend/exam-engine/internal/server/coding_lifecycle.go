package server

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/originbi/exam-engine/internal/auth"
	"github.com/originbi/exam-engine/internal/pluginhost"
)

// These fall back to the well-known seed IDs when the dynamic lookup finds no
// coding exam version (fresh DB, or sections not wired to the coding plugin).
const (
	codingExamVersionFallback = "00000000-0000-0000-0000-000000000601"
	systemOrgFallback         = "00000000-0000-0000-0000-000000000001"
)

// certPassPercent is the threshold (inclusive) at or above which an evaluated
// attempt earns a certificate. Configurable via CERT_PASS_PERCENT.
func certPassPercent() float64 {
	if v := strings.TrimSpace(os.Getenv("CERT_PASS_PERCENT")); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil && f > 0 {
			return f
		}
	}
	return 90
}

// ─── Availability catalog ───────────────────────────────────────────────────

type codingLanguageDTO struct {
	ID            string `json:"id"`   // bare id, e.g. "python"
	Slug          string `json:"slug"` // plugin slug, e.g. "language.python"
	AssignmentRef string `json:"assignmentRef"`
	DisplayName   string `json:"displayName"`
	Available     bool   `json:"available"`
	Reason        string `json:"reason,omitempty"`
	QuestionCount int    `json:"questionCount"`
	Entitled      bool   `json:"entitled"`
}

type codingCatalogResponse struct {
	Languages []codingLanguageDTO `json:"languages"`
}

// bareLangFromSlug turns "language.python" → "python".
func bareLangFromSlug(slug string) string {
	return strings.TrimPrefix(slug, "language.")
}

// codingLanguageAvailability dry-runs the question builder for a language slug
// and reports whether enough questions exist to satisfy its configuration.
// A language is "available now" only when the bank can actually deliver a
// non-empty question set — this is what gates a student from paying for a
// language that has no questions wired.
func (s *Server) codingLanguageAvailability(ctx context.Context, slug string) (available bool, reason string, count int) {
	if s.plugins == nil {
		return false, "plugin registry unavailable", 0
	}
	if s.plugins.BySlug(slug) == nil {
		return false, "language not installed", 0
	}
	if ok, err := s.plugins.IsPluginAvailable(ctx, slug); err != nil {
		return false, "availability lookup failed", 0
	} else if !ok {
		return false, "language disabled by admin", 0
	}
	picked, _, err := s.pickCodingQuestions(ctx, s.pool, slug)
	if err != nil {
		if strings.Contains(err.Error(), "under-stocked") {
			return false, "question bank not configured for this language yet", 0
		}
		return false, "question bank lookup failed", 0
	}
	if len(picked) == 0 {
		return false, "no questions available for this language yet", 0
	}
	return true, "", len(picked)
}

// codingCatalog lists every installed language plugin with a live availability
// flag. The candidate UI uses `available` to gate the pay/start buttons.
func (s *Server) codingCatalog(w http.ResponseWriter, r *http.Request) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	if s.plugins == nil {
		writeError(w, http.StatusServiceUnavailable, "plugin registry unavailable")
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	entitled := map[string]bool{}
	if ents, err := s.plugins.UserLanguagePlugins(ctx, principal.UserID); err == nil {
		for _, e := range ents {
			entitled[e.Plugin.Slug] = true
		}
	}

	resp := codingCatalogResponse{Languages: []codingLanguageDTO{}}
	for _, m := range s.plugins.ByCategory(pluginhost.CategoryLanguage) {
		available, reason, count := s.codingLanguageAvailability(ctx, m.Slug)
		display := bareLangFromSlug(m.Slug)
		if cfg, err := m.DecodeLanguageConfig(); err == nil && cfg.DisplayName != "" {
			display = cfg.DisplayName
		}
		resp.Languages = append(resp.Languages, codingLanguageDTO{
			ID:            bareLangFromSlug(m.Slug),
			Slug:          m.Slug,
			AssignmentRef: "coding:" + bareLangFromSlug(m.Slug),
			DisplayName:   display,
			Available:     available,
			Reason:        reason,
			QuestionCount: count,
			Entitled:      entitled[m.Slug],
		})
	}
	writeJSON(w, http.StatusOK, resp)
}

// ─── Purchase → assignment (consolidated source of truth) ────────────────────

type purchaseCodingRequest struct {
	Language string `json:"language"`
}

type purchaseCodingResponse struct {
	Assignment assignmentDTO `json:"assignment"`
}

// resolveCodingExamVersion finds the coding exam version (and its owning org)
// dynamically, falling back to the well-known seed IDs.
func (s *Server) resolveCodingExamVersion(ctx context.Context) (uuid.UUID, string) {
	var evID uuid.UUID
	var orgID string
	err := s.pool.QueryRow(ctx, `
		SELECT ev.id, COALESCE(e.org_id::text, '')
		FROM exam_versions ev
		JOIN exams e ON e.id = ev.exam_id
		JOIN exam_sections es ON es.exam_version_id = ev.id
		JOIN plugins p ON p.id = es.plugin_id
		WHERE p.slug = 'assessment.coding'
		ORDER BY (ev.status = 'published') DESC, ev.created_at DESC
		LIMIT 1
	`).Scan(&evID, &orgID)
	if err != nil || evID == uuid.Nil {
		evID = uuid.MustParse(codingExamVersionFallback)
	}
	if strings.TrimSpace(orgID) == "" {
		if strings.TrimSpace(s.defaultOrgID) != "" {
			orgID = s.defaultOrgID
		} else {
			orgID = systemOrgFallback
		}
	}
	return evID, orgID
}

// purchaseCoding grants (or re-activates) a coding assignment for the
// authenticated user in one place — the engine — instead of relying on a
// cross-service INSERT with a hardcoded exam-version UUID. The frontend calls
// this after the payment modal succeeds (or immediately for free/admin users).
func (s *Server) purchaseCoding(w http.ResponseWriter, r *http.Request) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	var req purchaseCodingRequest
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}
	lang := strings.ToLower(strings.TrimSpace(req.Language))
	lang = strings.TrimPrefix(lang, "coding:")
	lang = bareLangFromSlug(lang)
	if lang == "" {
		writeError(w, http.StatusBadRequest, "language is required")
		return
	}
	slug := "language." + lang
	assignmentRef := "coding:" + lang

	ctx, cancel := contextWithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	// Hard gate: a student may only obtain a language whose questions are
	// actually available per its configuration.
	available, reason, _ := s.codingLanguageAvailability(ctx, slug)
	if !available {
		writeJSON(w, http.StatusConflict, map[string]string{
			"error":    "language not available",
			"language": lang,
			"reason":   reason,
		})
		return
	}

	examVersionID, orgID := s.resolveCodingExamVersion(ctx)

	id := uuid.New()
	var assignmentID uuid.UUID
	err = s.pool.QueryRow(ctx, `
		INSERT INTO exam_assignments (
		    id, exam_version_id, candidate_user_id, assigned_by, assigned_org_id,
		    available_from, available_until, max_attempts, status,
		    assignment_ref, metadata
		)
		VALUES ($1, $2, $3, $3, $4, now(), NULL, 3, 'active', $5,
		        jsonb_build_object('language', $6::text))
		ON CONFLICT (candidate_user_id, assignment_ref)
		    WHERE assignment_ref IS NOT NULL AND status <> 'revoked'
		DO UPDATE
		SET status = 'active',
		    available_from = COALESCE(exam_assignments.available_from, EXCLUDED.available_from),
		    available_until = NULL
		RETURNING id
	`, id, examVersionID, principal.UserID, orgID, assignmentRef, lang).Scan(&assignmentID)
	if err != nil {
		s.logger.Error("coding purchase upsert failed",
			"userId", principal.UserID, "language", lang, "err", err.Error())
		writeError(w, http.StatusInternalServerError, "failed to grant coding access")
		return
	}

	writeJSON(w, http.StatusOK, purchaseCodingResponse{
		Assignment: assignmentDTO{
			ID:            assignmentID.String(),
			AssignmentRef: assignmentRef,
			ItemRef:       assignmentRef,
			Status:        "active",
			ExamVersionID: examVersionID.String(),
		},
	})
}

// ─── Results (dashboard performance) ─────────────────────────────────────────

type resultQuestionDTO struct {
	Ordinal    int     `json:"ordinal"`
	Title      string  `json:"title"`
	Score      float64 `json:"score"`
	MaxScore   float64 `json:"maxScore"`
	TestsTotal int     `json:"testsTotal"`
	TestsPass  int     `json:"testsPassed"`
}

type resultDTO struct {
	AttemptID        string              `json:"attemptId"`
	AssignmentRef    string              `json:"assignmentRef"`
	Language         string              `json:"language"`
	Status           string              `json:"status"`
	Score            float64             `json:"score"`
	MaxScore         float64             `json:"maxScore"`
	Percentage       float64             `json:"percentage"`
	Passed           bool                `json:"passed"`
	SubmittedAt      *time.Time          `json:"submittedAt,omitempty"`
	CertificateSerial string             `json:"certificateSerial,omitempty"`
	Questions        []resultQuestionDTO `json:"questions"`
}

type resultsResponse struct {
	PassPercent float64     `json:"passPercent"`
	Results     []resultDTO `json:"results"`
}

// meResults returns the latest meaningful attempt per coding assignment with a
// real, graded score and per-question test breakdown. This is what the student
// dashboard renders as "your performance".
func (s *Server) meResults(w http.ResponseWriter, r *http.Request) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	rows, err := s.pool.Query(ctx, `
		SELECT DISTINCT ON (at.assignment_id)
		       at.id, COALESCE(a.assignment_ref, ''), at.status::text,
		       COALESCE(at.final_score, 0)::float8, at.submitted_at
		FROM attempts at
		JOIN exam_assignments a ON a.id = at.assignment_id
		WHERE at.candidate_user_id = $1
		  AND at.status IN ('submitted','under_review','evaluated','published')
		ORDER BY at.assignment_id, at.created_at DESC
	`, principal.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "results lookup failed")
		return
	}
	defer rows.Close()

	type rawResult struct {
		attemptID     uuid.UUID
		assignmentRef string
		status        string
		score         float64
		submittedAt   sql.NullTime
	}
	raws := []rawResult{}
	for rows.Next() {
		var rr rawResult
		if err := rows.Scan(&rr.attemptID, &rr.assignmentRef, &rr.status, &rr.score, &rr.submittedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "results scan failed")
			return
		}
		raws = append(raws, rr)
	}
	if rows.Err() != nil {
		writeError(w, http.StatusInternalServerError, "results rows failed")
		return
	}

	pass := certPassPercent()
	resp := resultsResponse{PassPercent: pass, Results: []resultDTO{}}
	for _, rr := range raws {
		questions, maxScore := s.resultQuestions(ctx, rr.attemptID)
		percentage := 0.0
		if maxScore > 0 {
			percentage = (rr.score / maxScore) * 100
		}
		serial, _ := s.certificateSerialForAttempt(ctx, rr.attemptID)
		resp.Results = append(resp.Results, resultDTO{
			AttemptID:         rr.attemptID.String(),
			AssignmentRef:     rr.assignmentRef,
			Language:          strings.TrimPrefix(rr.assignmentRef, "coding:"),
			Status:            rr.status,
			Score:             rr.score,
			MaxScore:          maxScore,
			Percentage:        percentage,
			Passed:            percentage >= pass,
			SubmittedAt:       nullTimePtr(rr.submittedAt),
			CertificateSerial: serial,
			Questions:         questions,
		})
	}
	writeJSON(w, http.StatusOK, resp)
}

// resultQuestions returns the per-question breakdown for an attempt plus the
// total possible score across the attempt's questions.
func (s *Server) resultQuestions(ctx context.Context, attemptID uuid.UUID) ([]resultQuestionDTO, float64) {
	rows, err := s.pool.Query(ctx, `
		SELECT eq.ordinal,
		       q.title,
		       COALESCE(eq.score_override, qv.max_score)::float8 AS max_score,
		       COALESCE(ans.final_score, 0)::float8 AS score,
		       COALESCE((
		           SELECT COUNT(*) FROM code_run_test_results rtr
		           JOIN code_runs cr ON cr.id = rtr.code_run_id
		           WHERE cr.answer_id = ans.id AND cr.mode = 'final'
		       ), 0) AS tests_total,
		       COALESCE((
		           SELECT COUNT(*) FROM code_run_test_results rtr
		           JOIN code_runs cr ON cr.id = rtr.code_run_id
		           WHERE cr.answer_id = ans.id AND cr.mode = 'final' AND rtr.passed
		       ), 0) AS tests_passed
		FROM exam_questions eq
		JOIN question_versions qv ON qv.id = eq.question_version_id
		JOIN questions q ON q.id = qv.question_id
		LEFT JOIN answers ans ON ans.exam_question_id = eq.id AND ans.attempt_id = $1
		WHERE eq.attempt_built_for = $1
		ORDER BY eq.ordinal
	`, attemptID)
	if err != nil {
		return []resultQuestionDTO{}, 0
	}
	defer rows.Close()
	out := []resultQuestionDTO{}
	total := 0.0
	for rows.Next() {
		var q resultQuestionDTO
		if err := rows.Scan(&q.Ordinal, &q.Title, &q.MaxScore, &q.Score, &q.TestsTotal, &q.TestsPass); err != nil {
			return out, total
		}
		total += q.MaxScore
		out = append(out, q)
	}
	return out, total
}

// attemptMaxScore sums the possible score across an attempt's questions.
func (s *Server) attemptMaxScore(ctx context.Context, attemptID uuid.UUID) (float64, error) {
	var total float64
	err := s.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(COALESCE(eq.score_override, qv.max_score)), 0)::float8
		FROM exam_questions eq
		JOIN question_versions qv ON qv.id = eq.question_version_id
		WHERE eq.attempt_built_for = $1
	`, attemptID).Scan(&total)
	return total, err
}

// ─── Certificates ────────────────────────────────────────────────────────────

type certificateDTO struct {
	Serial        string    `json:"serial"`
	AttemptID     string    `json:"attemptId"`
	AssignmentRef string    `json:"assignmentRef"`
	Language      string    `json:"language"`
	CandidateName string    `json:"candidateName"`
	Score         float64   `json:"score"`
	MaxScore      float64   `json:"maxScore"`
	Percentage    float64   `json:"percentage"`
	IssuedAt      time.Time `json:"issuedAt"`
}

func newCertificateSerial() string {
	b := make([]byte, 5)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("OBI-%d", time.Now().UnixNano())
	}
	return "OBI-" + strconv.Itoa(time.Now().Year()) + "-" + strings.ToUpper(hex.EncodeToString(b))
}

// maybeIssueCertificate issues (idempotently) a certificate when an attempt's
// graded percentage meets the pass threshold. Safe to call more than once.
func (s *Server) maybeIssueCertificate(ctx context.Context, attemptID uuid.UUID, userID int64, finalScore float64) {
	maxScore, err := s.attemptMaxScore(ctx, attemptID)
	if err != nil || maxScore <= 0 {
		return
	}
	percentage := (finalScore / maxScore) * 100
	if percentage < certPassPercent() {
		return
	}

	var assignmentRef, candidateName string
	_ = s.pool.QueryRow(ctx, `
		SELECT COALESCE(a.assignment_ref, ''),
		       COALESCE(reg.full_name, u.email, '')
		FROM attempts at
		JOIN exam_assignments a ON a.id = at.assignment_id
		JOIN users u ON u.id = at.candidate_user_id
		LEFT JOIN registrations reg ON reg.user_id = u.id AND COALESCE(reg.is_deleted, false) = false
		WHERE at.id = $1
		ORDER BY reg.id DESC
		LIMIT 1
	`, attemptID).Scan(&assignmentRef, &candidateName)
	language := strings.TrimPrefix(assignmentRef, "coding:")

	if _, err := s.pool.Exec(ctx, `
		INSERT INTO certificates (
		    serial, attempt_id, candidate_user_id, assignment_ref, language,
		    candidate_name, score, max_score, percentage
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (attempt_id) DO NOTHING
	`, newCertificateSerial(), attemptID, userID, assignmentRef, language,
		candidateName, finalScore, maxScore, percentage); err != nil {
		s.logger.Error("certificate issue failed", "attempt_id", attemptID, "err", err.Error())
	}
}

func (s *Server) certificateSerialForAttempt(ctx context.Context, attemptID uuid.UUID) (string, error) {
	var serial string
	err := s.pool.QueryRow(ctx, `SELECT serial FROM certificates WHERE attempt_id = $1`, attemptID).Scan(&serial)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return serial, err
}

// meCertificates lists the authenticated user's certificates.
func (s *Server) meCertificates(w http.ResponseWriter, r *http.Request) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	rows, err := s.pool.Query(ctx, `
		SELECT serial, attempt_id, COALESCE(assignment_ref,''), COALESCE(language,''),
		       COALESCE(candidate_name,''), score::float8, max_score::float8,
		       percentage::float8, issued_at
		FROM certificates
		WHERE candidate_user_id = $1
		ORDER BY issued_at DESC
	`, principal.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "certificate lookup failed")
		return
	}
	defer rows.Close()
	out := []certificateDTO{}
	for rows.Next() {
		var c certificateDTO
		var attemptID uuid.UUID
		if err := rows.Scan(&c.Serial, &attemptID, &c.AssignmentRef, &c.Language,
			&c.CandidateName, &c.Score, &c.MaxScore, &c.Percentage, &c.IssuedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "certificate scan failed")
			return
		}
		c.AttemptID = attemptID.String()
		out = append(out, c)
	}
	writeJSON(w, http.StatusOK, map[string]any{"certificates": out})
}

// verifyCertificate is the public verification endpoint for a certificate
// serial. No auth — anyone with the serial can confirm authenticity.
func (s *Server) verifyCertificate(w http.ResponseWriter, r *http.Request) {
	serial := strings.TrimSpace(chi.URLParam(r, "serial"))
	if serial == "" {
		writeError(w, http.StatusBadRequest, "serial required")
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	var c certificateDTO
	var attemptID uuid.UUID
	err := s.pool.QueryRow(ctx, `
		SELECT serial, attempt_id, COALESCE(assignment_ref,''), COALESCE(language,''),
		       COALESCE(candidate_name,''), score::float8, max_score::float8,
		       percentage::float8, issued_at
		FROM certificates WHERE serial = $1
	`, serial).Scan(&c.Serial, &attemptID, &c.AssignmentRef, &c.Language,
		&c.CandidateName, &c.Score, &c.MaxScore, &c.Percentage, &c.IssuedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		writeJSON(w, http.StatusNotFound, map[string]any{"valid": false})
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "verification failed")
		return
	}
	c.AttemptID = attemptID.String()
	writeJSON(w, http.StatusOK, map[string]any{"valid": true, "certificate": c})
}
