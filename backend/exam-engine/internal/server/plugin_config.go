package server

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/originbi/exam-engine/internal/auth"
	"github.com/originbi/exam-engine/internal/pluginhost"
)

// pluginConfigResponse is the per-attempt plugin manifest the frontend uses
// to instantiate PluginProvider on attempt start. See PLUGIN_ARCHITECTURE.md
// §5.4 for the contract.
type pluginConfigResponse struct {
	Plugins     []pluginConfigEntry  `json:"plugins"`
	Constraints []constraintEntry    `json:"constraints"`
	Surfaces    surfaceCollections   `json:"surfaces"`
}

type pluginConfigEntry struct {
	ID         string                 `json:"id"`
	Slug       string                 `json:"slug"`
	Name       string                 `json:"name"`
	Category   string                 `json:"category"`
	Version    string                 `json:"version"`
	Enabled    bool                   `json:"enabled"`
	Config     map[string]any         `json:"config"`
	Emits      []pluginhost.EmittedEvent `json:"emits,omitempty"`
	Subscribes []string               `json:"subscribes,omitempty"`
}

type constraintEntry struct {
	ID     string         `json:"id"`
	Kind   string         `json:"kind"`
	Config map[string]any `json:"config,omitempty"`
}

type surfaceCollections struct {
	Admin     []pluginhost.SurfaceMount `json:"admin,omitempty"`
	Candidate []pluginhost.SurfaceMount `json:"candidate,omitempty"`
}

// mePluginConfig resolves the set of plugins the caller should run, with
// their effective configuration. Today the resolution is naive: every
// enabled-by-default plugin is included with its declared schema defaults.
// Per-org and per-attempt overrides are stubs that future work fills in.
//
// Optional ?attempt_id=<uuid> narrows resolution to that attempt. We only
// validate the format here; the org/package join is a TODO callout below.
func (s *Server) mePluginConfig(w http.ResponseWriter, r *http.Request) {
	if _, err := auth.Require(r.Context()); err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	if s.plugins == nil {
		writeJSON(w, http.StatusOK, pluginConfigResponse{
			Plugins:  []pluginConfigEntry{},
			Surfaces: surfaceCollections{},
		})
		return
	}

	if raw := strings.TrimSpace(r.URL.Query().Get("attempt_id")); raw != "" {
		if _, err := uuid.Parse(raw); err != nil {
			writeError(w, http.StatusBadRequest, "invalid attempt_id")
			return
		}
		// TODO: join plugin_entitlements × org/platform overrides ×
		// exam-package settings keyed on this attempt. For now we return the
		// platform-default set regardless of attempt_id so the frontend has a
		// stable contract while resolution is built out.
	}

	out := pluginConfigResponse{
		Plugins:  []pluginConfigEntry{},
		Surfaces: surfaceCollections{},
	}

	for _, m := range s.plugins.All() {
		if m == nil {
			continue
		}
		ext, err := m.DecodeExtensions()
		if err != nil {
			s.logger.Warn("plugin extensions decode failed",
				"slug", m.Slug, "err", err)
		}
		cfg := defaultConfigFromSchema(m.Schema)
		out.Plugins = append(out.Plugins, pluginConfigEntry{
			ID:         m.ID.String(),
			Slug:       m.Slug,
			Name:       m.Name,
			Category:   string(m.Category),
			Version:    m.Version,
			Enabled:    m.EnabledByDefault,
			Config:     cfg,
			Emits:      ext.Emits,
			Subscribes: ext.Subscribes,
		})
		for _, c := range ext.ClientConstraints {
			out.Constraints = append(out.Constraints, constraintEntry{
				ID:     c.ID,
				Kind:   c.Kind,
				Config: rawToMap(c.ConfigSchema),
			})
		}
		out.Surfaces.Admin = append(out.Surfaces.Admin, ext.AdminUI...)
		out.Surfaces.Candidate = append(out.Surfaces.Candidate, ext.CandidateUI...)
	}

	writeJSON(w, http.StatusOK, out)
}

// defaultConfigFromSchema reads the top-level "defaults" key from a manifest
// schema, if present, and returns it as a plain map. Returns an empty map
// when no defaults are declared so the frontend always sees a usable object.
func defaultConfigFromSchema(schema json.RawMessage) map[string]any {
	if len(schema) == 0 {
		return map[string]any{}
	}
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(schema, &raw); err != nil {
		return map[string]any{}
	}
	defaults, ok := raw["defaults"]
	if !ok {
		return map[string]any{}
	}
	out := map[string]any{}
	if err := json.Unmarshal(defaults, &out); err != nil {
		return map[string]any{}
	}
	return out
}

func rawToMap(raw json.RawMessage) map[string]any {
	if len(raw) == 0 {
		return nil
	}
	out := map[string]any{}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil
	}
	return out
}
