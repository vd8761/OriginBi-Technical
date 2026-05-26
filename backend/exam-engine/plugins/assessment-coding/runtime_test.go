package assessmentcoding

import (
	"errors"
	"testing"
)

func TestValidateAnswer_HappyPath(t *testing.T) {
	a := &Answer{
		Language: "language.python",
		Files: []AnswerFile{
			{Path: "solution.py", Content: "print('ok')\n"},
		},
		EntryFile: "solution.py",
	}
	rc := RuntimeContext{
		Language:         "language.python",
		AllowedLanguages: []string{"language.python", "language.java"},
		DefaultEntryFile: "solution.py",
	}
	if err := ValidateAnswer(a, rc); err != nil {
		t.Fatalf("expected no errors, got %v", err)
	}
}

func TestValidateAnswer_LanguageNotAllowed(t *testing.T) {
	a := &Answer{Language: "language.go", Files: []AnswerFile{{Path: "main.go", Content: "x"}}, EntryFile: "main.go"}
	rc := RuntimeContext{AllowedLanguages: []string{"language.python"}}
	err := ValidateAnswer(a, rc)
	if err == nil {
		t.Fatal("expected LANGUAGE_NOT_ALLOWED")
	}
	var ve ValidationErrors
	errors.As(err, &ve)
	if !codeSet(ve)["LANGUAGE_NOT_ALLOWED"] {
		t.Errorf("expected LANGUAGE_NOT_ALLOWED, got %v", quietJSON(ve))
	}
}

func TestValidateAnswer_LockedFileModified(t *testing.T) {
	snap := []StarterFile{{
		Path:     "helpers.py",
		Content:  "def build_index(nums):\n    return {}\n",
		ReadOnly: true,
	}, {
		Path:    "solution.py",
		Content: "def two_sum(): pass\n",
	}}
	a := &Answer{
		Language: "language.python",
		Files: []AnswerFile{
			{Path: "helpers.py", Content: "# MWAHAHA\n"}, // tampered
			{Path: "solution.py", Content: "def two_sum(): return [0,1]\n"},
		},
		EntryFile: "solution.py",
	}
	rc := RuntimeContext{Snapshot: snap, AllowedLanguages: []string{"language.python"}}
	err := ValidateAnswer(a, rc)
	var ve ValidationErrors
	errors.As(err, &ve)
	if !codeSet(ve)["LOCKED_FILE_MODIFIED"] {
		t.Errorf("expected LOCKED_FILE_MODIFIED, got %v", quietJSON(ve))
	}
}

func TestValidateAnswer_LockedFileMissing(t *testing.T) {
	snap := []StarterFile{
		{Path: "helpers.py", Content: "x\n", ReadOnly: true},
		{Path: "solution.py", Content: "y\n"},
	}
	a := &Answer{
		Language: "language.python",
		Files: []AnswerFile{
			{Path: "solution.py", Content: "y\n"},
		},
		EntryFile: "solution.py",
	}
	err := ValidateAnswer(a, RuntimeContext{Snapshot: snap, AllowedLanguages: []string{"language.python"}})
	var ve ValidationErrors
	errors.As(err, &ve)
	if !codeSet(ve)["LOCKED_FILE_MISSING"] {
		t.Errorf("expected LOCKED_FILE_MISSING, got %v", quietJSON(ve))
	}
}

func TestValidateAnswer_LockedRegionModified(t *testing.T) {
	starter := "" +
		"# signature - do not modify\n" + // line 1
		"def two_sum(nums, target):\n" + // line 2
		"    # ^ do not modify\n" + // line 3
		"    pass\n" // line 4
	snap := []StarterFile{{
		Path:    "solution.py",
		Content: starter,
		LockedRegions: []LockedRegion{
			{StartLine: 1, EndLine: 3, Reason: "function signature"},
		},
	}}

	// Modify line 4 only — should be allowed.
	a := &Answer{
		Language: "language.python",
		Files: []AnswerFile{{
			Path: "solution.py",
			Content: "# signature - do not modify\n" +
				"def two_sum(nums, target):\n" +
				"    # ^ do not modify\n" +
				"    return [0, 1]\n",
		}},
		EntryFile: "solution.py",
	}
	if err := ValidateAnswer(a, RuntimeContext{Snapshot: snap}); err != nil {
		t.Fatalf("editing outside locked region must be allowed, got %v", err)
	}

	// Modify line 2 — should be rejected with structured detail.
	a.Files[0].Content = "" +
		"# signature - do not modify\n" +
		"def two_sum(a, b):\n" + // changed
		"    # ^ do not modify\n" +
		"    return [0, 1]\n"
	err := ValidateAnswer(a, RuntimeContext{Snapshot: snap})
	if err == nil {
		t.Fatal("expected LOCKED_REGION_MODIFIED")
	}
	var ve ValidationErrors
	errors.As(err, &ve)
	if !codeSet(ve)["LOCKED_REGION_MODIFIED"] {
		t.Fatalf("expected LOCKED_REGION_MODIFIED, got %v", quietJSON(ve))
	}
	// Verify the structured detail carries the lock metadata so the frontend
	// can highlight the violated range.
	var ok bool
	for _, e := range ve {
		if e.Code != "LOCKED_REGION_MODIFIED" {
			continue
		}
		if e.Detail["startLine"] == 1 && e.Detail["endLine"] == 3 && e.Detail["path"] == "solution.py" {
			ok = true
		}
	}
	if !ok {
		t.Errorf("expected detail with startLine=1, endLine=3, path=solution.py; got %v", ve)
	}
}

func TestValidateAnswer_EntryFileFallsBackToDefault(t *testing.T) {
	a := &Answer{
		Language: "language.python",
		Files:    []AnswerFile{{Path: "solution.py", Content: "x"}},
	}
	rc := RuntimeContext{
		DefaultEntryFile: "solution.py",
		AllowedLanguages: []string{"language.python"},
	}
	if err := ValidateAnswer(a, rc); err != nil {
		t.Fatalf("default entry file should be used when answer is silent: %v", err)
	}
}

func TestValidateAnswer_EntryFileMissingErrors(t *testing.T) {
	a := &Answer{
		Language:  "language.python",
		Files:     []AnswerFile{{Path: "solution.py", Content: "x"}},
		EntryFile: "main.py", // not in files
	}
	err := ValidateAnswer(a, RuntimeContext{AllowedLanguages: []string{"language.python"}})
	var ve ValidationErrors
	errors.As(err, &ve)
	if !codeSet(ve)["ENTRY_FILE_MISSING"] {
		t.Errorf("expected ENTRY_FILE_MISSING, got %v", quietJSON(ve))
	}
}

func TestValidateAnswer_TooManyFiles(t *testing.T) {
	a := &Answer{Language: "language.python", EntryFile: "f0.py"}
	for i := 0; i < 5; i++ {
		a.Files = append(a.Files, AnswerFile{Path: fileName(i), Content: "x"})
	}
	err := ValidateAnswer(a, RuntimeContext{MaxFiles: 3, AllowedLanguages: []string{"language.python"}})
	var ve ValidationErrors
	errors.As(err, &ve)
	if !codeSet(ve)["TOO_MANY_FILES"] {
		t.Errorf("expected TOO_MANY_FILES, got %v", quietJSON(ve))
	}
}

func fileName(i int) string {
	return "f" + string(rune('0'+i)) + ".py"
}
