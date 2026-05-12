// Package db owns the pgx connection pool. The pool is the single shared
// resource the rest of the engine reads/writes through.
package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Pool = pgxpool.Pool

func Open(ctx context.Context, dsn string) (*Pool, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse dsn: %w", err)
	}
	// Sane defaults; tune in production via DATABASE_URL params.
	cfg.MaxConns = 20
	cfg.MinConns = 2
	cfg.MaxConnLifetime = 30 * time.Minute
	cfg.MaxConnIdleTime = 5 * time.Minute
	cfg.HealthCheckPeriod = 30 * time.Second

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("open pool: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping: %w", err)
	}
	return pool, nil
}

// EnsurePartitions creates today's heartbeat partition and the current month's
// events partition if they don't yet exist. Safe to call on boot and from a
// daily cron — relies on the SQL helpers seeded by migration 004.
func EnsurePartitions(ctx context.Context, pool *Pool) error {
	if _, err := pool.Exec(ctx,
		`SELECT ensure_attempt_events_partition(date_trunc('month', now())::date)`); err != nil {
		return fmt.Errorf("ensure events partition: %w", err)
	}
	if _, err := pool.Exec(ctx,
		`SELECT ensure_attempt_heartbeats_partition(current_date)`); err != nil {
		return fmt.Errorf("ensure heartbeats partition: %w", err)
	}
	return nil
}
