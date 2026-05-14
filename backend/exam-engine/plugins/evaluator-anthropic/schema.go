// Package evaluatoranthropic contains metadata for the evaluator.anthropic provider plugin.
package evaluatoranthropic

import (
	"embed"
	"encoding/json"
)

const Slug = "evaluator.anthropic"

//go:embed schemas/*.json
var schemaFS embed.FS

func ConfigSchema() (json.RawMessage, error) {
	raw, err := schemaFS.ReadFile("schemas/config.schema.json")
	if err != nil {
		return nil, err
	}
	return json.RawMessage(raw), nil
}
