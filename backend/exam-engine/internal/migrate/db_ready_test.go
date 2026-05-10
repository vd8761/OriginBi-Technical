package migrate

import (
	"context"
	"database/sql"
	"os"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func TestDatabaseReady(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	if err := Up(ctx, dsn); err != nil {
		t.Fatalf("run migrations: %v", err)
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()

	if err := db.PingContext(ctx); err != nil {
		t.Fatalf("ping db: %v", err)
	}

	var version int64
	if err := db.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(version_id), 0)
		FROM goose_db_version
		WHERE is_applied
	`).Scan(&version); err != nil {
		t.Fatalf("read goose version: %v", err)
	}
	if version < 10 {
		t.Fatalf("expected migration version >= 10, got %d", version)
	}

	requiredTables := []string{
		"organizations",
		"organization_members",
		"plugins",
		"platform_plugin_entitlements",
		"org_plugin_entitlements",
		"questions",
		"question_versions",
		"question_test_cases",
		"exams",
		"exam_versions",
		"exam_sections",
		"exam_questions",
		"exam_assignments",
		"attempts",
		"attempt_question_state",
		"answers",
		"code_submissions",
		"code_submission_files",
		"code_runs",
		"code_run_test_results",
		"attempt_events",
		"attempt_event_summary",
		"attempt_heartbeats",
		"attempt_connectivity_gaps",
		"evaluations",
		"manual_review_assignments",
		"result_publications",
		"pricing_items",
		"purchases",
		"users",
		"registrations",
		"user_sessions",
	}

	for _, table := range requiredTables {
		var exists bool
		if err := db.QueryRowContext(ctx, `
			SELECT to_regclass('public.' || $1) IS NOT NULL
		`, table).Scan(&exists); err != nil {
			t.Fatalf("check table %s: %v", table, err)
		}
		if !exists {
			t.Fatalf("required table missing: %s", table)
		}
	}

	var codingPrices int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM pricing_items
		WHERE item_ref IN ('coding:python','coding:java','coding:cpp','coding:javascript','coding:c')
	`).Scan(&codingPrices); err != nil {
		t.Fatalf("check coding pricing items: %v", err)
	}
	if codingPrices != 5 {
		t.Fatalf("expected 5 coding pricing items, got %d", codingPrices)
	}

	var codingQuestions int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM exam_questions
		WHERE exam_version_id = '00000000-0000-0000-0000-000000000601'
	`).Scan(&codingQuestions); err != nil {
		t.Fatalf("check coding questions: %v", err)
	}
	if codingQuestions != 5 {
		t.Fatalf("expected 5 seeded coding questions, got %d", codingQuestions)
	}

	var plugins int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM plugins
	`).Scan(&plugins); err != nil {
		t.Fatalf("check plugin seed: %v", err)
	}
	if plugins == 0 {
		t.Fatal("expected seeded plugins")
	}
}
