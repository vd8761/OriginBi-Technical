package server

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
)

// activeAttemptRow is one row in the admin proctoring live monitor — an
// in-progress attempt plus per-kind event counters and the last event
// timestamp. The admin frontend polls this every ~5 seconds.
type activeAttemptRow struct {
	AttemptID     string         `json:"attempt_id"`
	CandidateID   int64          `json:"candidate_user_id"`
	ExamVersionID string         `json:"exam_version_id"`
	Status        string         `json:"status"`
	StartedAt     *time.Time     `json:"started_at,omitempty"`
	LastSeenAt    *time.Time     `json:"last_seen_at,omitempty"`
	LastEventAt   *time.Time     `json:"last_event_at,omitempty"`
	EventCounts   map[string]int `json:"event_counts"`
}

type activeAttemptsResponse struct {
	Attempts []activeAttemptRow `json:"attempts"`
	PolledAt time.Time          `json:"polled_at"`
}

// listActiveAttemptsForProctoring serves GET /v1/admin/proctoring/active.
// Returns up to N in-progress attempts (status in 'started'/'in_progress'/
// 'paused') aggregated with their attempt_events counts grouped by kind.
//
// Stateless and idempotent so any backend instance can serve any admin
// poller — no sticky sessions, no per-viewer goroutines.
func (s *Server) listActiveAttemptsForProctoring(w http.ResponseWriter, r *http.Request) {
	limit := 200
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 && n <= 500 {
			limit = n
		}
	}
	sinceCutoff := time.Now().Add(-2 * time.Hour)
	if raw := r.URL.Query().Get("since"); raw != "" {
		if ts, err := time.Parse(time.RFC3339, raw); err == nil {
			sinceCutoff = ts
		}
	}

	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	rows, err := s.pool.Query(ctx, `
		WITH active AS (
			SELECT id, candidate_user_id, exam_version_id, status, started_at, last_seen_at
			FROM attempts
			WHERE status IN ('started','in_progress','paused')
			  AND (last_seen_at IS NULL OR last_seen_at >= $1)
			ORDER BY COALESCE(last_seen_at, started_at, created_at) DESC
			LIMIT $2
		),
		ev AS (
			SELECT attempt_id, kind, COUNT(*)::int AS n, MAX(occurred_at) AS last_at
			FROM attempt_events
			WHERE attempt_id IN (SELECT id FROM active)
			GROUP BY attempt_id, kind
		)
		SELECT a.id::text, a.candidate_user_id, a.exam_version_id::text, a.status,
		       a.started_at, a.last_seen_at,
		       COALESCE(json_object_agg(ev.kind, ev.n) FILTER (WHERE ev.kind IS NOT NULL), '{}')::text AS counts,
		       MAX(ev.last_at) AS last_event_at
		FROM active a
		LEFT JOIN ev ON ev.attempt_id = a.id
		GROUP BY a.id, a.candidate_user_id, a.exam_version_id, a.status, a.started_at, a.last_seen_at
		ORDER BY COALESCE(MAX(ev.last_at), a.started_at) DESC
	`, sinceCutoff, limit)
	if err != nil {
		s.logger.Error("active attempts query failed", "err", err)
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	out := activeAttemptsResponse{Attempts: make([]activeAttemptRow, 0, 32), PolledAt: time.Now().UTC()}
	for rows.Next() {
		var row activeAttemptRow
		var countsJSON string
		if err := rows.Scan(
			&row.AttemptID,
			&row.CandidateID,
			&row.ExamVersionID,
			&row.Status,
			&row.StartedAt,
			&row.LastSeenAt,
			&countsJSON,
			&row.LastEventAt,
		); err != nil {
			s.logger.Error("active attempts scan failed", "err", err)
			continue
		}
		row.EventCounts = parseCounts(countsJSON)
		out.Attempts = append(out.Attempts, row)
	}
	if err := rows.Err(); err != nil && err != pgx.ErrNoRows {
		s.logger.Error("active attempts rows error", "err", err)
	}

	writeJSON(w, http.StatusOK, out)
}

func parseCounts(s string) map[string]int {
	out := map[string]int{}
	if s == "" || s == "{}" {
		return out
	}
	if err := json.Unmarshal([]byte(s), &out); err != nil {
		return map[string]int{}
	}
	return out
}
