# Runbook

How to bring OriginBi Technical up, and the non-obvious things that will bite
you if you don't know them.

## Components

| Service | Port | Runtime | Started by |
| --- | --- | --- | --- |
| frontend (Next.js) | 3000 | Node | PM2 (`ecosystem.config.js`) |
| assessment-service (NestJS) | 5000 | Node | PM2 (`ecosystem.config.js`) |
| exam-engine (Go) | 8088 | binary | systemd (`deploy/systemd/exam-engine.service`) |
| tech-assessment-engine (Go) | 5001 | binary | systemd — **see "Unused service" below** |
| Judge0 | 2358 | Docker | `docker compose up -d` in `backend/judge0` |

Two external dependencies live in the **sibling `originbi` repo**, not this one:

| Service | Port | Needed for |
| --- | --- | --- |
| auth-service | 4002 | All login. The frontend posts credentials here. |
| student-service | 4004 | Student profile, departments, login status |

Without 4002 running, **nobody can log in** — the frontend's
`NEXT_PUBLIC_AUTH_SERVICE_URL` points at it. This is the main coupling to the
sibling platform.

## Start order (matters)

1. **PostgreSQL**
2. **exam-engine** — its goose baseline creates `users`, `plugins`, `questions`
   and the rest of the shared core.
3. **assessment-service** — its migrations add the `tech_*` tables, which carry
   foreign keys to `users(id)`. Starting it against a database exam-engine has
   never touched fails on the first foreign key.
4. frontend, tech-assessment-engine — order irrelevant.

Judge0 whenever you need the coding module.

## Database

One database, shared by all three backends: `originbi_technical`.

Schema is applied **only** by migrations. There is no hand-apply path any more
— `db:init` has been removed and the loose SQL files under `backend/db/` are
gone (see `backend/db/README.md` for what happened to each).

- exam-engine: goose, `internal/migrate/sql/`, tracked in `goose_db_version`.
  Runs when `RUN_MIGRATIONS=true`.
- assessment-service: custom runner, `db/migrations/`, tracked in
  `assessment_db_version`. Runs when `RUN_MIGRATIONS=true`.

A migration failure **aborts boot on purpose** so the failure is loud. If a
service exits at startup with `[Migrator] failed on ...`, fix the migration —
don't start the service with migrations disabled.

### Creating a database from scratch

```bash
createdb originbi_technical
# then start exam-engine, then assessment-service, both with RUN_MIGRATIONS=true
```

There is no seed step for a production database. For a test environment,
`backend/assessment-service/src/db/seed-all-assessments.ts` inserts sample MCQ
content and `backend/exam-engine/scripts/reseed_coding.sql` inserts sample
coding questions. Both need at least one row in `users`.

### Users are per-database

`users.id` is **not** shared with the sibling platform. The same person has
different ids in `originbi` and `originbi_technical`. Never pass an id from one
platform to the other — resolve identity by Cognito `sub` (or email), which is
stable across both. Both platforms authenticate against the same Cognito pool.

## Services that fail closed

These are deliberate. Do not "fix" them by disabling the check.

- **tech-assessment-engine** exits on boot without `COGNITO_REGION`,
  `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`. It previously served the whole
  assessment API with no authentication whatsoever.
- **assessment-service** refuses to start when `ASSESSMENT_AUTH` is disabled and
  `NODE_ENV=production`. Auth now defaults to on; it must be switched off
  explicitly, and only outside production.
- **exam-engine** rejects requests without a valid Cognito bearer token. The
  `X-User-Id` development bypass requires `DEV_AUTH_BYPASS=on` and is refused
  when `APP_ENV=production`.
- **Admin routes on both services require the ADMIN role, not merely a valid
  session.** Authentication and authorization are different questions and both
  are now asked:
  - assessment-service: a global `RolesGuard` resolves the caller's `users` row
    from the token (by `cognito_sub`, falling back to email) and enforces
    `@Roles('ADMIN')` on every `/api/admin/*` controller. It also attaches
    `req.dbUser`, which handlers use instead of a client-supplied `userId`.
  - exam-engine: the whole `/v1/admin` group runs behind `adminOnly`. Most
    handlers also check individually, but three did not — the router now makes
    it structural.

  Role means `users.role IN ('ADMIN','SUPER_ADMIN','STAFF')` in *this*
  database. An admin with no row here is not an admin here.

## Unused service: tech-assessment-engine

Nothing calls it. The frontend proxies `/api/assessment/*` to
assessment-service on 5000, which implements a superset of its four routes.
There is no reference to port 5001 anywhere in the frontend.

It is authenticated and safe to run, but the right end state is decommissioning:

```bash
systemctl disable --now tech-assessment-engine
```

Confirm it's unused in your environment first.

## Building for deployment

```bash
# Node services
cd frontend && npm ci && npm run build
cd backend/assessment-service && npm ci && npm run build   # -> dist/main.js

# Go services (Linux target)
cd backend/exam-engine            && GOOS=linux GOARCH=amd64 go build -o exam-engine ./cmd/server
cd backend/tech-assessment-engine && GOOS=linux GOARCH=amd64 go build -o tech-engine ./cmd/api
```

The systemd units expect the binaries at those exact names inside each service
directory, and run as an unprivileged `originbi` account:

```bash
useradd --system --no-create-home --shell /usr/sbin/nologin originbi
chown -R originbi: /home/OriginBi-Technical
chmod 400 backend/*/.env.local          # they contain AWS and database credentials
```

## Configuration

Each service has a `.env.local.example` listing every variable with notes.
Copy to `.env.local` and fill in. `.gitignore` excludes `.env*` except the
`*.example` files — keep it that way.

## Health checks

```bash
curl localhost:3000                          # frontend
curl localhost:5000/api/health               # assessment-service
curl localhost:5000/api/adaptive/v2/health   # adaptive schema self-check
curl localhost:8088/healthz                  # exam-engine liveness
curl localhost:8088/readyz                   # exam-engine + database
curl localhost:5001/health                   # tech-assessment-engine
```

`/api/adaptive/v2/health` is the most useful of these: it reports `degraded`
and names what is missing when the adaptive schema is behind the code.

## Known gaps

- **Coding module needs Judge0** (Docker). Without it, authoring, the language
  catalog and attempt start all work, but code run/submit fail. The question
  bank itself is seeded by `backend/exam-engine/scripts/reseed_coding.sql`;
  note that the retired `tech_coding_*` tables are always empty and are not the
  place to look.
- **`/student/profile` on the sibling student-service is unauthenticated.** It
  returns a full profile — role, phone, personality scores — for any email
  address supplied. Fix belongs in the sibling repo.
- **Two MCQ implementations coexist.** The `tech_*` tables (four near-identical
  table families driven by string-templated SQL) hold all the data, while
  exam-engine's plugin model — generic `questions`/`question_versions` with
  working `assessment.mcq` and `assessment.fillblank` plugins — is unused.
  Consolidating is the largest outstanding piece of work.

  The split has one user-visible consequence, now bridged rather than fixed:
  `/my-score` reads exam-engine `/v1/me/results`, which only ever returns
  coding attempts. The frontend `getMyResults()` therefore fetches *both* that
  and assessment-service `/api/assessment/me/results` and merges them. If you
  consolidate the two models, collapse that merge back into one call.
