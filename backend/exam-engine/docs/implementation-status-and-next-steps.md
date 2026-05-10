# Exam Engine Implementation Status and Next Steps

Last updated: 2026-05-10

This document summarizes the Go `backend/exam-engine/` implementation and the remaining backend work. The detailed schema source of truth is [database-plan.md](database-plan.md). Do not duplicate that whole schema here; use this file for implementation status and continuation context.

The larger product remains the Exam Portal Plan: a multi-tenant platform where corporate and college tenants share the same tenant model in v1, plugins are the central assessment capability model, live attempts use frozen snapshots, and LLM evaluation stays separately entitled. The current backend is an individual coding-assessment slice plus the runtime foundation for future tenant/admin flows.

## Related Documents

- Schema source of truth: [database-plan.md](database-plan.md)
- Frontend status: [exam-portal-status-and-next-steps.md](../../../frontend/docs/exam-portal-status-and-next-steps.md)
- Judge0 status: [service-status-and-next-steps.md](../../judge0/docs/service-status-and-next-steps.md)

## Completed

### Service Structure

The Go service exists under:

```text
backend/exam-engine/
```

Implemented structure:

- `cmd/server/main.go` - binary entrypoint.
- `internal/config` - environment loading.
- `internal/db` - pgx pool setup and partition helper calls.
- `internal/migrate` - embedded Goose migrations.
- `internal/auth` - request principal context.
- `internal/server` - Chi router and handlers.
- `docs/database-plan.md` - full database design.
- `README.md` - run instructions and endpoint summary.
- `Dockerfile`.
- `docker-compose.yml`.
- `.env.example`.

### Runtime Boot Flow

Implemented boot behavior:

- Loads config from environment.
- Optionally reads `.env` for local development.
- Requires `DATABASE_URL`.
- Builds structured JSON logging with `slog`.
- Runs embedded Goose migrations when `RUN_MIGRATIONS=true`.
- Opens a `pgxpool` connection pool.
- Ensures current telemetry partitions on boot when `ENSURE_PARTITIONS_ON_BOOT=true`.
- Starts an hourly partition maintainer.
- Starts the HTTP server.
- Handles graceful shutdown on interrupt or termination signals.

### Configuration

Implemented environment variables:

- `DATABASE_URL` - required Postgres DSN.
- `HTTP_ADDR` - defaults to `:8080`.
- `LOG_LEVEL` - defaults to `info`.
- `HEARTBEAT_GRACE_SECONDS` - defaults to `60`.
- `RUN_MIGRATIONS` - defaults to `true`.
- `ENSURE_PARTITIONS_ON_BOOT` - defaults to `true`.
- `JUDGE0_URL` - defaults to `http://localhost:2358`.
- `BOOTSTRAP_ADMIN_TOKEN` - optional local bootstrap secret; bootstrap is disabled when unset.
- `ALLOWED_ORIGINS` - optional comma-separated CORS/origin allowlist.
- `APP_ENV` - set to `production` to make cookies Secure by default.
- `COOKIE_SECURE`, `COOKIE_DOMAIN`, `COOKIE_SAMESITE` - optional cookie deployment controls.
- `DB_POOL_MAX_CONNS`, `DB_POOL_MIN_CONNS`, `DB_POOL_MAX_CONN_LIFETIME_SECONDS`, `DB_POOL_MAX_CONN_IDLE_SECONDS`, `DB_POOL_HEALTHCHECK_SECONDS` - pgx pool sizing/tuning for production replicas.
- `JUDGE0_MAX_CONCURRENCY`, `JUDGE0_HTTP_TIMEOUT_SECONDS`, `JUDGE0_MAX_IDLE_CONNS`, `JUDGE0_MAX_IDLE_CONNS_PER_HOST` - per-engine Judge0 execution and HTTP connection controls.

### Database And Migrations

Migrations are embedded into the binary through Go `embed` and run with Goose.

Implemented migration files:

- `001_init.sql` - extensions, enums, organizations, organization membership, plugin registry, taxonomy, question bank base.
- `002_exams.sql` - templates, exams, sections, exam versions, exam-level entitlements, assignments.
- `003_runtime.sql` - attempts, question state, answers, code submissions, code runs.
- `004_telemetry.sql` - partitioned attempt events, event summaries, partitioned heartbeats, connectivity gaps, partition helper functions.
- `005_evaluation.sql` - rubrics, evaluations, criterion scores, manual review assignments.
- `006_publication.sql` - result publication.
- `007_billing.sql` - optional pricing and purchases.
- `008_seed_plugins.sql` - system organization and initial plugin catalog.
- `009_identity_coding_runtime.sql` - users, registrations, sessions, assignment refs, coding pricing items, and the current Coding Assessment seed.
- `010_runtime_traceability_and_load_indexes.sql` - active-attempt uniqueness and runtime/load indexes for attempts, answers, and code runs.

The migration set reflects the schema direction in [database-plan.md](database-plan.md).

### Identity And Sessions

Implemented tables in migration `009`:

- `users`
- `registrations`
- `user_sessions`

Implemented auth behavior:

- Passwords are stored in `users.password` as bcrypt hashes.
- Sessions use opaque tokens.
- Token hashes are stored in `user_sessions.token_hash`.
- Browser cookie name is `ob_session`.
- Cookie is HttpOnly.
- Cookie can be configured with Secure, Domain, and SameSite settings through environment variables.
- Session TTL is fixed at 24 hours from login.
- Re-login creates a fresh 24-hour session.
- Logout revokes the current session and clears the cookie.
- Protected runtime APIs validate the DB session.
- Auth and bootstrap requests are rate-limited in-process per client IP.
- Auth, runtime, code-run, heartbeat, event, and admin mutation request bodies are size-limited.
- JSON decoders reject unknown top-level fields on API request bodies.

Implemented auth APIs:

```text
POST /v1/auth/register
POST /v1/auth/login
POST /v1/auth/logout
GET  /v1/auth/session
GET  /v1/me/registration
PUT  /v1/me/registration
POST /v1/admin/bootstrap
```

Bootstrap admin behavior:

- `POST /v1/admin/bootstrap` creates or updates a local platform admin.
- It requires `BOOTSTRAP_ADMIN_TOKEN`; when the token is unset the route is disabled.
- It sets `users.is_admin = true`.
- It creates or updates the registration row.
- It adds platform organization membership.
- It returns a session cookie.

### Plugin Model Foundation

Implemented schema foundation:

- Plugin registry.
- Platform plugin entitlements.
- Organization plugin entitlements.
- Exam plugin entitlements.
- Exam-question plugin entitlements.
- Seed plugins for MCQ, coding, evaluation, proctoring, and feature flags.

Implemented admin API:

```text
GET /v1/admin/plugins
PUT /v1/admin/plugins/{plugin_id}
```

Current admin API behavior:

- Requires an authenticated session.
- Requires `users.is_admin = true`.
- Lists plugin metadata and platform entitlement state.
- Updates platform plugin entitlement state and config.

### Pricing, Demo Purchase, And Assignments

Implemented in migration `009`:

- Coding pricing items:
  - `coding:python`
  - `coding:java`
  - `coding:cpp`
  - `coding:javascript`
  - `coding:c`
- `exam_assignments.assignment_ref`.
- `exam_assignments.purchase_id`.
- Unique active assignment per `candidate_user_id` and `assignment_ref`.
- Unique demo purchase per user/item/provider ref.

Implemented APIs:

```text
GET  /v1/me/assignments
POST /v1/purchases/demo
```

Demo purchase behavior:

- Requires login.
- Validates that the requested item ref is one of the five coding language refs.
- Creates or reuses a `purchases` row.
- Creates or reuses an active `exam_assignments` row.
- Sets `available_from = now()`.
- Sets `available_until = NULL`.
- Sets `max_attempts = 1`.
- Returns assignment state immediately.

Paid coding exams do not expire in this slice. Retakes are not implemented.

### Seeded Coding Assessment

Migration `009` seeds the current Coding Assessment using stable UUIDs.

Seeded objects:

- Platform-owned Coding Assessment exam.
- Published exam version.
- Coding section.
- Five questions:
  - Two Sum.
  - Identify the Data Structure.
  - Implement the Algorithm.
  - Time Complexity.
  - Longest Common Subsequence.
- MCQ options for the time-complexity question.
- Sample testcase rows for code questions.

This seed gives the runtime stable backend ids for assignments, attempts, answers, code runs, and testcase results.

### Attempt Runtime

Implemented APIs:

```text
POST /v1/attempts/start
GET  /v1/attempts/{attempt_id}/snapshot
PUT  /v1/attempts/{attempt_id}/answers/{exam_question_id}
POST /v1/attempts/{attempt_id}/submit
```

Start behavior:

- Requires login.
- Accepts `assignmentId` or `assignmentRef`.
- Validates assignment ownership.
- Validates active assignment status.
- Validates schedule window.
- Rejects already completed assignments.
- Resumes an existing active attempt when present.
- Creates a new attempt when no active attempt exists.
- Sets `deadline_at` from the seeded exam duration.
- Freezes the attempt snapshot into `attempts.fingerprint`.
- Returns the frozen snapshot.
- Writes `attempt_started` or `attempt_resumed` telemetry events.

Snapshot behavior:

- Requires login and attempt ownership.
- Returns attempt id, assignment id, exam version id, status, start/submission/deadline timestamps, time remaining, assignment ref, language, total time, questions, and saved answers.
- Uses the frozen `exam_version_id` on the attempt.

Autosave behavior:

- Requires active attempt ownership.
- Validates the `exam_question_id` belongs to the attempt's exam version.
- Upserts `attempt_question_state`.
- Upserts `answers.payload`.
- Stores the client payload as JSONB.
- Writes an `answer_saved` telemetry event in the same transaction.
- Returns server `savedAt`.

Submit behavior:

- Runs in one transaction.
- Persists all final answers first.
- Auto-grades MCQ answers from stored options.
- Auto-grades coding answers from the latest persisted testcase run for each answer.
- Writes `evaluations` rows for auto evaluation.
- Updates `answers.auto_score`, `answers.final_score`, `answers.auto_feedback`, and `answers.grading_status`.
- Updates the attempt to `evaluated` with `final_score` and `grading_status` only after required writes succeed.
- Writes an `attempt_submitted` telemetry event in the same transaction.
- Returns an error without changing the attempt status when persistence fails.

### Code Run Dispatch

Implemented API:

```text
POST /v1/attempts/{attempt_id}/answers/{exam_question_id}/runs
```

Run behavior:

- Requires login.
- Validates active attempt ownership.
- Validates question belongs to the attempt's frozen exam version.
- Supports `mode = custom` and `mode = tests`.
- Supports languages:
  - Python.
  - Java.
  - C++.
  - JavaScript.
  - C.
- Persists the current answer payload before running.
- Creates immutable `code_submissions`.
- Stores `code_submission_files`.
- Creates `code_runs`.
- Sends execution to Judge0 through the Go engine.
- Persists stdout, stderr, compile output, Judge0 status, time, memory, and finish time.
- For testcase mode, stores `code_run_test_results` with input, expected output, actual output, pass/fail, time, and memory.
- Validates candidate file paths, duplicate paths, file count, total source size, entry file existence, and custom stdin size before persistence/execution.
- Validates the requested coding language against the paid assignment language.
- Uses a pooled Judge0 HTTP client instead of the default client.
- Enforces per-engine code-run concurrency with `JUDGE0_MAX_CONCURRENCY`.
- Writes `code_run_started`, `code_run_finished`, `code_run_failed`, and `code_run_rejected` telemetry events.
- Limits Judge0 response decoding to avoid unbounded response bodies.

Judge0 execution details:

- Default Judge0 URL is `http://localhost:2358`.
- Custom stdin is sent only for custom mode.
- Test mode runs each visible non-hidden testcase.
- JavaScript helper files are inlined.
- Python, Java, C++, and C can use Judge0 multi-file mode when multiple executable source files are present.
- CPU, wall time, memory, stack, process, and file limits are currently hard-coded in the engine.

### Heartbeat And Telemetry

Implemented APIs:

```text
POST /v1/attempts/{attempt_id}/heartbeat
POST /v1/attempts/{attempt_id}/events
```

Current behavior:

- Protected by the same DB session middleware.
- Verifies attempt ownership through the authenticated user id.
- Heartbeat accepts `sent_at` and optional `client_state`.
- Heartbeat updates `last_seen_at`, server-authoritative time remaining, and timeout status.
- Heartbeat records breached connectivity gaps in `attempt_connectivity_gaps`.
- Event ingest accepts batches up to 200 events and a 1 MB request body.
- Event payloads are capped.
- Events are inserted into partitioned telemetry tables.
- Event summary counts are upserted.

Frontend heartbeat and telemetry wiring is implemented for the coding assessment:

- Heartbeats are sent every 15 seconds while an attempt is active.
- Client timer drift is corrected from the server-authoritative remaining time.
- Proctoring violations, tab switches, question navigation, status changes, MCQ selections, workspace changes, autosaves, run completions, submit success/failure, and heartbeat failures are batched to `POST /events`.

### Health And Readiness

Implemented public routes:

```text
GET /healthz
GET /readyz
```

Behavior:

- `/healthz` returns liveness without DB validation.
- `/readyz` pings Postgres and returns ready only when DB is reachable.

### Production Hardening Added

Implemented hardening:

- Explicit CORS and unsafe-method origin checks through `ALLOWED_ORIGINS`.
- Localhost-only origin defaults for development when no allowlist is configured.
- Secure cookie controls through `APP_ENV`, `COOKIE_SECURE`, `COOKIE_DOMAIN`, and `COOKIE_SAMESITE`.
- Bootstrap disabled when `BOOTSTRAP_ADMIN_TOKEN` is unset.
- Constant-time bootstrap token comparison.
- Per-IP in-memory rate limiter for register, login, and bootstrap.
- Env-tunable pgx pool sizing.
- Per-replica Judge0 concurrency limit and pooled Judge0 HTTP client.
- Active-attempt uniqueness index for duplicate-click/retry/load-balanced start safety.
- Current plus upcoming telemetry partitions are ensured on boot.
- Request body caps for auth/runtime/code-run/event endpoints.
- Stricter registration, login, and code-run validation.
- Backend regression tests for origin policy, bootstrap token behavior, cookie controls, registration validation, code-run validation, and rate limiting.

## Planned

Backend architecture still planned:

- Next.js for web experiences.
- NestJS for identity/RBAC, tenant management, exam authoring, scheduling, reporting, and orchestration.
- Go exam engine for runtime-critical attempt lifecycle, timing, autosave, code run dispatch, scoring hooks, and telemetry.

The current implementation is Go-engine-first because there is no NestJS service in this repo yet.

## Not Yet Implemented

Backend gaps:

- Real payment provider integration and webhook processing.
- Distributed rate limiting for multi-instance deployments.
- Durable audit log for admin/plugin changes and auth-sensitive actions.
- CSRF token support if cookies ever need `SameSite=None` outside a same-site deployment.
- Organization/corporate/college user provisioning APIs.
- Organization-level plugin entitlement APIs.
- Exam authoring APIs.
- Backend-driven catalog APIs for all assessment tracks.
- Fully dynamic coding question body/starter-code snapshot payloads.
- Section navigation API.
- Background connectivity gap detector worker for gaps not observed by a returning heartbeat.
- Hidden-test final judge worker; current submit grading uses the latest persisted visible testcase run.
- Manual review queue API.
- LLM evaluation dispatcher.
- Result publication API.
- Candidate result history API.
- Admin monitoring API.
- Organization admin monitoring API.
- Live monitor stream or WebSocket.
- sqlc query layer.
- Migration integration tests.
- Runtime handler tests.
- Load tests for telemetry ingestion.

## Next Backend Slices

Recommended order:

1. Add migration and handler tests for auth/session/purchase/attempt lifecycle.
2. Add browser E2E coverage for signup/login, demo purchase, start/resume, autosave, code run, reload, submit, and DB verification.
3. Add hidden-test final judge worker for submit-time grading.
4. Add result publication API and candidate result display API.
5. Add manual review API.
6. Add LLM evaluation dispatcher behind explicit plugin entitlement.
7. Add organization entitlement APIs for plugin and coding language allowlists.
8. Add exam authoring APIs that write full starter-code/testcase snapshot payloads.
9. Replace seeded/static coding content with authoring-driven frozen snapshot payloads.
10. Define the NestJS ownership contract:
    - which tables NestJS may write,
    - which runtime tables only Go may write,
    - which reads should go through APIs rather than direct DB access.

## Open Decisions

- Whether NestJS will own browser sessions long-term or whether this Go session implementation remains in v1.
- Whether the Go engine should expose browser-facing APIs directly in production.
- Exact shape of frozen question payloads for coding starter files, locked files, visible testcases, hidden testcases, and hints.
- Whether hidden testcases run during candidate Run Tests, final submit, or a later grading worker.
- How to enforce compile/run attempt limits per question and per exam.
- Whether result publication stores a frozen candidate-visible JSON snapshot.
- Whether Postgres row-level security is needed in v1 or app-level tenant filtering is enough.
- How reviewer assignment should work.
- How much raw Judge0 output should be retained and for how long.

## Verification Notes

Known local verification already completed during the implementation pass:

- `go test ./...` passed from `backend/exam-engine` with a workspace-local Go cache.
- Local compose Postgres on `localhost:55432` was previously migrated through Goose version 9; the current `010` migration still needs a live Docker/Postgres rerun.
- Frontend TypeScript check passed with `npx tsc --noEmit`.
- Focused frontend lint passed for `frontend/lib/api.ts` and `frontend/components/assessment/coding/CodingAssessment.tsx`.
- Frontend production build now succeeds with `npm run build`.
- Production-hardening unit tests now cover the critical security helper behavior in `internal/server`.

Known blocked verification:

- Live DB migration verification for `010` is currently blocked because Docker Desktop/Postgres is not running locally.
- Browser end-to-end testing still needs the Go engine running at `http://localhost:8088` and Judge0 at `http://localhost:2358`.
- Judge0 was reachable at `http://localhost:2358` during the previous verification pass.
- Full `npm run lint --if-present` still reports unrelated existing frontend lint errors outside the changed files.

## Current Repository Notes

- `backend/exam-engine/` is currently untracked in git.
- The service has substantial implementation files, migrations, and docs, but they have not been added to tracked git history yet.
- Keep [database-plan.md](database-plan.md) as the schema source of truth.
