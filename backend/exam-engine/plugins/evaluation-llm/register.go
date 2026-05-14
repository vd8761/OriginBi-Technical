// Package evaluationllm implements the evaluation.llm scaffold.
package evaluationllm

import (
	"context"
	"embed"
	"encoding/json"
	"net/http"

	"github.com/originbi/exam-engine/internal/pluginhost"
)

const (
	Slug           = "evaluation.llm"
	ActionEvaluate = "llm.evaluate"
)

//go:embed schemas/*.json
var schemaFS embed.FS

func ConfigSchema() (json.RawMessage, error) {
	raw, err := schemaFS.ReadFile("schemas/config.schema.json")
	if err != nil {
		return nil, err
	}
	return json.RawMessage(raw), nil
}

func Register(reg *pluginhost.Registry) error {
	if reg == nil {
		return nil
	}
	return reg.RegisterAction(Slug, ActionEvaluate, notImplementedHandler)
}

func notImplementedHandler(context.Context, *pluginhost.Registry, pluginhost.ActionRequest) (pluginhost.ActionResponse, error) {
	body, _ := json.Marshal(map[string]string{
		"error":  "evaluation.llm.dispatcher_not_implemented",
		"detail": "Provider call not implemented in this build",
	})
	return pluginhost.ActionResponse{
		HTTPStatus: http.StatusNotImplemented,
		Body:       body,
	}, nil
}
