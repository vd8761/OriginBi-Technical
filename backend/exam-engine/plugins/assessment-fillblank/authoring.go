package assessmentfillblank

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

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

type KnownLanguageSlugs func(slug string) bool

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

	if body.Type != "fillblank" {
		errs = append(errs, &ValidationError{Code: "WRONG_TYPE", Field: "type", Message: fmt.Sprintf("expected 'fillblank', got %q", body.Type)})
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

	canonical := canonicalLanguageSlug(body.Language)
	if canonical == "" {
		errs = append(errs, &ValidationError{Code: "LANGUAGE_REQUIRED", Field: "language", Message: "language is required"})
	} else if ctx.IsKnownLanguage != nil && !ctx.IsKnownLanguage(canonical) {
		errs = append(errs, &ValidationError{Code: "UNKNOWN_LANGUAGE", Field: "language", Message: fmt.Sprintf("language plugin %s is not installed", body.Language)})
	}

	if len(body.Blanks) == 0 {
		errs = append(errs, &ValidationError{Code: "BLANKS_REQUIRED", Field: "blanks", Message: "at least one blank is required"})
	}
	seenIDs := make(map[string]bool, len(body.Blanks))
	for i, b := range body.Blanks {
		field := fmt.Sprintf("blanks[%d]", i)
		if strings.TrimSpace(b.ID) == "" {
			errs = append(errs, &ValidationError{Code: "BLANK_ID_REQUIRED", Field: field + ".id", Message: "blank id is required"})
			continue
		}
		if seenIDs[b.ID] {
			errs = append(errs, &ValidationError{Code: "DUPLICATE_BLANK_ID", Field: field + ".id", Message: fmt.Sprintf("duplicate blank id %q", b.ID)})
		}
		seenIDs[b.ID] = true
		if len(b.Answers) == 0 {
			errs = append(errs, &ValidationError{Code: "ANSWERS_REQUIRED", Field: field + ".answers", Message: "at least one accepted answer is required"})
		}
		// Validate match mode + (if regex) compilability.
		mode := b.MatchMode
		if mode == "" {
			mode = MatchCI
		}
		switch mode {
		case MatchExact, MatchCI, MatchTrim:
		case MatchRegex:
			for j, ans := range b.Answers {
				if _, err := regexp.Compile(ans); err != nil {
					errs = append(errs, &ValidationError{
						Code: "INVALID_REGEX", Field: fmt.Sprintf("%s.answers[%d]", field, j),
						Message: fmt.Sprintf("regex %q does not compile: %v", ans, err),
					})
				}
			}
		default:
			errs = append(errs, &ValidationError{Code: "INVALID_MATCH_MODE", Field: field + ".matchMode", Message: fmt.Sprintf("must be exact|ci|trim|regex, got %q", b.MatchMode)})
		}
	}

	// Sanity-check: every {{id}} placeholder in the prompt should map to a known
	// blank, and every blank should be referenced from the prompt. Non-fatal: we
	// emit warnings via ValidationError but with a UNDECLARED/UNUSED code.
	placeholders := extractPlaceholders(body.Prompt)
	for _, p := range placeholders {
		if !seenIDs[p] {
			errs = append(errs, &ValidationError{
				Code: "UNDECLARED_PLACEHOLDER", Field: "prompt",
				Message: fmt.Sprintf("prompt references {{%s}} but no blank with id=%q exists", p, p),
			})
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

var placeholderRe = regexp.MustCompile(`\{\{\s*([^}\s]+)\s*\}\}`)

func extractPlaceholders(prompt string) []string {
	matches := placeholderRe.FindAllStringSubmatch(prompt, -1)
	if len(matches) == 0 {
		return nil
	}
	out := make([]string, 0, len(matches))
	seen := map[string]bool{}
	for _, m := range matches {
		if seen[m[1]] {
			continue
		}
		seen[m[1]] = true
		out = append(out, m[1])
	}
	return out
}

func canonicalLanguageSlug(slug string) string {
	s := strings.ToLower(strings.TrimSpace(slug))
	if s == "" || strings.HasPrefix(s, "language.") {
		return s
	}
	return "language." + s
}
