// Package pluginhost loads plugin manifests from the database, resolves the
// dependency graph, dispatches runtime actions to registered handlers, and
// resolves per-user/per-org/per-platform plugin entitlements.
//
// The contract (manifest fields, dependency rules, entitlement scopes) is
// defined in docs/plugin-architecture/. The DB is the source of truth: the
// `plugins` table — enriched by migration 012 — carries every manifest field
// (plugin_type, category, requires, extends, provides, schema). In-process Go
// packages register action handlers against plugin slugs at boot.
package pluginhost

import (
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
)

// PluginType distinguishes plugins that other plugins depend on (base) from
// plugins that augment a base (addon). Matches plugins.plugin_type.
type PluginType string

const (
	PluginTypeBase  PluginType = "base"
	PluginTypeAddon PluginType = "addon"
)

// Category groups plugins by their role. Matches plugins.category. Used by
// admin UI for filtering and by the resolver for "user language plugins"
// type queries that constrain to category='language'.
type Category string

const (
	CategoryAssessment Category = "assessment"
	CategoryEvaluation Category = "evaluation"
	CategoryProctoring Category = "proctoring"
	CategoryRunner     Category = "runner"
	CategoryLanguage   Category = "language"
	CategoryFeature    Category = "feature"
	CategoryMedia      Category = "media"
)

// Manifest mirrors a `plugins` row plus its JSON columns parsed into Go
// slices. One Manifest per installed plugin per running process.
type Manifest struct {
	ID               uuid.UUID
	Kind             string // legacy plugin_kind enum; kept for back-compat
	Slug             string
	Name             string
	Version          string
	PluginType       PluginType
	Category         Category
	Requires         []string
	Extends          []string
	Provides         []string
	Schema           json.RawMessage
	RequiresLicense  bool
	EnabledByDefault bool
}

// IsLanguage is true for the per-programming-language addon plugins
// (language.python, language.java, …). The user entitlement model is built
// around these.
func (m *Manifest) IsLanguage() bool {
	return m.Category == CategoryLanguage
}

// LanguageConfig is the typed view of Manifest.Schema for category='language'
// plugins. Populated by Manifest.DecodeLanguageConfig; nil for non-language.
type LanguageConfig struct {
	DisplayName       string  `json:"displayName"`
	Judge0LanguageID  int     `json:"judge0LanguageId"`
	FileExtension     string  `json:"fileExtension"`
	DefaultEntryFile  string  `json:"defaultEntryFile"`
	CompileFlags      *string `json:"compileFlags,omitempty"`
	TimeLimitMs       int     `json:"timeLimitMs"`
	MemoryLimitKb     int     `json:"memoryLimitKb"`
	StackLimitKb      int     `json:"stackLimitKb"`
	ProcessesLimit    int     `json:"processesLimit"`
	OutputLimitKb     int     `json:"outputLimitKb"`
	SupportsMultiFile bool    `json:"supportsMultiFile"`
	MonacoLanguageID  string  `json:"monacoLanguageId"`
	Icon              *string `json:"icon,omitempty"`
	// LegacyItemRef ties this language plugin to the pre-plugin pricing slug
	// (e.g. "coding:python"). Kept so existing exam_assignments.assignment_ref
	// values continue to resolve.
	LegacyItemRef *string `json:"legacyItemRef,omitempty"`
}

// DecodeLanguageConfig parses Manifest.Schema as a LanguageConfig. Returns an
// error if the manifest is not a language plugin or the schema is malformed.
func (m *Manifest) DecodeLanguageConfig() (*LanguageConfig, error) {
	if !m.IsLanguage() {
		return nil, fmt.Errorf("plugin %s is not a language plugin (category=%s)", m.Slug, m.Category)
	}
	var cfg LanguageConfig
	if err := json.Unmarshal(m.Schema, &cfg); err != nil {
		return nil, fmt.Errorf("decode language config for %s: %w", m.Slug, err)
	}
	return &cfg, nil
}
