package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/originbi/exam-engine/internal/auth"
	"github.com/originbi/exam-engine/internal/pluginhost"
	assessmentcoding "github.com/originbi/exam-engine/plugins/assessment-coding"
	evaluationtestcase "github.com/originbi/exam-engine/plugins/evaluation-testcase"
	runnerjudge0 "github.com/originbi/exam-engine/plugins/runner-judge0"
)

type codeFileDTO struct {
	Path     string `json:"path"`
	Content  string `json:"content"`
	ReadOnly bool   `json:"readOnly,omitempty"`
	Language string `json:"language,omitempty"`
}

type codeRunRequest struct {
	Mode        string        `json:"mode"`
	Language    string        `json:"language"`
	Files       []codeFileDTO `json:"files"`
	EntryFile   string        `json:"entryFile"`
	CustomStdin string        `json:"customStdin"`
}

type codeRunResponse struct {
	Type        string              `json:"type"`
	Stdout      string              `json:"stdout"`
	Stderr      string              `json:"stderr"`
	TestResults []codeTestResultDTO `json:"testResults,omitempty"`
	Time        string              `json:"time"`
	Memory      string              `json:"memory"`
	Summary     string              `json:"summary"`
	RunID       string              `json:"runId"`
}

type codeTestResultDTO struct {
	Input    string `json:"input"`
	Expected string `json:"expected"`
	Passed   bool   `json:"passed"`
	Actual   string `json:"actual"`
	Time     string `json:"time"`
}

type dbTestCase struct {
	ID               uuid.UUID
	Ordinal          int
	Name             string
	Stdin            string
	Expected         string
	Comparator       string
	ComparatorConfig json.RawMessage
}

type judge0Status = runnerjudge0.Status
type judge0Result = runnerjudge0.Result

const (
	maxCodeFiles            = 24
	maxCodeFilePathBytes    = 255
	maxCandidateSourceBytes = 256 << 10
)

var (
	errCodeRunnerBusy      = errors.New("code runner is busy; retry shortly")
	errNoTestCases         = errors.New("no test cases defined")
	errLanguageNotEntitled = errors.New("LANGUAGE_NOT_ENTITLED")
	errRunnerUnavailable   = errors.New("code runner unavailable")
)

func (s *Server) judge0Health(w http.ResponseWriter, r *http.Request) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	if !s.isAdmin(r.Context(), principal.UserID) {
		writeError(w, http.StatusForbidden, "admin access required")
		return
	}

	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	if s.plugins == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status": "unavailable",
			"error":  "plugin registry unavailable",
		})
		return
	}
	required, err := runnerjudge0.Health(ctx, s.plugins, s.judgeHTTPClient, judge0BaseURL())
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status": "unreachable",
			"error":  err.Error(),
		})
		return
	}
	status := "ready"
	for _, item := range required {
		if !item.Available {
			status = "degraded"
			break
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"status":    status,
		"judge0Url": judge0BaseURL(),
		"required":  required,
	})
}

func (s *Server) runCode(w http.ResponseWriter, r *http.Request) {
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
	var req codeRunRequest
	if !decodeJSON(w, r, &req, maxCodeRunBodyBytes) {
		return
	}
	req.Mode = strings.ToLower(strings.TrimSpace(req.Mode))
	req.Language = runnerjudge0.NormalizeLanguageSlug(req.Language)
	req.EntryFile = strings.TrimSpace(req.EntryFile)
	if err := validateCodeRunRequest(&req, false); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	if err := s.ensureLanguageEntitled(ctx, principal.UserID, req.Language); err != nil {
		writeLanguageErr(w, err)
		return
	}
	payload, err := json.Marshal(req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "run payload encode failed")
		return
	}
	action := actionForRunMode(req.Mode)
	if s.plugins != nil {
		resp, err := s.plugins.Dispatch(ctx, pluginhost.ActionRequest{
			AttemptID:      attemptID,
			ExamQuestionID: examQuestionID,
			UserID:         principal.UserID,
			Action:         action,
			Payload:        payload,
		})
		if err != nil {
			if errors.Is(err, pluginhost.ErrActionUnknown) {
				writeError(w, http.StatusServiceUnavailable, "code runner unavailable")
				return
			}
			writeError(w, http.StatusInternalServerError, "code action failed")
			return
		}
		writeJSON(w, resp.HTTPStatus, resp.Body)
		return
	}
	resp, err := s.executeCodeRunAction(ctx, principal.UserID, attemptID, examQuestionID, req)
	if err != nil {
		writeCodeRunErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleCodingAction(ctx context.Context, _ *pluginhost.Registry, actionReq pluginhost.ActionRequest) (pluginhost.ActionResponse, error) {
	var req codeRunRequest
	if err := json.Unmarshal(actionReq.Payload, &req); err != nil {
		body, _ := json.Marshal(map[string]string{"error": "invalid coding action payload"})
		return pluginhost.ActionResponse{HTTPStatus: http.StatusBadRequest, Body: body}, nil
	}
	req.Mode = strings.ToLower(strings.TrimSpace(req.Mode))
	req.Language = runnerjudge0.NormalizeLanguageSlug(req.Language)
	req.EntryFile = strings.TrimSpace(req.EntryFile)
	if err := validateCodeRunRequest(&req, actionReq.Action == assessmentcoding.ActionSubmit); err != nil {
		body, _ := json.Marshal(map[string]string{"error": err.Error()})
		return pluginhost.ActionResponse{HTTPStatus: http.StatusBadRequest, Body: body}, nil
	}
	if err := s.ensureLanguageEntitled(ctx, actionReq.UserID, req.Language); err != nil {
		status, body := codeRunErrResponse(err)
		return pluginhost.ActionResponse{HTTPStatus: status, Body: body}, nil
	}
	resp, err := s.executeCodeRunAction(ctx, actionReq.UserID, actionReq.AttemptID, actionReq.ExamQuestionID, req)
	if err != nil {
		status, body := codeRunErrResponse(err)
		return pluginhost.ActionResponse{HTTPStatus: status, Body: body}, nil
	}
	body, _ := json.Marshal(resp)
	return pluginhost.ActionResponse{HTTPStatus: http.StatusOK, Body: body}, nil
}

func (s *Server) executeCodeRunAction(
	ctx context.Context,
	userID int64,
	attemptID uuid.UUID,
	examQuestionID uuid.UUID,
	req codeRunRequest,
) (codeRunResponse, error) {
	if err := s.ensureRunnerAvailable(ctx); err != nil {
		return codeRunResponse{}, err
	}
	body, err := s.loadQuestionBodyForAttempt(ctx, attemptID, userID, examQuestionID)
	if err != nil {
		return codeRunResponse{}, fmt.Errorf("question body lookup failed: %w", err)
	}
	if err := s.validateCodingAnswerPayload(req, body); err != nil {
		return codeRunResponse{}, err
	}
	tests, err := s.loadRunTests(ctx, attemptID, userID, examQuestionID, req.Mode, req.Language)
	if err != nil {
		return codeRunResponse{}, fmt.Errorf("testcase lookup failed: %w", err)
	}
	if req.Mode == "tests" && len(tests) == 0 {
		return codeRunResponse{}, errNoTestCases
	}

	select {
	case s.codeRunSem <- struct{}{}:
		defer func() { <-s.codeRunSem }()
	default:
		_ = s.recordAttemptEvent(ctx, attemptID, "code_run_rejected", 2, &examQuestionID, map[string]any{
			"reason":   "engine_busy",
			"mode":     req.Mode,
			"language": req.Language,
		})
		return codeRunResponse{}, errCodeRunnerBusy
	}

	runID, err := s.persistRunStart(ctx, userID, attemptID, examQuestionID, req, false)
	if err != nil {
		return codeRunResponse{}, fmt.Errorf("run persistence failed: %w", err)
	}

	payload, err := s.buildJudge0Payload(req)
	if err != nil {
		_ = s.finishRunWithError(ctx, runID, err.Error())
		return codeRunResponse{}, err
	}

	runCtx, runCancel := context.WithTimeout(ctx, 90*time.Second)
	defer runCancel()
	resp, err := s.executeJudge0(runCtx, runID, req, payload, tests)
	if err != nil {
		_ = s.finishRunWithError(ctx, runID, err.Error())
		return codeRunResponse{}, fmt.Errorf("Judge0 execution failed: %w", err)
	}
	return resp, nil
}

func (s *Server) loadQuestionBodyForAttempt(ctx context.Context, attemptID uuid.UUID, userID int64, examQuestionID uuid.UUID) ([]byte, error) {
	var body []byte
	err := s.pool.QueryRow(ctx, `
		SELECT qv.body
		FROM attempts a
		JOIN exam_questions eq
		     ON eq.exam_version_id = a.exam_version_id
		    AND eq.id = $2
		JOIN question_versions qv ON qv.id = eq.question_version_id
		WHERE a.id = $1
		  AND a.candidate_user_id = $3
		  AND a.status IN ('started','in_progress','paused')
	`, attemptID, examQuestionID, userID).Scan(&body)
	return body, err
}

func actionForRunMode(mode string) string {
	switch mode {
	case "custom":
		return assessmentcoding.ActionRunCustom
	case "final":
		return assessmentcoding.ActionSubmit
	default:
		return assessmentcoding.ActionRunTests
	}
}

func (s *Server) ensureLanguageEntitled(ctx context.Context, userID int64, langSlug string) error {
	if s.plugins == nil {
		return nil
	}
	m := s.plugins.BySlug(langSlug)
	if m == nil || !m.IsLanguage() {
		return errors.New("unsupported language")
	}
	ok, err := s.plugins.IsLanguageEntitledForUser(ctx, userID, langSlug)
	if err != nil {
		return err
	}
	if !ok {
		return errLanguageNotEntitled
	}
	return nil
}

func (s *Server) ensureRunnerAvailable(ctx context.Context) error {
	if s.plugins == nil {
		return nil
	}
	ok, err := s.plugins.IsPluginAvailable(ctx, runnerjudge0.Slug)
	if err != nil {
		return err
	}
	if !ok {
		return errRunnerUnavailable
	}
	return nil
}

func (s *Server) legacyItemRefForLanguage(langSlug string) string {
	if s.plugins == nil {
		return ""
	}
	m := s.plugins.BySlug(runnerjudge0.NormalizeLanguageSlug(langSlug))
	if m == nil {
		return ""
	}
	cfg, err := m.DecodeLanguageConfig()
	if err != nil {
		return ""
	}
	return runnerjudge0.LegacyItemRef(cfg)
}

func writeLanguageErr(w http.ResponseWriter, err error) {
	if errors.Is(err, errLanguageNotEntitled) {
		writeJSON(w, http.StatusForbidden, map[string]string{
			"error": "LANGUAGE_NOT_ENTITLED",
		})
		return
	}
	writeError(w, http.StatusBadRequest, err.Error())
}

func writeCodeRunErr(w http.ResponseWriter, err error) {
	status, body := codeRunErrResponse(err)
	writeJSON(w, status, body)
}

func codeRunErrResponse(err error) (int, json.RawMessage) {
	var validationErrs assessmentcoding.ValidationErrors
	if errors.As(err, &validationErrs) {
		body, _ := json.Marshal(map[string]any{"errors": validationErrs})
		return http.StatusUnprocessableEntity, body
	}
	status := http.StatusInternalServerError
	var msg string
	switch {
	case errors.Is(err, errLanguageNotEntitled):
		status = http.StatusForbidden
		msg = "LANGUAGE_NOT_ENTITLED"
	case errors.Is(err, pgx.ErrNoRows):
		status = http.StatusNotFound
		msg = "active attempt/question not found"
	case errors.Is(err, errCodeRunnerBusy):
		status = http.StatusTooManyRequests
		msg = errCodeRunnerBusy.Error()
	case errors.Is(err, errNoTestCases):
		status = http.StatusBadRequest
		msg = errNoTestCases.Error()
	case errors.Is(err, errRunnerUnavailable):
		status = http.StatusServiceUnavailable
		msg = errRunnerUnavailable.Error()
	case strings.Contains(err.Error(), "Judge0 execution failed"):
		status = http.StatusBadGateway
		msg = err.Error()
	default:
		msg = err.Error()
	}
	body, _ := json.Marshal(map[string]string{"error": msg})
	return status, body
}

func (s *Server) loadRunTests(ctx context.Context, attemptID uuid.UUID, userID int64, examQuestionID uuid.UUID, mode string, language string) ([]dbTestCase, error) {
	itemRef := s.legacyItemRefForLanguage(language)
	if itemRef == "" {
		itemRef = "coding:" + runnerjudge0.LegacyLanguageName(language)
	}
	var exists int
	// 'submitted' is included so the post-submit final-evaluation pass can
	// still load the graded test cases — the attempt is already 'submitted'
	// by then. The live run path is gated to active attempts elsewhere
	// (loadQuestionBodyForAttempt), so this does not loosen it.
	err := s.pool.QueryRow(ctx, `
		SELECT 1
		FROM attempts a
		JOIN exam_assignments assign ON assign.id = a.assignment_id
		JOIN exam_questions eq
		     ON eq.exam_version_id = a.exam_version_id
		    AND eq.id = $2
		WHERE a.id = $1
		  AND a.candidate_user_id = $3
		  AND a.status IN ('started','in_progress','paused','submitted')
		  AND (
		      assign.assignment_ref IS NULL
		      OR assign.assignment_ref = $4
		  )
	`, attemptID, examQuestionID, userID, itemRef).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if mode != "tests" && mode != "final" {
		return nil, nil
	}
	rows, err := s.pool.Query(ctx, `
		SELECT tc.id, tc.ordinal, COALESCE(tc.name, ''), tc.stdin, tc.expected_stdout,
		       tc.comparator, tc.comparator_config
		FROM exam_questions eq
		JOIN question_test_cases tc ON tc.question_version_id = eq.question_version_id
		WHERE eq.id = $1
		  AND ($2 = 'final' OR tc.is_hidden = false)
		ORDER BY tc.ordinal
	`, examQuestionID, mode)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	tests := []dbTestCase{}
	for rows.Next() {
		var tc dbTestCase
		if err := rows.Scan(&tc.ID, &tc.Ordinal, &tc.Name, &tc.Stdin, &tc.Expected, &tc.Comparator, &tc.ComparatorConfig); err != nil {
			return nil, err
		}
		tests = append(tests, tc)
	}
	return tests, rows.Err()
}

// persistRunStart records a code run. When reuseAnswer is false (the live
// run-tests / run-custom path) it first writes the candidate's current code
// as the answer-of-record. When true (the post-submit final-evaluation pass)
// the answer was already frozen at submit time, so it is left untouched and
// only the code_submissions rows are written.
func (s *Server) persistRunStart(
	ctx context.Context,
	userID int64,
	attemptID uuid.UUID,
	examQuestionID uuid.UUID,
	req codeRunRequest,
	reuseAnswer bool,
) (uuid.UUID, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return uuid.Nil, err
	}
	defer tx.Rollback(ctx)

	if !reuseAnswer {
		payload, _ := json.Marshal(map[string]any{
			"language":    req.Language,
			"files":       req.Files,
			"entryFile":   req.EntryFile,
			"lastRunMode": req.Mode,
		})
		if _, err := s.saveAnswerTx(ctx, tx, userID, attemptID, examQuestionID, "attempted", payload); err != nil {
			return uuid.Nil, err
		}
	}
	var answerID uuid.UUID
	if err := tx.QueryRow(ctx, `
		SELECT id
		FROM answers
		WHERE attempt_id = $1 AND exam_question_id = $2
	`, attemptID, examQuestionID).Scan(&answerID); err != nil {
		return uuid.Nil, err
	}

	submissionID := uuid.New()
	totalBytes := 0
	for _, f := range req.Files {
		totalBytes += len([]byte(f.Content))
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO code_submissions (id, answer_id, language, entry_path, total_bytes)
		VALUES ($1, $2, $3, $4, $5)
	`, submissionID, answerID, req.Language, req.EntryFile, totalBytes); err != nil {
		return uuid.Nil, err
	}
	for _, f := range req.Files {
		if _, err := tx.Exec(ctx, `
			INSERT INTO code_submission_files (submission_id, path, content, is_read_only, language)
			VALUES ($1, $2, $3, $4, $5)
		`, submissionID, f.Path, f.Content, f.ReadOnly, nullEmpty(f.Language)); err != nil {
			return uuid.Nil, err
		}
	}

	runID := uuid.New()
	if _, err := tx.Exec(ctx, `
		INSERT INTO code_runs (
		    id, attempt_id, answer_id, submission_id, mode,
		    judge0_status_desc, custom_stdin, started_at
		)
		VALUES ($1, $2, $3, $4, $5, 'Queued', $6, now())
	`, runID, attemptID, answerID, submissionID, req.Mode, nullableCustomStdin(req)); err != nil {
		return uuid.Nil, err
	}
	if err := s.recordAttemptEventTx(ctx, tx, attemptID, "code_run_started", 0, &examQuestionID, map[string]any{
		"runId":      runID.String(),
		"mode":       req.Mode,
		"language":   req.Language,
		"entryFile":  req.EntryFile,
		"fileCount":  len(req.Files),
		"totalBytes": totalBytes,
	}); err != nil {
		return uuid.Nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return uuid.Nil, err
	}
	return runID, nil
}

func (s *Server) executeJudge0(
	ctx context.Context,
	runID uuid.UUID,
	req codeRunRequest,
	payload map[string]any,
	tests []dbTestCase,
) (codeRunResponse, error) {
	if req.Mode == "custom" {
		r, err := s.postJudge0(ctx, payload, req.CustomStdin)
		if err != nil {
			return codeRunResponse{}, err
		}
		resp := responseForSingleRun(runID, r)
		if err := s.persistRunFinish(ctx, runID, req.Mode, []judge0Result{r}, nil, resp); err != nil {
			return codeRunResponse{}, err
		}
		return resp, nil
	}

	results := make([]judge0Result, 0, len(tests))
	testDTOs := make([]codeTestResultDTO, 0, len(tests))
	passCount := 0
	var firstFail *judge0Result
	for _, tc := range tests {
		r, err := s.postJudge0(ctx, payload, tc.Stdin)
		if err != nil {
			return codeRunResponse{}, err
		}
		results = append(results, r)
		actual := strings.TrimSpace(r.Stdout)
		if actual == "" {
			actual = strings.TrimSpace(stderrForJudge0(r))
		}
		if actual == "" {
			actual = r.Status.Description
		}
		passed := false
		if r.Status.ID == 3 {
			if ok, err := evaluationtestcase.Compare(tc.Comparator, tc.Expected, r.Stdout, tc.ComparatorConfig); err == nil {
				passed = ok
			}
		}
		if passed {
			passCount++
		} else if firstFail == nil {
			fail := r
			firstFail = &fail
		}
		testDTOs = append(testDTOs, codeTestResultDTO{
			Input:    tc.Stdin,
			Expected: tc.Expected,
			Passed:   passed,
			Actual:   actual,
			Time:     formatJudge0Time(r.Time),
		})
	}

	runType := "success"
	stderr := ""
	if passCount != len(tests) {
		runType = "partial"
		if firstFail != nil {
			runType = mapJudge0Type(firstFail.Status.ID, true)
			if runType == "success" {
				runType = "partial"
			}
			stderr = stderrForJudge0(*firstFail)
		}
	}
	resp := codeRunResponse{
		Type:        runType,
		Stdout:      strings.Join(mapJudge0Stdout(results), "\n---\n"),
		Stderr:      stderr,
		TestResults: testDTOs,
		Time:        formatJudge0TimeString(totalJudge0Time(results)),
		Memory:      formatJudge0Memory(peakJudge0Memory(results)),
		Summary:     fmt.Sprintf("%d/%d test cases passed.", passCount, len(tests)),
		RunID:       runID.String(),
	}
	if passCount == len(tests) {
		resp.Summary = "All test cases passed."
	}
	if err := s.persistRunFinish(ctx, runID, req.Mode, results, tests, resp); err != nil {
		return codeRunResponse{}, err
	}
	return resp, nil
}

func (s *Server) persistRunFinish(
	ctx context.Context,
	runID uuid.UUID,
	mode string,
	results []judge0Result,
	tests []dbTestCase,
	resp codeRunResponse,
) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var attemptID uuid.UUID
	if err := tx.QueryRow(ctx, `SELECT attempt_id FROM code_runs WHERE id = $1`, runID).Scan(&attemptID); err != nil {
		return err
	}

	statusID := 3
	statusDesc := "Accepted"
	token := ""
	stdout := resp.Stdout
	stderr := resp.Stderr
	compileOutput := ""
	var timeSeconds any
	var memoryKB any
	for _, r := range results {
		if token == "" {
			token = r.Token
		}
		if r.Status.ID != 3 {
			statusID = r.Status.ID
			statusDesc = r.Status.Description
			if stderr == "" {
				stderr = stderrForJudge0(r)
			}
			if compileOutput == "" {
				compileOutput = r.CompileOutput
			}
			break
		}
		statusDesc = r.Status.Description
	}
	if total := totalJudge0Time(results); total > 0 {
		timeSeconds = total
	}
	if peak := peakJudge0Memory(results); peak > 0 {
		memoryKB = peak
	}
	if _, err := tx.Exec(ctx, `
		UPDATE code_runs
		SET judge0_token = $2,
		    judge0_status_id = $3,
		    judge0_status_desc = $4,
		    stdout = $5,
		    stderr = $6,
		    compile_output = $7,
		    time_seconds = $8,
		    memory_kb = $9,
		    finished_at = now()
		WHERE id = $1
	`, runID, nullEmpty(token), statusID, statusDesc, nullEmpty(stdout),
		nullEmpty(stderr), nullEmpty(compileOutput), timeSeconds, memoryKB); err != nil {
		return err
	}

	if mode == "tests" || mode == "final" {
		for i, tc := range tests {
			if i >= len(resp.TestResults) {
				break
			}
			var tcTime any
			var tcMemory any
			if i < len(results) {
				if seconds := judge0Seconds(results[i].Time); seconds > 0 {
					tcTime = seconds
				}
				if results[i].Memory != nil {
					tcMemory = *results[i].Memory
				}
			}
			if _, err := tx.Exec(ctx, `
				INSERT INTO code_run_test_results (
				    id, code_run_id, test_case_id, ordinal, passed,
				    actual_stdout, expected_stdout, time_seconds, memory_kb
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			`, uuid.New(), runID, tc.ID, tc.Ordinal, resp.TestResults[i].Passed,
				resp.TestResults[i].Actual, tc.Expected, tcTime, tcMemory); err != nil {
				return err
			}
		}
	}
	severity := int16(0)
	if resp.Type == "partial" {
		severity = 1
	} else if resp.Type != "success" {
		severity = 2
	}
	if err := s.recordAttemptEventTx(ctx, tx, attemptID, "code_run_finished", severity, nil, map[string]any{
		"runId":       runID.String(),
		"mode":        mode,
		"type":        resp.Type,
		"summary":     resp.Summary,
		"statusId":    statusID,
		"status":      statusDesc,
		"testResults": len(resp.TestResults),
	}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *Server) finishRunWithError(ctx context.Context, runID uuid.UUID, msg string) error {
	ctx, cancel := contextWithTimeout(ctx, 3*time.Second)
	defer cancel()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var attemptID uuid.UUID
	if err := tx.QueryRow(ctx, `SELECT attempt_id FROM code_runs WHERE id = $1`, runID).Scan(&attemptID); err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
		UPDATE code_runs
		SET judge0_status_desc = 'Engine error',
		    stderr = $2,
		    finished_at = now()
		WHERE id = $1
	`, runID, msg)
	if err != nil {
		return err
	}
	if err := s.recordAttemptEventTx(ctx, tx, attemptID, "code_run_failed", 2, nil, map[string]any{
		"runId": runID.String(),
		"error": msg,
	}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *Server) postJudge0(ctx context.Context, payload map[string]any, stdin string) (judge0Result, error) {
	return runnerjudge0.Client{
		BaseURL:    judge0BaseURL(),
		HTTPClient: s.judgeHTTPClient,
	}.Post(ctx, payload, stdin)
}

func (s *Server) buildJudge0Payload(req codeRunRequest) (map[string]any, error) {
	files := make([]runnerjudge0.File, 0, len(req.Files))
	for _, f := range req.Files {
		files = append(files, runnerjudge0.File{
			Path:     f.Path,
			Content:  f.Content,
			ReadOnly: f.ReadOnly,
			Language: f.Language,
		})
	}
	return runnerjudge0.BuildPayload(runnerjudge0.NewRuntime(s.plugins), runnerjudge0.PayloadRequest{
		Language:  req.Language,
		Files:     files,
		EntryFile: req.EntryFile,
	})
}

func responseForSingleRun(runID uuid.UUID, r judge0Result) codeRunResponse {
	return codeRunResponse{
		Type:    mapJudge0Type(r.Status.ID, false),
		Stdout:  r.Stdout,
		Stderr:  stderrForJudge0(r),
		Time:    formatJudge0Time(r.Time),
		Memory:  formatJudge0Memory(pointerMemory(r.Memory)),
		Summary: headlineForJudge0(r.Status),
		RunID:   runID.String(),
	}
}

func stderrForJudge0(r judge0Result) string {
	if r.CompileOutput != "" {
		return r.CompileOutput
	}
	if r.Stderr != "" {
		return r.Stderr
	}
	return r.Message
}

func mapJudge0Type(statusID int, hasFailingTests bool) string {
	if statusID == 3 {
		if hasFailingTests {
			return "partial"
		}
		return "success"
	}
	if statusID == 4 {
		return "partial"
	}
	if statusID == 5 {
		return "timeout"
	}
	if statusID == 6 {
		return "compile-error"
	}
	return "error"
}

func headlineForJudge0(status judge0Status) string {
	if status.ID == 3 {
		return "Accepted"
	}
	if status.ID == 6 {
		return "Compile Error"
	}
	if status.ID == 5 {
		return "Time Limit Exceeded"
	}
	if status.Description != "" {
		return status.Description
	}
	return "Error"
}

func formatJudge0Time(v *string) string {
	if v == nil || *v == "" {
		return "0ms"
	}
	return formatJudge0TimeString(judge0Seconds(v))
}

func formatJudge0TimeString(seconds float64) string {
	ms := int(seconds*1000 + 0.5)
	if ms >= 1000 {
		return fmt.Sprintf("%.2fs", float64(ms)/1000)
	}
	return fmt.Sprintf("%dms", ms)
}

func formatJudge0Memory(kb int) string {
	if kb <= 0 {
		return "0 MB"
	}
	if kb >= 1024 {
		return fmt.Sprintf("%.1f MB", float64(kb)/1024)
	}
	return fmt.Sprintf("%d KB", kb)
}

func judge0Seconds(v *string) float64 {
	if v == nil || *v == "" {
		return 0
	}
	seconds, _ := strconv.ParseFloat(*v, 64)
	return seconds
}

func totalJudge0Time(results []judge0Result) float64 {
	total := 0.0
	for _, r := range results {
		total += judge0Seconds(r.Time)
	}
	return total
}

func peakJudge0Memory(results []judge0Result) int {
	peak := 0
	for _, r := range results {
		if r.Memory != nil && *r.Memory > peak {
			peak = *r.Memory
		}
	}
	return peak
}

func pointerMemory(v *int) int {
	if v == nil {
		return 0
	}
	return *v
}

func judge0BaseURL() string {
	if v := strings.TrimRight(os.Getenv("JUDGE0_URL"), "/"); v != "" {
		return v
	}
	return "http://localhost:2358"
}

func nullEmpty(v string) any {
	if v == "" {
		return nil
	}
	return v
}

func nullableCustomStdin(req codeRunRequest) any {
	if req.Mode != "custom" {
		return nil
	}
	return req.CustomStdin
}

func validCodingLanguage(v string) bool {
	return strings.HasPrefix(runnerjudge0.NormalizeLanguageSlug(v), "language.")
}

func validateCodeRunRequest(req *codeRunRequest, allowFinal bool) error {
	if req.Mode != "custom" && req.Mode != "tests" && !(allowFinal && req.Mode == "final") {
		if allowFinal {
			return errors.New("mode must be custom, tests, or final")
		}
		return errors.New("mode must be custom or tests")
	}
	if !validCodingLanguage(req.Language) {
		return errors.New("unsupported language")
	}
	if len(req.Files) == 0 {
		return errors.New("files are required")
	}
	if len(req.Files) > maxCodeFiles {
		return errors.New("too many files")
	}
	if len(req.CustomStdin) > 64<<10 {
		return errors.New("custom stdin is too large")
	}
	seen := map[string]struct{}{}
	totalBytes := 0
	for i := range req.Files {
		req.Files[i].Path = strings.TrimSpace(req.Files[i].Path)
		if req.Files[i].Path == "" {
			return errors.New("file path is required")
		}
		if len(req.Files[i].Path) > maxCodeFilePathBytes {
			return errors.New("file path is too long")
		}
		if !isSafeCandidatePath(req.Files[i].Path) {
			return errors.New("invalid file path")
		}
		if _, ok := seen[req.Files[i].Path]; ok {
			return errors.New("duplicate file path")
		}
		seen[req.Files[i].Path] = struct{}{}
		totalBytes += len([]byte(req.Files[i].Content))
	}
	if totalBytes > maxCandidateSourceBytes {
		return errors.New("source too large")
	}
	if req.EntryFile == "" {
		req.EntryFile = firstWritableFile(req.Files)
	}
	if req.EntryFile == "" {
		return errors.New("entry file is required")
	}
	if _, ok := seen[req.EntryFile]; !ok {
		return errors.New("entry file not found")
	}
	return nil
}

func firstWritableFile(files []codeFileDTO) string {
	for _, f := range files {
		if !f.ReadOnly {
			return f.Path
		}
	}
	if len(files) > 0 {
		return files[0].Path
	}
	return ""
}

func mapJudge0Stdout(results []judge0Result) []string {
	out := make([]string, 0, len(results))
	for _, r := range results {
		out = append(out, r.Stdout)
	}
	return out
}

func isSafeCandidatePath(p string) bool {
	if p == "" || strings.Contains(p, "\\") || strings.HasPrefix(p, "/") {
		return false
	}
	clean := path.Clean(p)
	if clean == "." || clean == ".." || strings.HasPrefix(clean, "../") {
		return false
	}
	return clean == p
}
