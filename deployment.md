# Deployment

Stack:

- **frontend** — Next.js 16 (`frontend/`), port `3000`
- **exam-engine** — Go runtime API (`backend/exam-engine/`), port `8088`
- **Postgres 16** — exam-engine database (compose), exposed on `55432`
- **Judge0** — code execution sandbox (`backend/judge0/`), port `2358`
- **assessment-service** (legacy NestJS in `backend/assessment-service/`) is **not** wired to the current frontend coding flow and can be ignored for runtime deployment.

The frontend talks to exam-engine at `NEXT_PUBLIC_API_BASE` (default `http://localhost:8088`). Exam-engine talks to Judge0 at `JUDGE0_URL` (default `http://localhost:2358`).

---

## 1. Local development

### 1.1 Prerequisites

- Docker Desktop (WSL2 backend on Windows)
- Node.js 22+ and npm (frontend)
- Go 1.22+ (only if running exam-engine bare-metal)
- Free ports: `3000`, `8088`, `55432`, `2358`

### 1.2 Start Judge0 (code sandbox)

```bash
cd backend/judge0
docker compose up -d
```

Verify:

```bash
curl http://localhost:2358/system_info
```

`judge0.conf` ships with working defaults. Treat it as a secret in any non-local environment (rotate `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `SECRET_KEY_BASE`).

### 1.3 Start exam-engine + Postgres

```bash
cd backend/exam-engine
cp .env.example .env       # only needed for bare-metal; compose has its own env
docker compose up -d --build
```

This brings up:

- `exam-engine-db-1` — Postgres on `localhost:55432` (user/db/pass: `exam`/`exam`/`exam`)
- `engine` — exam-engine API on `localhost:8088`

Migrations run automatically on engine boot (`RUN_MIGRATIONS=true`). Telemetry partitions are auto-ensured (`ENSURE_PARTITIONS_ON_BOOT=true`).

Bare-metal alternative (DB still via compose):

```bash
cd backend/exam-engine
docker compose up -d db
cp .env.example .env
go mod download
go run ./cmd/server
```

Health checks:

```bash
curl http://localhost:8088/healthz   # {"status":"ok"}
curl http://localhost:8088/readyz    # {"status":"ready"}
```

### 1.4 Bootstrap a local admin (optional)

```bash
curl -X POST http://localhost:8088/v1/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"token":"change-this-before-use","email":"admin@example.com","password":"password123","name":"Platform Admin"}'
```

The bootstrap endpoint is disabled when `BOOTSTRAP_ADMIN_TOKEN` is unset.

### 1.5 Start the frontend

```bash
cd frontend
npm install
npm run dev
```

App at `http://localhost:3000`. `frontend/.env.local` is committed with non-secret defaults; create or extend it with engine and Judge0 URLs as needed (see env table below).

### 1.6 Smoke test

```bash
# session-issuing request
curl -s -c /tmp/cookies -H "Origin: http://localhost:3000" -H "Content-Type: application/json" \
  -X POST http://localhost:8088/v1/auth/register \
  -d '{"email":"dev@example.com","password":"Passw0rd!aa","name":"Dev","gender":"male","countryCode":"+91","phone":"9999999999","role":"student"}'

# authenticated call
curl -s -b /tmp/cookies http://localhost:8088/v1/auth/session
```

---

## 2. Production

### 2.1 Topology

```
[ Browser ] ── HTTPS ──> [ Reverse proxy / CDN ]
                                  │
                  ┌───────────────┼────────────────┐
                  ▼               ▼                ▼
            /          /v1            (any other)
       Next.js SSR   exam-engine    static / 404
       (Node 22)     (Go binary)
                          │
                          ▼
                   Postgres 16 (managed)
                          │
                          ▼
                       Judge0
                  (private network)
```

Two valid configurations for the engine URL:

1. **Same-origin** — reverse proxy routes `/v1/*` to exam-engine. Leave `NEXT_PUBLIC_API_BASE` empty; the frontend will use same-origin `/v1` paths (see `frontend/lib/api.ts:6`).
2. **Separate origin** — set `NEXT_PUBLIC_API_BASE=https://api.example.com`. Add that origin to `ALLOWED_ORIGINS` on the engine, and use `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true` for cross-site cookies.

### 2.2 Database (Postgres)

- Use managed Postgres 16 (RDS, Cloud SQL, Neon, etc.).
- Provide DSN via `DATABASE_URL` with `sslmode=require` or stricter.
- Embedded migrations run automatically on boot. To run them in a controlled job, set `RUN_MIGRATIONS=false` on regular instances and run one-shot with `RUN_MIGRATIONS=true` during deploy.
- Partitions: keep `ENSURE_PARTITIONS_ON_BOOT=true` on at least one replica; an in-process hourly ticker maintains forward partitions.

### 2.3 Judge0

- Deploy from `backend/judge0/docker-compose.yml` on an isolated VM/host that allows `privileged: true` and cgroup mounts (kernel sandbox requirement). Managed Kubernetes generally cannot run it as-is.
- Restrict network ingress to exam-engine only. Do **not** expose `2358` to the public internet.
- Rotate every secret in `judge0.conf`: `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `SECRET_KEY_BASE`, admin tokens.
- Disable `JUDGE0_ALLOW_UNSAFE_EXECUTION` if you do not require it.

### 2.4 exam-engine

Build the image once and reuse:

```bash
docker build -t registry.example.com/originbi/exam-engine:<sha> backend/exam-engine
docker push  registry.example.com/originbi/exam-engine:<sha>
```

Runtime requirements:

- Set `APP_ENV=production` (toggles secure-cookie defaults).
- Set `ALLOWED_ORIGINS` to your real frontend origin(s), comma-separated. CORS and unsafe-method origin checks reject anything else.
- Set `BOOTSTRAP_ADMIN_TOKEN` to a random secret (or leave unset to disable bootstrap entirely).
- Set `COOKIE_DOMAIN` if you serve frontend and API from different subdomains under one parent (e.g. `.example.com`).
- Set `COOKIE_SECURE=true` and `COOKIE_SAMESITE=lax` (or `none` if cross-site).
- Size `JUDGE0_MAX_CONCURRENCY` per replica so total concurrent jobs ≤ Judge0 worker capacity. Excess load fails fast rather than queueing inside the engine.

Health probes for the orchestrator:

- Liveness: `GET /healthz` (200 = process alive)
- Readiness: `GET /readyz` (200 = DB reachable)

### 2.5 frontend

Two ways to ship:

- **Node server** — `npm run build && npm start` on Node 22 behind the reverse proxy. Required if you use SSR features.
- **Container** — wrap the same commands in a Dockerfile. `frontend/Dockerfile.local` is for dev only (runs `next dev`); write a production one with `next build` + `next start`.

Build-time vs runtime envs:

- Anything prefixed `NEXT_PUBLIC_*` is **inlined at `next build`**. To change them per environment, rebuild — do not try to override at container start.
- Non-public envs (`ENGINE_INTERNAL_URL`) are read at runtime by `frontend/proxy.ts`.

### 2.6 Deploy order

1. Apply DB migrations (engine with `RUN_MIGRATIONS=true`, one-shot).
2. Roll out exam-engine.
3. Roll out frontend.
4. Smoke `/healthz`, `/readyz`, and one authenticated round-trip.

---

## 3. Environment reference

### 3.1 exam-engine (`backend/exam-engine/.env.example`)

| Var | Default | Required | Notes |
|---|---|---|---|
| `DATABASE_URL` | — | yes | Postgres DSN. Local compose: `postgres://exam:exam@localhost:55432/exam?sslmode=disable`. Prod: `sslmode=require`. |
| `HTTP_ADDR` | `:8080` (code), `:8088` (example) | no | Listen address. |
| `LOG_LEVEL` | `info` | no | `debug`/`info`/`warn`/`error`. |
| `HEARTBEAT_GRACE_SECONDS` | `60` | no | Heartbeat grace before a connectivity-gap row is written. |
| `RUN_MIGRATIONS` | `true` | no | Embedded migrations on boot. |
| `ENSURE_PARTITIONS_ON_BOOT` | `true` | no | Telemetry partition maintainer. |
| `JUDGE0_URL` | `http://localhost:2358` | no | Judge0 base URL. |
| `JUDGE0_MAX_CONCURRENCY` | `12` | no | Per-replica code-run cap. |
| `JUDGE0_HTTP_TIMEOUT_SECONDS` | `95` | no | |
| `JUDGE0_MAX_IDLE_CONNS` | `100` | no | |
| `JUDGE0_MAX_IDLE_CONNS_PER_HOST` | `32` | no | |
| `DB_POOL_MAX_CONNS` | `20` | no | pgx pool. |
| `DB_POOL_MIN_CONNS` | `2` | no | |
| `DB_POOL_MAX_CONN_LIFETIME_SECONDS` | `1800` | no | |
| `DB_POOL_MAX_CONN_IDLE_SECONDS` | `300` | no | |
| `DB_POOL_HEALTHCHECK_SECONDS` | `30` | no | |
| `BOOTSTRAP_ADMIN_TOKEN` | unset | no | Required to enable `POST /v1/admin/bootstrap`. Keep unset in prod after first admin is created. |
| `ALLOWED_ORIGINS` | localhost only | prod yes | Comma-separated. Empty → defaults to `localhost`/`127.0.0.1` only. |
| `APP_ENV` | unset | prod yes | `production` flips cookie-secure default to `true`. |
| `COOKIE_SECURE` | derived from `APP_ENV` | no | Explicit override. |
| `COOKIE_DOMAIN` | host-only | no | Set for cross-subdomain cookies. |
| `COOKIE_SAMESITE` | `lax` | no | `lax`/`strict`/`none`. Use `none` only with `Secure`. |
| `PORT` | falls back to `HTTP_ADDR` | no | Read by some PaaS; engine reads `HTTP_ADDR`. |

### 3.2 frontend

| Var | Default | Scope | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE` | `http://localhost:8088` (dev), `""` (prod) | build-time | Engine URL the browser uses. Empty in prod = same-origin `/v1`. |
| `ENGINE_INTERNAL_URL` | `NEXT_PUBLIC_API_BASE` fallback | runtime | Used by `frontend/proxy.ts` for server-side calls (e.g. inside Docker, `http://host.docker.internal:8088`). |
| `NEXT_PUBLIC_JUDGE0_URL` | `http://localhost:2358` | build-time | Direct Judge0 calls from legacy paths. Usually omit in prod. |
| `NEXT_PUBLIC_ADMIN_EMAIL` | `ariyappan@touchmarkdes.com` | build-time | Hard-coded gate on `/admin/login`. Override per env. |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | `Admin@123` | build-time | Same. Treat as a secret and rotate. |
| `NEXT_PUBLIC_TECH_API_URL` | unset | build-time | Legacy NestJS service URL; only needed if you keep that path alive. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000` | build-time | Legacy NestJS service URL (older modules). |
| `NEXT_PUBLIC_STUDENT_SERVICE_URL` | `http://localhost:4004` | build-time | Legacy student service. |

`NEXT_PUBLIC_*` values are baked into the JS bundle at build time — never put real secrets in them. The two admin envs above are exposed to the browser today; replace them with a server-side auth check before going to production.

### 3.3 Judge0 (`backend/judge0/judge0.conf`)

Treat the whole file as secret in non-local envs. At minimum rotate:

- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `SECRET_KEY_BASE`
- any `*_TOKEN` or `*_PASSWORD` keys

Keep `JUDGE0_ALLOW_UNSAFE_EXECUTION` off unless deliberately needed; the production setup should bind Judge0 to a private network only reachable from exam-engine.

---

## 4. Operational notes

- **Sessions** — exam-engine issues an `ob_session` HttpOnly cookie via `/v1/auth/login` and `/v1/auth/register`. Sessions live 24h. All `/v1/*` routes outside the auth namespace require it.
- **Telemetry tables** — `attempt_events_YYYY_MM` and `attempt_heartbeats_YYYY_MM_DD` are partitioned. The engine maintains forward partitions automatically; if you scale to many replicas, only one needs `ENSURE_PARTITIONS_ON_BOOT=true`.
- **Backups** — Postgres only. Judge0 state is ephemeral; Redis holds queues and can be lost on restart.
- **Scaling** — exam-engine is stateless apart from the DB pool and the per-replica Judge0 semaphore. Scale horizontally; size `JUDGE0_MAX_CONCURRENCY × replicas` to fit Judge0 worker count.
- **Time** — server-authoritative timer relies on the host clock. Run NTP.
