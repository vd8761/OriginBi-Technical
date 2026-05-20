package server

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	assessmentcoding "github.com/originbi/exam-engine/plugins/assessment-coding"
)

func TestDecodeQuestionCSVSeedFile(t *testing.T) {
	path := filepath.Join("..", "..", "seed", "coding_questions_full.csv")
	f, err := os.Open(path)
	if err != nil {
		t.Skipf("seed CSV not found: %v", err)
	}
	defer f.Close()

	rows, err := decodeQuestionCSV(f)
	if err != nil {
		t.Fatalf("decodeQuestionCSV failed: %v", err)
	}
	if len(rows) != 4 {
		t.Fatalf("expected 4 questions, got %d", len(rows))
	}

	first := rows[0]
	if first.Title != "Two Sum" {
		t.Fatalf("row 0 title = %q", first.Title)
	}
	if first.Difficulty != 1 {
		t.Fatalf("row 0 difficulty = %d, want 1 (easy)", first.Difficulty)
	}
	if first.MaxScore != 10 {
		t.Fatalf("row 0 max_score = %v, want 10", first.MaxScore)
	}
	if len(first.TestCases) != 3 {
		t.Fatalf("row 0 test cases = %d, want 3", len(first.TestCases))
	}
	if !first.TestCases[0].IsSample || first.TestCases[0].IsHidden {
		t.Fatalf("row 0 case 0 should be sample+visible: %+v", first.TestCases[0])
	}
	if first.TestCases[0].Explanation == "" {
		t.Fatal("row 0 case 0 missing explanation")
	}

	var body assessmentcoding.QuestionBody
	if err := json.Unmarshal(first.Body, &body); err != nil {
		t.Fatalf("row 0 body unmarshal: %v", err)
	}
	if len(body.AllowedLanguages) != 1 || body.AllowedLanguages[0] != "language.python" {
		t.Fatalf("row 0 allowedLanguages = %v", body.AllowedLanguages)
	}
	if len(body.Tags) != 3 {
		t.Fatalf("row 0 tags = %v, want 3", body.Tags)
	}
	if body.InputFormat == nil || body.OutputFormat == nil {
		t.Fatal("row 0 missing input/output format")
	}
	if body.HintsEnabled == nil || !*body.HintsEnabled {
		t.Fatal("row 0 hintsEnabled should be true")
	}
	if len(body.Hints) != 2 {
		t.Fatalf("row 0 hints = %d, want 2", len(body.Hints))
	}

	// Multi-file row (Valid Parentheses) must synthesize a solution.<ext> file.
	multi := rows[2]
	var mb assessmentcoding.QuestionBody
	if err := json.Unmarshal(multi.Body, &mb); err != nil {
		t.Fatalf("row 2 body unmarshal: %v", err)
	}
	if mb.MultiFile == nil || !*mb.MultiFile {
		t.Fatal("row 2 multiFile should be true")
	}
	files := mb.StarterFiles["language.java"]
	if len(files) != 1 || files[0].Path != "solution.java" {
		t.Fatalf("row 2 starterFiles = %+v, want solution.java", files)
	}
}

func TestNormalizeQuestionRequestDefaultsCodingPlugin(t *testing.T) {
	req := normalizeQuestionRequest(adminQuestionRequest{
		Title: "  Two Sum  ",
		Body:  json.RawMessage(`{"type":"coding"}`),
	})
	if req.Title != "Two Sum" {
		t.Fatalf("expected trimmed title, got %q", req.Title)
	}
	if req.PluginSlug != assessmentcoding.Slug {
		t.Fatalf("expected default plugin slug %q, got %q", assessmentcoding.Slug, req.PluginSlug)
	}
	if req.Difficulty != 1 {
		t.Fatalf("expected default difficulty 1, got %d", req.Difficulty)
	}
}

func TestValidatePluginCreateRejectsBadLanguageSlug(t *testing.T) {
	err := validatePluginCreate(createPluginRequest{
		Kind:       "language",
		Slug:       "kotlin",
		Name:       "Kotlin",
		Version:    "1.0.0",
		PluginType: "addon",
		Category:   "language",
		Schema:     json.RawMessage(`{"displayName":"Kotlin","judge0LanguageId":78,"fileExtension":".kt","monacoLanguageId":"kotlin"}`),
	})
	if err == nil {
		t.Fatal("expected invalid language slug to fail")
	}
}

func TestValidatePluginCreateAcceptsLanguageConfig(t *testing.T) {
	err := validatePluginCreate(createPluginRequest{
		Kind:       "language",
		Slug:       "language.kotlin",
		Name:       "Kotlin",
		Version:    "1.0.0",
		PluginType: "addon",
		Category:   "language",
		Schema:     json.RawMessage(`{"displayName":"Kotlin","judge0LanguageId":78,"fileExtension":".kt","defaultEntryFile":"Main.kt","timeLimitMs":3000,"memoryLimitKb":131072,"stackLimitKb":32768,"processesLimit":32,"outputLimitKb":16384,"supportsMultiFile":true,"monacoLanguageId":"kotlin"}`),
	})
	if err != nil {
		t.Fatalf("expected language config to pass, got %v", err)
	}
}
