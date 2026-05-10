package server

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/originbi/exam-engine/internal/auth"
)

type attemptDTO struct {
	ID              string     `json:"id"`
	AssignmentID    string     `json:"assignmentId"`
	ExamVersionID   string     `json:"examVersionId"`
	Status          string     `json:"status"`
	StartedAt       *time.Time `json:"startedAt,omitempty"`
	SubmittedAt     *time.Time `json:"submittedAt,omitempty"`
	DeadlineAt      *time.Time `json:"deadlineAt,omitempty"`
	TimeRemainingMs int        `json:"timeRemainingMs"`
}

type startAttemptRequest struct {
	AssignmentID  string `json:"assignmentId"`
	AssignmentRef string `json:"assignmentRef"`
}

type snapshotQuestionDTO struct {
	ExamQuestionID    string          `json:"examQuestionId"`
	QuestionVersionID string          `json:"questionVersionId"`
	Ordinal           int             `json:"ordinal"`
	Score             float64         `json:"score"`
	Body              json.RawMessage `json:"body"`
}

type answerSnapshotDTO struct {
	ExamQuestionID string          `json:"examQuestionId"`
	State          string          `json:"state"`
	Payload        json.RawMessage `json:"payload"`
	SavedAt        *time.Time      `json:"savedAt,omitempty"`
}

type snapshotResponse struct {
	Attempt          attemptDTO            `json:"attempt"`
	AssignmentRef    string                `json:"assignmentRef"`
	Language         string                `json:"language"`
	TotalTimeSeconds int                   `json:"totalTimeSeconds"`
	Questions        []snapshotQuestionDTO `json:"questions"`
	Answers          []answerSnapshotDTO   `json:"answers"`
}

type saveAnswerRequest struct {
	State   string          `json:"state"`
	Payload json.RawMessage `json:"payload"`
}

type saveAnswerResponse struct {
	Saved   bool      `json:"saved"`
	SavedAt time.Time `json:"savedAt"`
}

type submitRequest struct {
	Answers []submitAnswerRequest `json:"answers"`
}

type submitAnswerRequest struct {
	ExamQuestionID string          `json:"examQuestionId"`
	State          string          `json:"state"`
	Payload        json.RawMessage `json:"payload"`
}

type submitResponse struct {
	Attempt attemptDTO `json:"attempt"`
	Status  string     `json:"status"`
}

func (s *Server) startAttempt(w http.ResponseWriter, r *http.Request) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	var req startAttemptRequest
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}
	req.AssignmentRef = strings.ToLower(strings.TrimSpace(req.AssignmentRef))

	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	assignmentID, err := s.resolveAssignment(ctx, principal.UserID, req)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "active assignment not found")
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var doneAttemptID string
	var doneStatus string
	err = s.pool.QueryRow(ctx, `
		SELECT id::text, status::text
		FROM attempts
		WHERE assignment_id = $1
		  AND status IN ('submitted','timed_out','under_review','evaluated','published')
		ORDER BY created_at DESC
		LIMIT 1
	`, assignmentID).Scan(&doneAttemptID, &doneStatus)
	if err == nil {
		writeJSON(w, http.StatusConflict, map[string]string{
			"error":     "assignment already completed",
			"attemptId": doneAttemptID,
			"status":    doneStatus,
		})
		return
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusInternalServerError, "attempt lookup failed")
		return
	}

	var activeAttemptID uuid.UUID
	err = s.pool.QueryRow(ctx, `
		SELECT id
		FROM attempts
		WHERE assignment_id = $1
		  AND status IN ('started','in_progress','paused')
		ORDER BY created_at DESC
		LIMIT 1
	`, assignmentID).Scan(&activeAttemptID)
	if err == nil {
		s.writeSnapshot(w, r, principal.UserID, activeAttemptID)
		return
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusInternalServerError, "attempt lookup failed")
		return
	}

	var examVersionID uuid.UUID
	var totalSeconds int
	err = s.pool.QueryRow(ctx, `
		SELECT a.exam_version_id, ev.total_time_seconds
		FROM exam_assignments a
		JOIN exam_versions ev ON ev.id = a.exam_version_id
		WHERE a.id = $1
	`, assignmentID).Scan(&examVersionID, &totalSeconds)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "assignment exam lookup failed")
		return
	}

	now := time.Now().UTC()
	deadline := now.Add(time.Duration(totalSeconds) * time.Second)
	attemptID := uuid.New()
	_, err = s.pool.Exec(ctx, `
		INSERT INTO attempts (
		    id, assignment_id, candidate_user_id, exam_version_id,
		    status, started_at, deadline_at, time_remaining_ms, last_seen_at
		)
		VALUES ($1, $2, $3, $4, 'in_progress', $5, $6, $7, $5)
	`, attemptID, assignmentID, principal.UserID, examVersionID, now, deadline, totalSeconds*1000)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "attempt create failed")
		return
	}

	s.writeSnapshot(w, r, principal.UserID, attemptID)
}

func (s *Server) attemptSnapshot(w http.ResponseWriter, r *http.Request) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	attemptID, err := uuid.Parse(chi.URLParam(r, "attempt_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid attempt_id")
		return
	}
	s.writeSnapshot(w, r, principal.UserID, attemptID)
}

func (s *Server) saveAnswer(w http.ResponseWriter, r *http.Request) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	attemptID, err := uuid.Parse(chi.URLParam(r, "attempt_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid attempt_id")
		return
	}
	examQuestionID, err := uuid.Parse(chi.URLParam(r, "exam_question_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid exam_question_id")
		return
	}
	var req saveAnswerRequest
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}
	if req.State == "" {
		req.State = "attempted"
	}
	if !validQuestionState(req.State) {
		writeError(w, http.StatusBadRequest, "invalid state")
		return
	}
	if len(req.Payload) == 0 {
		req.Payload = json.RawMessage("{}")
	}

	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db unavailable")
		return
	}
	defer tx.Rollback(ctx)

	savedAt, err := s.saveAnswerTx(ctx, tx, principal.UserID, attemptID, examQuestionID, req.State, req.Payload)
	if err != nil {
		writeSaveAnswerErr(w, err)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "commit failed")
		return
	}
	writeJSON(w, http.StatusOK, saveAnswerResponse{Saved: true, SavedAt: savedAt})
}

func (s *Server) submitAttempt(w http.ResponseWriter, r *http.Request) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	attemptID, err := uuid.Parse(chi.URLParam(r, "attempt_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid attempt_id")
		return
	}
	var req submitRequest
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}

	ctx, cancel := contextWithTimeout(r.Context(), 8*time.Second)
	defer cancel()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db unavailable")
		return
	}
	defer tx.Rollback(ctx)

	for _, a := range req.Answers {
		examQuestionID, err := uuid.Parse(a.ExamQuestionID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid examQuestionId")
			return
		}
		state := a.State
		if state == "" {
			state = "attempted"
		}
		if !validQuestionState(state) {
			writeError(w, http.StatusBadRequest, "invalid state")
			return
		}
		payload := a.Payload
		if len(payload) == 0 {
			payload = json.RawMessage("{}")
		}
		if _, err := s.saveAnswerTx(ctx, tx, principal.UserID, attemptID, examQuestionID, state, payload); err != nil {
			writeSaveAnswerErr(w, err)
			return
		}
	}

	var dto attemptDTO
	var id, assignmentID, examVersionID uuid.UUID
	var startedAt, submittedAt, deadlineAt sql.NullTime
	err = tx.QueryRow(ctx, `
		UPDATE attempts
		SET status = 'submitted',
		    submitted_at = now(),
		    last_seen_at = now(),
		    time_remaining_ms = CASE
		        WHEN deadline_at IS NULL THEN time_remaining_ms
		        ELSE GREATEST(0, (extract(epoch FROM (deadline_at - now())) * 1000)::int)
		    END
		WHERE id = $1
		  AND candidate_user_id = $2
		  AND status IN ('started','in_progress','paused')
		RETURNING id, assignment_id, exam_version_id, status::text,
		          started_at, submitted_at, deadline_at, time_remaining_ms
	`, attemptID, principal.UserID).Scan(
		&id, &assignmentID, &examVersionID, &dto.Status,
		&startedAt, &submittedAt, &deadlineAt, &dto.TimeRemainingMs,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusConflict, "attempt is not active")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "submit failed")
		return
	}
	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "commit failed")
		return
	}
	dto.ID = id.String()
	dto.AssignmentID = assignmentID.String()
	dto.ExamVersionID = examVersionID.String()
	dto.StartedAt = nullTimePtr(startedAt)
	dto.SubmittedAt = nullTimePtr(submittedAt)
	dto.DeadlineAt = nullTimePtr(deadlineAt)
	writeJSON(w, http.StatusOK, submitResponse{Attempt: dto, Status: dto.Status})
}

func (s *Server) writeSnapshot(w http.ResponseWriter, r *http.Request, userID int64, attemptID uuid.UUID) {
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	resp, err := s.loadSnapshot(ctx, userID, attemptID)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "attempt not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "snapshot failed")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) loadSnapshot(ctx context.Context, userID int64, attemptID uuid.UUID) (snapshotResponse, error) {
	var resp snapshotResponse
	var attemptIDOut, assignmentID, examVersionID uuid.UUID
	var startedAt, submittedAt, deadlineAt sql.NullTime
	err := s.pool.QueryRow(ctx, `
		SELECT a.id,
		       a.assignment_id,
		       a.exam_version_id,
		       a.status::text,
		       a.started_at,
		       a.submitted_at,
		       a.deadline_at,
		       CASE
		           WHEN a.deadline_at IS NOT NULL
		                AND a.status IN ('started','in_progress','paused')
		           THEN GREATEST(0, (extract(epoch FROM (a.deadline_at - now())) * 1000)::int)
		           ELSE COALESCE(a.time_remaining_ms, 0)
		       END AS time_remaining_ms,
		       COALESCE(assign.assignment_ref, ''),
		       ev.total_time_seconds
		FROM attempts a
		JOIN exam_assignments assign ON assign.id = a.assignment_id
		JOIN exam_versions ev ON ev.id = a.exam_version_id
		WHERE a.id = $1 AND a.candidate_user_id = $2
	`, attemptID, userID).Scan(
		&attemptIDOut,
		&assignmentID,
		&examVersionID,
		&resp.Attempt.Status,
		&startedAt,
		&submittedAt,
		&deadlineAt,
		&resp.Attempt.TimeRemainingMs,
		&resp.AssignmentRef,
		&resp.TotalTimeSeconds,
	)
	if err != nil {
		return snapshotResponse{}, err
	}
	resp.Attempt.ID = attemptIDOut.String()
	resp.Attempt.AssignmentID = assignmentID.String()
	resp.Attempt.ExamVersionID = examVersionID.String()
	resp.Attempt.StartedAt = nullTimePtr(startedAt)
	resp.Attempt.SubmittedAt = nullTimePtr(submittedAt)
	resp.Attempt.DeadlineAt = nullTimePtr(deadlineAt)
	resp.Language = strings.TrimPrefix(resp.AssignmentRef, "coding:")

	qRows, err := s.pool.Query(ctx, `
		SELECT eq.id,
		       qv.id,
		       eq.ordinal,
		       COALESCE(eq.score_override, qv.max_score)::float8,
		       qv.body
		FROM exam_questions eq
		JOIN question_versions qv ON qv.id = eq.question_version_id
		WHERE eq.exam_version_id = $1
		ORDER BY eq.ordinal
	`, examVersionID)
	if err != nil {
		return snapshotResponse{}, err
	}
	defer qRows.Close()
	resp.Questions = []snapshotQuestionDTO{}
	for qRows.Next() {
		var q snapshotQuestionDTO
		var eqID, qvID uuid.UUID
		var body []byte
		if err := qRows.Scan(&eqID, &qvID, &q.Ordinal, &q.Score, &body); err != nil {
			return snapshotResponse{}, err
		}
		q.ExamQuestionID = eqID.String()
		q.QuestionVersionID = qvID.String()
		q.Body = json.RawMessage(body)
		resp.Questions = append(resp.Questions, q)
	}
	if qRows.Err() != nil {
		return snapshotResponse{}, qRows.Err()
	}

	aRows, err := s.pool.Query(ctx, `
		SELECT eq.id,
		       COALESCE(aqs.state::text, 'unattempted'),
		       COALESCE(ans.payload, '{}'::jsonb),
		       ans.submitted_at
		FROM exam_questions eq
		LEFT JOIN attempt_question_state aqs
		       ON aqs.exam_question_id = eq.id AND aqs.attempt_id = $2
		LEFT JOIN answers ans
		       ON ans.exam_question_id = eq.id AND ans.attempt_id = $2
		WHERE eq.exam_version_id = $1
		ORDER BY eq.ordinal
	`, examVersionID, attemptID)
	if err != nil {
		return snapshotResponse{}, err
	}
	defer aRows.Close()
	resp.Answers = []answerSnapshotDTO{}
	for aRows.Next() {
		var a answerSnapshotDTO
		var eqID uuid.UUID
		var payload []byte
		var savedAt sql.NullTime
		if err := aRows.Scan(&eqID, &a.State, &payload, &savedAt); err != nil {
			return snapshotResponse{}, err
		}
		a.ExamQuestionID = eqID.String()
		a.Payload = json.RawMessage(payload)
		a.SavedAt = nullTimePtr(savedAt)
		resp.Answers = append(resp.Answers, a)
	}
	if aRows.Err() != nil {
		return snapshotResponse{}, aRows.Err()
	}
	return resp, nil
}

func (s *Server) resolveAssignment(ctx context.Context, userID int64, req startAttemptRequest) (uuid.UUID, error) {
	if req.AssignmentID != "" {
		assignmentID, err := uuid.Parse(req.AssignmentID)
		if err != nil {
			return uuid.Nil, errors.New("invalid assignmentId")
		}
		var found uuid.UUID
		err = s.pool.QueryRow(ctx, `
			SELECT id
			FROM exam_assignments
			WHERE id = $1
			  AND candidate_user_id = $2
			  AND status = 'active'
			  AND now() >= COALESCE(available_from, '-infinity'::timestamptz)
			  AND (available_until IS NULL OR now() <= available_until)
		`, assignmentID, userID).Scan(&found)
		return found, err
	}
	if req.AssignmentRef == "" {
		return uuid.Nil, errors.New("assignmentId or assignmentRef is required")
	}
	var found uuid.UUID
	err := s.pool.QueryRow(ctx, `
		SELECT id
		FROM exam_assignments
		WHERE candidate_user_id = $1
		  AND assignment_ref = $2
		  AND status = 'active'
		  AND now() >= COALESCE(available_from, '-infinity'::timestamptz)
		  AND (available_until IS NULL OR now() <= available_until)
		ORDER BY created_at DESC
		LIMIT 1
	`, userID, req.AssignmentRef).Scan(&found)
	return found, err
}

func (s *Server) saveAnswerTx(
	ctx context.Context,
	tx pgx.Tx,
	userID int64,
	attemptID uuid.UUID,
	examQuestionID uuid.UUID,
	state string,
	payload json.RawMessage,
) (time.Time, error) {
	var questionVersionID uuid.UUID
	err := tx.QueryRow(ctx, `
		SELECT eq.question_version_id
		FROM attempts a
		JOIN exam_questions eq
		     ON eq.exam_version_id = a.exam_version_id
		    AND eq.id = $2
		WHERE a.id = $1
		  AND a.candidate_user_id = $3
		  AND a.status IN ('started','in_progress','paused')
	`, attemptID, examQuestionID, userID).Scan(&questionVersionID)
	if err != nil {
		return time.Time{}, err
	}

	now := time.Now().UTC()
	if _, err := tx.Exec(ctx, `
		INSERT INTO attempt_question_state (
		    id, attempt_id, exam_question_id, state,
		    visit_count, first_viewed_at, last_viewed_at
		)
		VALUES ($1, $2, $3, $4, 1, $5, $5)
		ON CONFLICT (attempt_id, exam_question_id) DO UPDATE
		SET state = EXCLUDED.state,
		    last_viewed_at = EXCLUDED.last_viewed_at,
		    visit_count = GREATEST(attempt_question_state.visit_count, 1)
	`, uuid.New(), attemptID, examQuestionID, state, now); err != nil {
		return time.Time{}, err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO answers (
		    id, attempt_id, exam_question_id, question_version_id,
		    payload, submitted_at
		)
		VALUES ($1, $2, $3, $4, $5::jsonb, $6)
		ON CONFLICT (attempt_id, exam_question_id) DO UPDATE
		SET payload = EXCLUDED.payload,
		    submitted_at = EXCLUDED.submitted_at
	`, uuid.New(), attemptID, examQuestionID, questionVersionID, []byte(payload), now); err != nil {
		return time.Time{}, err
	}
	return now, nil
}

func validQuestionState(v string) bool {
	switch v {
	case "unattempted", "viewed", "attempted", "solved", "flagged", "skipped":
		return true
	default:
		return false
	}
}

func writeSaveAnswerErr(w http.ResponseWriter, err error) {
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "active attempt/question not found")
		return
	}
	writeError(w, http.StatusInternalServerError, "save failed")
}
