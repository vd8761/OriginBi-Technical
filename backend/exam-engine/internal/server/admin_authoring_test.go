package server

import (
	"encoding/json"
	"testing"

	assessmentcoding "github.com/originbi/exam-engine/plugins/assessment-coding"
)

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
