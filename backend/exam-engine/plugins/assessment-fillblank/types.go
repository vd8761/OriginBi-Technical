// Package assessmentfillblank implements the assessment.fillblank base plugin.
// It owns the question body shape (prompt with {{n}} placeholders mapped into
// a blanks array of accepted-answer sets), the answer payload (blank.id ->
// candidate string), and grading.
package assessmentfillblank

import (
	"embed"
	"fmt"
)

const (
	Slug         = "assessment.fillblank"
	ActionSubmit = "fillblank.submit"
)

//go:embed schemas/*.json
var schemaFS embed.FS

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

type PromptFormat string

const (
	PromptFormatMarkdown PromptFormat = "markdown"
	PromptFormatHTML     PromptFormat = "html"
	PromptFormatPlain    PromptFormat = "plain"
)

// MatchMode selects how a candidate's input is compared to accepted answers.
type MatchMode string

const (
	MatchExact MatchMode = "exact"
	MatchCI    MatchMode = "ci"
	MatchTrim  MatchMode = "trim"
	MatchRegex MatchMode = "regex"
)

type AttachmentMeta struct {
	URL      string `json:"url"`
	Key      string `json:"key,omitempty"`
	FileName string `json:"fileName,omitempty"`
	Alt      string `json:"alt,omitempty"`
	Mime     string `json:"mime,omitempty"`
}

// Blank describes one slot in the prompt. The blank's id corresponds to the
// {{id}} placeholder index in prompt.
type Blank struct {
	ID          string    `json:"id"`
	Answers     []string  `json:"answers"`
	MatchMode   MatchMode `json:"matchMode,omitempty"`
	Hint        string    `json:"hint,omitempty"`
	Placeholder string    `json:"placeholder,omitempty"`
}

type QuestionBody struct {
	Type         string           `json:"type"`
	Title        string           `json:"title"`
	Section      string           `json:"section,omitempty"`
	Category     string           `json:"category,omitempty"`
	Difficulty   string           `json:"difficulty,omitempty"`
	PromptFormat PromptFormat     `json:"promptFormat,omitempty"`
	Prompt       string           `json:"prompt"`
	Language     string           `json:"language"`
	Blanks       []Blank          `json:"blanks"`
	Tags         []string         `json:"tags,omitempty"`
	Mode         string           `json:"mode,omitempty"`
	Explanation  string           `json:"explanation,omitempty"`
	Attachments  []AttachmentMeta `json:"attachments,omitempty"`
}

// Answer is the candidate's submission. Keyed by Blank.ID.
type Answer struct {
	Responses map[string]string `json:"responses"`
}
