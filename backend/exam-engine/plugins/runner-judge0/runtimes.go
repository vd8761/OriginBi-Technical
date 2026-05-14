// Package runnerjudge0 implements the runner.judge0 addon plugin.
package runnerjudge0

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/originbi/exam-engine/internal/pluginhost"
)

const Slug = "runner.judge0"

type RunnerConfig struct {
	DefaultBaseURL      string         `json:"defaultBaseUrl"`
	MultiFileLanguageID int            `json:"multiFileLanguageId"`
	Defaults            map[string]int `json:"defaults"`
}

type Runtime struct {
	reg *pluginhost.Registry
}

func NewRuntime(reg *pluginhost.Registry) *Runtime {
	return &Runtime{reg: reg}
}

func (r *Runtime) Lookup(langSlug string) (*pluginhost.LanguageConfig, error) {
	if r == nil || r.reg == nil {
		return nil, errors.New("plugin registry unavailable")
	}
	m := r.reg.BySlug(NormalizeLanguageSlug(langSlug))
	if m == nil {
		return nil, fmt.Errorf("language plugin %s is not installed", langSlug)
	}
	return m.DecodeLanguageConfig()
}

func (r *Runtime) Judge0ID(langSlug string) (int, error) {
	cfg, err := r.Lookup(langSlug)
	if err != nil {
		return 0, err
	}
	if cfg.Judge0LanguageID <= 0 {
		return 0, fmt.Errorf("language plugin %s has no judge0LanguageId", langSlug)
	}
	return cfg.Judge0LanguageID, nil
}

func (r *Runtime) AllInstalled() []*pluginhost.LanguageConfig {
	if r == nil || r.reg == nil {
		return nil
	}
	langs := r.reg.ByCategory(pluginhost.CategoryLanguage)
	out := make([]*pluginhost.LanguageConfig, 0, len(langs))
	for _, m := range langs {
		cfg, err := m.DecodeLanguageConfig()
		if err == nil {
			out = append(out, cfg)
		}
	}
	return out
}

func (r *Runtime) RunnerConfig() RunnerConfig {
	cfg := RunnerConfig{
		DefaultBaseURL:      "http://localhost:2358",
		MultiFileLanguageID: 89,
		Defaults: map[string]int{
			"timeLimitMs":    3000,
			"memoryLimitKb":  131072,
			"stackLimitKb":   32768,
			"processesLimit": 32,
			"outputLimitKb":  16384,
		},
	}
	if r == nil || r.reg == nil {
		return cfg
	}
	m := r.reg.BySlug(Slug)
	if m == nil || len(m.Schema) == 0 {
		return cfg
	}
	_ = json.Unmarshal(m.Schema, &cfg)
	if cfg.DefaultBaseURL == "" {
		cfg.DefaultBaseURL = "http://localhost:2358"
	}
	if cfg.MultiFileLanguageID <= 0 {
		cfg.MultiFileLanguageID = 89
	}
	if cfg.Defaults == nil {
		cfg.Defaults = map[string]int{}
	}
	return cfg
}

func NormalizeLanguageSlug(v string) string {
	v = strings.ToLower(strings.TrimSpace(v))
	if v == "" || strings.HasPrefix(v, "language.") {
		return v
	}
	return "language." + v
}

func LegacyLanguageName(langSlug string) string {
	return strings.TrimPrefix(NormalizeLanguageSlug(langSlug), "language.")
}

func LegacyItemRef(cfg *pluginhost.LanguageConfig) string {
	if cfg == nil || cfg.LegacyItemRef == nil {
		return ""
	}
	return strings.TrimSpace(*cfg.LegacyItemRef)
}

func IsLanguageEnabled(ctx context.Context, reg *pluginhost.Registry, userID int64, langSlug string) (bool, error) {
	if reg == nil {
		return false, errors.New("plugin registry unavailable")
	}
	return reg.IsLanguageEntitledForUser(ctx, userID, NormalizeLanguageSlug(langSlug))
}
