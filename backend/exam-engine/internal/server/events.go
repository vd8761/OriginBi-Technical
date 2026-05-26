package server

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/originbi/exam-engine/internal/auth"
	"github.com/originbi/exam-engine/internal/pluginhost"
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
			if ev.Kind == "" || ev.OccurredAt.IsZero() || len(ev.Payload) > maxPayloadBytes {
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

	// Telemetry is now persisted; fan accepted events out to the in-process
	// bus so plugin subscribers can react. Bus delivery is fire-and-forget
	// from the client's perspective; subscriber errors are logged but never
	// surface as 5xx because the durable record already landed.
	if s.plugins != nil {
		bus := s.plugins.Events()
		for _, ev := range req.Events {
			if ev.Kind == "" || ev.OccurredAt.IsZero() || len(ev.Payload) > maxPayloadBytes {
				continue
			}
			payload := ev.Payload
			if len(payload) == 0 {
				payload = json.RawMessage("{}")
			}
			var pluginID uuid.UUID
			if ev.PluginID != nil {
				pluginID = *ev.PluginID
			}
			if err := bus.Publish(r.Context(), pluginhost.Event{
				Kind:       ev.Kind,
				AttemptID:  attemptID,
				UserID:     principal.UserID,
				PluginID:   pluginID,
				Severity:   ev.Severity,
				OccurredAt: ev.OccurredAt,
				Payload:    payload,
			}); err != nil {
				s.logger.Warn("event bus subscriber failed",
					"attempt_id", attemptID, "kind", ev.Kind, "err", err)
			}
		}
	}

	writeJSON(w, http.StatusOK, IngestResponse{
		Accepted: len(rows),
		Rejected: rejected,
	})
}

// publishLifecycleEvent emits an in-process bus notification for a
// kernel-originated lifecycle change (started, resumed, submitted, paused,
// timed_out). Telemetry is the durable record; the bus is for reactions.
//
// Subscriber errors are logged at warn level — they must never tank the
// lifecycle handler that triggered the publish.
func (s *Server) publishLifecycleEvent(ctx context.Context, kind string, attemptID uuid.UUID, userID int64, payload map[string]any) {
	if s.plugins == nil {
		return
	}
	body, err := json.Marshal(payload)
	if err != nil {
		s.logger.Warn("lifecycle event marshal failed",
			"attempt_id", attemptID, "kind", kind, "err", err)
		body = []byte("{}")
	}
	if err := s.plugins.Events().Publish(ctx, pluginhost.Event{
		Kind:       kind,
		AttemptID:  attemptID,
		UserID:     userID,
		OccurredAt: time.Now().UTC(),
		Payload:    body,
	}); err != nil {
		s.logger.Warn("lifecycle event subscriber failed",
			"attempt_id", attemptID, "kind", kind, "err", err)
	}
}

// streamAttemptCommands serves the engine→client command channel as
// Server-Sent Events. Plugins call s.plugins.Commands().Send(attemptID, cmd)
// to deliver a message. Auth follows the same rule as other attempt routes:
// the caller must own the attempt.
func (s *Server) streamAttemptCommands(w http.ResponseWriter, r *http.Request) {
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

	// Ownership check — same predicate as ingestEvents.
	var candidateID int64
	err = s.pool.QueryRow(r.Context(),
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

	if s.plugins == nil {
		writeError(w, http.StatusServiceUnavailable, "plugin host unavailable")
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming not supported")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	ctx := r.Context()
	commands, unsubscribe := s.plugins.Commands().Listen(ctx, attemptID)
	defer unsubscribe()

	// Heartbeat keeps load-balancer connections alive on idle attempts. SSE
	// comments (lines beginning with ":") are ignored by EventSource clients
	// but reset proxy idle timers.
	heartbeat := time.NewTicker(20 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-heartbeat.C:
			if _, err := w.Write([]byte(": keep-alive\n\n")); err != nil {
				return
			}
			flusher.Flush()
		case cmd, ok := <-commands:
			if !ok {
				return
			}
			body, err := json.Marshal(cmd)
			if err != nil {
				s.logger.Warn("command marshal failed",
					"attempt_id", attemptID, "kind", cmd.Kind, "err", err)
				continue
			}
			if _, err := w.Write([]byte("event: " + cmd.Kind + "\n")); err != nil {
				return
			}
			if _, err := w.Write([]byte("data: ")); err != nil {
				return
			}
			if _, err := w.Write(body); err != nil {
				return
			}
			if _, err := w.Write([]byte("\n\n")); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}
