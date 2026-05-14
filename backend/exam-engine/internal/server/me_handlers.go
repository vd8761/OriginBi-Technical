package server

import (
	"net/http"
	"time"

	"github.com/originbi/exam-engine/internal/auth"
)

type meLanguageDTO struct {
	Slug             string  `json:"slug"`
	DisplayName      string  `json:"displayName"`
	MonacoLanguageID string  `json:"monacoLanguageId"`
	Icon             *string `json:"icon,omitempty"`
	Source           string  `json:"source"`
	ItemRef          string  `json:"itemRef,omitempty"`
	OrgID            string  `json:"orgId,omitempty"`
}

type meLanguagesResponse struct {
	Languages []meLanguageDTO `json:"languages"`
}

func (s *Server) meLanguages(w http.ResponseWriter, r *http.Request) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	if s.plugins == nil {
		writeError(w, http.StatusServiceUnavailable, "plugin registry unavailable")
		return
	}
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	ents, err := s.plugins.UserLanguagePlugins(ctx, principal.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "language lookup failed")
		return
	}
	resp := meLanguagesResponse{Languages: []meLanguageDTO{}}
	for _, ent := range ents {
		cfg, err := ent.Plugin.DecodeLanguageConfig()
		if err != nil {
			continue
		}
		resp.Languages = append(resp.Languages, meLanguageDTO{
			Slug:             ent.Plugin.Slug,
			DisplayName:      cfg.DisplayName,
			MonacoLanguageID: cfg.MonacoLanguageID,
			Icon:             cfg.Icon,
			Source:           string(ent.Source),
			ItemRef:          ent.ItemRef,
			OrgID:            ent.OrgID,
		})
	}
	writeJSON(w, http.StatusOK, resp)
}
