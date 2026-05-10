package server

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/originbi/exam-engine/internal/auth"
)

type codeFileDTO struct {
	Path     string `json:"path"`
	Content  string `json:"content"`
	ReadOnly bool   `json:"readOnly,omitempty"`
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
	ID       uuid.UUID
	Ordinal  int
	Name     string
	Stdin    string
	Expected string
}

type judge0Status struct {
	ID          int    `json:"id"`
	Description string `json:"description"`
}

type judge0RawResult struct {
	Stdout        *string      `json:"stdout"`
	Stderr        *string      `json:"stderr"`
	CompileOutput *string      `json:"compile_output"`
	Message       *string      `json:"message"`
	Status        judge0Status `json:"status"`
	Time          *string      `json:"time"`
	Memory        *int         `json:"memory"`
	Token         string       `json:"token"`
}

type judge0Result struct {
	Stdout        string
	Stderr        string
	CompileOutput string
	Message       string
	Status        judge0Status
	Time          *string
	Memory        *int
	Token         string
}

const (
	maxCodeFiles            = 24
	maxCodeFilePathBytes    = 255
	maxCandidateSourceBytes = 256 << 10
)

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
	req.Language = strings.ToLower(strings.TrimSpace(req.Language))
	req.EntryFile = strings.TrimSpace(req.EntryFile)
	if err := validateCodeRunRequest(&req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	ctx, cancel := contextWithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	tests, err := s.loadRunTests(ctx, attemptID, principal.UserID, examQuestionID, req.Mode, req.Language)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "active attempt/question not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "testcase lookup failed")
		return
	}
	if req.Mode == "tests" && len(tests) == 0 {
		writeError(w, http.StatusBadRequest, "no test cases defined")
		return
	}

	select {
	case s.codeRunSem <- struct{}{}:
		defer func() { <-s.codeRunSem }()
	default:
		_ = s.recordAttemptEvent(r.Context(), attemptID, "code_run_rejected", 2, &examQuestionID, map[string]any{
			"reason":   "engine_busy",
			"mode":     req.Mode,
			"language": req.Language,
		})
		writeError(w, http.StatusTooManyRequests, "code runner is busy; retry shortly")
		return
	}

	runID, err := s.persistRunStart(ctx, principal.UserID, attemptID, examQuestionID, req)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "active attempt/question not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "run persistence failed")
		return
	}

	payload, err := buildJudge0Payload(req)
	if err != nil {
		_ = s.finishRunWithError(r.Context(), runID, err.Error())
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	runCtx, runCancel := context.WithTimeout(r.Context(), 90*time.Second)
	defer runCancel()
	resp, err := s.executeJudge0(runCtx, runID, req, payload, tests)
	if err != nil {
		_ = s.finishRunWithError(r.Context(), runID, err.Error())
		writeError(w, http.StatusBadGateway, "Judge0 execution failed: "+err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) loadRunTests(ctx context.Context, attemptID uuid.UUID, userID int64, examQuestionID uuid.UUID, mode string, language string) ([]dbTestCase, error) {
	var exists int
	err := s.pool.QueryRow(ctx, `
		SELECT 1
		FROM attempts a
		JOIN exam_assignments assign ON assign.id = a.assignment_id
		JOIN exam_questions eq
		     ON eq.exam_version_id = a.exam_version_id
		    AND eq.id = $2
		WHERE a.id = $1
		  AND a.candidate_user_id = $3
		  AND a.status IN ('started','in_progress','paused')
		  AND (
		      assign.assignment_ref IS NULL
		      OR assign.assignment_ref = 'coding:' || $4
		  )
	`, attemptID, examQuestionID, userID, language).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if mode != "tests" {
		return nil, nil
	}
	rows, err := s.pool.Query(ctx, `
		SELECT tc.id, tc.ordinal, COALESCE(tc.name, ''), tc.stdin, tc.expected_stdout
		FROM exam_questions eq
		JOIN question_test_cases tc ON tc.question_version_id = eq.question_version_id
		WHERE eq.id = $1
		  AND tc.is_hidden = false
		ORDER BY tc.ordinal
	`, examQuestionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	tests := []dbTestCase{}
	for rows.Next() {
		var tc dbTestCase
		if err := rows.Scan(&tc.ID, &tc.Ordinal, &tc.Name, &tc.Stdin, &tc.Expected); err != nil {
			return nil, err
		}
		tests = append(tests, tc)
	}
	return tests, rows.Err()
}

func (s *Server) persistRunStart(
	ctx context.Context,
	userID int64,
	attemptID uuid.UUID,
	examQuestionID uuid.UUID,
	req codeRunRequest,
) (uuid.UUID, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return uuid.Nil, err
	}
	defer tx.Rollback(ctx)

	payload, _ := json.Marshal(map[string]any{
		"language":    req.Language,
		"files":       req.Files,
		"entryFile":   req.EntryFile,
		"lastRunMode": req.Mode,
	})
	if _, err := s.saveAnswerTx(ctx, tx, userID, attemptID, examQuestionID, "attempted", payload); err != nil {
		return uuid.Nil, err
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
			INSERT INTO code_submission_files (submission_id, path, content, is_read_only)
			VALUES ($1, $2, $3, $4)
		`, submissionID, f.Path, f.Content, f.ReadOnly); err != nil {
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
		passed := r.Status.ID == 3 && strings.TrimSpace(r.Stdout) == strings.TrimSpace(tc.Expected)
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

	if mode == "tests" {
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
	body := cloneMap(payload)
	body["stdin"] = encodeBase64(stdin)
	raw, err := json.Marshal(body)
	if err != nil {
		return judge0Result{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, judge0BaseURL()+"/submissions?base64_encoded=true&wait=true", bytes.NewReader(raw))
	if err != nil {
		return judge0Result{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := s.judgeHTTPClient.Do(req)
	if err != nil {
		return judge0Result{}, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return judge0Result{}, fmt.Errorf("status %d", res.StatusCode)
	}
	var rawResult judge0RawResult
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&rawResult); err != nil {
		return judge0Result{}, err
	}
	return decodeJudge0(rawResult), nil
}

func buildJudge0Payload(req codeRunRequest) (map[string]any, error) {
	languageID, source, sourceIsBase64, err := submissionSource(req.Language, req.Files, req.EntryFile)
	if err != nil {
		return nil, err
	}
	body := map[string]any{
		"language_id":                  languageID,
		"cpu_time_limit":               3,
		"wall_time_limit":              8,
		"memory_limit":                 131072,
		"stack_limit":                  32768,
		"max_processes_and_or_threads": 32,
		"max_file_size":                1024,
	}
	if languageID == 89 {
		body["source_code"] = ""
		body["additional_files"] = source
	} else if sourceIsBase64 {
		body["source_code"] = source
	} else {
		body["source_code"] = encodeBase64(source)
	}
	return body, nil
}

func submissionSource(lang string, files []codeFileDTO, entryFile string) (int, string, bool, error) {
	if lang == "javascript" {
		return 63, inlineJavaScript(files, entryFile), false, nil
	}
	execFiles := executableFiles(files)
	if len(execFiles) > 1 {
		zipB64, err := buildMultiFileZip(lang, execFiles, entryFile)
		return 89, zipB64, true, err
	}
	ids := map[string]int{
		"python": 71,
		"java":   62,
		"cpp":    54,
		"c":      50,
	}
	id, ok := ids[lang]
	if !ok {
		return 0, "", false, errors.New("unsupported language")
	}
	if len(execFiles) > 0 {
		return id, execFiles[0].Content, false, nil
	}
	return id, files[0].Content, false, nil
}

func buildMultiFileZip(lang string, files []codeFileDTO, entryFile string) (string, error) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	for _, f := range files {
		name := safeZipPath(f.Path)
		if name == "" {
			continue
		}
		w, err := zw.Create(name)
		if err != nil {
			return "", err
		}
		if _, err := w.Write([]byte(f.Content)); err != nil {
			return "", err
		}
	}
	scripts := runScriptsFor(lang, files, entryFile)
	if err := addExecutableZipFile(zw, "run", scripts["run"]); err != nil {
		return "", err
	}
	if compile := scripts["compile"]; compile != "" {
		if err := addExecutableZipFile(zw, "compile", compile); err != nil {
			return "", err
		}
	}
	if err := zw.Close(); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(buf.Bytes()), nil
}

func addExecutableZipFile(zw *zip.Writer, name string, content string) error {
	h := &zip.FileHeader{Name: name, Method: zip.Deflate}
	h.SetMode(0755)
	w, err := zw.CreateHeader(h)
	if err != nil {
		return err
	}
	_, err = w.Write([]byte(content))
	return err
}

func runScriptsFor(lang string, files []codeFileDTO, entryFile string) map[string]string {
	entry := entryFile
	if entry == "" {
		entry = firstWritableFile(files)
	}
	switch lang {
	case "python":
		return map[string]string{"run": fmt.Sprintf("#!/bin/sh\nexec python3 %q\n", entry)}
	case "java":
		mainClass := javaMainClass(files, entry)
		return map[string]string{
			"compile": "#!/bin/sh\nset -e\njavac $(find . -name '*.java')\n",
			"run":     fmt.Sprintf("#!/bin/sh\nexec java -cp . %s\n", mainClass),
		}
	case "cpp":
		return map[string]string{
			"compile": "#!/bin/sh\nset -e\ng++ -O2 -std=c++17 $(find . -name '*.cpp') -o main\n",
			"run":     "#!/bin/sh\nexec ./main\n",
		}
	case "c":
		return map[string]string{
			"compile": "#!/bin/sh\nset -e\ngcc -O2 $(find . -name '*.c') -o main\n",
			"run":     "#!/bin/sh\nexec ./main\n",
		}
	default:
		return map[string]string{"run": fmt.Sprintf("#!/bin/sh\nexec cat %q\n", entry)}
	}
}

func inlineJavaScript(files []codeFileDTO, entryFile string) string {
	entry := findFile(files, entryFile)
	if entry == nil {
		for i := range files {
			if strings.HasSuffix(files[i].Path, ".js") && !files[i].ReadOnly {
				entry = &files[i]
				break
			}
		}
	}
	if entry == nil {
		return files[0].Content
	}
	helpers := []string{}
	for i := range files {
		if files[i].Path == entry.Path || !strings.HasSuffix(files[i].Path, ".js") || files[i].ReadOnly {
			continue
		}
		helpers = append(helpers, "// --- "+files[i].Path+" ---\n"+stripJSExports(files[i].Content))
	}
	entrySource := stripRelativeRequires(entry.Content)
	return strings.Join(append(helpers, "// --- "+entry.Path+" ---\n"+entrySource), "\n\n")
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

func decodeJudge0(raw judge0RawResult) judge0Result {
	return judge0Result{
		Stdout:        decodeMaybeBase64(raw.Stdout),
		Stderr:        decodeMaybeBase64(raw.Stderr),
		CompileOutput: decodeMaybeBase64(raw.CompileOutput),
		Message:       decodeMaybeBase64(raw.Message),
		Status:        raw.Status,
		Time:          raw.Time,
		Memory:        raw.Memory,
		Token:         raw.Token,
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

func decodeMaybeBase64(v *string) string {
	if v == nil || *v == "" {
		return ""
	}
	bytes, err := base64.StdEncoding.DecodeString(*v)
	if err != nil {
		return *v
	}
	return string(bytes)
}

func encodeBase64(v string) string {
	return base64.StdEncoding.EncodeToString([]byte(v))
}

func judge0BaseURL() string {
	if v := strings.TrimRight(os.Getenv("JUDGE0_URL"), "/"); v != "" {
		return v
	}
	return "http://localhost:2358"
}

func cloneMap(in map[string]any) map[string]any {
	out := make(map[string]any, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
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
	switch v {
	case "python", "java", "cpp", "javascript", "c":
		return true
	default:
		return false
	}
}

func validateCodeRunRequest(req *codeRunRequest) error {
	if req.Mode != "custom" && req.Mode != "tests" {
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

func executableFiles(files []codeFileDTO) []codeFileDTO {
	out := []codeFileDTO{}
	for _, f := range files {
		if f.ReadOnly && !isSourcePath(f.Path) {
			continue
		}
		if isSourcePath(f.Path) {
			out = append(out, f)
		}
	}
	return out
}

func isSourcePath(p string) bool {
	switch path.Ext(p) {
	case ".py", ".js", ".java", ".cpp", ".cc", ".cxx", ".c", ".h", ".hpp":
		return true
	default:
		return false
	}
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

func findFile(files []codeFileDTO, p string) *codeFileDTO {
	for i := range files {
		if files[i].Path == p {
			return &files[i]
		}
	}
	return nil
}

func javaMainClass(files []codeFileDTO, entryFile string) string {
	if strings.HasSuffix(entryFile, ".java") {
		base := path.Base(entryFile)
		return strings.TrimSuffix(base, ".java")
	}
	re := regexp.MustCompile(`public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)`)
	for _, f := range files {
		if !strings.HasSuffix(f.Path, ".java") {
			continue
		}
		if m := re.FindStringSubmatch(f.Content); len(m) == 2 {
			return m[1]
		}
	}
	return "Main"
}

func stripJSExports(src string) string {
	reObject := regexp.MustCompile(`(?m)^\s*module\.exports\s*=\s*\{[^}]*\}\s*;?\s*$`)
	reSingle := regexp.MustCompile(`(?m)^\s*module\.exports\s*=\s*[A-Za-z_$][\w$]*\s*;?\s*$`)
	reNamed := regexp.MustCompile(`(?m)^\s*exports\.([A-Za-z_$][\w$]*)\s*=`)
	src = reObject.ReplaceAllString(src, "")
	src = reSingle.ReplaceAllString(src, "")
	return reNamed.ReplaceAllString(src, "const $1 =")
}

func stripRelativeRequires(src string) string {
	reDecl := regexp.MustCompile(`(?m)^\s*(?:const|let|var)\s+[^=;]+=\s*require\(\s*['"]\./[^'"]+['"]\s*\)\s*;?\s*$`)
	reBare := regexp.MustCompile(`(?m)^\s*require\(\s*['"]\./[^'"]+['"]\s*\)\s*;?\s*$`)
	src = reDecl.ReplaceAllString(src, "")
	return reBare.ReplaceAllString(src, "")
}

func mapJudge0Stdout(results []judge0Result) []string {
	out := make([]string, 0, len(results))
	for _, r := range results {
		out = append(out, r.Stdout)
	}
	return out
}

func safeZipPath(p string) string {
	clean := strings.TrimPrefix(path.Clean("/"+p), "/")
	if clean == "." || strings.HasPrefix(clean, "../") {
		return ""
	}
	return clean
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
