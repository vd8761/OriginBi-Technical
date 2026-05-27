package assessmentmcq

import (
	"encoding/json"
	"fmt"
	"strings"
)

// ValidationError mirrors the shape used by assessment.coding so the admin
// authoring UI can render errors from either plugin with the same component.
type ValidationError struct {
	Code    string         `json:"code"`
	Field   string         `json:"field,omitempty"`
	Message string         `json:"message"`
	Detail  map[string]any `json:"detail,omitempty"`
}

func (e *ValidationError) Error() string {
	if e.Field != "" {
		return fmt.Sprintf("%s: %s (%s)", e.Code, e.Message, e.Field)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

type ValidationErrors []*ValidationError

func (e ValidationErrors) Error() string {
	parts := make([]string, 0, len(e))
	for _, ve := range e {
		parts = append(parts, ve.Error())
	}
	return strings.Join(parts, "; ")
}

func (e ValidationErrors) HasErrors() bool { return len(e) > 0 }

// KnownLanguageSlugs lets the validator confirm a language slug references a
// real plugin without importing pluginhost.
type KnownLanguageSlugs func(slug string) bool

// AuthoringContext bundles the lookups the validator needs.
type AuthoringContext struct {
	IsKnownLanguage KnownLanguageSlugs
}

func ValidateQuestionBody(raw json.RawMessage, ctx AuthoringContext) error {
	var body QuestionBody
	if err := json.Unmarshal(raw, &body); err != nil {
		return ValidationErrors{{Code: "INVALID_JSON", Message: fmt.Sprintf("body is not valid JSON: %v", err)}}
	}
	return ValidateQuestionBodyStruct(&body, ctx)
}

func ValidateQuestionBodyStruct(body *QuestionBody, ctx AuthoringContext) error {
	var errs ValidationErrors

	if body.Type != "mcq" {
		errs = append(errs, &ValidationError{Code: "WRONG_TYPE", Field: "type", Message: fmt.Sprintf("expected 'mcq', got %q", body.Type)})
	}
	if strings.TrimSpace(body.Title) == "" {
		errs = append(errs, &ValidationError{Code: "TITLE_REQUIRED", Field: "title", Message: "title is required"})
	}
	if strings.TrimSpace(body.Prompt) == "" {
		errs = append(errs, &ValidationError{Code: "PROMPT_REQUIRED", Field: "prompt", Message: "prompt is required"})
	}
	if body.PromptFormat == "" {
		body.PromptFormat = PromptFormatMarkdown
	}
	switch body.PromptFormat {
	case PromptFormatMarkdown, PromptFormatHTML, PromptFormatPlain:
	default:
		errs = append(errs, &ValidationError{Code: "INVALID_PROMPT_FORMAT", Field: "promptFormat", Message: fmt.Sprintf("must be markdown|html|plain, got %q", body.PromptFormat)})
	}

	// Language must be a known plugin slug.
	canonical := canonicalLanguageSlug(body.Language)
	if canonical == "" {
		errs = append(errs, &ValidationError{Code: "LANGUAGE_REQUIRED", Field: "language", Message: "language is required"})
	} else if ctx.IsKnownLanguage != nil && !ctx.IsKnownLanguage(canonical) {
		errs = append(errs, &ValidationError{Code: "UNKNOWN_LANGUAGE", Field: "language", Message: fmt.Sprintf("language plugin %s is not installed", body.Language)})
	}

	// Options.
	if len(body.Options) < 2 {
		errs = append(errs, &ValidationError{Code: "TOO_FEW_OPTIONS", Field: "options", Message: "at least 2 options are required"})
	}
	if len(body.Options) > 10 {
		errs = append(errs, &ValidationError{Code: "TOO_MANY_OPTIONS", Field: "options", Message: fmt.Sprintf("at most 10 options allowed, got %d", len(body.Options))})
	}
	seenIDs := make(map[string]bool, len(body.Options))
	for i, opt := range body.Options {
		field := fmt.Sprintf("options[%d]", i)
		if strings.TrimSpace(opt.ID) == "" {
			errs = append(errs, &ValidationError{Code: "OPTION_ID_REQUIRED", Field: field + ".id", Message: "option id is required"})
			continue
		}
		if seenIDs[opt.ID] {
			errs = append(errs, &ValidationError{Code: "DUPLICATE_OPTION_ID", Field: field + ".id", Message: fmt.Sprintf("duplicate option id %q", opt.ID)})
		}
		seenIDs[opt.ID] = true
		if strings.TrimSpace(opt.Text) == "" {
			errs = append(errs, &ValidationError{Code: "OPTION_TEXT_REQUIRED", Field: field + ".text", Message: "option text is required"})
		}
	}

	// Correct option IDs must each reference an existing option.
	if len(body.CorrectOptionIDs) == 0 {
		errs = append(errs, &ValidationError{Code: "CORRECT_REQUIRED", Field: "correctOptionIds", Message: "at least one correct option is required"})
	}
	seenCorrect := make(map[string]bool, len(body.CorrectOptionIDs))
	for i, id := range body.CorrectOptionIDs {
		field := fmt.Sprintf("correctOptionIds[%d]", i)
		if seenCorrect[id] {
			errs = append(errs, &ValidationError{Code: "DUPLICATE_CORRECT_ID", Field: field, Message: fmt.Sprintf("duplicate correct id %q", id)})
		}
		seenCorrect[id] = true
		if !seenIDs[id] {
			errs = append(errs, &ValidationError{Code: "CORRECT_OPTION_MISSING", Field: field, Message: fmt.Sprintf("correctOptionIds entry %q does not match any option.id", id)})
		}
	}

	switch body.Mode {
	case "", "trial", "main":
	default:
		errs = append(errs, &ValidationError{Code: "INVALID_MODE", Field: "mode", Message: fmt.Sprintf("must be trial|main, got %q", body.Mode)})
	}

	if errs.HasErrors() {
		return errs
	}
	return nil
}

// canonicalLanguageSlug rewrites bare language identifiers ("python") to the
// canonical plugin slug form ("language.python"). Empty input returns "".
func canonicalLanguageSlug(slug string) string {
	s := strings.ToLower(strings.TrimSpace(slug))
	if s == "" || strings.HasPrefix(s, "language.") {
		return s
	}
	return "language." + s
}
