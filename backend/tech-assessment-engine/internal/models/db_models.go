package models

import (
	"time"
)

// TechAssessment represents the core tech_assessments DB table
type TechAssessment struct {
	AssessmentID            int64      `gorm:"primaryKey;column:assessment_id;autoIncrement" json:"assessmentId"`
	AssessmentCode          string     `gorm:"column:assessment_code;unique" json:"assessmentCode"`
	AssessmentName          string     `gorm:"column:assessment_name" json:"assessmentName"`
	ModuleType              string     `gorm:"column:module_type" json:"moduleType"`
	TotalTimeMinutes        int        `gorm:"column:total_time_minutes" json:"totalTimeMinutes"`
	TotalQuestions          int        `gorm:"column:total_questions" json:"totalQuestions"`
	QuestionLimit           int        `gorm:"column:question_limit" json:"questionLimit"`
	Categories              string     `gorm:"column:categories;type:jsonb" json:"categories"`
	DifficultyMarks         string     `gorm:"column:difficulty_marks;type:jsonb" json:"difficultyMarks"`
	DifficultyNegativeMarks string     `gorm:"column:difficulty_negative_marks;type:jsonb" json:"difficultyNegativeMarks"`
	TabSwitchLimit          int        `gorm:"column:tab_switch_limit" json:"tabSwitchLimit"`
	AntiCopyEnabled         bool       `gorm:"column:anti_copy_enabled" json:"antiCopyEnabled"`
	ShuffleQuestions        bool       `gorm:"column:shuffle_questions" json:"shuffleQuestions"`
	ShuffleOptions          bool       `gorm:"column:shuffle_options" json:"shuffleOptions"`
	NegativeMarkEnabled     bool       `gorm:"column:negative_mark_enabled" json:"negativeMarkEnabled"`
	NegativeMarkValue       *float64   `gorm:"column:negative_mark_value" json:"negativeMarkValue"`
	Status                  string     `gorm:"column:status" json:"status"`
	Amount                  float64    `gorm:"column:amount" json:"amount"`
	TrialAttemptsLimit      int        `gorm:"column:trial_attempts_limit" json:"trialAttemptsLimit"`
	MainAttemptsLimit       int        `gorm:"column:main_attempts_limit" json:"mainAttemptsLimit"`
	CreatedBy               int64      `gorm:"column:created_by" json:"createdBy"`
	CreatedAt               time.Time  `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
	UpdatedAt               time.Time  `gorm:"column:updated_at;autoUpdateTime" json:"updatedAt"`
	BlockConfig             string     `gorm:"column:block_config;type:jsonb" json:"blockConfig"`
	AdaptiveConfig          string     `gorm:"column:adaptive_config;type:jsonb" json:"adaptiveConfig"`
}

// TableName returns the exact table name for GORM
func (TechAssessment) TableName() string {
	return "tech_assessments"
}

// StartAttemptRequest represents the payload to start an assessment
type StartAttemptRequest struct {
	AssessmentID   *int64  `json:"assessmentId"`
	AssessmentCode string  `json:"assessmentCode"`
	UserID         *int64  `json:"userId"`
	Mode           string  `json:"mode"` // "trial" or "main"
}

// OptionResponse represents question options returned to frontend
type OptionResponse struct {
	ID   string `json:"id"`
	Text string `json:"text"`
}

// QuestionResponse represents questions returned to frontend
type QuestionResponse struct {
	ID               int64            `json:"id"`
	Text             string           `json:"text"`
	Options          []OptionResponse `json:"options"`
	Marks            *float64         `json:"marks,omitempty"`
	NegativeMarks    *float64         `json:"negativeMarks,omitempty"`
	Difficulty       string           `json:"difficulty,omitempty"`
	ImageUrl         string           `json:"imageUrl,omitempty"`
	TaskType         string           `json:"taskType,omitempty"`
	AudioUrl         string           `json:"audioUrl,omitempty"`
	PassageText      string           `json:"passageText,omitempty"`
	ReferenceAnswer  string           `json:"referenceAnswer,omitempty"`
	Type             string           `json:"type,omitempty"`
	Category         string           `json:"category,omitempty"`
	ScenarioContext  string           `json:"scenarioContext,omitempty"`
	Topic            string           `json:"topic,omitempty"`
}

// StartAttemptResponse is returned on successful start
type StartAttemptResponse struct {
	AttemptToken    string             `json:"attemptToken"`
	ExpiresAt       time.Time          `json:"expiresAt"`
	DurationSeconds int                `json:"durationSeconds"`
	Mode            string             `json:"mode"`
	Questions       []QuestionResponse `json:"questions"`
	TotalQuestions  int                `json:"totalQuestions"`
}

// StartBlockBasedAttemptResponse is returned on successful adaptive block start
type StartBlockBasedAttemptResponse struct {
	AttemptToken      string             `json:"attemptToken"`
	ExpiresAt         time.Time          `json:"expiresAt"`
	DurationSeconds   int                `json:"durationSeconds"`
	Mode              string             `json:"mode"`
	BlockConfig       interface{}        `json:"blockConfig"`
	CurrentBlock      interface{}        `json:"currentBlock"`
	TotalBlocks       int                `json:"totalBlocks"`
	QuestionsPerBlock int                `json:"questionsPerBlock"`
	IsBlockBased      bool               `json:"isBlockBased"`
	TotalQuestions    int                `json:"totalQuestions"`
}

// AnswerPayload represents complex/grammar/coding options
type AnswerPayload struct {
	Code              string  `json:"code"`
	SubmittedCode     string  `json:"submittedCode"`
	Language          string  `json:"language"`
	Lang              string  `json:"lang"`
	SelectedOptionId  string  `json:"selectedOptionId"`
	OptionId          string  `json:"optionId"`
	Value             string  `json:"value"`
	Text              string  `json:"text"`
	AnswerText        string  `json:"answerText"`
	Audio             string  `json:"audio"`
	AudioBase64       string  `json:"audioBase64"`
	AudioUrl          string  `json:"audioUrl"`
}
