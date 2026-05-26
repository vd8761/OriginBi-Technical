// Package migrate runs the embedded SQL migrations against the configured DB.
// Migrations live in backend/exam-engine/migrations/ and are baked into the
// binary at compile time so deployments don't need a separate goose CLI.
package migrate

import (
	"context"
	"database/sql"
	"embed"
	"fmt"

	_ "github.com/jackc/pgx/v5/stdlib" // registers "pgx" driver
	"github.com/pressly/goose/v3"
)

//go:embed sql/*.sql
var migrationsFS embed.FS

// Up runs all pending migrations.
//
// We open a separate database/sql connection just for migrations — goose
// requires the database/sql interface and we don't want to drag the migration
// driver into the runtime pool. The connection is closed before returning.
func Up(ctx context.Context, dsn string) error {
	sqlDB, err := sql.Open("pgx", dsn)
	if err != nil {
		return fmt.Errorf("open migration db: %w", err)
	}
	defer sqlDB.Close()

	goose.SetBaseFS(migrationsFS)
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("set dialect: %w", err)
	}
	if err := goose.UpContext(ctx, sqlDB, "sql"); err != nil {
		return fmt.Errorf("goose up: %w", err)
	}
	return nil
}
