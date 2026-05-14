// Package evaluatoropenai contains metadata for the evaluator.openai provider plugin.
package evaluatoropenai

import (
	"embed"
	"encoding/json"
)

const Slug = "evaluator.openai"

//go:embed schemas/*.json
var schemaFS embed.FS

func ConfigSchema() (json.RawMessage, error) {
	raw, err := schemaFS.ReadFile("schemas/config.schema.json")
	if err != nil {
		return nil, err
	}
	return json.RawMessage(raw), nil
}
