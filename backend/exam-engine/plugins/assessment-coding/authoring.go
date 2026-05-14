package assessmentcoding

import (
	"encoding/json"
	"fmt"
	"strings"
)

// ValidationError is one structured authoring/runtime validation failure.
// Code names are stable strings the frontend / admin UI can branch on; Field
// points to the JSON-pointer-ish path that failed.
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

// ValidationErrors aggregates many failures so the admin UI can report all of
// them at once instead of a one-by-one trickle.
type ValidationErrors []*ValidationError

func (e ValidationErrors) Error() string {
	switch len(e) {
	case 0:
		return ""
	case 1:
		return e[0].Error()
	}
	parts := make([]string, 0, len(e))
	for _, ve := range e {
		parts = append(parts, ve.Error())
	}
	return strings.Join(parts, "; ")
}

// HasErrors is a small helper used by callers that don't want to test len() at
// every callsite.
func (e ValidationErrors) HasErrors() bool { return len(e) > 0 }

// KnownLanguageSlugs is the predicate the validator uses to confirm a
// language slug references a real plugin. It is supplied by the caller so
// this package stays independent of pluginhost.
type KnownLanguageSlugs func(slug string) bool

// AuthoringContext bundles the lookups the validator needs from the wider
// system. Filled in by handlers in Phase 5.
type AuthoringContext struct {
	IsKnownLanguage KnownLanguageSlugs
	// MaxStarterBytes guards against pathological inputs (e.g. a 10MB starter
	// file). Falls back to the schema default when zero.
	MaxStarterBytes int
}

// ValidateQuestionBody enforces the rules from the JSON Schema plus a few
// cross-field invariants that JSON Schema alone can't express:
//
//   - entryFile keys must be in allowedLanguages (or starterCode/Files keys)
//   - starterFiles paths must be unique within a language
//   - lockedRegions startLine <= endLine, both within the file's line count
//   - language slugs referenced anywhere must resolve via ctx.IsKnownLanguage
//
// Returns nil when valid; otherwise ValidationErrors with one entry per
// failure.
func ValidateQuestionBody(raw json.RawMessage, ctx AuthoringContext) error {
	var body QuestionBody
	if err := json.Unmarshal(raw, &body); err != nil {
		return ValidationErrors{{
			Code:    "INVALID_JSON",
			Message: fmt.Sprintf("body is not valid JSON: %v", err),
		}}
	}
	return ValidateQuestionBodyStruct(&body, ctx)
}

// ValidateQuestionBodyStruct is the typed counterpart of ValidateQuestionBody.
// Useful in tests and admin code that already holds a typed struct.
func ValidateQuestionBodyStruct(body *QuestionBody, ctx AuthoringContext) error {
	var errs ValidationErrors

	if body.Type != "coding" {
		errs = append(errs, &ValidationError{
			Code:    "WRONG_TYPE",
			Field:   "type",
			Message: fmt.Sprintf("expected 'coding', got %q", body.Type),
		})
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
		// ok
	default:
		errs = append(errs, &ValidationError{
			Code:    "INVALID_PROMPT_FORMAT",
			Field:   "promptFormat",
			Message: fmt.Sprintf("must be markdown|html|plain, got %q", body.PromptFormat),
		})
	}

	// Language references.
	known := func(slug string) bool {
		if ctx.IsKnownLanguage == nil {
			// Pass-through when caller didn't supply a resolver (unit tests).
			return true
		}
		return ctx.IsKnownLanguage(slug)
	}

	// allowedLanguages plugin slugs.
	seenAllowed := map[string]bool{}
	for i, slug := range body.AllowedLanguages {
		if !strings.HasPrefix(slug, "language.") {
			errs = append(errs, &ValidationError{
				Code: "INVALID_LANGUAGE_SLUG", Field: fmt.Sprintf("allowedLanguages[%d]", i),
				Message: fmt.Sprintf("must be a language plugin slug (got %q)", slug),
			})
			continue
		}
		if seenAllowed[slug] {
			errs = append(errs, &ValidationError{
				Code: "DUPLICATE_LANGUAGE", Field: fmt.Sprintf("allowedLanguages[%d]", i),
				Message: fmt.Sprintf("duplicate language %s", slug),
			})
			continue
		}
		seenAllowed[slug] = true
		if !known(slug) {
			errs = append(errs, &ValidationError{
				Code: "UNKNOWN_LANGUAGE", Field: fmt.Sprintf("allowedLanguages[%d]", i),
				Message: fmt.Sprintf("language plugin %s is not installed", slug),
			})
		}
	}

	// Collect the set of language keys actually used (starterCode + starterFiles
	// + entryFile). Each of these implicitly extends the allowedLanguages.
	usedLangs := map[string]bool{}
	for slug := range body.StarterCode {
		usedLangs[slug] = true
		checkLanguageKey(slug, "starterCode", &errs, known)
	}
	for slug := range body.StarterFiles {
		usedLangs[slug] = true
		checkLanguageKey(slug, "starterFiles", &errs, known)
	}
	for slug := range body.EntryFile {
		usedLangs[slug] = true
		checkLanguageKey(slug, "entryFile", &errs, known)
	}

	// If allowedLanguages is set, every used language must be inside it.
	if len(seenAllowed) > 0 {
		for slug := range usedLangs {
			if !seenAllowed[slug] {
				errs = append(errs, &ValidationError{
					Code:    "LANGUAGE_NOT_ALLOWED",
					Field:   fmt.Sprintf("starterFiles[%s]", slug),
					Message: fmt.Sprintf("%s appears in starter files but is not in allowedLanguages", slug),
				})
			}
		}
	}

	// Validate starterFiles per language: unique paths, valid lockedRegions.
	for slug, files := range body.StarterFiles {
		seenPaths := map[string]bool{}
		fieldPrefix := fmt.Sprintf("starterFiles[%s]", slug)
		for i, f := range files {
			if strings.TrimSpace(f.Path) == "" {
				errs = append(errs, &ValidationError{
					Code: "FILE_PATH_REQUIRED", Field: fmt.Sprintf("%s[%d].path", fieldPrefix, i),
					Message: "path is required",
				})
				continue
			}
			if strings.Contains(f.Path, "..") {
				errs = append(errs, &ValidationError{
					Code: "INVALID_FILE_PATH", Field: fmt.Sprintf("%s[%d].path", fieldPrefix, i),
					Message: fmt.Sprintf("path %q must not contain '..'", f.Path),
				})
			}
			if seenPaths[f.Path] {
				errs = append(errs, &ValidationError{
					Code: "DUPLICATE_FILE_PATH", Field: fmt.Sprintf("%s[%d].path", fieldPrefix, i),
					Message: fmt.Sprintf("duplicate path %q in %s starter files", f.Path, slug),
				})
				continue
			}
			seenPaths[f.Path] = true

			if ctx.MaxStarterBytes > 0 && len(f.Content) > ctx.MaxStarterBytes {
				errs = append(errs, &ValidationError{
					Code: "FILE_TOO_LARGE", Field: fmt.Sprintf("%s[%d].content", fieldPrefix, i),
					Message: fmt.Sprintf("file %q exceeds %d bytes", f.Path, ctx.MaxStarterBytes),
				})
			}

			// LockedRegions: validate ranges against the file's actual line count.
			lineCount := countLines(f.Content)
			for ri, r := range f.LockedRegions {
				rField := fmt.Sprintf("%s[%d].lockedRegions[%d]", fieldPrefix, i, ri)
				switch {
				case r.StartLine < 1:
					errs = append(errs, &ValidationError{
						Code: "LOCKED_REGION_OUT_OF_RANGE", Field: rField,
						Message: "startLine must be >= 1",
					})
				case r.EndLine < r.StartLine:
					errs = append(errs, &ValidationError{
						Code: "LOCKED_REGION_OUT_OF_RANGE", Field: rField,
						Message: fmt.Sprintf("endLine (%d) must be >= startLine (%d)", r.EndLine, r.StartLine),
					})
				case r.EndLine > lineCount:
					errs = append(errs, &ValidationError{
						Code:  "LOCKED_REGION_OUT_OF_RANGE",
						Field: rField,
						Message: fmt.Sprintf("endLine (%d) exceeds file %q line count (%d)",
							r.EndLine, f.Path, lineCount),
					})
				}
			}
		}

		// entryFile, if set for this language, must reference a path that exists.
		if entry, ok := body.EntryFile[slug]; ok && entry != "" {
			if !seenPaths[entry] {
				// Allow shorthand: when only starterCode is set we synthesize a
				// single file under the entry path.
				if _, viaCode := body.StarterCode[slug]; !viaCode {
					errs = append(errs, &ValidationError{
						Code: "ENTRY_FILE_MISSING", Field: fmt.Sprintf("entryFile[%s]", slug),
						Message: fmt.Sprintf("entryFile %q does not exist in starterFiles[%s]", entry, slug),
					})
				}
			}
		}
	}

	// Hints: afterFailures must be monotonic so the candidate experience is
	// understandable (hint 2 needs more failures than hint 1).
	for i := 1; i < len(body.Hints); i++ {
		if body.Hints[i].AfterFailures < body.Hints[i-1].AfterFailures {
			errs = append(errs, &ValidationError{
				Code: "HINTS_NOT_MONOTONIC", Field: fmt.Sprintf("hints[%d].afterFailures", i),
				Message: fmt.Sprintf("hint %d unlocks before hint %d", i+1, i),
			})
		}
	}

	if errs.HasErrors() {
		return errs
	}
	return nil
}

func checkLanguageKey(slug, field string, errs *ValidationErrors, known func(string) bool) {
	if !strings.HasPrefix(slug, "language.") {
		*errs = append(*errs, &ValidationError{
			Code: "INVALID_LANGUAGE_SLUG", Field: fmt.Sprintf("%s[%s]", field, slug),
			Message: fmt.Sprintf("must be a language plugin slug (got %q)", slug),
		})
		return
	}
	if !known(slug) {
		*errs = append(*errs, &ValidationError{
			Code: "UNKNOWN_LANGUAGE", Field: fmt.Sprintf("%s[%s]", field, slug),
			Message: fmt.Sprintf("language plugin %s is not installed", slug),
		})
	}
}

func countLines(s string) int {
	if s == "" {
		return 0
	}
	n := strings.Count(s, "\n")
	if !strings.HasSuffix(s, "\n") {
		n++
	}
	return n
}
