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
)

// HeartbeatRequest is what the client posts every N seconds.
//
// The server is authoritative on time_remaining_ms. We ignore whatever the
// client claims and recompute from attempts.deadline_at. The client field is
// kept only for observability and drift detection.
type HeartbeatRequest struct {
	SentAt      time.Time       `json:"sent_at"`
	ClientState json.RawMessage `json:"client_state,omitempty"`
}

type HeartbeatResponse struct {
	ReceivedAt            time.Time `json:"received_at"`
	RTTMillis             int       `json:"rtt_ms"`
	ServerTimeRemainingMs int       `json:"server_time_remaining_ms"`
	DeadlineAt            time.Time `json:"deadline_at"`
	Status                string    `json:"status"`
}

func (s *Server) heartbeat(w http.ResponseWriter, r *http.Request) {
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

	var req HeartbeatRequest
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}
	if len(req.ClientState) == 0 {
		req.ClientState = json.RawMessage("{}")
	}

	now := time.Now().UTC()

	ctx, cancel := contextWithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db unavailable")
		return
	}
	defer tx.Rollback(ctx)

	var (
		status      string
		startedAt   *time.Time
		deadlineAt  *time.Time
		candidateID int64
	)
	err = tx.QueryRow(ctx, `
		SELECT status, started_at, deadline_at, candidate_user_id
		FROM attempts
		WHERE id = $1
		FOR UPDATE
	`, attemptID).Scan(&status, &startedAt, &deadlineAt, &candidateID)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "attempt not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	_ = startedAt
	if candidateID != principal.UserID {
		writeError(w, http.StatusNotFound, "attempt not found")
		return
	}
	if !heartbeatAcceptable(status) {
		writeError(w, http.StatusConflict, "attempt status does not accept heartbeats: "+status)
		return
	}

	var remainingMs int
	if deadlineAt != nil {
		remaining := deadlineAt.Sub(now)
		if remaining < 0 {
			remaining = 0
			status = "timed_out"
		}
		remainingMs = int(remaining / time.Millisecond)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE attempts
		SET last_seen_at      = $2,
		    time_remaining_ms = $3,
		    status            = COALESCE(NULLIF($4, '')::attempt_status, status)
		WHERE id = $1
	`, attemptID, now, remainingMs, statusOnlyIfChanged(status)); err != nil {
		writeError(w, http.StatusInternalServerError, "update attempt failed")
		return
	}

	var rtt int
	if !req.SentAt.IsZero() {
		rtt = int(now.Sub(req.SentAt) / time.Millisecond)
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO attempt_heartbeats
		    (attempt_id, sent_at, received_at, rtt_ms, client_state)
		VALUES ($1, $2, $3, $4, $5::jsonb)
	`, attemptID, nullableTime(req.SentAt), now, rtt, []byte(req.ClientState)); err != nil {
		s.logger.Error("heartbeat insert failed", "attempt_id", attemptID, "err", err)
		writeError(w, http.StatusServiceUnavailable, "telemetry unavailable")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "commit failed")
		return
	}

	resp := HeartbeatResponse{
		ReceivedAt:            now,
		RTTMillis:             rtt,
		ServerTimeRemainingMs: remainingMs,
		Status:                status,
	}
	if deadlineAt != nil {
		resp.DeadlineAt = *deadlineAt
	}
	writeJSON(w, http.StatusOK, resp)
}

func heartbeatAcceptable(status string) bool {
	switch status {
	case "started", "in_progress", "paused":
		return true
	default:
		return false
	}
}

func statusOnlyIfChanged(status string) string {
	if status == "timed_out" {
		return status
	}
	return ""
}

func nullableTime(t time.Time) any {
	if t.IsZero() {
		return nil
	}
	return t
}

var _ = (*int)(nil)
var _ context.Context
