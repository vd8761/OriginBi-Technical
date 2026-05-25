package server

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// RunBackgroundJobs blocks until ctx cancels, running periodic maintenance
// tasks. Today: a sweeper that re-kicks Phase-2 grading for attempts that
// landed in 'submitted' but never made it to 'evaluated' (e.g. because Judge0
// was down when submit fired). scheduleAttemptEvaluation is idempotent — the
// `evaluating sync.Map` skips in-flight attempts and the final UPDATE is
// guarded on `status = 'submitted'`, so concurrent passes are safe.
func (s *Server) RunBackgroundJobs(ctx context.Context) {
	interval := envDurationSeconds("STRANDED_SWEEPER_INTERVAL_SECONDS", 60*time.Second)
	if interval < time.Second {
		interval = time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	s.logger.Info("background sweeper started", "interval", interval)
	for {
		select {
		case <-ctx.Done():
			s.logger.Info("background sweeper stopped")
			return
		case <-ticker.C:
			s.sweepStrandedAttempts(ctx)
		}
	}
}

func (s *Server) sweepStrandedAttempts(ctx context.Context) {
	ageSeconds := envInt("STRANDED_SWEEPER_AGE_SECONDS", 300)
	batch := envInt("STRANDED_SWEEPER_BATCH", 50)

	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	rows, err := s.pool.Query(queryCtx, fmt.Sprintf(`
		SELECT id, candidate_user_id
		FROM attempts
		WHERE status = 'submitted'
		  AND submitted_at < now() - interval '%d seconds'
		ORDER BY submitted_at
		LIMIT %d
	`, ageSeconds, batch))
	if err != nil {
		if !errors.Is(err, context.Canceled) {
			s.logger.Warn("stranded sweeper query failed", "err", err)
		}
		return
	}
	defer rows.Close()

	kicked := 0
	for rows.Next() {
		var id uuid.UUID
		var userID int64
		if err := rows.Scan(&id, &userID); err != nil {
			s.logger.Warn("stranded sweeper scan failed", "err", err)
			continue
		}
		s.scheduleAttemptEvaluation(id, userID)
		kicked++
	}
	if err := rows.Err(); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		s.logger.Warn("stranded sweeper iter failed", "err", err)
	}
	if kicked > 0 {
		s.logger.Info("stranded sweeper re-kicked attempts", "count", kicked)
	}
}
