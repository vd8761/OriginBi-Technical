package models

type ModuleConfig struct {
	Attempts        string
	Questions       string
	Junction        string
	IDCol           string
	Options         string
	AttemptIDCol    string
	CatCol          string
	HasDifficulty   bool
	HasMode         bool
	TextColumn      string
}

var ModuleConfigs = map[string]ModuleConfig{
	"aptitude": {
		Attempts:      "tech_aptitude_attempts",
		Questions:     "tech_aptitude_questions",
		Junction:      "tech_aptitude_attempt_questions",
		IDCol:         "aptitude_question_id",
		Options:       "tech_aptitude_options",
		AttemptIDCol:  "aptitude_attempt_id",
		CatCol:        "subcategory",
		HasDifficulty: true,
		HasMode:       true,
		TextColumn:    "question_text",
	},
	"grammar": {
		Attempts:      "tech_grammar_attempts",
		Questions:     "tech_grammar_questions",
		Junction:      "tech_grammar_attempt_questions",
		IDCol:         "grammar_question_id",
		Options:       "tech_grammar_options",
		AttemptIDCol:  "grammar_attempt_id",
		CatCol:        "task_type",
		HasDifficulty: true,
		HasMode:       true,
		TextColumn:    "question_text",
	},
	"mnc": {
		Attempts:      "tech_mnc_attempts",
		Questions:     "tech_mnc_questions",
		Junction:      "tech_mnc_attempt_questions",
		IDCol:         "mnc_question_id",
		Options:       "tech_mnc_options",
		AttemptIDCol:  "mnc_attempt_id",
		CatCol:        "subcategory",
		HasDifficulty: true,
		HasMode:       true,
		TextColumn:    "question_text",
	},
	"role": {
		Attempts:      "tech_role_attempts",
		Questions:     "tech_role_questions",
		Junction:      "tech_role_attempt_questions",
		IDCol:         "role_question_id",
		Options:       "tech_role_options",
		AttemptIDCol:  "role_attempt_id",
		CatCol:        "domain",
		HasDifficulty: false,
		HasMode:       false,
		TextColumn:    "question_text",
	},
	// "coding" is intentionally absent. Coding questions/attempts live in
	// exam-engine (`questions` with plugin_slug='assessment.coding') and are
	// served from its admin + runtime APIs. Anything reaching this service
	// asking for module="coding" should be routed there instead.
}
