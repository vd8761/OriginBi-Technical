package runnerjudge0

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/originbi/exam-engine/internal/pluginhost"
)

type Language struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type LanguageHealth struct {
	Plugin    string `json:"plugin"`
	Language  string `json:"language"`
	Judge0ID  int    `json:"judge0Id"`
	Available bool   `json:"available"`
}

// Health cross-checks installed language.* plugins against the live Judge0
// /languages response. Returns per-plugin availability plus the full list of
// languages Judge0 supports so callers (admin UI) can validate new IDs before
// save.
func Health(ctx context.Context, reg *pluginhost.Registry, httpClient *http.Client, baseURL string) ([]LanguageHealth, []Language, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL+"/languages", nil)
	if err != nil {
		return nil, nil, err
	}
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	res, err := httpClient.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, nil, fmt.Errorf("Judge0 returned status %d", res.StatusCode)
	}
	var languages []Language
	if err := json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&languages); err != nil {
		return nil, nil, fmt.Errorf("language response decode failed")
	}
	available := map[int]bool{}
	for _, lang := range languages {
		available[lang.ID] = true
	}
	plugins := reg.ByCategory(pluginhost.CategoryLanguage)
	out := make([]LanguageHealth, 0, len(plugins))
	for _, m := range plugins {
		cfg, err := m.DecodeLanguageConfig()
		if err != nil {
			continue
		}
		out = append(out, LanguageHealth{
			Plugin:    m.Slug,
			Language:  cfg.DisplayName,
			Judge0ID:  cfg.Judge0LanguageID,
			Available: available[cfg.Judge0LanguageID],
		})
	}
	return out, languages, nil
}
