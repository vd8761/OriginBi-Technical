package assessmentcoding

import (
	"errors"
	"strings"
	"testing"
)

func knownLanguages(slugs ...string) KnownLanguageSlugs {
	set := make(map[string]bool, len(slugs))
	for _, s := range slugs {
		set[s] = true
	}
	return func(slug string) bool { return set[slug] }
}

func TestValidateQuestionBody_HappyPath(t *testing.T) {
	body := &QuestionBody{
		Type:             "coding",
		Title:            "Two Sum",
		Prompt:           "Find two numbers that add up to target.",
		PromptFormat:     PromptFormatMarkdown,
		AllowedLanguages: []string{"language.python"},
		EntryFile:        map[string]string{"language.python": "solution.py"},
		StarterFiles: map[string][]StarterFile{
			"language.python": {
				{Path: "solution.py", Content: "def two_sum(nums, target):\n    pass\n"},
				{Path: "README.md", Content: "Edit solution.py.\n", ReadOnly: true, Language: "markdown"},
			},
		},
		Hints: []Hint{
			{AfterFailures: 2, Text: "Try a hash map."},
			{AfterFailures: 5, Text: "O(n) is possible."},
		},
	}
	ctx := AuthoringContext{IsKnownLanguage: knownLanguages("language.python")}
	if err := ValidateQuestionBodyStruct(body, ctx); err != nil {
		t.Fatalf("expected no errors, got %v", err)
	}
}

func TestValidateQuestionBody_MissingRequired(t *testing.T) {
	body := &QuestionBody{Type: "coding"} // no title, no prompt
	err := ValidateQuestionBodyStruct(body, AuthoringContext{})
	if err == nil {
		t.Fatal("expected validation errors, got nil")
	}
	var ve ValidationErrors
	if !errors.As(err, &ve) {
		t.Fatalf("expected ValidationErrors, got %T", err)
	}
	codes := codeSet(ve)
	for _, want := range []string{"TITLE_REQUIRED", "PROMPT_REQUIRED"} {
		if !codes[want] {
			t.Errorf("expected error code %s, got %v", want, codes)
		}
	}
}

func TestValidateQuestionBody_UnknownLanguageInStarter(t *testing.T) {
	body := &QuestionBody{
		Type:   "coding",
		Title:  "X",
		Prompt: "Y",
		StarterFiles: map[string][]StarterFile{
			"language.kotlin": {{Path: "Main.kt", Content: "fun main(){}\n"}},
		},
	}
	ctx := AuthoringContext{IsKnownLanguage: knownLanguages("language.python")}
	err := ValidateQuestionBodyStruct(body, ctx)
	if err == nil {
		t.Fatal("expected UNKNOWN_LANGUAGE for language.kotlin")
	}
	var ve ValidationErrors
	errors.As(err, &ve)
	if !codeSet(ve)["UNKNOWN_LANGUAGE"] {
		t.Errorf("expected UNKNOWN_LANGUAGE, got %v", ve)
	}
}

func TestValidateQuestionBody_LanguageNotInAllowedList(t *testing.T) {
	body := &QuestionBody{
		Type:             "coding",
		Title:            "X",
		Prompt:           "Y",
		AllowedLanguages: []string{"language.python"},
		StarterFiles: map[string][]StarterFile{
			"language.java": {{Path: "Main.java", Content: "class Main{}\n"}},
		},
	}
	err := ValidateQuestionBodyStruct(body, AuthoringContext{})
	if err == nil {
		t.Fatal("expected LANGUAGE_NOT_ALLOWED")
	}
	var ve ValidationErrors
	errors.As(err, &ve)
	if !codeSet(ve)["LANGUAGE_NOT_ALLOWED"] {
		t.Errorf("expected LANGUAGE_NOT_ALLOWED, got %v", ve)
	}
}

func TestValidateQuestionBody_LockedRegionOutOfRange(t *testing.T) {
	body := &QuestionBody{
		Type:   "coding",
		Title:  "X",
		Prompt: "Y",
		StarterFiles: map[string][]StarterFile{
			"language.python": {{
				Path:    "solution.py",
				Content: "line1\nline2\nline3\n",
				LockedRegions: []LockedRegion{
					{StartLine: 1, EndLine: 5}, // file has 3 lines
				},
			}},
		},
	}
	err := ValidateQuestionBodyStruct(body, AuthoringContext{})
	if err == nil {
		t.Fatal("expected LOCKED_REGION_OUT_OF_RANGE")
	}
	var ve ValidationErrors
	errors.As(err, &ve)
	if !codeSet(ve)["LOCKED_REGION_OUT_OF_RANGE"] {
		t.Errorf("expected LOCKED_REGION_OUT_OF_RANGE, got %v", ve)
	}
}

func TestValidateQuestionBody_DuplicatePath(t *testing.T) {
	body := &QuestionBody{
		Type:   "coding",
		Title:  "X",
		Prompt: "Y",
		StarterFiles: map[string][]StarterFile{
			"language.python": {
				{Path: "solution.py", Content: "a"},
				{Path: "solution.py", Content: "b"},
			},
		},
	}
	err := ValidateQuestionBodyStruct(body, AuthoringContext{})
	var ve ValidationErrors
	errors.As(err, &ve)
	if !codeSet(ve)["DUPLICATE_FILE_PATH"] {
		t.Errorf("expected DUPLICATE_FILE_PATH, got %v", ve)
	}
}

func TestValidateQuestionBody_EntryFileMissing(t *testing.T) {
	body := &QuestionBody{
		Type:   "coding",
		Title:  "X",
		Prompt: "Y",
		StarterFiles: map[string][]StarterFile{
			"language.python": {{Path: "solution.py", Content: "x"}},
		},
		EntryFile: map[string]string{"language.python": "main.py"},
	}
	err := ValidateQuestionBodyStruct(body, AuthoringContext{})
	var ve ValidationErrors
	errors.As(err, &ve)
	if !codeSet(ve)["ENTRY_FILE_MISSING"] {
		t.Errorf("expected ENTRY_FILE_MISSING, got %v", ve)
	}
}

func TestValidateQuestionBody_HintsMustBeMonotonic(t *testing.T) {
	body := &QuestionBody{
		Type:   "coding",
		Title:  "X",
		Prompt: "Y",
		Hints: []Hint{
			{AfterFailures: 5, Text: "later"},
			{AfterFailures: 2, Text: "earlier"}, // wrong order
		},
	}
	err := ValidateQuestionBodyStruct(body, AuthoringContext{})
	var ve ValidationErrors
	errors.As(err, &ve)
	if !codeSet(ve)["HINTS_NOT_MONOTONIC"] {
		t.Errorf("expected HINTS_NOT_MONOTONIC, got %v", ve)
	}
}

func TestValidateQuestionBody_PathTraversalRejected(t *testing.T) {
	body := &QuestionBody{
		Type:   "coding",
		Title:  "X",
		Prompt: "Y",
		StarterFiles: map[string][]StarterFile{
			"language.python": {{Path: "../../etc/passwd", Content: ""}},
		},
	}
	err := ValidateQuestionBodyStruct(body, AuthoringContext{})
	var ve ValidationErrors
	errors.As(err, &ve)
	if !codeSet(ve)["INVALID_FILE_PATH"] {
		t.Errorf("expected INVALID_FILE_PATH, got %v", ve)
	}
}

// codeSet flattens a ValidationErrors slice into a set of codes for easier
// assertions in tests.
func codeSet(ve ValidationErrors) map[string]bool {
	out := make(map[string]bool, len(ve))
	for _, e := range ve {
		out[e.Code] = true
	}
	return out
}

// quietJSON returns a compact one-line representation of a slice of
// ValidationErrors. Handy when a test failure prints `%v` on a complex case.
func quietJSON(ve ValidationErrors) string {
	var b strings.Builder
	for i, e := range ve {
		if i > 0 {
			b.WriteString("; ")
		}
		b.WriteString(e.Code)
	}
	return b.String()
}

var _ = quietJSON // referenced from runtime_test.go
