# exam-engine

Go runtime engine for the OriginBI Exam Portal. It currently owns the individual coding-assessment runtime slice: auth sessions, demo purchases, non-expiring coding assignments, attempt start/resume, frozen attempt snapshots, autosave, Judge0-backed code runs, submit, heartbeat, telemetry ingest, and admin plugin toggles.

The full schema design is in [docs/database-plan.md](docs/database-plan.md). The current implementation status is in [docs/implementation-status-and-next-steps.md](docs/implementation-status-and-next-steps.md).

## What Is Here

```text
backend/exam-engine/
  cmd/server/main.go
  internal/auth
  internal/config
  internal/db
  internal/migrate
  internal/migrate/sql
  internal/server
  docs/database-plan.md
  docs/implementation-status-and-next-steps.md
  Dockerfile
  docker-compose.yml
  .env.example
```

## Run Locally

### Option A: docker compose

```bash
cp .env.example .env
docker compose up --build
```

Postgres is exposed on `localhost:55432`. The engine is exposed on `localhost:8088`. Migrations run automatically.

### Option B: bare metal

Requires Go 1.22+ and Postgres reachable at `DATABASE_URL`.

```bash
cp .env.example .env
go mod download
go run ./cmd/server
```

The `.env.example` uses the compose-exposed Postgres port `55432` and `HTTP_ADDR=:8088`, so a bare-metal engine can run against the local compose database while the frontend default `NEXT_PUBLIC_API_BASE=http://localhost:8088` works without extra configuration.

## Core Environment

| Env | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | required | Postgres DSN |
| `HTTP_ADDR` | `:8080` in code, `:8088` in local `.env.example` | listen address |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `HEARTBEAT_GRACE_SECONDS` | `60` | heartbeat grace for connectivity gap records |
| `RUN_MIGRATIONS` | `true` | auto-run embedded migrations on boot |
| `ENSURE_PARTITIONS_ON_BOOT` | `true` | ensure current/upcoming telemetry partitions on boot |
| `JUDGE0_URL` | `http://localhost:2358` | Judge0 base URL |
| `JUDGE0_MAX_CONCURRENCY` | `12` | per-engine concurrent code-run cap |
| `JUDGE0_HTTP_TIMEOUT_SECONDS` | `95` | Judge0 HTTP timeout |
| `JUDGE0_MAX_IDLE_CONNS` | `100` | Judge0 HTTP client idle pool |
| `JUDGE0_MAX_IDLE_CONNS_PER_HOST` | `32` | Judge0 per-host idle pool |
| `DB_POOL_MAX_CONNS` | `20` | pgx pool max connections |
| `DB_POOL_MIN_CONNS` | `2` | pgx pool min connections |
| `DB_POOL_MAX_CONN_LIFETIME_SECONDS` | `1800` | pgx max connection lifetime |
| `DB_POOL_MAX_CONN_IDLE_SECONDS` | `300` | pgx idle connection lifetime |
| `DB_POOL_HEALTHCHECK_SECONDS` | `30` | pgx pool health-check cadence |
| `BOOTSTRAP_ADMIN_TOKEN` | none | enables local admin bootstrap when set |
| `ALLOWED_ORIGINS` | localhost origins | comma-separated browser origins allowed by CORS and unsafe-method origin checks |
| `APP_ENV` | none | set to `production` to make cookies Secure by default |
| `COOKIE_SECURE` | derived from `APP_ENV` | explicit Secure cookie override |
| `COOKIE_DOMAIN` | host-only | optional cookie domain |
| `COOKIE_SAMESITE` | `lax` | `lax`, `strict`, or `none` |

## Implemented Endpoints

### Public

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/healthz` | liveness |
| `GET` | `/readyz` | database readiness |
| `POST` | `/v1/auth/register` | create user, registration, session |
| `POST` | `/v1/auth/login` | create 24-hour session |
| `POST` | `/v1/auth/logout` | revoke current session |
| `GET` | `/v1/auth/session` | validate current session |
| `POST` | `/v1/admin/bootstrap` | create or update first local admin |

### Authenticated

All routes below require the HttpOnly `ob_session` cookie.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/v1/me/registration` | read current user registration |
| `PUT` | `/v1/me/registration` | update current user registration |
| `GET` | `/v1/me/assignments` | list current user's assignments |
| `POST` | `/v1/purchases/demo` | create/reuse demo purchase and active coding assignment |
| `POST` | `/v1/attempts/start` | create or resume attempt and return snapshot |
| `GET` | `/v1/attempts/{attempt_id}/snapshot` | load frozen attempt snapshot |
| `PUT` | `/v1/attempts/{attempt_id}/answers/{exam_question_id}` | autosave answer payload |
| `POST` | `/v1/attempts/{attempt_id}/answers/{exam_question_id}/runs` | run code through Judge0 and persist results |
| `POST` | `/v1/attempts/{attempt_id}/submit` | persist final answers, auto-grade stored answers/runs, and finalize attempt |
| `POST` | `/v1/attempts/{attempt_id}/heartbeat` | server-authoritative timer heartbeat |
| `POST` | `/v1/attempts/{attempt_id}/events` | telemetry event ingest |
| `GET` | `/v1/admin/plugins` | list plugin platform state |
| `PUT` | `/v1/admin/plugins/{plugin_id}` | update plugin platform state |

## Local Admin Bootstrap

```bash
curl -X POST http://localhost:8088/v1/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"token":"change-this-before-use","email":"admin@example.com","password":"password123","name":"Platform Admin"}'
```

The response sets the `ob_session` cookie. The frontend admin plugin panel is available at `/admin/plugins`. Bootstrap is disabled when `BOOTSTRAP_ADMIN_TOKEN` is not set.

## Demo Purchase Contract

```http
POST /v1/purchases/demo
Cookie: ob_session=...
Content-Type: application/json

{ "itemRef": "coding:python" }
```

Supported item refs:

- `coding:python`
- `coding:java`
- `coding:cpp`
- `coding:javascript`
- `coding:c`

The API creates or reuses a paid purchase and an active non-expiring assignment. This slice allows one final attempt per paid language.

## Attempt Start Contract

```http
POST /v1/attempts/start
Cookie: ob_session=...
Content-Type: application/json

{ "assignmentRef": "coding:python" }
```

The engine validates assignment ownership, creates or resumes the active attempt, and returns the frozen snapshot needed by the frontend.

## Autosave Contract

```http
PUT /v1/attempts/{attempt_id}/answers/{exam_question_id}
Cookie: ob_session=...
Content-Type: application/json

{
  "state": "attempted",
  "payload": {
    "language": "python",
    "entryFile": "solution.py",
    "files": [
      { "path": "solution.py", "content": "print('ok')" }
    ],
    "mcqAnswer": null
  }
}
```

Autosave upserts `attempt_question_state` and `answers.payload`.
Each save also writes an `answer_saved` event into partitioned telemetry in the same transaction.

## Code Run Contract

```http
POST /v1/attempts/{attempt_id}/answers/{exam_question_id}/runs
Cookie: ob_session=...
Content-Type: application/json

{
  "mode": "tests",
  "language": "python",
  "entryFile": "solution.py",
  "files": [
    { "path": "solution.py", "content": "print('ok')" }
  ],
  "customStdin": ""
}
```

The engine persists answer payload, code submission files, code run rows, Judge0 outputs, and testcase results before returning feedback to the frontend.
Code-run start/finish/failure events are written to partitioned telemetry. Per-engine code execution is protected by `JUDGE0_MAX_CONCURRENCY` so load-balanced replicas fail fast instead of exhausting Judge0 or the Go process.

## Migrations

Embedded migrations live in `internal/migrate/sql`.

| File | Adds |
|---|---|
| `001_init.sql` | organizations, organization members, plugin registry, taxonomy, question bank base |
| `002_exams.sql` | templates, exams, sections, exam versions, exam-level entitlements, assignments |
| `003_runtime.sql` | attempts, question state, answers, code submissions, code runs |
| `004_telemetry.sql` | partitioned events, heartbeats, summaries, gaps, partition helpers |
| `005_evaluation.sql` | rubrics, evaluations, criterion scores, manual review assignments |
| `006_publication.sql` | result publication |
| `007_billing.sql` | pricing and purchases |
| `008_seed_plugins.sql` | system organization and initial plugin catalog |
| `009_identity_coding_runtime.sql` | users, registrations, sessions, coding prices, assignment refs, seeded Coding Assessment |
| `010_runtime_traceability_and_load_indexes.sql` | active-attempt uniqueness and runtime/load indexes |

## Current Limits

- Real payment provider/webhook integration is not implemented.
- Organization/admin authoring workflows are not implemented.
- Manual review, LLM evaluation, and result publication are not implemented yet.
- The coding UI still uses frontend static question data for rich display, while the backend snapshot supplies authoritative ids, ordering, timing, and saved payloads.
- Browser end-to-end verification requires the engine to be running on `localhost:8088` and Judge0 on `localhost:2358`.
