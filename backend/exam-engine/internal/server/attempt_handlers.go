package server

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
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

type candidateTestCaseDTO struct {
	Input    string `json:"input"`
	Stdin    string `json:"stdin"`
	Expected string `json:"expected"`
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

type attemptFingerprint struct {
	Snapshot *frozenAttemptSnapshot `json:"snapshot,omitempty"`
}

type frozenAttemptSnapshot struct {
	AssignmentRef    string                `json:"assignmentRef"`
	Language         string                `json:"language"`
	ExamVersionID    string                `json:"examVersionId"`
	TotalTimeSeconds int                   `json:"totalTimeSeconds"`
	Questions        []snapshotQuestionDTO `json:"questions"`
	CreatedAt        time.Time             `json:"createdAt"`
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

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db unavailable")
		return
	}
	defer tx.Rollback(ctx)

	var assignmentID, examVersionID uuid.UUID
	var assignmentRef string
	var totalSeconds int
	if req.AssignmentID != "" {
		parsedID, err := uuid.Parse(req.AssignmentID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid assignmentId")
			return
		}
		err = tx.QueryRow(ctx, `
			SELECT a.id, a.exam_version_id, COALESCE(a.assignment_ref, ''), ev.total_time_seconds
			FROM exam_assignments a
			JOIN exam_versions ev ON ev.id = a.exam_version_id
			WHERE a.id = $1
			  AND a.candidate_user_id = $2
			  AND a.status = 'active'
			  AND now() >= COALESCE(a.available_from, '-infinity'::timestamptz)
			  AND (a.available_until IS NULL OR now() <= a.available_until)
			FOR UPDATE OF a
		`, parsedID, principal.UserID).Scan(&assignmentID, &examVersionID, &assignmentRef, &totalSeconds)
	} else if req.AssignmentRef != "" {
		err = tx.QueryRow(ctx, `
			SELECT a.id, a.exam_version_id, COALESCE(a.assignment_ref, ''), ev.total_time_seconds
			FROM exam_assignments a
			JOIN exam_versions ev ON ev.id = a.exam_version_id
			WHERE a.candidate_user_id = $1
			  AND a.assignment_ref = $2
			  AND a.status = 'active'
			  AND now() >= COALESCE(a.available_from, '-infinity'::timestamptz)
			  AND (a.available_until IS NULL OR now() <= a.available_until)
			ORDER BY a.created_at DESC
			LIMIT 1
			FOR UPDATE OF a
		`, principal.UserID, req.AssignmentRef).Scan(&assignmentID, &examVersionID, &assignmentRef, &totalSeconds)
	} else {
		writeError(w, http.StatusBadRequest, "assignmentId or assignmentRef is required")
		return
	}
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "active assignment not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "assignment lookup failed")
		return
	}

	var doneAttemptID string
	var doneStatus string
	err = tx.QueryRow(ctx, `
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
	err = tx.QueryRow(ctx, `
		SELECT id
		FROM attempts
		WHERE assignment_id = $1
		  AND status IN ('started','in_progress','paused')
		ORDER BY created_at DESC
		LIMIT 1
	`, assignmentID).Scan(&activeAttemptID)
	if err == nil {
		if err := s.recordAttemptEventTx(ctx, tx, activeAttemptID, "attempt_resumed", 0, nil, map[string]any{
			"assignmentRef": assignmentRef,
		}); err != nil {
			writeError(w, http.StatusInternalServerError, "trace write failed")
			return
		}
		if err := tx.Commit(ctx); err != nil {
			writeError(w, http.StatusInternalServerError, "commit failed")
			return
		}
		s.writeSnapshot(w, r, principal.UserID, activeAttemptID)
		return
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusInternalServerError, "attempt lookup failed")
		return
	}

	frozen, err := s.buildFrozenSnapshot(ctx, tx, examVersionID, assignmentRef, totalSeconds)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "snapshot build failed")
		return
	}
	fingerprint, err := json.Marshal(attemptFingerprint{Snapshot: &frozen})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "snapshot encode failed")
		return
	}

	now := time.Now().UTC()
	deadline := now.Add(time.Duration(totalSeconds) * time.Second)
	attemptID := uuid.New()
	_, err = tx.Exec(ctx, `
		INSERT INTO attempts (
		    id, assignment_id, candidate_user_id, exam_version_id,
		    status, started_at, deadline_at, time_remaining_ms, last_seen_at,
		    fingerprint
		)
		VALUES ($1, $2, $3, $4, 'in_progress', $5, $6, $7, $5, $8::jsonb)
	`, attemptID, assignmentID, principal.UserID, examVersionID, now, deadline, totalSeconds*1000, fingerprint)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "attempt create failed")
		return
	}
	if err := s.recordAttemptEventTx(ctx, tx, attemptID, "attempt_started", 0, nil, map[string]any{
		"assignmentRef": assignmentRef,
		"language":      frozen.Language,
		"questionCount": len(frozen.Questions),
		"deadlineAt":    deadline,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "trace write failed")
		return
	}
	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "commit failed")
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

	saveCtx, saveCancel := contextWithTimeout(r.Context(), 10*time.Second)
	defer saveCancel()
	tx, err := s.pool.Begin(saveCtx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db unavailable")
		return
	}
	defer tx.Rollback(saveCtx)

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
		if _, err := s.saveAnswerTx(saveCtx, tx, principal.UserID, attemptID, examQuestionID, state, payload); err != nil {
			writeSaveAnswerErr(w, err)
			return
		}
	}
	if err := tx.Commit(saveCtx); err != nil {
		writeError(w, http.StatusInternalServerError, "commit failed")
		return
	}

	if err := s.runFinalCodeForAttempt(r.Context(), principal.UserID, attemptID); err != nil {
		writeError(w, http.StatusBadGateway, "final code evaluation failed: "+err.Error())
		return
	}

	gradeCtx, gradeCancel := contextWithTimeout(r.Context(), 10*time.Second)
	defer gradeCancel()
	tx, err = s.pool.Begin(gradeCtx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db unavailable")
		return
	}
	defer tx.Rollback(gradeCtx)

	finalScore, gradingStatus, err := s.gradeAttemptTx(gradeCtx, tx, attemptID, principal.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "grading failed")
		return
	}

	var dto attemptDTO
	var id, assignmentID, examVersionID uuid.UUID
	var startedAt, submittedAt, deadlineAt sql.NullTime
	err = tx.QueryRow(gradeCtx, `
		UPDATE attempts
		SET status = 'evaluated',
		    submitted_at = now(),
		    last_seen_at = now(),
		    final_score = $3,
		    grading_status = $4,
		    time_remaining_ms = CASE
		        WHEN deadline_at IS NULL THEN time_remaining_ms
		        ELSE GREATEST(0, (extract(epoch FROM (deadline_at - now())) * 1000)::int)
		    END
		WHERE id = $1
		  AND candidate_user_id = $2
		  AND status IN ('started','in_progress','paused')
		RETURNING id, assignment_id, exam_version_id, status::text,
		          started_at, submitted_at, deadline_at, time_remaining_ms
	`, attemptID, principal.UserID, finalScore, gradingStatus).Scan(
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
	if err := s.recordAttemptEventTx(gradeCtx, tx, attemptID, "attempt_submitted", 0, nil, map[string]any{
		"finalScore":    finalScore,
		"gradingStatus": gradingStatus,
		"answerCount":   len(req.Answers),
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "trace write failed")
		return
	}
	if err := tx.Commit(gradeCtx); err != nil {
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
	var fingerprintBytes []byte
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
		       ev.total_time_seconds,
		       a.fingerprint
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
		&fingerprintBytes,
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

	if len(fingerprintBytes) > 0 {
		var fingerprint attemptFingerprint
		if err := json.Unmarshal(fingerprintBytes, &fingerprint); err == nil && fingerprint.Snapshot != nil {
			snap := fingerprint.Snapshot
			if snap.AssignmentRef != "" {
				resp.AssignmentRef = snap.AssignmentRef
			}
			if snap.Language != "" {
				resp.Language = snap.Language
			}
			if snap.TotalTimeSeconds > 0 {
				resp.TotalTimeSeconds = snap.TotalTimeSeconds
			}
			if len(snap.Questions) > 0 {
				resp.Questions = snap.Questions
				if err := s.refreshCandidateQuestionBodies(ctx, resp.Questions); err != nil {
					return snapshotResponse{}, err
				}
				answers, err := s.loadAnswerSnapshots(ctx, examVersionID, attemptID)
				if err != nil {
					return snapshotResponse{}, err
				}
				resp.Answers = answers
				return resp, nil
			}
		}
	}

	qRows, err := s.pool.Query(ctx, `
		SELECT eq.id,
		       qv.id,
		       eq.ordinal,
		       COALESCE(eq.score_override, qv.max_score)::float8,
		       q.title,
		       qv.difficulty,
		       qv.body
		FROM exam_questions eq
		JOIN question_versions qv ON qv.id = eq.question_version_id
		JOIN questions q ON q.id = qv.question_id
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
		var title string
		var difficulty int
		if err := qRows.Scan(&eqID, &qvID, &q.Ordinal, &q.Score, &title, &difficulty, &body); err != nil {
			return snapshotResponse{}, err
		}
		q.ExamQuestionID = eqID.String()
		q.QuestionVersionID = qvID.String()
		candidateBody, err := s.candidateQuestionBody(ctx, qvID, title, difficulty, body)
		if err != nil {
			return snapshotResponse{}, err
		}
		q.Body = candidateBody
		resp.Questions = append(resp.Questions, q)
	}
	if qRows.Err() != nil {
		return snapshotResponse{}, qRows.Err()
	}

	answers, err := s.loadAnswerSnapshots(ctx, examVersionID, attemptID)
	if err != nil {
		return snapshotResponse{}, err
	}
	resp.Answers = answers
	return resp, nil
}

func (s *Server) loadAnswerSnapshots(ctx context.Context, examVersionID uuid.UUID, attemptID uuid.UUID) ([]answerSnapshotDTO, error) {
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
		return nil, err
	}
	defer aRows.Close()
	answers := []answerSnapshotDTO{}
	for aRows.Next() {
		var a answerSnapshotDTO
		var eqID uuid.UUID
		var payload []byte
		var savedAt sql.NullTime
		if err := aRows.Scan(&eqID, &a.State, &payload, &savedAt); err != nil {
			return nil, err
		}
		a.ExamQuestionID = eqID.String()
		a.Payload = json.RawMessage(payload)
		a.SavedAt = nullTimePtr(savedAt)
		answers = append(answers, a)
	}
	if aRows.Err() != nil {
		return nil, aRows.Err()
	}
	return answers, nil
}

func (s *Server) buildFrozenSnapshot(
	ctx context.Context,
	tx pgx.Tx,
	examVersionID uuid.UUID,
	assignmentRef string,
	totalSeconds int,
) (frozenAttemptSnapshot, error) {
	rows, err := tx.Query(ctx, `
		SELECT eq.id,
		       qv.id,
		       eq.ordinal,
		       COALESCE(eq.score_override, qv.max_score)::float8,
		       q.title,
		       qv.difficulty,
		       qv.body
		FROM exam_questions eq
		JOIN question_versions qv ON qv.id = eq.question_version_id
		JOIN questions q ON q.id = qv.question_id
		WHERE eq.exam_version_id = $1
		ORDER BY eq.ordinal
	`, examVersionID)
	if err != nil {
		return frozenAttemptSnapshot{}, err
	}
	defer rows.Close()

	questions := []snapshotQuestionDTO{}
	for rows.Next() {
		var q snapshotQuestionDTO
		var eqID, qvID uuid.UUID
		var body []byte
		var title string
		var difficulty int
		if err := rows.Scan(&eqID, &qvID, &q.Ordinal, &q.Score, &title, &difficulty, &body); err != nil {
			return frozenAttemptSnapshot{}, err
		}
		q.ExamQuestionID = eqID.String()
		q.QuestionVersionID = qvID.String()
		candidateBody, err := s.candidateQuestionBody(ctx, qvID, title, difficulty, body)
		if err != nil {
			return frozenAttemptSnapshot{}, err
		}
		q.Body = candidateBody
		questions = append(questions, q)
	}
	if rows.Err() != nil {
		return frozenAttemptSnapshot{}, rows.Err()
	}
	return frozenAttemptSnapshot{
		AssignmentRef:    assignmentRef,
		Language:         strings.TrimPrefix(assignmentRef, "coding:"),
		ExamVersionID:    examVersionID.String(),
		TotalTimeSeconds: totalSeconds,
		Questions:        questions,
		CreatedAt:        time.Now().UTC(),
	}, nil
}

func (s *Server) refreshCandidateQuestionBodies(ctx context.Context, questions []snapshotQuestionDTO) error {
	for i := range questions {
		questionVersionID, err := uuid.Parse(questions[i].QuestionVersionID)
		if err != nil {
			return err
		}
		var title string
		var difficulty int
		var body []byte
		if err := s.pool.QueryRow(ctx, `
			SELECT q.title, qv.difficulty, qv.body
			FROM question_versions qv
			JOIN questions q ON q.id = qv.question_id
			WHERE qv.id = $1
		`, questionVersionID).Scan(&title, &difficulty, &body); err != nil {
			return err
		}
		questions[i].Body, err = s.candidateQuestionBody(ctx, questionVersionID, title, difficulty, body)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *Server) candidateQuestionBody(
	ctx context.Context,
	questionVersionID uuid.UUID,
	title string,
	difficulty int,
	raw []byte,
) (json.RawMessage, error) {
	body := map[string]any{}
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &body)
	}
	if _, ok := body["title"]; !ok {
		body["title"] = title
	}
	if _, ok := body["difficulty"]; !ok {
		body["difficulty"] = difficultyName(difficulty)
	}
	questionType := strings.ToLower(stringValue(body["type"]))
	responseType := strings.ToLower(stringValue(body["responseType"]))
	if responseType == "" {
		if questionType == "mcq" {
			responseType = "mcq"
		} else {
			responseType = "code"
		}
		body["responseType"] = responseType
	}

	if responseType == "mcq" || questionType == "mcq" {
		options, err := s.visibleMCQOptions(ctx, questionVersionID)
		if err != nil {
			return nil, err
		}
		body["type"] = "mcq"
		body["responseType"] = "mcq"
		body["options"] = options
		delete(body, "correct")
		delete(body, "correctOption")
		delete(body, "correctOptionId")
		delete(body, "answer")
	} else {
		testCases, err := s.visibleQuestionTestCases(ctx, questionVersionID)
		if err != nil {
			return nil, err
		}
		body["testCases"] = testCases
	}

	encoded, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	return json.RawMessage(encoded), nil
}

func (s *Server) visibleMCQOptions(ctx context.Context, questionVersionID uuid.UUID) ([]string, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT label
		FROM question_options
		WHERE question_version_id = $1
		ORDER BY ordinal
	`, questionVersionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	options := []string{}
	for rows.Next() {
		var label string
		if err := rows.Scan(&label); err != nil {
			return nil, err
		}
		options = append(options, label)
	}
	return options, rows.Err()
}

func (s *Server) visibleQuestionTestCases(ctx context.Context, questionVersionID uuid.UUID) ([]candidateTestCaseDTO, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT COALESCE(name, ''), stdin, expected_stdout
		FROM question_test_cases
		WHERE question_version_id = $1
		  AND is_hidden = false
		ORDER BY ordinal
	`, questionVersionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	testCases := []candidateTestCaseDTO{}
	for rows.Next() {
		var name, stdin, expected string
		if err := rows.Scan(&name, &stdin, &expected); err != nil {
			return nil, err
		}
		input := name
		if input == "" {
			input = stdin
		}
		testCases = append(testCases, candidateTestCaseDTO{
			Input:    input,
			Stdin:    stdin,
			Expected: expected,
		})
	}
	return testCases, rows.Err()
}

func difficultyName(v int) string {
	switch {
	case v <= 1:
		return "easy"
	case v == 2:
		return "medium"
	default:
		return "hard"
	}
}

func stringValue(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
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
	if err := s.recordAttemptEventTx(ctx, tx, attemptID, "answer_saved", 0, &examQuestionID, map[string]any{
		"state":        state,
		"payloadBytes": len(payload),
	}); err != nil {
		return time.Time{}, err
	}
	return now, nil
}

type finalCodeAnswer struct {
	ExamQuestionID uuid.UUID
	AssignmentLang string
	Body           []byte
	Payload        []byte
}

type finalCodePayload struct {
	Language  string        `json:"language"`
	Files     []codeFileDTO `json:"files"`
	EntryFile string        `json:"entryFile"`
}

func (s *Server) runFinalCodeForAttempt(ctx context.Context, userID int64, attemptID uuid.UUID) error {
	queryCtx, queryCancel := contextWithTimeout(ctx, 5*time.Second)
	defer queryCancel()
	rows, err := s.pool.Query(queryCtx, `
		SELECT ans.exam_question_id,
		       replace(COALESCE(assign.assignment_ref, ''), 'coding:', ''),
		       qv.body,
		       ans.payload
		FROM attempts a
		JOIN exam_assignments assign ON assign.id = a.assignment_id
		JOIN answers ans ON ans.attempt_id = a.id
		JOIN exam_questions eq ON eq.id = ans.exam_question_id
		JOIN question_versions qv ON qv.id = ans.question_version_id
		WHERE a.id = $1
		  AND a.candidate_user_id = $2
		  AND a.status IN ('started','in_progress','paused')
		ORDER BY eq.ordinal
	`, attemptID, userID)
	if err != nil {
		return err
	}
	defer rows.Close()

	codeAnswers := []finalCodeAnswer{}
	for rows.Next() {
		var ans finalCodeAnswer
		if err := rows.Scan(&ans.ExamQuestionID, &ans.AssignmentLang, &ans.Body, &ans.Payload); err != nil {
			return err
		}
		if isCodeResponseBody(ans.Body) {
			codeAnswers = append(codeAnswers, ans)
		}
	}
	if rows.Err() != nil {
		return rows.Err()
	}

	for _, ans := range codeAnswers {
		var payload finalCodePayload
		if len(ans.Payload) > 0 {
			_ = json.Unmarshal(ans.Payload, &payload)
		}
		payload.Language = strings.ToLower(strings.TrimSpace(payload.Language))
		if payload.Language == "" {
			payload.Language = strings.ToLower(strings.TrimSpace(ans.AssignmentLang))
		}
		req := codeRunRequest{
			Mode:      "final",
			Language:  payload.Language,
			Files:     payload.Files,
			EntryFile: payload.EntryFile,
		}
		if len(req.Files) == 0 {
			continue
		}
		if err := validateCodeRunRequest(&req, true); err != nil {
			return fmt.Errorf("question %s: %w", ans.ExamQuestionID, err)
		}

		testCtx, testCancel := contextWithTimeout(ctx, 5*time.Second)
		tests, err := s.loadRunTests(testCtx, attemptID, userID, ans.ExamQuestionID, req.Mode, req.Language)
		testCancel()
		if err != nil {
			return fmt.Errorf("question %s final tests: %w", ans.ExamQuestionID, err)
		}
		if len(tests) == 0 {
			return fmt.Errorf("question %s has no final tests", ans.ExamQuestionID)
		}

		persistCtx, persistCancel := contextWithTimeout(ctx, 5*time.Second)
		runID, err := s.persistRunStart(persistCtx, userID, attemptID, ans.ExamQuestionID, req)
		persistCancel()
		if err != nil {
			return fmt.Errorf("question %s final run start: %w", ans.ExamQuestionID, err)
		}

		judgePayload, err := buildJudge0Payload(req)
		if err != nil {
			_ = s.finishRunWithError(ctx, runID, err.Error())
			return fmt.Errorf("question %s final payload: %w", ans.ExamQuestionID, err)
		}
		runCtx, runCancel := context.WithTimeout(ctx, 120*time.Second)
		_, err = s.executeJudge0(runCtx, runID, req, judgePayload, tests)
		runCancel()
		if err != nil {
			_ = s.finishRunWithError(ctx, runID, err.Error())
			return fmt.Errorf("question %s Judge0: %w", ans.ExamQuestionID, err)
		}
	}
	return nil
}

func isCodeResponseBody(body []byte) bool {
	var parsed struct {
		Type         string `json:"type"`
		ResponseType string `json:"responseType"`
	}
	_ = json.Unmarshal(body, &parsed)
	if strings.EqualFold(parsed.ResponseType, "mcq") || strings.EqualFold(parsed.Type, "mcq") {
		return false
	}
	return true
}

type answerForGrade struct {
	AnswerID          uuid.UUID
	ExamQuestionID    uuid.UUID
	QuestionVersionID uuid.UUID
	MaxScore          float64
	Body              []byte
	Payload           []byte
}

func (s *Server) gradeAttemptTx(ctx context.Context, tx pgx.Tx, attemptID uuid.UUID, userID int64) (float64, string, error) {
	rows, err := tx.Query(ctx, `
		SELECT ans.id,
		       ans.exam_question_id,
		       ans.question_version_id,
		       COALESCE(eq.score_override, qv.max_score)::float8,
		       qv.body,
		       ans.payload
		FROM attempts a
		JOIN answers ans ON ans.attempt_id = a.id
		JOIN exam_questions eq ON eq.id = ans.exam_question_id
		JOIN question_versions qv ON qv.id = ans.question_version_id
		WHERE a.id = $1 AND a.candidate_user_id = $2
		ORDER BY eq.ordinal
	`, attemptID, userID)
	if err != nil {
		return 0, "", err
	}

	answers := []answerForGrade{}
	for rows.Next() {
		var ans answerForGrade
		if err := rows.Scan(
			&ans.AnswerID,
			&ans.ExamQuestionID,
			&ans.QuestionVersionID,
			&ans.MaxScore,
			&ans.Body,
			&ans.Payload,
		); err != nil {
			rows.Close()
			return 0, "", err
		}
		answers = append(answers, ans)
	}
	if rows.Err() != nil {
		rows.Close()
		return 0, "", rows.Err()
	}
	rows.Close()

	total := 0.0
	for _, ans := range answers {
		score, feedback, err := s.gradeAnswerTx(ctx, tx, ans)
		if err != nil {
			return 0, "", err
		}
		total += score
		if _, err := tx.Exec(ctx, `
			UPDATE answers
			SET auto_score = $2,
			    final_score = $2,
			    auto_feedback = $3::jsonb,
			    grading_status = 'auto_evaluated'
			WHERE id = $1
		`, ans.AnswerID, score, feedback); err != nil {
			return 0, "", err
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO evaluations (
			    id, answer_id, evaluator_kind, status, score, feedback,
			    completed_at, metadata
			)
			VALUES (
			    $1, $2, 'auto', 'auto_evaluated', $3, $4, now(),
			    jsonb_build_object('source', 'submit', 'attempt_id', $5::text)
			)
		`, uuid.New(), ans.AnswerID, score, string(feedback), attemptID); err != nil {
			return 0, "", err
		}
	}
	if len(answers) == 0 {
		return 0, "auto_evaluated", nil
	}
	return total, "auto_evaluated", nil
}

func (s *Server) gradeAnswerTx(ctx context.Context, tx pgx.Tx, ans answerForGrade) (float64, []byte, error) {
	var body struct {
		Type string `json:"type"`
	}
	_ = json.Unmarshal(ans.Body, &body)
	if body.Type == "mcq" {
		return s.gradeMCQAnswerTx(ctx, tx, ans)
	}
	return s.gradeCodingAnswerTx(ctx, tx, ans)
}

func (s *Server) gradeMCQAnswerTx(ctx context.Context, tx pgx.Tx, ans answerForGrade) (float64, []byte, error) {
	var payload struct {
		MCQAnswer *int `json:"mcqAnswer"`
	}
	_ = json.Unmarshal(ans.Payload, &payload)

	var correctOrdinal int
	err := tx.QueryRow(ctx, `
		SELECT ordinal
		FROM question_options
		WHERE question_version_id = $1 AND is_correct
		ORDER BY ordinal
		LIMIT 1
	`, ans.QuestionVersionID).Scan(&correctOrdinal)
	if errors.Is(err, pgx.ErrNoRows) {
		feedback, _ := json.Marshal(map[string]any{
			"type":   "mcq",
			"status": "no_correct_option",
		})
		return 0, feedback, nil
	}
	if err != nil {
		return 0, nil, err
	}

	selected := -1
	if payload.MCQAnswer != nil {
		selected = *payload.MCQAnswer
	}
	correct := selected+1 == correctOrdinal || selected == correctOrdinal
	score := 0.0
	if correct {
		score = ans.MaxScore
	}
	feedback, _ := json.Marshal(map[string]any{
		"type":           "mcq",
		"selected":       selected,
		"correctOrdinal": correctOrdinal,
		"correct":        correct,
		"maxScore":       ans.MaxScore,
	})
	return score, feedback, nil
}

func (s *Server) gradeCodingAnswerTx(ctx context.Context, tx pgx.Tx, ans answerForGrade) (float64, []byte, error) {
	var runID uuid.UUID
	err := tx.QueryRow(ctx, `
		SELECT id
		FROM code_runs
		WHERE answer_id = $1
		  AND mode = 'final'
		  AND finished_at IS NOT NULL
		ORDER BY finished_at DESC
		LIMIT 1
	`, ans.AnswerID).Scan(&runID)
	if errors.Is(err, pgx.ErrNoRows) {
		feedback, _ := json.Marshal(map[string]any{
			"type":    "coding",
			"status":  "not_run",
			"summary": "No persisted final test run was available for this submission.",
		})
		return 0, feedback, nil
	}
	if err != nil {
		return 0, nil, err
	}

	var totalTests int
	var passedTests int
	var totalWeight float64
	var passedWeight float64
	if err := tx.QueryRow(ctx, `
		SELECT COUNT(*),
		       COALESCE(SUM(CASE WHEN r.passed THEN 1 ELSE 0 END), 0)::int,
		       COALESCE(SUM(COALESCE(tc.weight, 1)), 0)::float8,
		       COALESCE(SUM(CASE WHEN r.passed THEN COALESCE(tc.weight, 1) ELSE 0 END), 0)::float8
		FROM code_run_test_results r
		LEFT JOIN question_test_cases tc ON tc.id = r.test_case_id
		WHERE r.code_run_id = $1
	`, runID).Scan(&totalTests, &passedTests, &totalWeight, &passedWeight); err != nil {
		return 0, nil, err
	}
	score := 0.0
	if totalWeight > 0 {
		score = ans.MaxScore * passedWeight / totalWeight
	}
	feedback, _ := json.Marshal(map[string]any{
		"type":         "coding",
		"runId":        runID.String(),
		"passedTests":  passedTests,
		"totalTests":   totalTests,
		"passedWeight": passedWeight,
		"totalWeight":  totalWeight,
		"maxScore":     ans.MaxScore,
	})
	return score, feedback, nil
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
