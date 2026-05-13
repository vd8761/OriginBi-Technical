// Package db owns the pgx connection pool. The pool is the single shared
// resource the rest of the engine reads/writes through.
package db

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Pool = pgxpool.Pool

func Open(ctx context.Context, dsn string) (*Pool, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse dsn: %w", err)
	}
	// Sane defaults for local/dev. Production can override these without code
	// changes by setting DB_POOL_* env vars on every engine replica.
	cfg.MaxConns = int32(envInt("DB_POOL_MAX_CONNS", 20))
	cfg.MinConns = int32(envInt("DB_POOL_MIN_CONNS", 2))
	cfg.MaxConnLifetime = envDurationSeconds("DB_POOL_MAX_CONN_LIFETIME_SECONDS", 30*time.Minute)
	cfg.MaxConnIdleTime = envDurationSeconds("DB_POOL_MAX_CONN_IDLE_SECONDS", 5*time.Minute)
	cfg.HealthCheckPeriod = envDurationSeconds("DB_POOL_HEALTHCHECK_SECONDS", 30*time.Second)

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
	for i := 0; i < 3; i++ {
		if _, err := pool.Exec(ctx,
			`SELECT ensure_attempt_events_partition((date_trunc('month', now()) + make_interval(months => $1::int))::date)`,
			i); err != nil {
			return fmt.Errorf("ensure events partition: %w", err)
		}
	}
	for i := 0; i < 14; i++ {
		if _, err := pool.Exec(ctx,
			`SELECT ensure_attempt_heartbeats_partition(current_date + $1::int)`,
			i); err != nil {
			return fmt.Errorf("ensure heartbeats partition: %w", err)
		}
	}
	return nil
}

func envInt(name string, fallback int) int {
	raw := os.Getenv(name)
	if raw == "" {
		return fallback
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v <= 0 {
		return fallback
	}
	return v
}

func envDurationSeconds(name string, fallback time.Duration) time.Duration {
	raw := os.Getenv(name)
	if raw == "" {
		return fallback
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v <= 0 {
		return fallback
	}
	return time.Duration(v) * time.Second
}
