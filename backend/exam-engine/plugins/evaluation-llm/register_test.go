package evaluationllm

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/originbi/exam-engine/internal/pluginhost"
)

func TestRegisterEvaluateReturnsNotImplemented(t *testing.T) {
	reg := &pluginhost.Registry{}
	if err := Register(reg); err != nil {
		t.Fatalf("register: %v", err)
	}
	resp, err := reg.Dispatch(context.Background(), pluginhost.ActionRequest{Action: ActionEvaluate})
	if err != nil {
		t.Fatalf("dispatch: %v", err)
	}
	if resp.HTTPStatus != http.StatusNotImplemented {
		t.Fatalf("expected 501, got %d", resp.HTTPStatus)
	}
	var body map[string]string
	if err := json.Unmarshal(resp.Body, &body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body["error"] != "evaluation.llm.dispatcher_not_implemented" {
		t.Fatalf("unexpected error code: %q", body["error"])
	}
}

func TestConfigSchemaEmbedded(t *testing.T) {
	raw, err := ConfigSchema()
	if err != nil {
		t.Fatalf("schema: %v", err)
	}
	var schema map[string]any
	if err := json.Unmarshal(raw, &schema); err != nil {
		t.Fatalf("schema json: %v", err)
	}
	if schema["title"] == "" {
		t.Fatal("expected schema title")
	}
}
