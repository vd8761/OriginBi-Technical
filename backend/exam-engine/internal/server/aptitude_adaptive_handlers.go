package server

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

type aptitudeBlockStartRequest struct {
	AssessmentID   int64  `json:"assessmentId"`
	AssessmentCode string `json:"assessmentCode"`
	UserID         int64  `json:"userId"`
	Mode           string `json:"mode"`
}

type aptitudeBlockNextRequest struct {
	Accuracy  float64           `json:"accuracy"`
	TimeTaken int               `json:"timeTaken"`
	Answers   map[string]string `json:"answers"`
}

type aptitudeBlockSubmitRequest struct {
	Answers map[string]string `json:"answers"`
}

type aptitudeBlockOption struct {
	ID   string `json:"id"`
	Text string `json:"text"`
}

type aptitudeBlockQuestion struct {
	ID            string                `json:"id"`
	Text          string                `json:"text"`
	Options       []aptitudeBlockOption `json:"options"`
	Difficulty    string                `json:"difficulty"`
	Category      string                `json:"category"`
	Marks         float64               `json:"marks"`
	NegativeMarks float64               `json:"negativeMarks"`
	ImageURL      *string               `json:"imageUrl,omitempty"`
}

type aptitudeBlockResponse struct {
	BlockID            int64                    `json:"blockId"`
	BlockNumber        int                      `json:"blockNumber"`
	Questions          []aptitudeBlockQuestion  `json:"questions"`
	Difficulty         string                   `json:"difficulty"`
	TimeLimit          int                      `json:"timeLimit"`
	IsAdaptive         bool                     `json:"isAdaptive"`
	NextBlockDifficulty *string                  `json:"nextBlockDifficulty,omitempty"`
}

type aptitudeBlockStartResponse struct {
	AttemptToken      string                 `json:"attemptToken"`
	ExpiresAt         time.Time              `json:"expiresAt"`
	DurationSeconds   int                    `json:"durationSeconds"`
	Mode              string                 `json:"mode"`
	BlockConfig       map[string]any         `json:"blockConfig"`
	CurrentBlock      aptitudeBlockResponse  `json:"currentBlock"`
	TotalBlocks       int                    `json:"totalBlocks"`
	QuestionsPerBlock int                    `json:"questionsPerBlock"`
	IsBlockBased      bool                   `json:"isBlockBased"`
	TotalQuestions    int                    `json:"totalQuestions"`
}

type aptitudeBlockNextResponse struct {
	CanProceed         bool                   `json:"canProceed"`
	NextBlock          *aptitudeBlockResponse `json:"nextBlock,omitempty"`
	NextBlockDifficulty string                 `json:"nextBlockDifficulty,omitempty"`
	Message            string                 `json:"message,omitempty"`
}

type aptitudeSubmitResponse struct {
	TotalScore       float64 `json:"totalScore"`
	PositiveScore    float64 `json:"positiveScore"`
	NegativeScore    float64 `json:"negativeScore"`
	CorrectCount     int     `json:"correctCount"`
	WrongCount       int     `json:"wrongCount"`
	Accuracy         float64 `json:"accuracy"`
	TimeTakenSeconds int     `json:"timeTakenSeconds"`
}

type aptitudeAssessment struct {
	AssessmentID       int64
	AssessmentCode     string
	TotalTimeMinutes   int
	TotalQuestions     int
	BlockConfigRaw     []byte
	AdaptiveConfigRaw  []byte
	CategoriesRaw      []byte
	NegativeMarkEnabled bool
	NegativeMarkValue  float64
}

type blockConfig struct {
	Enabled             bool
	BlocksPerAssessment int
	QuestionsPerBlock   int
}

type adaptiveConfig struct {
	Enabled             bool
	DifficultyProgress  string
	Strategy            string
}

func (s *Server) startAptitudeBlockBasedAttempt(w http.ResponseWriter, r *http.Request) {
	var req aptitudeBlockStartRequest
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}
	if req.Mode == "" {
		req.Mode = "main"
	}

	ctx, cancel := contextWithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db unavailable")
		return
	}
	defer tx.Rollback(ctx)

	assessment, err := loadAptitudeAssessment(ctx, tx, req.AssessmentID, req.AssessmentCode)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "assessment not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "assessment lookup failed")
		return
	}

	bConfig := parseBlockConfig(assessment.BlockConfigRaw)
	if !bConfig.Enabled {
		writeError(w, http.StatusBadRequest, "block-based mode is disabled")
		return
	}

	userID, err := resolveTechUserID(ctx, tx, req.UserID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "user not found")
		return
	}

	if err := ensureAdaptiveBlocks(ctx, tx, assessment.AssessmentID, bConfig.BlocksPerAssessment, parseAdaptiveConfig(assessment.AdaptiveConfigRaw).Enabled); err != nil {
		writeError(w, http.StatusInternalServerError, "adaptive blocks init failed")
		return
	}

	attemptToken := "APT-BLOCK-" + randomHex(10)
	shuffleSeed := randomHex(8)
	if assessment.TotalTimeMinutes <= 0 {
		assessment.TotalTimeMinutes = 60
	}
	now := time.Now().UTC()
	expiresAt := now.Add(time.Duration(assessment.TotalTimeMinutes) * time.Minute)

	var attemptID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO tech_aptitude_attempts (
		    assessment_id, user_id, attempt_token, shuffle_seed, status,
		    started_at, expires_at, created_at, updated_at
		) VALUES ($1, $2, $3, $4, 'in_progress', $5, $6, now(), now())
		RETURNING aptitude_attempt_id
	`, assessment.AssessmentID, userID, attemptToken, shuffleSeed, now, expiresAt).Scan(&attemptID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "attempt create failed")
		return
	}

	block, err := generateAptitudeBlock(ctx, tx, assessment, attemptID, attemptToken, userID, 1, bConfig)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "block generation failed")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "commit failed")
		return
	}

	blockConfigResp := map[string]any{
		"enabled":             bConfig.Enabled,
		"blocksPerAssessment": bConfig.BlocksPerAssessment,
		"questionsPerBlock":   bConfig.QuestionsPerBlock,
	}

	resp := aptitudeBlockStartResponse{
		AttemptToken:      attemptToken,
		ExpiresAt:         expiresAt,
		DurationSeconds:   assessment.TotalTimeMinutes * 60,
		Mode:              req.Mode,
		BlockConfig:       blockConfigResp,
		CurrentBlock:      block,
		TotalBlocks:       bConfig.BlocksPerAssessment,
		QuestionsPerBlock: bConfig.QuestionsPerBlock,
		IsBlockBased:      true,
		TotalQuestions:    len(block.Questions),
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) nextAptitudeBlock(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	blockNumber, err := strconv.Atoi(chi.URLParam(r, "blockNumber"))
	if err != nil || blockNumber < 1 {
		writeError(w, http.StatusBadRequest, "invalid block number")
		return
	}
	var req aptitudeBlockNextRequest
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}

	ctx, cancel := contextWithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db unavailable")
		return
	}
	defer tx.Rollback(ctx)

	attemptID, assessmentID, userID, _, err := loadAptitudeAttemptByToken(ctx, tx, token)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "attempt not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "attempt lookup failed")
		return
	}

	assessment, err := loadAptitudeAssessment(ctx, tx, assessmentID, "")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "assessment lookup failed")
		return
	}
	bConfig := parseBlockConfig(assessment.BlockConfigRaw)
	if !bConfig.Enabled {
		writeError(w, http.StatusBadRequest, "block-based mode is disabled")
		return
	}

	if err := updateBlockAnswers(ctx, tx, attemptID, req.Answers); err != nil {
		writeError(w, http.StatusBadRequest, "invalid answers")
		return
	}

	performance, err := finalizeBlockPerformance(ctx, tx, attemptID, token, assessment, blockNumber, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "block completion failed")
		return
	}

	if err := lockPreviousBlocks(ctx, tx, attemptID, blockNumber); err != nil {
		writeError(w, http.StatusInternalServerError, "lock previous blocks failed")
		return
	}

	if blockNumber >= bConfig.BlocksPerAssessment {
		if err := tx.Commit(ctx); err != nil {
			writeError(w, http.StatusInternalServerError, "commit failed")
			return
		}
		writeJSON(w, http.StatusOK, aptitudeBlockNextResponse{CanProceed: false, Message: "All blocks completed"})
		return
	}

	nextBlock, err := generateAptitudeBlock(ctx, tx, assessment, attemptID, token, userID, blockNumber+1, bConfig)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "next block generation failed")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "commit failed")
		return
	}

	resp := aptitudeBlockNextResponse{
		CanProceed:          true,
		NextBlock:           &nextBlock,
		NextBlockDifficulty: performance.NextDifficulty,
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) submitAptitudeBlockBasedAttempt(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	var req aptitudeBlockSubmitRequest
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}

	ctx, cancel := contextWithTimeout(r.Context(), 12*time.Second)
	defer cancel()

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db unavailable")
		return
	}
	defer tx.Rollback(ctx)

	attemptID, assessmentID, _, startedAt, err := loadAptitudeAttemptByToken(ctx, tx, token)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "attempt not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "attempt lookup failed")
		return
	}

	if err := updateBlockAnswers(ctx, tx, attemptID, req.Answers); err != nil {
		writeError(w, http.StatusBadRequest, "invalid answers")
		return
	}

	assessment, err := loadAptitudeAssessment(ctx, tx, assessmentID, "")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "assessment lookup failed")
		return
	}

	result, err := scoreAptitudeAttempt(ctx, tx, attemptID, assessment, startedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "scoring failed")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "commit failed")
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func loadAptitudeAssessment(ctx context.Context, tx pgx.Tx, assessmentID int64, assessmentCode string) (aptitudeAssessment, error) {
	var a aptitudeAssessment
	if assessmentID > 0 {
		err := tx.QueryRow(ctx, `
			SELECT assessment_id, assessment_code, total_time_minutes, total_questions,
			       block_config, adaptive_config, categories,
			       negative_mark_enabled, COALESCE(negative_mark_value, 0)
			FROM tech_assessments
			WHERE assessment_id = $1 AND module_type = 'aptitude'
		`, assessmentID).Scan(
			&a.AssessmentID, &a.AssessmentCode, &a.TotalTimeMinutes, &a.TotalQuestions,
			&a.BlockConfigRaw, &a.AdaptiveConfigRaw, &a.CategoriesRaw,
			&a.NegativeMarkEnabled, &a.NegativeMarkValue,
		)
		return a, err
	}
	assessmentCode = strings.TrimSpace(assessmentCode)
	return a, tx.QueryRow(ctx, `
		SELECT assessment_id, assessment_code, total_time_minutes, total_questions,
		       block_config, adaptive_config, categories,
		       negative_mark_enabled, COALESCE(negative_mark_value, 0)
		FROM tech_assessments
		WHERE assessment_code = $1 AND module_type = 'aptitude'
	`, assessmentCode).Scan(
		&a.AssessmentID, &a.AssessmentCode, &a.TotalTimeMinutes, &a.TotalQuestions,
		&a.BlockConfigRaw, &a.AdaptiveConfigRaw, &a.CategoriesRaw,
		&a.NegativeMarkEnabled, &a.NegativeMarkValue,
	)
}

func parseBlockConfig(raw []byte) blockConfig {
	cfg := blockConfig{Enabled: false, BlocksPerAssessment: 4, QuestionsPerBlock: 5}
	if len(raw) == 0 {
		return cfg
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		return cfg
	}
	cfg.Enabled = boolFromAny(m["enabled"])
	cfg.BlocksPerAssessment = intFromAny(m["blocksPerAssessment"], m["blocks_per_assessment"], cfg.BlocksPerAssessment)
	cfg.QuestionsPerBlock = intFromAny(m["questionsPerBlock"], m["questions_per_block"], cfg.QuestionsPerBlock)
	return cfg
}

func parseAdaptiveConfig(raw []byte) adaptiveConfig {
	cfg := adaptiveConfig{Enabled: false}
	if len(raw) == 0 {
		return cfg
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		return cfg
	}
	cfg.Enabled = boolFromAny(m["enabled"])
	if v, ok := m["difficultyProgression"].(string); ok {
		cfg.DifficultyProgress = v
	} else if v, ok := m["difficulty_progression"].(string); ok {
		cfg.DifficultyProgress = v
	}
	if v, ok := m["adaptationStrategy"].(string); ok {
		cfg.Strategy = v
	} else if v, ok := m["adaptation_strategy"].(string); ok {
		cfg.Strategy = v
	}
	return cfg
}

func parseCategories(raw []byte) []string {
	if len(raw) == 0 {
		return nil
	}
	var items []any
	if err := json.Unmarshal(raw, &items); err != nil {
		return nil
	}
	cats := make([]string, 0, len(items))
	for _, v := range items {
		switch t := v.(type) {
		case string:
			if t != "" {
				cats = append(cats, t)
			}
		case map[string]any:
			if name, ok := t["name"].(string); ok && name != "" {
				cats = append(cats, name)
				continue
			}
			if id, ok := t["id"].(string); ok && id != "" {
				cats = append(cats, id)
			}
		}
	}
	return cats
}

func ensureAdaptiveBlocks(ctx context.Context, tx pgx.Tx, assessmentID int64, blocks int, isAdaptive bool) error {
	var count int
	if err := tx.QueryRow(ctx, `
		SELECT COUNT(*) FROM adaptive_blocks WHERE assessment_id = $1
	`, assessmentID).Scan(&count); err != nil {
		return err
	}
	if count >= blocks {
		return nil
	}
	for i := 1; i <= blocks; i++ {
		_, err := tx.Exec(ctx, `
			INSERT INTO adaptive_blocks (assessment_id, block_number, difficulty_distribution, is_adaptive, status)
			VALUES ($1, $2, '{"easy":60,"medium":30,"hard":10}', $3, 'pending')
			ON CONFLICT (assessment_id, block_number) DO NOTHING
		`, assessmentID, i, isAdaptive)
		if err != nil {
			return err
		}
	}
	return nil
}

func generateAptitudeBlock(
	ctx context.Context,
	tx pgx.Tx,
	assessment aptitudeAssessment,
	attemptID int64,
	attemptToken string,
	userID int64,
	blockNumber int,
	bConfig blockConfig,
) (aptitudeBlockResponse, error) {
	categories := parseCategories(assessment.CategoriesRaw)
	if len(categories) == 0 {
		rows, err := tx.Query(ctx, `
			SELECT DISTINCT subcategory
			FROM tech_aptitude_questions
			WHERE assessment_id = $1 AND status = 'active'
		`, assessment.AssessmentID)
		if err != nil {
			return aptitudeBlockResponse{}, err
		}
		for rows.Next() {
			var c string
			if err := rows.Scan(&c); err != nil {
				rows.Close()
				return aptitudeBlockResponse{}, err
			}
			if c != "" {
				categories = append(categories, c)
			}
		}
		rows.Close()
	}

	easyCount, mediumCount, hardCount := difficultyMixForBlock(ctx, tx, attemptID, blockNumber, assessment)
	difficulties := make([]string, 0, bConfig.QuestionsPerBlock)
	for i := 0; i < easyCount; i++ {
		difficulties = append(difficulties, "easy")
	}
	for i := 0; i < mediumCount; i++ {
		difficulties = append(difficulties, "medium")
	}
	for i := 0; i < hardCount; i++ {
		difficulties = append(difficulties, "hard")
	}
	if len(difficulties) < bConfig.QuestionsPerBlock {
		for len(difficulties) < bConfig.QuestionsPerBlock {
			difficulties = append(difficulties, "medium")
		}
	}
	if len(difficulties) > bConfig.QuestionsPerBlock {
		difficulties = difficulties[:bConfig.QuestionsPerBlock]
	}

	categoryOrder := categoryOrderForBlock(ctx, tx, attemptID, categories, bConfig.QuestionsPerBlock)

	usedIDs, err := loadAttemptQuestionIDs(ctx, tx, attemptID)
	if err != nil {
		return aptitudeBlockResponse{}, err
	}

	questions := make([]aptitudeBlockQuestion, 0, bConfig.QuestionsPerBlock)
	for i := 0; i < bConfig.QuestionsPerBlock; i++ {
		difficulty := difficulties[i]
		category := categoryOrder[i%len(categoryOrder)]
		q, qID, err := selectAptitudeQuestion(ctx, tx, assessment.AssessmentID, attemptID, difficulty, category, usedIDs)
		if err != nil {
			return aptitudeBlockResponse{}, err
		}
		usedIDs = append(usedIDs, qID)
		questions = append(questions, q)

		displayOrder := (blockNumber-1)*bConfig.QuestionsPerBlock + (i + 1)
		_, err = tx.Exec(ctx, `
			INSERT INTO tech_aptitude_attempt_questions (
			    aptitude_attempt_id, aptitude_question_id, display_order,
			    block_number, block_sequence_order, is_locked
			) VALUES ($1, $2, $3, $4, $5, false)
			ON CONFLICT (aptitude_attempt_id, aptitude_question_id) DO NOTHING
		`, attemptID, qID, displayOrder, blockNumber, i+1)
		if err != nil {
			return aptitudeBlockResponse{}, err
		}
	}

	blockID, err := ensureBlockAttempt(ctx, tx, assessment.AssessmentID, attemptToken, userID, blockNumber, difficulties)
	if err != nil {
		return aptitudeBlockResponse{}, err
	}

	blockDifficulty := mixDifficultyLabel(easyCount, mediumCount, hardCount)
	isAdaptive := parseAdaptiveConfig(assessment.AdaptiveConfigRaw).Enabled
	return aptitudeBlockResponse{
		BlockID:     blockID,
		BlockNumber: blockNumber,
		Questions:   questions,
		Difficulty:  blockDifficulty,
		TimeLimit:   bConfig.QuestionsPerBlock * 2,
		IsAdaptive:  isAdaptive,
	}, nil
}

func loadAttemptQuestionIDs(ctx context.Context, tx pgx.Tx, attemptID int64) ([]int64, error) {
	rows, err := tx.Query(ctx, `
		SELECT aptitude_question_id
		FROM tech_aptitude_attempt_questions
		WHERE aptitude_attempt_id = $1
	`, attemptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func ensureBlockAttempt(
	ctx context.Context,
	tx pgx.Tx,
	assessmentID int64,
	attemptToken string,
	userID int64,
	blockNumber int,
	difficulties []string,
) (int64, error) {
	var blockID int64
	if err := tx.QueryRow(ctx, `
		SELECT block_id FROM adaptive_blocks
		WHERE assessment_id = $1 AND block_number = $2
	`, assessmentID, blockNumber).Scan(&blockID); err != nil {
		return 0, err
	}
	blockDifficulty := mixDifficultyLabelFromSlice(difficulties)
	_, err := tx.Exec(ctx, `
		INSERT INTO block_attempts (
		    attempt_token, block_id, user_id, block_number, status, started_at, difficulty_achieved
		) VALUES ($1, $2, $3, $4, 'in_progress', now(), $5)
		ON CONFLICT (attempt_token, block_number) DO UPDATE
		SET status = 'in_progress', started_at = now(), difficulty_achieved = EXCLUDED.difficulty_achieved
	`, attemptToken, blockID, userID, blockNumber, blockDifficulty)
	if err != nil {
		return 0, err
	}
	return blockID, nil
}

func loadAptitudeAttemptByToken(ctx context.Context, tx pgx.Tx, token string) (int64, int64, int64, time.Time, error) {
	var attemptID, assessmentID, userID int64
	var startedAt time.Time
	err := tx.QueryRow(ctx, `
		SELECT aptitude_attempt_id, assessment_id, user_id, started_at
		FROM tech_aptitude_attempts
		WHERE attempt_token = $1
	`, token).Scan(&attemptID, &assessmentID, &userID, &startedAt)
	return attemptID, assessmentID, userID, startedAt, err
}

func updateBlockAnswers(ctx context.Context, tx pgx.Tx, attemptID int64, answers map[string]string) error {
	if len(answers) == 0 {
		return nil
	}
	for qid, opt := range answers {
		qid = strings.TrimSpace(qid)
		if qid == "" {
			continue
		}
		questionID, err := strconv.ParseInt(qid, 10, 64)
		if err != nil {
			return err
		}
		var optID *int64
		if opt != "" {
			parsed, err := strconv.ParseInt(opt, 10, 64)
			if err != nil {
				return err
			}
			optID = &parsed
		}
		_, err = tx.Exec(ctx, `
			UPDATE tech_aptitude_attempt_questions
			SET selected_option_id = $1, answered_at = now()
			WHERE aptitude_attempt_id = $2 AND aptitude_question_id = $3
		`, optID, attemptID, questionID)
		if err != nil {
			return err
		}
	}
	return nil
}

type blockPerformance struct {
	Accuracy        float64
	TimeTaken       int
	TimeEfficiency  float64
	CorrectCount    int
	TotalCount      int
	NextDifficulty  string
}

func finalizeBlockPerformance(
	ctx context.Context,
	tx pgx.Tx,
	attemptID int64,
	attemptToken string,
	assessment aptitudeAssessment,
	blockNumber int,
	userID int64,
) (blockPerformance, error) {
	rows, err := tx.Query(ctx, `
		SELECT q.correct_option_id, aq.selected_option_id, q.marks, q.negative_marks
		FROM tech_aptitude_attempt_questions aq
		JOIN tech_aptitude_questions q ON q.aptitude_question_id = aq.aptitude_question_id
		WHERE aq.aptitude_attempt_id = $1 AND aq.block_number = $2
	`, attemptID, blockNumber)
	if err != nil {
		return blockPerformance{}, err
	}
	defer rows.Close()

	correct := 0
	total := 0
	for rows.Next() {
		var correctOptionID *int64
		var selectedOptionID *int64
		var marks float64
		var negative float64
		if err := rows.Scan(&correctOptionID, &selectedOptionID, &marks, &negative); err != nil {
			return blockPerformance{}, err
		}
		total++
		if correctOptionID != nil && selectedOptionID != nil && *correctOptionID == *selectedOptionID {
			correct++
		}
	}
	if rows.Err() != nil {
		return blockPerformance{}, rows.Err()
	}

	accuracy := 0.0
	if total > 0 {
		accuracy = float64(correct) / float64(total)
	}

	var blockStartedAt time.Time
	err = tx.QueryRow(ctx, `
		SELECT started_at
		FROM block_attempts
		WHERE attempt_token = $1 AND block_number = $2
	`, attemptToken, blockNumber).Scan(&blockStartedAt)
	if err != nil {
		blockStartedAt = time.Now().UTC()
	}
	timeTaken := int(time.Since(blockStartedAt).Seconds())
	if timeTaken < 1 {
		timeTaken = 1
	}

	expectedSeconds := 300
	if assessment.TotalQuestions > 0 && assessment.TotalTimeMinutes > 0 {
		avg := float64(assessment.TotalTimeMinutes*60) / float64(assessment.TotalQuestions)
		expectedSeconds = int(avg * 5)
	}
	if expectedSeconds < 60 {
		expectedSeconds = 60
	}

	timeEfficiency := float64(expectedSeconds) / float64(timeTaken)
	if timeEfficiency < 0.5 {
		timeEfficiency = 0.5
	}
	if timeEfficiency > 1.5 {
		timeEfficiency = 1.5
	}

	nextDifficulty := nextDifficultyLabel(accuracy, timeEfficiency)

	metrics := map[string]any{
		"correctCount":   correct,
		"totalCount":     total,
		"accuracy":       accuracy,
		"timeEfficiency": timeEfficiency,
	}
	metricsRaw, _ := json.Marshal(metrics)

	_, err = tx.Exec(ctx, `
		UPDATE block_attempts
		SET status = 'completed', completed_at = now(),
		    time_taken_seconds = $1, accuracy_score = $2,
		    performance_metrics = $3::jsonb, next_block_difficulty = $4
		WHERE attempt_token = $5 AND block_number = $6
	`, timeTaken, accuracy, metricsRaw, nextDifficulty, attemptToken, blockNumber)
	if err != nil {
		return blockPerformance{}, err
	}

	return blockPerformance{
		Accuracy:       accuracy,
		TimeTaken:      timeTaken,
		TimeEfficiency: timeEfficiency,
		CorrectCount:   correct,
		TotalCount:     total,
		NextDifficulty: nextDifficulty,
	}, nil
}

func lockPreviousBlocks(ctx context.Context, tx pgx.Tx, attemptID int64, blockNumber int) error {
	_, err := tx.Exec(ctx, `
		UPDATE tech_aptitude_attempt_questions
		SET is_locked = true
		WHERE aptitude_attempt_id = $1 AND block_number < $2
	`, attemptID, blockNumber)
	return err
}

func scoreAptitudeAttempt(ctx context.Context, tx pgx.Tx, attemptID int64, assessment aptitudeAssessment, startedAt time.Time) (aptitudeSubmitResponse, error) {
	rows, err := tx.Query(ctx, `
		SELECT aq.attempt_question_id, q.correct_option_id, aq.selected_option_id,
		       q.marks, q.negative_marks
		FROM tech_aptitude_attempt_questions aq
		JOIN tech_aptitude_questions q ON q.aptitude_question_id = aq.aptitude_question_id
		WHERE aq.aptitude_attempt_id = $1
	`, attemptID)
	if err != nil {
		return aptitudeSubmitResponse{}, err
	}
	defer rows.Close()

	correctCount := 0
	wrongCount := 0
	positive := 0.0
	negative := 0.0

	for rows.Next() {
		var attemptQuestionID int64
		var correctOptionID *int64
		var selectedOptionID *int64
		var marks float64
		var negativeMarks float64
		if err := rows.Scan(&attemptQuestionID, &correctOptionID, &selectedOptionID, &marks, &negativeMarks); err != nil {
			return aptitudeSubmitResponse{}, err
		}
		if selectedOptionID == nil {
			continue
		}
		isCorrect := correctOptionID != nil && *correctOptionID == *selectedOptionID
		if isCorrect {
			correctCount++
			positive += marks
			_, err = tx.Exec(ctx, `
				UPDATE tech_aptitude_attempt_questions
				SET is_correct = true, score_awarded = $1, negative_applied = 0
				WHERE attempt_question_id = $2
			`, marks, attemptQuestionID)
		} else {
			wrongCount++
			appliedNegative := 0.0
			if assessment.NegativeMarkEnabled {
				if negativeMarks > 0 {
					appliedNegative = negativeMarks
				} else {
					appliedNegative = assessment.NegativeMarkValue
				}
			}
			negative += appliedNegative
			_, err = tx.Exec(ctx, `
				UPDATE tech_aptitude_attempt_questions
				SET is_correct = false, score_awarded = 0, negative_applied = $1
				WHERE attempt_question_id = $2
			`, appliedNegative, attemptQuestionID)
		}
		if err != nil {
			return aptitudeSubmitResponse{}, err
		}
	}
	if rows.Err() != nil {
		return aptitudeSubmitResponse{}, rows.Err()
	}

	totalScore := positive - negative
	if totalScore < 0 {
		totalScore = 0
	}
	totalAnswered := correctCount + wrongCount
	accuracy := 0.0
	if totalAnswered > 0 {
		accuracy = float64(correctCount) / float64(totalAnswered)
	}

	timeTaken := int(time.Since(startedAt).Seconds())
	if timeTaken < 0 {
		timeTaken = 0
	}

	_, err = tx.Exec(ctx, `
		UPDATE tech_aptitude_attempts
		SET status = 'submitted', submitted_at = now(),
		    total_score = $1, positive_score = $2, negative_score = $3,
		    time_taken_seconds = $4, updated_at = now()
		WHERE aptitude_attempt_id = $5
	`, totalScore, positive, negative, timeTaken, attemptID)
	if err != nil {
		return aptitudeSubmitResponse{}, err
	}

	return aptitudeSubmitResponse{
		TotalScore:       totalScore,
		PositiveScore:    positive,
		NegativeScore:    negative,
		CorrectCount:     correctCount,
		WrongCount:       wrongCount,
		Accuracy:         accuracy,
		TimeTakenSeconds: timeTaken,
	}, nil
}

func difficultyMixForBlock(ctx context.Context, tx pgx.Tx, attemptID int64, blockNumber int, assessment aptitudeAssessment) (int, int, int) {
	if blockNumber == 1 {
		return 3, 1, 1
	}
	var accuracy float64
	var timeTaken int
	err := tx.QueryRow(ctx, `
		SELECT accuracy_score, time_taken_seconds
		FROM block_attempts
		WHERE attempt_token = (
			SELECT attempt_token FROM tech_aptitude_attempts WHERE aptitude_attempt_id = $1
		) AND block_number = $2
	`, attemptID, blockNumber-1).Scan(&accuracy, &timeTaken)
	if err != nil {
		return 3, 1, 1
	}
	expectedSeconds := 300
	if assessment.TotalQuestions > 0 && assessment.TotalTimeMinutes > 0 {
		avg := float64(assessment.TotalTimeMinutes*60) / float64(assessment.TotalQuestions)
		expectedSeconds = int(avg * 5)
	}
	if expectedSeconds < 60 {
		expectedSeconds = 60
	}
	timeEfficiency := float64(expectedSeconds) / float64(maxInt(timeTaken, 1))
	if accuracy >= 0.8 && timeEfficiency >= 0.9 {
		return 1, 2, 2
	}
	return 3, 1, 1
}

func nextDifficultyLabel(accuracy, timeEfficiency float64) string {
	if accuracy >= 0.8 && timeEfficiency >= 0.9 {
		return "hard"
	}
	return "medium"
}

func categoryOrderForBlock(ctx context.Context, tx pgx.Tx, attemptID int64, categories []string, count int) []string {
	if len(categories) == 0 {
		return []string{"General"}
	}
	stats := loadCategoryStats(ctx, tx, attemptID)
	order := make([]string, 0, len(categories))
	for _, c := range categories {
		order = append(order, c)
	}
	sort.SliceStable(order, func(i, j int) bool {
		ai := stats[order[i]]
		aj := stats[order[j]]
		return ai < aj
	})
	selected := []string{}
	for len(selected) < count {
		for _, c := range order {
			selected = append(selected, c)
			if len(selected) >= count {
				break
			}
		}
	}
	return selected
}

func loadCategoryStats(ctx context.Context, tx pgx.Tx, attemptID int64) map[string]float64 {
	rows, err := tx.Query(ctx, `
		SELECT q.subcategory,
		       COUNT(*) AS total,
		       COUNT(CASE WHEN aq.selected_option_id = q.correct_option_id THEN 1 END) AS correct
		FROM tech_aptitude_attempt_questions aq
		JOIN tech_aptitude_questions q ON q.aptitude_question_id = aq.aptitude_question_id
		WHERE aq.aptitude_attempt_id = $1 AND aq.selected_option_id IS NOT NULL
		GROUP BY q.subcategory
	`, attemptID)
	if err != nil {
		return map[string]float64{}
	}
	defer rows.Close()
	stats := map[string]float64{}
	for rows.Next() {
		var cat string
		var total int
		var correct int
		if err := rows.Scan(&cat, &total, &correct); err != nil {
			return stats
		}
		if total == 0 {
			stats[cat] = 0.5
			continue
		}
		stats[cat] = float64(correct) / float64(total)
	}
	return stats
}

func selectAptitudeQuestion(
	ctx context.Context,
	tx pgx.Tx,
	assessmentID int64,
	attemptID int64,
	difficulty string,
	category string,
	usedIDs []int64,
) (aptitudeBlockQuestion, int64, error) {
	var q aptitudeBlockQuestion
	var qID int64
	var imageURL *string
	row := tx.QueryRow(ctx, `
		SELECT aptitude_question_id, question_text, difficulty, subcategory,
		       marks, negative_marks, image_url
		FROM tech_aptitude_questions
		WHERE assessment_id = $1 AND status = 'active'
		  AND difficulty = $2 AND subcategory = $3
		  AND (cardinality($4::bigint[]) = 0 OR aptitude_question_id <> ALL($4::bigint[]))
		ORDER BY random()
		LIMIT 1
	`, assessmentID, difficulty, category, usedIDs)
	if err := row.Scan(&qID, &q.Text, &q.Difficulty, &q.Category, &q.Marks, &q.NegativeMarks, &imageURL); err != nil {
		row = tx.QueryRow(ctx, `
			SELECT aptitude_question_id, question_text, difficulty, subcategory,
			       marks, negative_marks, image_url
			FROM tech_aptitude_questions
			WHERE assessment_id = $1 AND status = 'active'
			  AND difficulty = $2
			  AND (cardinality($3::bigint[]) = 0 OR aptitude_question_id <> ALL($3::bigint[]))
			ORDER BY random()
			LIMIT 1
		`, assessmentID, difficulty, usedIDs)
		if err := row.Scan(&qID, &q.Text, &q.Difficulty, &q.Category, &q.Marks, &q.NegativeMarks, &imageURL); err != nil {
			return aptitudeBlockQuestion{}, 0, err
		}
	}

	opts, err := fetchAptitudeOptions(ctx, tx, qID)
	if err != nil {
		return aptitudeBlockQuestion{}, 0, err
	}
	q.ID = strconv.FormatInt(qID, 10)
	q.ImageURL = imageURL
	q.Options = opts
	return q, qID, nil
}

func fetchAptitudeOptions(ctx context.Context, tx pgx.Tx, questionID int64) ([]aptitudeBlockOption, error) {
	rows, err := tx.Query(ctx, `
		SELECT option_id, option_text
		FROM tech_aptitude_options
		WHERE aptitude_question_id = $1
		ORDER BY option_id
	`, questionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	opts := []aptitudeBlockOption{}
	for rows.Next() {
		var id int64
		var text string
		if err := rows.Scan(&id, &text); err != nil {
			return nil, err
		}
		opts = append(opts, aptitudeBlockOption{ID: strconv.FormatInt(id, 10), Text: text})
	}
	return opts, rows.Err()
}

func resolveTechUserID(ctx context.Context, tx pgx.Tx, userID int64) (int64, error) {
	if userID > 0 {
		return userID, nil
	}
	var id int64
	if err := tx.QueryRow(ctx, `SELECT id FROM users ORDER BY id LIMIT 1`).Scan(&id); err != nil {
		return 0, err
	}
	return id, nil
}

func boolFromAny(v any) bool {
	switch t := v.(type) {
	case bool:
		return t
	case string:
		return strings.EqualFold(t, "true")
	case float64:
		return t != 0
	default:
		return false
	}
}

func intFromAny(primary any, fallback any, def int) int {
	if v := intFromValue(primary); v > 0 {
		return v
	}
	if v := intFromValue(fallback); v > 0 {
		return v
	}
	return def
}

func intFromValue(v any) int {
	switch t := v.(type) {
	case int:
		return t
	case int64:
		return int(t)
	case float64:
		return int(t)
	case string:
		if n, err := strconv.Atoi(t); err == nil {
			return n
		}
	}
	return 0
}

func randomHex(n int) string {
	buf := make([]byte, n)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}

func mixDifficultyLabel(easy, medium, hard int) string {
	if hard >= 2 {
		return "hard"
	}
	if medium >= 2 {
		return "medium"
	}
	return "easy"
}

func mixDifficultyLabelFromSlice(difficulties []string) string {
	easy := 0
	medium := 0
	hard := 0
	for _, d := range difficulties {
		switch d {
		case "easy":
			easy++
		case "medium":
			medium++
		case "hard":
			hard++
		}
	}
	return mixDifficultyLabel(easy, medium, hard)
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
