// Package assessmentcoding implements the assessment.coding base plugin. It
// owns:
//
//   - the question body shape (markdown statement, multi-file starters,
//     per-file read-only flags and region locks, allowed-language list)
//   - the answer payload shape (language slug + files + entryFile + custom
//     stdin)
//   - validators that enforce the above (called by the run/submit handlers
//     in Phase 4)
//
// The JSON Schema files in schemas/ are the contract; the Go structs and
// validators below are the in-process realization of that contract. We use
// hand-written validators (not a runtime JSON Schema engine) to avoid a
// dependency for v1 — the body shape is small and stable, and the validators
// produce structured errors with the same code names the frontend expects.
package assessmentcoding

import (
	"embed"
	"fmt"
)

const (
	// Slug is the canonical plugin slug used in plugin lookups, action IDs, and
	// error messages.
	Slug = "assessment.coding"

	// Action IDs handled by this plugin. Registered with pluginhost in Phase 4.
	ActionRunCustom = "coding.run-custom"
	ActionRunTests  = "coding.run-tests"
	ActionSubmit    = "coding.submit"
)

// Embedded schema files. Exposed via Schemas() so the admin API can serve
// them to the frontend's schema-driven config renderer without duplicating
// the JSON across packages.
//
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

// PromptFormat is the renderer hint stored in QuestionBody.PromptFormat.
// "markdown" is the new default; "html" covers legacy seeded bodies; "plain"
// is a passthrough.
type PromptFormat string

const (
	PromptFormatMarkdown PromptFormat = "markdown"
	PromptFormatHTML     PromptFormat = "html"
	PromptFormatPlain    PromptFormat = "plain"
)

// LockedRegion is a contiguous range of lines within a starter file that the
// candidate cannot edit. Lines are 1-indexed and the range is inclusive on
// both ends.
type LockedRegion struct {
	StartLine int    `json:"startLine"`
	EndLine   int    `json:"endLine"`
	Reason    string `json:"reason,omitempty"`
}

// Contains reports whether `line` falls inside this region (inclusive).
func (l LockedRegion) Contains(line int) bool {
	return line >= l.StartLine && line <= l.EndLine
}

// StarterFile is one file in a per-language starter set. ReadOnly locks the
// whole file; LockedRegions locks individual line ranges.
type StarterFile struct {
	Path          string         `json:"path"`
	Content       string         `json:"content"`
	ReadOnly      bool           `json:"readOnly,omitempty"`
	LockedRegions []LockedRegion `json:"lockedRegions,omitempty"`
	// Language is an optional Monaco hint for files whose extension is
	// ambiguous (README.md inside a Python project, etc.).
	Language string `json:"language,omitempty"`
}

// Sample is a visible-to-candidate I/O example. Distinct from
// question_test_cases — these are documentation, not graded.
type Sample struct {
	Input       string `json:"input"`
	Output      string `json:"output"`
	Explanation string `json:"explanation,omitempty"`
}

// Hint is a progressively revealed help text. AfterFailures is the number of
// failed run-tests attempts before the hint becomes visible.
type Hint struct {
	AfterFailures int    `json:"afterFailures"`
	Text          string `json:"text"`
}

// JudgeConfig holds per-question overrides for judging behavior. Defaults
// come from the language plugin's LanguageConfig.
type JudgeConfig struct {
	TimeLimitMs         *int  `json:"timeLimitMs,omitempty"`
	MemoryLimitKb       *int  `json:"memoryLimitKb,omitempty"`
	StrictWhitespace    *bool `json:"strictWhitespace,omitempty"`
	StopOnFirstFailure  *bool `json:"stopOnFirstFailure,omitempty"`
	PartialCredit       *bool `json:"partialCredit,omitempty"`
	ShowWrongAnswerDiff *bool `json:"showWrongAnswerDiff,omitempty"`
}

// FormattedText is a content blob plus a renderer hint. Used for the
// per-question Input Format / Output Format / Constraints sections so each
// can independently be markdown, html, or plain text.
type FormattedText struct {
	Kind    PromptFormat `json:"kind"`    // markdown | html | plain
	Content string       `json:"content"`
}

// AttachmentMeta is one uploaded media file attached to a question. The file
// itself lives in object storage (R2); we only keep the reference here so the
// admin editor can re-list / re-insert it and the candidate side can render
// it. Distinct from the legacy single-object `Image`/`Media` fields.
type AttachmentMeta struct {
	URL      string `json:"url"`
	Key      string `json:"key,omitempty"`
	FileName string `json:"fileName,omitempty"`
	Alt      string `json:"alt,omitempty"`
	Mime     string `json:"mime,omitempty"`
}

// QuestionBody is the in-process realization of question_versions.body for
// coding-type questions. Lossless w.r.t. the JSON Schema in schemas/.
type QuestionBody struct {
	Type             string                   `json:"type"`
	ResponseType     string                   `json:"responseType,omitempty"`
	Title            string                   `json:"title"`
	Section          string                   `json:"section,omitempty"`
	Category         string                   `json:"category,omitempty"`
	Difficulty       string                   `json:"difficulty,omitempty"`
	PromptFormat     PromptFormat             `json:"promptFormat,omitempty"`
	Prompt           string                   `json:"prompt"`
	AllowedLanguages []string                 `json:"allowedLanguages,omitempty"`
	EntryFile        map[string]string        `json:"entryFile,omitempty"`
	StarterCode      map[string]string        `json:"starterCode,omitempty"`
	StarterFiles     map[string][]StarterFile `json:"starterFiles,omitempty"`
	Samples          []Sample                 `json:"samples,omitempty"`
	Constraints      string                   `json:"constraints,omitempty"`
	Hints            []Hint                   `json:"hints,omitempty"`
	JudgeConfig      *JudgeConfig             `json:"judgeConfig,omitempty"`

	// Authoring-spec fields (see schemas/question-body.schema.json). All
	// optional so legacy bodies (migration 011/021) round-trip unchanged.
	Tags              []string         `json:"tags,omitempty"`
	InputFormat       *FormattedText   `json:"inputFormat,omitempty"`
	OutputFormat      *FormattedText   `json:"outputFormat,omitempty"`
	ConstraintsFormat *FormattedText   `json:"constraintsFormat,omitempty"`
	HintsEnabled      *bool            `json:"hintsEnabled,omitempty"`
	MultiFile         *bool            `json:"multiFile,omitempty"`
	Mode              string           `json:"mode,omitempty"` // trial | main
	Attachments       []AttachmentMeta `json:"attachments,omitempty"`

	// The following are passthrough fields kept so existing seeded bodies
	// (migration 011) round-trip unchanged through the new schema.
	Image   map[string]any `json:"image,omitempty"`
	Media   map[string]any `json:"media,omitempty"`
	Pretext map[string]any `json:"pretext,omitempty"`
}

// AnswerFile is one file in a candidate's submission.
type AnswerFile struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

// Answer is the payload submitted to coding.run-custom / coding.run-tests /
// coding.submit. Mirrors the existing RunRequest in code_run_handlers.go.
type Answer struct {
	Language    string       `json:"language"`
	Files       []AnswerFile `json:"files"`
	EntryFile   string       `json:"entryFile,omitempty"`
	CustomStdin string       `json:"customStdin,omitempty"`
}

// FilesByPath indexes the answer's files by their path. Used by the locked
// file/region enforcer to compare candidate content against the snapshot.
func (a *Answer) FilesByPath() map[string]string {
	out := make(map[string]string, len(a.Files))
	for _, f := range a.Files {
		out[f.Path] = f.Content
	}
	return out
}
