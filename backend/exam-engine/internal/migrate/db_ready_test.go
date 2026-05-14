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
	if version < 14 {
		t.Fatalf("expected migration version >= 14, got %d", version)
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

	var hiddenCodingTests int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM question_test_cases
		WHERE is_hidden
		  AND question_version_id IN (
		      SELECT question_version_id
		      FROM exam_questions
		      WHERE exam_version_id = '00000000-0000-0000-0000-000000000601'
		  )
	`).Scan(&hiddenCodingTests); err != nil {
		t.Fatalf("check hidden coding tests: %v", err)
	}
	if hiddenCodingTests < 4 {
		t.Fatalf("expected hidden coding tests, got %d", hiddenCodingTests)
	}

	var languageColumnExists bool
	if err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_name = 'code_submission_files'
			  AND column_name = 'language'
		)
	`).Scan(&languageColumnExists); err != nil {
		t.Fatalf("check code_submission_files.language: %v", err)
	}
	if !languageColumnExists {
		t.Fatal("expected code_submission_files.language column")
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

	// Migration 012: the language catalog must be present as plugins with
	// category='language'. Every language listed here previously lived in the
	// hardcoded Judge0 map in code_run_handlers.go.
	requiredLanguageSlugs := []string{
		"language.python",
		"language.java",
		"language.cpp",
		"language.c",
		"language.javascript",
		"language.go",
	}
	for _, slug := range requiredLanguageSlugs {
		var exists bool
		if err := db.QueryRowContext(ctx, `
			SELECT EXISTS (
				SELECT 1 FROM plugins
				WHERE slug = $1 AND category = 'language' AND plugin_type = 'addon'
			)
		`, slug).Scan(&exists); err != nil {
			t.Fatalf("check language plugin %s: %v", slug, err)
		}
		if !exists {
			t.Fatalf("expected language plugin %s with category='language'", slug)
		}
	}

	// Migration 012: the previously seeded 'code.judge0' (UUID …0013) is now
	// 'assessment.coding'. Same UUID, so all FKs from exam_sections.plugin_id
	// and questions.plugin_id stay intact.
	var codingSlug string
	if err := db.QueryRowContext(ctx, `
		SELECT slug FROM plugins WHERE id = '00000000-0000-0000-0000-000000000013'
	`).Scan(&codingSlug); err != nil {
		t.Fatalf("check assessment.coding identity: %v", err)
	}
	if codingSlug != "assessment.coding" {
		t.Fatalf("expected plugin …0013 to be 'assessment.coding', got %q", codingSlug)
	}

	// Migration 012: existing 'coding:python' pricing rows are linked to their
	// language plugin so the entitlement resolver can join them.
	var linkedPricing int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM pricing_items pi
		JOIN plugins p ON p.id = pi.plugin_id
		WHERE pi.item_kind = 'coding_language'
		  AND p.category = 'language'
	`).Scan(&linkedPricing); err != nil {
		t.Fatalf("check pricing_items.plugin_id backfill: %v", err)
	}
	if linkedPricing != 5 {
		t.Fatalf("expected 5 coding_language pricing rows linked to language plugins, got %d", linkedPricing)
	}

	// Migration 013: locked_regions column for region-level read-only enforcement.
	var lockedRegionsExists bool
	if err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'code_submission_files'
			  AND column_name = 'locked_regions'
		)
	`).Scan(&lockedRegionsExists); err != nil {
		t.Fatalf("check code_submission_files.locked_regions: %v", err)
	}
	if !lockedRegionsExists {
		t.Fatal("expected code_submission_files.locked_regions column from migration 013")
	}

	// Migration 013: every seeded question_versions row now carries a promptFormat
	// so the candidate-side renderer can dispatch (existing seeds stamped 'html').
	var unstampedBodies int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM question_versions
		WHERE body ? 'prompt' AND NOT (body ? 'promptFormat')
	`).Scan(&unstampedBodies); err != nil {
		t.Fatalf("check question_versions promptFormat backfill: %v", err)
	}
	if unstampedBodies != 0 {
		t.Fatalf("expected all prompt bodies to carry promptFormat after migration 013, got %d missing", unstampedBodies)
	}

	// Migration 014: the broken (NULL-distinct) purchases unique index has been
	// replaced by two partial indexes; verify the new shape exists and the
	// legacy one is gone.
	var legacyIdx bool
	if err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM pg_indexes
			WHERE schemaname = 'public'
			  AND indexname = 'purchases_user_item_provider_ref_idx'
		)
	`).Scan(&legacyIdx); err != nil {
		t.Fatalf("check purchases legacy index: %v", err)
	}
	if legacyIdx {
		t.Fatal("expected purchases_user_item_provider_ref_idx to be replaced by migration 014")
	}
	for _, idx := range []string{
		"purchases_user_item_provider_ref_present_idx",
		"purchases_user_item_no_provider_idx",
		"code_runs_answer_final_idx",
		"ope_org_enabled_idx",
	} {
		var exists bool
		if err := db.QueryRowContext(ctx, `
			SELECT EXISTS (
				SELECT 1 FROM pg_indexes
				WHERE schemaname = 'public' AND indexname = $1
			)
		`, idx).Scan(&exists); err != nil {
			t.Fatalf("check index %s: %v", idx, err)
		}
		if !exists {
			t.Fatalf("expected index %s from migration 014", idx)
		}
	}
}
