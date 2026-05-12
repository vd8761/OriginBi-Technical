package server

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/originbi/exam-engine/internal/auth"
)

// IngestRequest is a batch of telemetry events. The frontend buffers
// proctoring signals client-side and POSTs N at a time to amortize round-trips.
type IngestRequest struct {
	Events []EventIn `json:"events"`
}

type EventIn struct {
	OccurredAt     time.Time       `json:"occurred_at"`
	Kind           string          `json:"kind"`
	Severity       int16           `json:"severity"`
	ExamQuestionID *uuid.UUID      `json:"exam_question_id,omitempty"`
	PluginID       *uuid.UUID      `json:"plugin_id,omitempty"`
	Payload        json.RawMessage `json:"payload,omitempty"`
}

type IngestResponse struct {
	Accepted int `json:"accepted"`
	Rejected int `json:"rejected"`
}

const (
	maxEventsPerRequest = 200
	maxPayloadBytes     = 4096
)

func (s *Server) ingestEvents(w http.ResponseWriter, r *http.Request) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}

	attemptID, err := uuid.Parse(chi.URLParam(r, "attempt_id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid attempt_id")
		return
	}

	var req IngestRequest
	if !decodeJSON(w, r, &req, 1<<20) {
		return
	}
	if len(req.Events) == 0 {
		writeJSON(w, http.StatusOK, IngestResponse{})
		return
	}
	if len(req.Events) > maxEventsPerRequest {
		writeError(w, http.StatusRequestEntityTooLarge, "too many events; max 200 per request")
		return
	}

	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var candidateID int64
	err = s.pool.QueryRow(ctx,
		`SELECT candidate_user_id FROM attempts WHERE id = $1`,
		attemptID,
	).Scan(&candidateID)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "attempt not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	if candidateID != principal.UserID {
		writeError(w, http.StatusNotFound, "attempt not found")
		return
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db unavailable")
		return
	}
	defer tx.Rollback(ctx)

	rows := make([][]any, 0, len(req.Events))
	rejected := 0
	for _, ev := range req.Events {
		if ev.Kind == "" || ev.OccurredAt.IsZero() {
			rejected++
			continue
		}
		if len(ev.Payload) > maxPayloadBytes {
			rejected++
			continue
		}
		if len(ev.Payload) == 0 {
			ev.Payload = json.RawMessage("{}")
		}
		rows = append(rows, []any{
			attemptID,
			ev.OccurredAt,
			ev.Kind,
			ev.Severity,
			ev.ExamQuestionID,
			ev.PluginID,
			[]byte(ev.Payload),
		})
	}

	if len(rows) > 0 {
		_, err := tx.CopyFrom(ctx,
			pgx.Identifier{"attempt_events"},
			[]string{"attempt_id", "occurred_at", "kind", "severity",
				"exam_question_id", "plugin_id", "payload"},
			pgx.CopyFromRows(rows),
		)
		if err != nil {
			s.logger.Error("event copy failed", "attempt_id", attemptID, "err", err)
			writeError(w, http.StatusServiceUnavailable, "telemetry unavailable")
			return
		}

		counts := map[string]struct {
			n      int
			lastAt time.Time
		}{}
		for _, ev := range req.Events {
			if ev.Kind == "" || ev.OccurredAt.IsZero() {
				continue
			}
			c := counts[ev.Kind]
			c.n++
			if ev.OccurredAt.After(c.lastAt) {
				c.lastAt = ev.OccurredAt
			}
			counts[ev.Kind] = c
		}
		for kind, c := range counts {
			if _, err := tx.Exec(ctx, `
				INSERT INTO attempt_event_summary (attempt_id, kind, count, last_at)
				VALUES ($1, $2, $3, $4)
				ON CONFLICT (attempt_id, kind) DO UPDATE
				SET count   = attempt_event_summary.count + EXCLUDED.count,
				    last_at = GREATEST(attempt_event_summary.last_at, EXCLUDED.last_at)
			`, attemptID, kind, c.n, c.lastAt); err != nil {
				writeError(w, http.StatusInternalServerError, "summary upsert failed")
				return
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "commit failed")
		return
	}

	writeJSON(w, http.StatusOK, IngestResponse{
		Accepted: len(rows),
		Rejected: rejected,
	})
}
