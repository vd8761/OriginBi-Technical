// Auto-runs SQL migrations from backend/assessment-service/db/migrations/
// at boot. Mirrors exam-engine's Goose pattern (but minimal, since we don't
// have a TypeScript Goose).
//
// Convention:
//   - Files named NNN_description.sql, NNN is a zero-padded sequence number.
//   - One migration per file. Pure SQL, no goose annotations.
//   - Each file runs inside a single transaction; if it fails the entire
//     file is rolled back and Nest's bootstrap aborts. systemd restarts
//     the service so an operator notices fast.
//   - Applied filenames recorded in `assessment_db_version`. On each boot
//     we scan the directory, diff against the table, and apply the
//     missing files in lex order.

import { promises as fs } from "fs";
import path from "path";
import type { Logger } from "@nestjs/common";
import type { Pool } from "pg";

const MIGRATION_FILE_PATTERN = /^\d{3}_.*\.sql$/;
const VERSION_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS assessment_db_version (
        filename     TEXT        PRIMARY KEY,
        applied_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
`;

// Resolve the migrations directory.
//
// Production: `node dist/src/main.js` → cwd is the service root, migrations
// live in `<service-root>/db/migrations/` (a sibling of src/, not bundled).
//
// Dev (`npm run dev` / `nest start`): same cwd assumption.
//
// __dirname-based resolution would point inside dist/ which doesn't ship
// the SQL files. Using cwd keeps the SQL outside the build artifact, which
// is intentional — easier to hotfix on the box without rebuilding.
function resolveMigrationsDir(): string {
    return path.resolve(process.cwd(), "db", "migrations");
}

async function ensureVersionTable(pool: Pool): Promise<void> {
    await pool.query(VERSION_TABLE_SQL);
}

async function loadAppliedFilenames(pool: Pool): Promise<Set<string>> {
    const rows = await pool.query<{ filename: string }>(
        `SELECT filename FROM assessment_db_version`,
    );
    return new Set(rows.rows.map((r) => r.filename));
}

async function listMigrationFiles(dir: string): Promise<string[]> {
    let entries: string[];
    try {
        entries = await fs.readdir(dir);
    } catch (err) {
        const e = err as NodeJS.ErrnoException;
        if (e.code === "ENOENT") {
            // No migrations folder yet — totally fine. First service install,
            // no schema changes to apply.
            return [];
        }
        throw err;
    }
    return entries
        .filter((name) => MIGRATION_FILE_PATTERN.test(name))
        .sort((a, b) => a.localeCompare(b));
}

async function applyMigration(
    pool: Pool,
    dir: string,
    filename: string,
    logger: Logger,
): Promise<void> {
    const sql = await fs.readFile(path.join(dir, filename), "utf8");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
            `INSERT INTO assessment_db_version (filename) VALUES ($1)`,
            [filename],
        );
        await client.query("COMMIT");
        logger.log(`[Migrator] applied ${filename}`);
    } catch (err) {
        try {
            await client.query("ROLLBACK");
        } catch {
            // ignore rollback failures — the underlying error is the one
            // we want to surface
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`[Migrator] failed on ${filename}: ${message}`);
    } finally {
        client.release();
    }
}

/**
 * Apply any not-yet-applied SQL files in db/migrations/ to the database.
 * Called once from the Nest bootstrap before app.listen().
 *
 * Idempotent: re-running with no pending files is a no-op (one cheap
 * SELECT). Failure throws — the caller MUST not start the HTTP server.
 */
export async function runPendingMigrations(
    pool: Pool,
    logger: Logger,
): Promise<void> {
    const dir = resolveMigrationsDir();
    await ensureVersionTable(pool);

    const [applied, available] = await Promise.all([
        loadAppliedFilenames(pool),
        listMigrationFiles(dir),
    ]);

    const pending = available.filter((f) => !applied.has(f));
    if (pending.length === 0) {
        logger.log(
            `[Migrator] up to date (${applied.size} already applied, ${available.length} on disk)`,
        );
        return;
    }

    logger.log(
        `[Migrator] applying ${pending.length} migration(s): ${pending.join(", ")}`,
    );
    for (const filename of pending) {
        await applyMigration(pool, dir, filename, logger);
    }
    logger.log(`[Migrator] done`);
}
