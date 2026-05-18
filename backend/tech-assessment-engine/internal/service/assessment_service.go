package service

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"tech-assessment-engine/internal/models"
	"tech-assessment-engine/internal/repository"
	"time"

	"gorm.io/gorm"
)

type AssessmentService struct{}

func NewAssessmentService() *AssessmentService {
	return &AssessmentService{}
}

// generateUUID returns a version 4 random UUID string
func generateUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40 // Version 4
	b[8] = (b[8] & 0x3f) | 0x80 // Variant 10
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

// generateRandomHex returns a random hex string of specified byte length
func generateRandomHex(length int) string {
	b := make([]byte, length)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x", b)
}

// hashSeed mimics TypeScript's SHA-256 and readUInt32LE(0)
func hashSeed(seed string) uint32 {
	hash := sha256.Sum256([]byte(seed))
	return binary.LittleEndian.Uint32(hash[:4])
}

// mulberry32 implements seeded Mulberry32 pseudo-random number generator
func mulberry32(seed uint32) func() float64 {
	t := seed
	return func() float64 {
		t += 0x6d2b79f5
		r := (t ^ (t >> 15)) * (1 | t)
		r ^= r + (r^(r>>7))*(61|r)
		r = r ^ (r >> 14)
		return float64(r) / 4294967296.0
	}
}

// shuffleWithSeed shuffles items slice with mulberry32 generator and seed
func shuffleWithSeed[T any](items []T, seed string) []T {
	if len(items) <= 1 {
		return items
	}
	rng := mulberry32(hashSeed(seed))
	array := make([]T, len(items))
	copy(array, items)
	for i := len(array) - 1; i > 0; i-- {
		j := int(math.Floor(rng() * float64(i+1)))
		array[i], array[j] = array[j], array[i]
	}
	return array
}

// resolveUserId selects target or default user_id from DB. Supports numeric user ID and email string.
func (s *AssessmentService) resolveUserId(tx *gorm.DB, userId interface{}) (int64, error) {
	if userId != nil {
		switch v := userId.(type) {
		case int64:
			return v, nil
		case int:
			return int64(v), nil
		case float64:
			return int64(v), nil
		case *int64:
			if v != nil {
				return *v, nil
			}
		case string:
			trimmed := strings.TrimSpace(v)
			if trimmed != "" {
				// Try parsing as integer
				if parsed, err := strconv.ParseInt(trimmed, 10, 64); err == nil {
					return parsed, nil
				}
				// Otherwise, treat as email if it contains '@'
				if strings.Contains(trimmed, "@") {
					var id int64
					err := tx.Raw("SELECT id FROM users WHERE email = ?", trimmed).Scan(&id).Error
					if err == nil && id > 0 {
						return id, nil
					}
				}
			}
		}
	}
	var id int64
	err := tx.Raw("SELECT id FROM users ORDER BY id LIMIT 1").Scan(&id).Error
	if err != nil {
		return 0, errors.New("no users found in the database")
	}
	return id, nil
}

// GetAttemptsStats retrieves attempt counts per module type for a user
func (s *AssessmentService) GetAttemptsStats(userId interface{}) (map[string]map[string]int64, error) {
	db := repository.GetDB()
	resolvedUserId, err := s.resolveUserId(db, userId)
	if err != nil {
		return nil, err
	}

	stats := make(map[string]map[string]int64)

	for module, config := range models.ModuleConfigs {
		stats[module] = map[string]int64{"trial": 0, "main": 0}

		if !config.HasMode {
			var count int64
			query := fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE user_id = ?", config.Attempts)
			if err := db.Raw(query, resolvedUserId).Scan(&count).Error; err == nil {
				stats[module]["trial"] = count
				stats[module]["main"] = count
			}
		} else {
			var trialCount, mainCount int64
			trialQuery := fmt.Sprintf(`
				SELECT COUNT(DISTINCT a.%s) 
				FROM %s a
				JOIN %s aq ON aq.%s = a.%s
				JOIN %s q ON q.%s = aq.%s
				WHERE a.user_id = ? AND q.mode = 'trial'`,
				config.AttemptIDCol, config.Attempts, config.Junction, config.AttemptIDCol,
				config.AttemptIDCol, config.Questions, config.IDCol, config.IDCol)
			
			mainQuery := fmt.Sprintf(`
				SELECT COUNT(DISTINCT a.%s) 
				FROM %s a
				JOIN %s aq ON aq.%s = a.%s
				JOIN %s q ON q.%s = aq.%s
				WHERE a.user_id = ? AND q.mode = 'main'`,
				config.AttemptIDCol, config.Attempts, config.Junction, config.AttemptIDCol,
				config.AttemptIDCol, config.Questions, config.IDCol, config.IDCol)

			_ = db.Raw(trialQuery, resolvedUserId).Scan(&trialCount)
			_ = db.Raw(mainQuery, resolvedUserId).Scan(&mainCount)

			stats[module]["trial"] = trialCount
			stats[module]["main"] = mainCount
		}
	}

	return stats, nil
}

// hasQuestions checks if an assessment has any active questions seeded
func (s *AssessmentService) hasQuestions(tx *gorm.DB, config models.ModuleConfig, assessmentID int64) bool {
	var count int64
	query := fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE assessment_id = ? AND status = 'active'", config.Questions)
	if err := tx.Raw(query, assessmentID).Scan(&count).Error; err != nil {
		return false
	}
	return count > 0
}

// getFallbackAssessment fetches the most recent active assessment for the given module
func (s *AssessmentService) getFallbackAssessment(tx *gorm.DB, dbModule string, config models.ModuleConfig) models.TechAssessment {
	var fallbacks []models.TechAssessment
	tx.Raw("SELECT * FROM tech_assessments WHERE module_type = ? AND status = 'active' ORDER BY assessment_id DESC", dbModule).Scan(&fallbacks)
	for _, fb := range fallbacks {
		if s.hasQuestions(tx, config, fb.AssessmentID) {
			return fb
		}
	}
	if len(fallbacks) > 0 {
		return fallbacks[0]
	}
	return models.TechAssessment{}
}

// StartAttempt starts an assessment attempt for standard models
func (s *AssessmentService) StartAttempt(module string, req models.StartAttemptRequest) (*models.StartAttemptResponse, error) {
	db := repository.GetDB()
	dbModule := module
	if module == "communication" {
		dbModule = "grammar"
	}

	config, ok := models.ModuleConfigs[dbModule]
	if !ok {
		return nil, fmt.Errorf("module %s is not supported", module)
	}

	var assessment models.TechAssessment
	var startResponse *models.StartAttemptResponse
	err := db.Transaction(func(tx *gorm.DB) error {
		var err error
		if req.AssessmentID != nil {
			err = tx.Raw("SELECT * FROM tech_assessments WHERE assessment_id = ? AND module_type = ?", *req.AssessmentID, dbModule).Scan(&assessment).Error
			if err != nil || assessment.AssessmentID == 0 {
				assessment = s.getFallbackAssessment(tx, dbModule, config)
			}
		} else if req.AssessmentCode != "" {
			err = tx.Raw("SELECT * FROM tech_assessments WHERE assessment_code = ? AND module_type = ?", req.AssessmentCode, dbModule).Scan(&assessment).Error
			if err == nil && assessment.AssessmentID > 0 {
				if !s.hasQuestions(tx, config, assessment.AssessmentID) {
					assessment.AssessmentID = 0 // force fallback
				}
			}
			if err != nil || assessment.AssessmentID == 0 {
				assessment = s.getFallbackAssessment(tx, dbModule, config)
			}
		} else {
			assessment = s.getFallbackAssessment(tx, dbModule, config)
		}

		if assessment.AssessmentID == 0 {
			return fmt.Errorf("%s assessment not found", module)
		}

		resolvedUserId, err := s.resolveUserId(tx, req.UserID)
		if err != nil {
			return err
		}

		now := time.Now()
		durationMinutes := assessment.TotalTimeMinutes
		if durationMinutes <= 0 {
			durationMinutes = 60
		}
		expiresAt := now.Add(time.Duration(durationMinutes) * time.Minute)
		attemptToken := fmt.Sprintf("%s-%s", strings.ToUpper(module[:3]), generateUUID())
		shuffleSeed := generateRandomHex(8)

		var attemptId int64
		if module == "coding" {
			insertQuery := fmt.Sprintf(`
				INSERT INTO %s (assessment_id, user_id, attempt_token, status, started_at, expires_at, created_at, updated_at)
				VALUES (?, ?, ?, 'in_progress', ?, ?, NOW(), NOW()) RETURNING %s`, config.Attempts, config.AttemptIDCol)
			err = tx.Raw(insertQuery, assessment.AssessmentID, resolvedUserId, attemptToken, now, expiresAt).Scan(&attemptId).Error
		} else {
			insertQuery := fmt.Sprintf(`
				INSERT INTO %s (assessment_id, user_id, attempt_token, shuffle_seed, status, started_at, expires_at, created_at, updated_at)
				VALUES (?, ?, ?, ?, 'in_progress', ?, ?, NOW(), NOW()) RETURNING %s`, config.Attempts, config.AttemptIDCol)
			err = tx.Raw(insertQuery, assessment.AssessmentID, resolvedUserId, attemptToken, shuffleSeed, now, expiresAt).Scan(&attemptId).Error
		}
		if err != nil {
			return fmt.Errorf("failed to insert attempt: %v", err)
		}

		requestedMode := req.Mode
		if requestedMode == "" {
			requestedMode = "main"
		}

		var questions []map[string]interface{}
		if !config.HasMode {
			query := fmt.Sprintf("SELECT %s FROM %s WHERE assessment_id = ? AND status = 'active'", config.IDCol, config.Questions)
			err = tx.Raw(query, assessment.AssessmentID).Scan(&questions).Error
		} else {
			query := fmt.Sprintf("SELECT %s FROM %s WHERE assessment_id = ? AND status = 'active' AND mode = ?", config.IDCol, config.Questions)
			err = tx.Raw(query, assessment.AssessmentID, requestedMode).Scan(&questions).Error
			if (err != nil || len(questions) == 0) && requestedMode == "trial" {
				err = tx.Raw(query, assessment.AssessmentID, "main").Scan(&questions).Error
			}
		}

		if err != nil || len(questions) == 0 {
			return errors.New("no active questions found for this assessment")
		}

		// Shuffling questions
		shuffled := questions
		if assessment.ShuffleQuestions {
			shuffled = shuffleWithSeed(questions, shuffleSeed)
		}

		finalQuestions := shuffled
		if requestedMode == "trial" {
			if len(shuffled) > 5 {
				finalQuestions = shuffled[:5]
			}
		} else {
			questionLimit := assessment.QuestionLimit
			if questionLimit > 0 && len(shuffled) > questionLimit {
				finalQuestions = shuffled[:questionLimit]
			}
		}

		// Insert into junction table
		for i, qMap := range finalQuestions {
			qId := qMap[config.IDCol]
			junctionInsert := fmt.Sprintf("INSERT INTO %s (%s, %s, display_order) VALUES (?, ?, ?)",
				config.Junction, config.AttemptIDCol, config.IDCol)
			err = tx.Exec(junctionInsert, attemptId, qId, i+1).Error
			if err != nil {
				return fmt.Errorf("failed to insert junction row: %v", err)
			}
		}

		// Retrieve full question details
		fullQuestions, err := s.getAttemptQuestionsByConfig(tx, attemptId, config, assessment.ShuffleOptions, shuffleSeed)
		if err != nil {
			return err
		}

		// Store results into response context outside tx
		startResponse = &models.StartAttemptResponse{
			AttemptToken:    attemptToken,
			ExpiresAt:       expiresAt,
			DurationSeconds: durationMinutes * 60,
			Mode:            requestedMode,
			Questions:       fullQuestions,
			TotalQuestions:  len(fullQuestions),
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return startResponse, nil
}

// getAttemptQuestionsByConfig fetches full question metadata and options (with optional seed-based shuffling)
func (s *AssessmentService) getAttemptQuestionsByConfig(tx *gorm.DB, attemptId int64, config models.ModuleConfig, shuffleOptions bool, seed string) ([]models.QuestionResponse, error) {
	isAptitude := config.Questions == "tech_aptitude_questions"
	isGrammar := config.Questions == "tech_grammar_questions"
	isRole := config.Questions == "tech_role_questions"
	isMnc := config.Questions == "tech_mnc_questions"
	isCoding := config.Questions == "tech_coding_questions"

	extraSelect := ""
	if isAptitude {
		extraSelect = ", q.image_url, q.marks, q.negative_marks, q.category, q.subcategory"
	} else if isGrammar {
		extraSelect = ", q.task_type, q.audio_url, q.passage_text, q.reference_answer, q.marks, q.negative_marks, q.category, q.subcategory"
	} else if isRole {
		extraSelect = ", q.domain, q.question_type, q.scenario_context, q.marks, q.negative_marks, q.category, q.subcategory"
	} else if isMnc {
		extraSelect = ", q.topic_group, q.marks, q.negative_marks, q.category, q.subcategory"
	}

	difficultySelect := ""
	if config.HasDifficulty {
		difficultySelect = ", q.difficulty"
	}

	textColumn := "q.question_text"
	if isCoding {
		textColumn = "q.problem_statement"
	}

	query := fmt.Sprintf(`
		SELECT aq.display_order, q.%s as question_id,
		       %s as question_text %s %s
		FROM %s aq
		JOIN %s q ON q.%s = aq.%s
		WHERE aq.%s = ?
		ORDER BY aq.display_order ASC`,
		config.IDCol, textColumn, difficultySelect, extraSelect,
		config.Junction, config.Questions, config.IDCol, config.IDCol, config.AttemptIDCol)

	rows, err := tx.Raw(query, attemptId).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var questions []models.QuestionResponse
	for rows.Next() {
		var displayOrder int
		var questionId int64
		var text string

		var difficulty sql.NullString
		var imageUrl sql.NullString
		var marks sql.NullFloat64
		var negativeMarks sql.NullFloat64

		// Grammar specific fields
		var taskType sql.NullString
		var audioUrl sql.NullString
		var passageText sql.NullString
		var referenceAnswer sql.NullString

		// Role specific fields
		var domain sql.NullString
		var questionType sql.NullString
		var scenarioContext sql.NullString

		// MNC specific fields
		var topicGroup sql.NullString

		// Shared category fields
		var category sql.NullString
		var subcategory sql.NullString

		scanDest := []interface{}{&displayOrder, &questionId, &text}
		if config.HasDifficulty {
			scanDest = append(scanDest, &difficulty)
		}

		if isAptitude {
			scanDest = append(scanDest, &imageUrl, &marks, &negativeMarks, &category, &subcategory)
		} else if isGrammar {
			scanDest = append(scanDest, &taskType, &audioUrl, &passageText, &referenceAnswer, &marks, &negativeMarks, &category, &subcategory)
		} else if isRole {
			scanDest = append(scanDest, &domain, &questionType, &scenarioContext, &marks, &negativeMarks, &category, &subcategory)
		} else if isMnc {
			scanDest = append(scanDest, &topicGroup, &marks, &negativeMarks, &category, &subcategory)
		}

		if err := rows.Scan(scanDest...); err != nil {
			return nil, err
		}

		q := models.QuestionResponse{
			ID:   questionId,
			Text: text,
		}

		if marks.Valid {
			v := marks.Float64
			q.Marks = &v
		}
		if negativeMarks.Valid {
			v := negativeMarks.Float64
			q.NegativeMarks = &v
		}
		if config.HasDifficulty && difficulty.Valid {
			q.Difficulty = difficulty.String
		}

		if isAptitude {
			if imageUrl.Valid {
				q.ImageUrl = imageUrl.String
			}
			q.Category = category.String
			q.Subcategory = subcategory.String
		}
		if isGrammar {
			q.TaskType = taskType.String
			q.AudioUrl = audioUrl.String
			q.PassageText = passageText.String
			q.ReferenceAnswer = referenceAnswer.String
			q.Category = category.String
			q.Subcategory = subcategory.String
		}
		if isRole {
			if questionType.String == "scenario" {
				q.Type = "scenario"
			} else {
				q.Type = "conceptual"
			}
			q.Category = category.String      // Priority to category column
			q.Subcategory = subcategory.String
			if q.Category == "" {
				q.Category = domain.String    // Fallback to domain for backward compat
			}
			q.ScenarioContext = scenarioContext.String
		}
		if isMnc {
			q.Topic = topicGroup.String
			q.Category = category.String
			q.Subcategory = subcategory.String
		}

		// Retrieve options
		if config.Options != "" {
			var opts []models.OptionResponse
			optQuery := fmt.Sprintf("SELECT option_id::text as id, option_text as text FROM %s WHERE %s = ? ORDER BY option_id ASC", config.Options, config.IDCol)
			if err := tx.Raw(optQuery, questionId).Scan(&opts).Error; err == nil {
				if shuffleOptions {
					q.Options = shuffleWithSeed(opts, fmt.Sprintf("%s%d", seed, questionId))
				} else {
					q.Options = opts
				}
			}
		}

		questions = append(questions, q)
	}

	return questions, nil
}

// GetAttemptQuestions fetches the questions of an active attempt by token
func (s *AssessmentService) GetAttemptQuestions(token string) (interface{}, error) {
	db := repository.GetDB()
	var moduleType string
	if strings.HasPrefix(token, "APT-") {
		moduleType = "aptitude"
	} else if strings.HasPrefix(token, "GRA-") || strings.HasPrefix(token, "COM-") {
		moduleType = "grammar"
	} else if strings.HasPrefix(token, "MNC-") {
		moduleType = "mnc"
	} else if strings.HasPrefix(token, "ROL-") {
		moduleType = "role"
	} else {
		moduleType = "aptitude" // fallback default
	}

	config, ok := models.ModuleConfigs[moduleType]
	if !ok {
		return nil, fmt.Errorf("unknown module for token %s", token)
	}

	var attempt map[string]interface{}
	query := fmt.Sprintf(`
		SELECT a.*, ass.shuffle_options, ass.module_type
		FROM %s a
		JOIN tech_assessments ass ON ass.assessment_id = a.assessment_id
		WHERE a.attempt_token = ?`, config.Attempts)

	err := db.Raw(query, token).Scan(&attempt).Error
	if err != nil || len(attempt) == 0 {
		return nil, errors.New("attempt not found")
	}

	attemptId := attempt[config.AttemptIDCol].(int64)
	shuffleOptions := attempt["shuffle_options"].(bool)
	shuffleSeed := attempt["shuffle_seed"].(string)

	questions, err := s.getAttemptQuestionsByConfig(db, attemptId, config, shuffleOptions, shuffleSeed)
	if err != nil {
		return nil, err
	}

	expiresAt, _ := attempt["expires_at"].(time.Time)
	status, _ := attempt["status"].(string)

	return map[string]interface{}{
		"questions": questions,
		"expiresAt": expiresAt,
		"status":    status,
	}, nil
}

// SubmitAttempt scores, saves answers, and finalizes attempt
func (s *AssessmentService) SubmitAttempt(module string, token string, answers map[string]interface{}) (interface{}, error) {
	db := repository.GetDB()
	dbModule := module
	if module == "communication" {
		dbModule = "grammar"
	}

	config, ok := models.ModuleConfigs[dbModule]
	if !ok {
		return nil, fmt.Errorf("module %s is not supported", module)
	}

	var attempt map[string]interface{}
	query := fmt.Sprintf("SELECT * FROM %s WHERE attempt_token = ?", config.Attempts)
	err := db.Raw(query, token).Scan(&attempt).Error
	if err != nil || len(attempt) == 0 {
		return nil, errors.New("attempt not found")
	}

	if attempt["status"] != "in_progress" {
		return nil, errors.New("attempt is already submitted or closed")
	}

	attemptId := attempt[config.AttemptIDCol].(int64)
	isGrammar := dbModule == "grammar"
	isCoding := dbModule == "coding"

	var result map[string]interface{}
	err = db.Transaction(func(tx *gorm.DB) error {
		difficultyCol := "q.difficulty"
		if !config.HasDifficulty {
			difficultyCol = "'medium' as difficulty"
		}
		correctOptCol := "q.correct_option_id"
		if isCoding {
			correctOptCol = "NULL as correct_option_id"
		}
		taskTypeCol := "q.task_type"
		if !isGrammar {
			taskTypeCol = "NULL as task_type"
		}

		aqQuery := fmt.Sprintf(`
			SELECT aq.*, %s, q.marks, q.negative_marks,
			       q.%s as category, %s,
			       ass.negative_mark_enabled, ass.negative_mark_value, %s,
			       ass.categories as assessment_categories
			FROM %s aq
			JOIN %s q ON q.%s = aq.%s
			JOIN tech_assessments ass ON ass.assessment_id = q.assessment_id
			WHERE aq.%s = ?`,
			correctOptCol, config.CatCol, difficultyCol, taskTypeCol,
			config.Junction, config.Questions, config.IDCol, config.IDCol, config.AttemptIDCol)

		var attemptQuestions []map[string]interface{}
		if err := tx.Raw(aqQuery, attemptId).Scan(&attemptQuestions).Error; err != nil {
			return err
		}

		var totalPositive float64
		var totalNegative float64
		var correctCount int
		totalCount := len(attemptQuestions)

		var assessmentCategories []interface{}
		if len(attemptQuestions) > 0 && attemptQuestions[0]["assessment_categories"] != nil {
			switch cats := attemptQuestions[0]["assessment_categories"].(type) {
			case string:
				_ = json.Unmarshal([]byte(cats), &assessmentCategories)
			case []interface{}:
				assessmentCategories = cats
			}
		}

		type sectionStats struct {
			Name          string  `json:"name"`
			Score         float64 `json:"score"`
			MaxScore      float64 `json:"maxScore"`
			AnsweredCount int     `json:"answeredCount"`
			TotalCount    int     `json:"totalCount"`
		}
		sectionMap := make(map[string]*sectionStats)

		for _, aq := range attemptQuestions {
			qIdStr := fmt.Sprintf("%v", aq[config.IDCol])
			attemptQId := aq["attempt_question_id"].(int64)

			var selectedVal interface{}
			var exists bool
			if selectedVal, exists = answers[qIdStr]; !exists {
				selectedVal = answers[fmt.Sprintf("%d", attemptQId)]
			}

			category, _ := aq["category"].(string)
			if category == "" {
				category = "General"
			}

			categoryName := category
			for _, catObj := range assessmentCategories {
				switch c := catObj.(type) {
				case string:
					if c == category {
						categoryName = c
					}
				case map[string]interface{}:
					if fmt.Sprintf("%v", c["id"]) == category || fmt.Sprintf("%v", c["name"]) == category {
						if name, ok := c["name"].(string); ok {
							categoryName = name
						}
					}
				}
			}

			if _, ok := sectionMap[category]; !ok {
				sectionMap[category] = &sectionStats{Name: categoryName}
			}

			var questionMarks float64
			if m, ok := aq["marks"].(float64); ok {
				questionMarks = m
			} else {
				questionMarks = 1.0
			}

			var questionNegMarks float64
			if negEnabled, ok := aq["negative_mark_enabled"].(bool); ok && negEnabled {
				if m, ok := aq["negative_marks"].(float64); ok {
					questionNegMarks = m
				} else if m, ok := aq["negative_mark_value"].(float64); ok {
					questionNegMarks = m
				}
			}

			sectionMap[category].TotalCount += 1
			sectionMap[category].MaxScore += questionMarks

			if isCoding {
				if selectedVal != nil && selectedVal != "" {
					var submittedCode, language string
					switch payload := selectedVal.(type) {
					case string:
						submittedCode = payload
					case map[string]interface{}:
						if code, ok := payload["code"].(string); ok {
							submittedCode = code
						} else if code, ok := payload["submittedCode"].(string); ok {
							submittedCode = code
						}
						if lang, ok := payload["language"].(string); ok {
							language = lang
						} else if lang, ok := payload["lang"].(string); ok {
							language = lang
						}
					}

					if submittedCode != "" {
						updateQuery := fmt.Sprintf("UPDATE %s SET submitted_code = ?, language = COALESCE(?, language), submitted_at = NOW() WHERE attempt_question_id = ?", config.Junction)
						_ = tx.Exec(updateQuery, submittedCode, language, attemptQId)
					}
				}
				continue
			}

			if isGrammar {
				taskType := strings.ToLower(fmt.Sprintf("%v", aq["task_type"]))
				if selectedVal != nil && selectedVal != "" {
					sectionMap[category].AnsweredCount++
					if taskType == "listening_mcq" || taskType == "reading_mcq" {
						var optId string
						switch p := selectedVal.(type) {
						case map[string]interface{}:
							if id, ok := p["selectedOptionId"].(string); ok {
								optId = id
							} else if id, ok := p["optionId"].(string); ok {
								optId = id
							} else if id, ok := p["value"].(string); ok {
								optId = id
							}
						default:
							optId = fmt.Sprintf("%v", selectedVal)
						}

						if optId != "" {
							isCorrect := optId == fmt.Sprintf("%v", aq["correct_option_id"])
							updateQuery := fmt.Sprintf("UPDATE %s SET selected_option_id = ?, is_correct = ?, answered_at = NOW() WHERE attempt_question_id = ?", config.Junction)
							_ = tx.Exec(updateQuery, optId, isCorrect, attemptQId)

							if isCorrect {
								totalPositive += questionMarks
								sectionMap[category].Score += questionMarks
								correctCount++
							} else {
								totalNegative += questionNegMarks
								sectionMap[category].Score -= questionNegMarks
							}
						}
					} else if taskType == "writing" {
						var answerText string
						switch p := selectedVal.(type) {
						case string:
							answerText = p
						case map[string]interface{} :
							if text, ok := p["text"].(string); ok {
								answerText = text
							} else if text, ok := p["answerText"].(string); ok {
								answerText = text
							}
						}
						if answerText != "" {
							updateQuery := fmt.Sprintf("UPDATE %s SET answer_text = ?, answered_at = NOW() WHERE attempt_question_id = ?", config.Junction)
							_ = tx.Exec(updateQuery, answerText, attemptQId)
						}
					} else if taskType == "speaking" {
						var audioPayload, answerText string
						switch p := selectedVal.(type) {
						case string:
							audioPayload = p
						case map[string]interface{}:
							if audio, ok := p["audio"].(string); ok {
								audioPayload = audio
							} else if audio, ok := p["audioBase64"].(string); ok {
								audioPayload = audio
							} else if audio, ok := p["audioUrl"].(string); ok {
								audioPayload = audio
							}
							if text, ok := p["text"].(string); ok {
								answerText = text
							} else if text, ok := p["answerText"].(string); ok {
								answerText = text
							}
						}
						if audioPayload != "" || answerText != "" {
							updateQuery := fmt.Sprintf("UPDATE %s SET answer_audio_url = ?, answer_text = COALESCE(?, answer_text), answered_at = NOW() WHERE attempt_question_id = ?", config.Junction)
							_ = tx.Exec(updateQuery, audioPayload, answerText, attemptQId)
						}
					} else {
						var answerText string
						switch p := selectedVal.(type) {
						case string:
							answerText = p
						case map[string]interface{}:
							if text, ok := p["text"].(string); ok {
								answerText = text
							} else if text, ok := p["answerText"].(string); ok {
								answerText = text
							}
						}
						if answerText != "" {
							updateQuery := fmt.Sprintf("UPDATE %s SET answer_text = ?, answered_at = NOW() WHERE attempt_question_id = ?", config.Junction)
							_ = tx.Exec(updateQuery, answerText, attemptQId)
						}
					}
				}
				continue
			}

			// Standard MCQ modules: aptitude, mnc, role
			if selectedVal != nil && fmt.Sprintf("%v", selectedVal) != "" {
				sectionMap[category].AnsweredCount++
				isCorrectAnswer := fmt.Sprintf("%v", selectedVal) == fmt.Sprintf("%v", aq["correct_option_id"])
				scoreAwarded := 0.0
				negativeApplied := 0.0

				if isCorrectAnswer {
					scoreAwarded = questionMarks
					totalPositive += scoreAwarded
					correctCount++
					sectionMap[category].Score += scoreAwarded
				} else {
					negativeApplied = questionNegMarks
					totalNegative += negativeApplied
					sectionMap[category].Score -= negativeApplied
				}

				updateQuery := fmt.Sprintf("UPDATE %s SET selected_option_id = ?, is_correct = ?, score_awarded = ?, negative_applied = ?, answered_at = NOW() WHERE attempt_question_id = ?", config.Junction)
				_ = tx.Exec(updateQuery, selectedVal, isCorrectAnswer, scoreAwarded, negativeApplied, attemptQId)
			} else {
				updateQuery := fmt.Sprintf("UPDATE %s SET selected_option_id = NULL, is_correct = NULL, score_awarded = 0, negative_applied = 0, answered_at = NULL WHERE attempt_question_id = ?", config.Junction)
				_ = tx.Exec(updateQuery, attemptQId)
			}
		}

		rawTotalScore := totalPositive - totalNegative
		totalScore := rawTotalScore
		if totalScore < 0 {
			totalScore = 0
		}
		accuracy := 0
		if totalCount > 0 {
			accuracy = int(math.Round((float64(correctCount) / float64(totalCount)) * 100))
		}

		now := time.Now()
		var startedAt time.Time
		if t, ok := attempt["started_at"].(time.Time); ok {
			startedAt = t
		}
		timeTakenSeconds := int(math.Max(0, math.Round(now.Sub(startedAt).Seconds())))

		updateAttemptQuery := fmt.Sprintf(`
			UPDATE %s 
			SET status = 'submitted', submitted_at = ?, positive_score = ?, negative_score = ?,
			    total_score = ?, time_taken_seconds = ?, updated_at = NOW()
			WHERE %s = ?`, config.Attempts, config.AttemptIDCol)

		if err := tx.Exec(updateAttemptQuery, now, totalPositive, totalNegative, totalScore, timeTakenSeconds, attemptId).Error; err != nil {
			return err
		}

		type sectionRes struct {
			Name   string `json:"name"`
			Score  float64 `json:"score"`
			Weight string  `json:"weight"`
		}
		var sections []sectionRes
		for _, sec := range sectionMap {
			s := sec.Score
			if s < 0 {
				s = 0
			}
			sections = append(sections, sectionRes{
				Name:   sec.Name,
				Score:  s,
				Weight: fmt.Sprintf("%.1f/%.1f", s, sec.MaxScore),
			})
		}

		result = map[string]interface{}{
			"success":          true,
			"token":            token,
			"overallScore":     totalScore,
			"totalScore":       totalScore,
			"positiveScore":    totalPositive,
			"negativeScore":    totalNegative,
			"correctCount":     correctCount,
			"totalQuestions":   totalCount,
			"accuracy":         accuracy,
			"timeTakenSeconds": timeTakenSeconds,
			"sections":         sections,
			"status":           "completed",
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}
