// Package assessmentmcq implements the assessment.mcq base plugin. It owns the
// question body shape (prompt, options, correct answer key, language bucket),
// the answer payload shape (selected option IDs), and the validators that
// enforce both.
package assessmentmcq

import (
	"embed"
	"fmt"
)

const (
	Slug         = "assessment.mcq"
	ActionSubmit = "mcq.submit"
)

//go:embed schemas/*.json
var schemaFS embed.FS

// Schemas returns the embedded JSON Schema bytes for this plugin's three
// schemas: question-body, answer, config.
func Schemas() (questionBody, answer, config []byte, err error) {
	if questionBody, err = schemaFS.ReadFile("schemas/question-body.schema.json"); err != nil {
		return nil, nil, nil, fmt.Errorf("%s: read question-body schema: %w", Slug, err)
	}
	if answer, err = schemaFS.ReadFile("schemas/answer.schema.json"); err != nil {
		return nil, nil, nil, fmt.Errorf("%s: read answer schema: %w", Slug, err)
	}
	if config, err = schemaFS.ReadFile("schemas/config.schema.json"); err != nil {
		return nil, nil, nil, fmt.Errorf("%s: read config schema: %w", Slug, err)
	}
	return questionBody, answer, config, nil
}

// PromptFormat mirrors the value used by assessment.coding so admin renderers
// can reuse the same code path.
type PromptFormat string

const (
	PromptFormatMarkdown PromptFormat = "markdown"
	PromptFormatHTML     PromptFormat = "html"
	PromptFormatPlain    PromptFormat = "plain"
)

// Option is one selectable answer.
type Option struct {
	ID          string `json:"id"`
	Text        string `json:"text"`
	Explanation string `json:"explanation,omitempty"`
}

// AttachmentMeta is one uploaded media file attached to the question. Mirrors
// the shape used by assessment.coding so the admin uploader is reusable.
type AttachmentMeta struct {
	URL      string `json:"url"`
	Key      string `json:"key,omitempty"`
	FileName string `json:"fileName,omitempty"`
	Alt      string `json:"alt,omitempty"`
	Mime     string `json:"mime,omitempty"`
}

// QuestionBody is the in-process realization of question_versions.body for
// mcq-type questions.
type QuestionBody struct {
	Type             string           `json:"type"`
	Title            string           `json:"title"`
	Section          string           `json:"section,omitempty"`
	Category         string           `json:"category,omitempty"`
	Difficulty       string           `json:"difficulty,omitempty"`
	PromptFormat     PromptFormat     `json:"promptFormat,omitempty"`
	Prompt           string           `json:"prompt"`
	Language         string           `json:"language"`
	Options          []Option         `json:"options"`
	CorrectOptionIDs []string         `json:"correctOptionIds"`
	MultiSelect      *bool            `json:"multiSelect,omitempty"`
	ShuffleOptions   *bool            `json:"shuffleOptions,omitempty"`
	Tags             []string         `json:"tags,omitempty"`
	Mode             string           `json:"mode,omitempty"`
	Explanation      string           `json:"explanation,omitempty"`
	Attachments      []AttachmentMeta `json:"attachments,omitempty"`
}

// Answer is the candidate's submission for mcq.submit.
type Answer struct {
	SelectedOptionIDs []string `json:"selectedOptionIds"`
}
