# OriginBi-Technical — Current Architecture

> Snapshot date: 2026-05-14. Authoritative as of audits in `backend/exam-engine`, `frontend/`, `backend/assessment-service`, `backend/tech-assessment-engine`, `backend/judge0`, `backend/shared`. Pair with `STATUS.md` (running tracker) and `PLUGIN_ARCHITECTURE.md` (proposed extension).

---

## 0. Implementation delta - 2026-05-15

The running implementation has moved beyond the original 2026-05-14 audit in these areas:

- **Backend plugin host:** `internal/pluginhost` now includes an in-process event bus, an engine-to-client command hub, `plugin_decisions`, and `GET /v1/me/plugin-config`.
- **Attempt command channel:** `GET /v1/attempts/{id}/commands` serves authenticated SSE-style command streams; frontend consumes it with authenticated streaming `fetch()`.
- **Telemetry reactions:** `POST /v1/attempts/{id}/events` persists accepted events, then publishes them on the backend bus for subscriber plugins.
- **Frontend plugin runtime:** `frontend/plugins/` now has `PluginProvider`, `MountPoint`, a typed event bus, discovery helpers, command-stream consumer, and a static registry.
- **Lighthouse plugin:** `proctoring.tab-switch` is implemented end-to-end. It emits `proctoring.tab.switched`, counts switches server-side, records `auto_terminate` in `plugin_decisions`, and emits `attempt.terminate`.
- **Candidate coding screen:** renders `attempt.background`, `attempt.toolbar`, and `attempt.warning-toast` mount points and auto-submits when an `attempt.terminate` command arrives.
- **Admin Settings plugins:** the Proctoring tab now renders first-party `settings.proctoring` plugins for Camera & Vision, Microphone & Audio, Screen & Browser, AI Monitoring, Identity Verification, Network & Location, plus Tab Switching.
- **Plugin config persistence:** `PUT /v1/admin/plugins/{plugin_id}/config` upserts platform plugin config by UUID or slug; admin discovery merges schema defaults with persisted platform config before mounting plugin surfaces.

Older sections below still describe the audit baseline; prefer `STATUS.md` for the freshest phase-by-phase truth.

---

## 1. Service inventory

| Service | Stack | Port | Role | Health |
|---|---|---|---|---|
| **exam-engine** | Go (chi) | 8088 | Primary runtime. Owns auth (Cognito JWT), attempts, code runs, plugin registry, partition maintenance | ✅ Active |
| **assessment-service** | NestJS / TypeORM | 5000 | Legacy adaptive assessments + admin file upload to R2 + `/admin/me` for the admin login bootstrap | ⚠️ Endpoints unauthenticated; auth wiring incomplete |
| **tech-assessment-engine** | Go (Gin) | 5001 | Standalone stateless grader for aptitude/grammar/MNC/role/coding modules. Replaced by exam-engine but still launched by `start-all.ps1` | 🟠 Effectively deprecated |
| **frontend** | Next.js 16 + React 19 + Tailwind 4 | 3000 | Candidate + admin SPA | ✅ Active |
| **Judge0** | Docker Compose (judge0 + Postgres + Redis) | 2358 | Code execution sandbox | ✅ Active (dev-permissive) |
| **shared** | Node | n/a | Empty stub — exports a single placeholder constant | 🔴 Unused |

All services share one Postgres database `obidatanew` on port 5432.

---

## 2. Topology

```
                        ┌─────────────────┐
                        │   Browser SPA   │  (Next.js 16, React 19)
                        │   localhost:3000│
                        └────────┬────────┘
                                 │
                Cognito JWT      │      X-User-Id (legacy header trust)
            (Authorization Bearer)│
                                 ▼
   ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
   │   exam-engine     │   │ assessment-service│   │ tech-assessment-  │
   │   :8088 (Go)      │   │     :5000 (Nest)  │   │    engine :5001   │
   │  ─ auth/Cognito   │   │ ─ /admin/me       │   │   (deprecated)    │
   │  ─ plugin registry│   │ ─ R2 file uploads │   │                   │
   │  ─ attempts       │   │ ─ adaptive blocks │   │                   │
   │  ─ heartbeat+evts │   └─────────┬─────────┘   └────────┬──────────┘
   │  ─ code runs      │             │                      │
   └────┬──────────────┘             │                      │
        │ HTTP                       │                      │
        ▼                            ▼                      ▼
   ┌────────────┐           ┌──────────────────────────────────┐
   │  Judge0    │           │  Postgres "obidatanew" :5432     │
   │  :2358     │           │  (shared by every service)       │
   └────────────┘           └──────────────────────────────────┘
```

---

## 3. exam-engine (Go) — the critical path

### 3.1 Boot sequence ([cmd/server/main.go](../../backend/exam-engine/cmd/server))

1. `config.Load()` reads env (`HTTP_ADDR`, `DATABASE_URL`, `COGNITO_*`, `JUDGE0_URL`, …)
2. `db.Open()` builds pgx pool
3. Goose runs embedded migrations 001–014 from [`internal/migrate/sql/`](../../backend/exam-engine/internal/migrate/sql) if `RUN_MIGRATIONS=true`
4. Partition maintenance ensures monthly partitions exist for `attempt_events` and runs hourly
5. `auth.NewCognitoVerifier()` pulls JWKS — fail-fast if pool/region wrong
6. `pluginhost.Bootstrap()` loads every row in `plugins` table into an in-memory `Registry`, validates the dependency graph; injects synthetic kernel manifests for slugs like `runtime.exam-session`
7. `server.New()` wires routes; `server.AttachPluginRegistry()` registers the Go action handlers for `assessment.coding.*` and `evaluation.llm.*`
8. Listen on `HTTP_ADDR` with 120s request timeout

### 3.2 Routing ([internal/server/server.go](../../backend/exam-engine/internal/server/server.go))

Global middleware chain: RequestID → RealIP → Recoverer → 120s timeout → CORS → request log → bad-origin reject.

| Group | Auth | Routes |
|---|---|---|
| Public | none | `/healthz`, `/readyz`, `/v1/auth/{register,login}`, `/v1/admin/bootstrap` |
| Authenticated (`sessionMiddleware`) | Cognito JWT | `/v1/auth/{logout,session}`, `/v1/me/{registration,assignments,languages}`, `/v1/attempts/*`, `/v1/admin/*`, `/v1/purchases/demo`, `/v1/admin/judge0/health` |

Admin endpoints additionally call `s.requireAdmin(w, r)` inside each handler. There is no route-group level admin guard.

### 3.3 Auth model ([internal/auth/](../../backend/exam-engine/internal/auth), [auth_handlers.go](../../backend/exam-engine/internal/server/auth_handlers.go))

- `sessionMiddleware` extracts a bearer or `ob_session` cookie, verifies via `cognito.Verify(token)` (requires `token_use=access`), then looks up the user by `cognito_sub` in `users`.
- `auth.Principal{UserID, OrgID}` is attached to the request context.
- `isAdmin(ctx, userID)` queries `users.role` (column-as-truth; **previously checked the non-existent `is_admin` column** — fixed in this audit).
- Legacy `X-User-Id` / `X-Org-Id` header path still exists in [auth.go:Middleware](../../backend/exam-engine/internal/auth/auth.go) but is dormant; comment in source notes it was meant for a gateway in front of the engine.

### 3.4 Plugin host ([internal/pluginhost/](../../backend/exam-engine/internal/pluginhost))

**Plugins are metadata + Go-registered action handlers, not dynamically loaded code.**

- **Registry** (`registry.go`): loads every row from `plugins` table → `Manifest{id, slug, requires[], extends[], provides[], schema(jsonb)}`. Synthetic kernel slugs (`runtime.exam-session`) injected so `assessment.coding`'s `requires` resolves.
- **Dependency resolver** (`dependencies.go`): topological sort; missing required slugs surface as `DependencyError{Kind: "missing-require"}`; only slugs in `BlockingSlugs` fail boot.
- **Dispatcher** (`dispatcher.go`): `Dispatch(ctx, ActionRequest)` → looks up `action_id` in an in-memory handler map. Handlers are Go functions registered at boot from packages like `assessmentcoding.Register(reg)`.
- **Entitlements** (`entitlements.go`): cascade resolution (user purchase → org grant → platform default) for language plugins.

**Installed plugins** (`backend/exam-engine/plugins/`):

| Slug | Kind | Provides |
|---|---|---|
| `assessment.coding` | base / assessment | `assessment.type.coding`, `question.type.code`, `runtime.action.coding.{run-custom, run-tests, submit}` |
| `runner.judge0` | addon / runner | `code.runner` |
| `evaluation.testcase` | base / evaluation | testcase comparator |
| `evaluation.llm` | base / evaluation | `evaluation.llm` |
| `evaluator.anthropic` | addon | `llm.provider` (extends `evaluation.llm`) |
| `evaluator.openai` | addon | `llm.provider` |
| `language.*` (python, java, go, c, cpp, javascript, …) | addon / language | per-language Judge0 + Monaco mapping |

### 3.5 Schema highlights ([internal/migrate/sql/](../../backend/exam-engine/internal/migrate/sql))

| Migration | Adds |
|---|---|
| 001_init | organizations, plugins, plugin_entitlements, tags, exam_templates, questions, question_versions, options, test_cases, media_assets |
| 002_exams | exams, exam_versions, exam_sections, exam_questions, exam_assignments |
| 003_runtime | attempts, attempt_question_state, answers, code_runs, code_submissions, evaluations, evaluation_criterion_scores |
| 004_telemetry | **attempt_events** (partitioned monthly), attempt_event_summary, attempt_heartbeats, attempt_connectivity_gaps |
| 005_evaluation | rubrics, manual_review_assignments |
| 006_publication | result_publications |
| 007_billing | pricing_items, purchases |
| 008_seed_plugins | seeds built-in plugins |
| 009–014 | identity columns, coding runtime traceability, body-polish, indices |

### 3.6 Telemetry path

- Client batches up to 200 events per `POST /v1/attempts/{id}/events` (`events.go`). Each event has `kind`, `severity`, `plugin_id`, `occurred_at`, `payload(jsonb)`. Stored verbatim into the partitioned `attempt_events` table.
- Heartbeat `POST /v1/attempts/{id}/heartbeat` is **the time authority** — server recomputes `time_remaining_ms` from `attempts.deadline_at`, ignoring client clock.
- There is **no real-time reaction channel** (no WebSocket, no SSE). Events are append-only.

---

## 4. Frontend (Next.js)

### 4.1 Layout

- App Router. Candidate routes (`/`, `/explore`, `/assessment/*`, `/dashboard`, `/profile`) and admin routes (`/admin/*`) coexist under one root layout (`app/layout.tsx`) which wraps the tree in `SessionProvider → PaymentProvider → ThemeProvider`.
- Admin shell: `app/admin/layout.tsx` → `AdminPageProvider` → `AdminShell` (renders empty container for `/admin/login`, full sidebar+topbar+main elsewhere).
- `AdminGuard` requires both `localStorage.originbi:admin-session === "true"` AND a stored access/id token; on either missing → redirect to `/admin/login?next=…`.

### 4.2 Data access

- One central fetcher in `lib/api.ts` — `apiFetch<T>(path)` does:
  - proactive refresh if access token is past expiry,
  - injects `Authorization: Bearer <access-token>` (engine rejects id tokens),
  - injects `X-User-Context` (full JSON user) and `X-User-Id` (numeric id),
  - on 401, single-flight refresh + replay; final 401 ⇒ clear tokens + redirect to `/admin/login`.
- **No SWR / React Query.** Every page does its own `useEffect → fetch → useState`.
- Storage keys: `originbi:{id,access,refresh}-token`, `originbi:admin-session`, `user`. Legacy keys (`originbi_id_token`, `accessToken`, cookie `obi.accessToken`) maintained for back-compat.

### 4.3 Admin pages (real data vs mock)

| Surface | Source |
|---|---|
| Sidebar count chips (Question Banks · CODING · N; Assessments · N) | live `listAdminQuestions` + `listExamPackages` |
| Dashboard KPI cards Active Candidates / Live Sessions / Flagged Today | **mock** (sum of hardcoded arrays) |
| Dashboard "Question Banks" 5-tile module strip counts | **mock** (per-module Q counts hardcoded) |
| Dashboard Live Assessments table, Recent Activity, sparklines | **mock** |
| `/admin/coding` problem cards | live |
| `/admin/exam-packages` package cards | live |
| `/admin/plugins`, `/admin/plugins/languages` | live |
| `/admin/users` roster | **mock** (backend exposes only single-user entitlement lookup) |
| `/admin/users/[id]/entitlements` | live |
| `/admin/proctoring` candidate tiles | **mock** |
| `/admin/settings` toggles | **local-only**, no backend persistence |

### 4.4 Design tokens

`app/globals.css` declares the admin token block on `.admin-panel-root`. Authoritative reference is `docs/OriginBi-Technical Admin/assets/colors_and_type.css`. Currently aligned on colors/radii/typography; drift noted on:
- Token names (`--admin-r-2xl: 22px` vs design `--radius-3xl: 22px`).
- Spacing scale `--space-1…16` not adopted — pixel values are still hardcoded across components.
- `--radius-4xl: 24px` (design's "dashboard panel" radius) not represented.

### 4.5 Reusable UI ([components/admin/ui/](../../frontend/components/admin/ui))

`Card`, `Badge`, `StatusDot`, `SegmentedToggle`, `PillTabs`, `StatCard`, `EmptyState`, `ErrorState`, `Drawer`, `Modal`, `Avatar`, `BreadcrumbBar`, `ToggleSwitch`. Missing for the target design: 5+ option segmented control, accent-color picker, sparkline / progress bar, "Active Layers" component, candidate-view preview card, "always-on" status pill.

### 4.6 No frontend plugin folder yet

`frontend/plugins/` does not exist. There is no event bus, no extension slot registry, no dynamic-import surface. The admin sidebar nav array is hardcoded in `components/admin/AdminNav.tsx`.

---

## 5. assessment-service (NestJS)

### 5.1 Modules

- `AdminQuestionController` — `POST /api/assessment/admin/upload`, CRUD on `/admin/assessments` and `/admin/:module/questions`, bulk import.
- `AssessmentController` — attempt lifecycle for legacy modules: start, fetch, submit.
- Adaptive controllers and services (block-based aptitude flow per `SETUP_ADAPTIVE_ASSESSMENT.md`).
- `PurchaseController` — pricing/purchase recording.

### 5.2 Auth posture

- No `AuthGuard` registered globally in `main.ts`.
- CORS is the only gate — origins via `ALLOWED_ORIGINS`. Anyone whose origin is allowed can call admin endpoints.
- `@aws-sdk/client-cognito-identity-provider` is in `package.json` but **not wired**.

### 5.3 The `/admin/me` endpoint

Used by the frontend's `/admin/login` flow as the "is this Cognito user really an admin?" check. Implementation is in this service (not in the Go engine). Confirms the engine's admin verification path is split across two services.

---

## 6. tech-assessment-engine (Go, port 5001)

Single-purpose attempt grader for the legacy module categories (aptitude/grammar/MNC/role/coding). Reads from `tech_*_questions`, writes `*_attempts`. No auth. Replaced by exam-engine but still launched by `start-all.ps1`. **Should be deprecated and removed once admin-facing screens have migrated to exam-engine endpoints.**

---

## 7. Judge0

Standard docker-compose (judge0 + Postgres + Redis). `JUDGE0_ALLOW_UNSAFE_EXECUTION=true` (dev). Talks only to the exam-engine through the `runner.judge0` plugin path. Direct browser→Judge0 is a documented fallback only.

---

## 8. Repository quality assessment

### What's good

- **Clear concern separation in the engine.** `auth/`, `pluginhost/`, `migrate/`, `server/`, `runnerjudge0/` are each well-scoped Go packages.
- **Append-only, partitioned telemetry.** `attempt_events` is partitioned monthly with auto-maintenance — production-shaped.
- **Cognito + JWKS caching with fail-fast init.** Real auth, not bearer-string-comparison.
- **Migrations are owned by the engine** and managed by goose. Single source of schema truth.
- **The admin frontend is now in good visual shape** after the recent rebuild and matches the design's pattern (sidebar groups, breadcrumb topbar, KPI strip, module tiles).
- **Plugin manifest model is sound:** `requires`/`extends`/`provides` with topological resolution is the right shape to extend into a real plugin system.

### What's tech debt

| Area | Issue | Severity |
|---|---|---|
| Schema drift | The historic `is_admin` column was scanned by `isAdmin()` and `login()` even though the active schema uses `users.role`. `isAdmin()` was fixed in this audit; `login()` still scans both — leave for now, but flag. | High |
| Auth posture inconsistency | `auth.Middleware` (X-User-Id trust) is dormant code coexisting with `sessionMiddleware` (real JWT). Easy to confuse which gate is live. | Med |
| Two parallel grading engines | `tech-assessment-engine` and `assessment-service` both grade attempts that the engine could grade. Frontend has to choose between them per surface. | Med |
| Unauthenticated NestJS | `assessment-service` exposes admin endpoints with no auth guard. `/admin/me` is the only access check. | High (security) |
| Mock data in production code | Several admin pages render hardcoded arrays alongside real fetches. A backend API outage looks like a green dashboard. | Med |
| No frontend tests | Zero Jest/Vitest/Playwright. The only safety net is `tsc --noEmit`. | Med |
| `backend/shared` unused | Exports a placeholder constant only. Should either be deleted or filled with real shared types. | Low |
| Token key churn | `originbi:id-token` vs `originbi_id_token` vs cookie `obi.accessToken` vs `accessToken` — multiple keys, kept for compat. | Low |
| Plugin code is in-process only | Plugins are Go packages compiled into the engine binary. The architecture says "plugin", but the lifecycle is "registered Go function". Real plugin isolation (lifecycle, sandboxing, hot reload) does not exist. | Med (intentional; covered in `PLUGIN_ARCHITECTURE.md`) |

### Production gaps

- **No real-time engine→client channel.** Telemetry flows in only; for proctoring rules to react (lock-screen on devtools open, terminate on policy violation) we need either WebSocket, SSE, or HTTP long-poll. None exists today.
- **No audit-of-decisions store.** `attempt_events` records what the client saw; there is no separate record of what the engine *decided* to do about it (flag, warn, auto-terminate).
- **No background workers.** Evaluation, score computation, partition janitor all run inline on the request path or as goroutines inside the engine. A real deployment would split these.
- **Frontend bundles Monaco fully.** No dynamic import; admin and candidate share the same bundle.
- **Single-tenant Postgres.** All services point at one DB. No row-level org isolation visible.

---

## 9. References

- Reference design source: [`docs/OriginBi-Technical Admin/`](../OriginBi-Technical%20Admin/) (HTML/JSX prototypes and `colors_and_type.css`)
- Design handoff bundle (downloaded): unpacked at `<runtime>/tool-results/design/originbi-technical-admin/` — same prototype tree as above.
- Engine plugin contract: [`backend/exam-engine/docs/plugin-architecture/`](../../backend/exam-engine/docs/plugin-architecture)
- Deployment: [`deployment.md`](../../deployment.md)
- Design rules: [`DESIGN_GUIDELINES.md`](../../DESIGN_GUIDELINES.md)
