// Command exam-engine-server is the runtime engine for the OriginBI exam
// platform. It owns the timer, telemetry ingest, and Judge0 integration.
//
// On boot it:
//  1. Loads config from env (.env optional in dev)
//  2. Runs embedded migrations (RUN_MIGRATIONS=true, default)
//  3. Ensures today's heartbeat partition + this month's events partition
//  4. Starts an HTTP server with health, heartbeat, and event-ingest routes
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/originbi/exam-engine/internal/auth"
	"github.com/originbi/exam-engine/internal/config"
	"github.com/originbi/exam-engine/internal/db"
	"github.com/originbi/exam-engine/internal/migrate"
	"github.com/originbi/exam-engine/internal/pluginhost"
	"github.com/originbi/exam-engine/internal/server"
)

func main() {
	if err := run(); err != nil {
		slog.Error("fatal", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	logger := newLogger(cfg.LogLevel)
	logger.Info("starting exam-engine", "config", cfg.String())

	rootCtx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	if cfg.RunMigrations {
		logger.Info("running migrations")
		if err := migrate.Up(rootCtx, cfg.DatabaseURL); err != nil {
			return err
		}
	}

	pool, err := db.Open(rootCtx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	if cfg.EnsurePartitionsOnBoot {
		if err := db.EnsurePartitions(rootCtx, pool); err != nil {
			logger.Warn("partition ensure failed", "err", err)
		}
		go partitionMaintainer(rootCtx, pool, logger)
	}

	verifier, err := auth.NewCognitoVerifier(rootCtx, cfg.CognitoRegion, cfg.CognitoUserPoolID, cfg.CognitoClientID)
	if err != nil {
		return err
	}
	logger.Info("cognito verifier initialized", "user_pool_id", cfg.CognitoUserPoolID)

	// Plugin registry must load after migrations have populated migrations 008
	// and 012 (assessment.coding plus language.* plugins). Only assessment.coding
	// is blocking: optional addon failures (e.g. evaluator.openai missing the
	// evaluation.llm base) log a warning and proceed.
	pluginRegistry, err := pluginhost.Bootstrap(rootCtx, pool, logger, pluginhost.BootstrapOptions{
		BlockingSlugs: map[string]bool{"assessment.coding": true},
	})
	if err != nil {
		return err
	}

	srv := server.New(pool, logger, verifier, cfg.DefaultOrgID)
	if err := srv.AttachPluginRegistry(pluginRegistry); err != nil {
		return err
	}

	httpSrv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           srv.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("http listening", "addr", cfg.HTTPAddr)
		if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case <-rootCtx.Done():
		logger.Info("shutting down")
	case err := <-errCh:
		logger.Error("http server crashed", "err", err)
	}

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		logger.Warn("graceful shutdown failed", "err", err)
	}
	return nil
}

// partitionMaintainer runs once an hour and ensures the upcoming partitions
// exist. Cheap to run; idempotent thanks to the SQL helpers.
func partitionMaintainer(ctx context.Context, pool *db.Pool, logger *slog.Logger) {
	t := time.NewTicker(1 * time.Hour)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if err := db.EnsurePartitions(ctx, pool); err != nil {
				logger.Warn("partition ensure tick failed", "err", err)
			}
		}
	}
}

func newLogger(level string) *slog.Logger {
	var lvl slog.Level
	switch level {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}
	h := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl})
	return slog.New(h)
}
