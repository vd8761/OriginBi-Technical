# Project STATUS — Running Tracker

> Per the user's explicit requirement: "Everytime you complete something, you MUST record what you done and what is planned next and what need to be implemented next."
>
> This file is the single source of truth for "where are we right now?". Update on every completed unit of work. Newest entry at the top.

Tag legend: ✅ done · 🟡 in flight · ⏭ next up · ⏳ later · 🔴 blocked

---

## Snapshot - 2026-05-15 (Backlog cleanup - controller route + typed-any debt)

### Just completed
- **AdaptiveBlockController route fix** (`backend/assessment-service/src/modules/assessment/controllers/adaptive-block.controller.ts`):
  - `@Controller('api/assessment/adaptive')` → `@Controller('assessment/adaptive')`. The global prefix is already `api`, so the previous declaration produced `/api/api/assessment/adaptive/...`. The documented URLs in `test-adaptive-system.js` and `SETUP_ADAPTIVE_ASSESSMENT.md` (both call `/api/assessment/adaptive/...`) had been silently 404ing since the controller was written.
  - Verified after `npx nest build`: old `/api/api/assessment/adaptive/paths/1` → 404, new `/api/assessment/adaptive/paths/1` → 401 (route alive, auth guard correctly enforcing).
- **`lib/api.ts` typed-any debt cleared**:
  - `safeJson` now returns `ErrorEnvelope & Record<string, unknown>` instead of `any`. Added a small `ErrorEnvelope` interface for `{ message, error, __raw }` and a helper `errorMessageFrom()` that handles string / string[] / fallback cases.
  - `registerUser` no longer captures an unused `res` — it `await`s the call with a `{ success?: boolean }` shape since the body isn't read.
  - `loginUser` now decodes against an explicit `LoginResponseBody` interface (`accessToken`, `idToken`, `refreshToken`, `user`, `registration`) instead of `any`. Tokens only set when both `accessToken` and `idToken` are present, matching the prior runtime behaviour exactly.

### Verification
- `npx eslint lib/api.ts` - clean (was: 3 errors + 1 warning).
- `npx tsc --noEmit` - green in frontend.
- `npm test` - 3 files / 14 tests still pass (~3.4s).
- `go test ./...` - green across `backend/exam-engine`.
- `npx nest build` - clean in `backend/assessment-service`.
- Live HTTP smoke: old `/api/api/...` → 404, new `/api/assessment/adaptive/paths/1` → 401, `/v1/admin/dashboard-summary` on the engine → 401 (Phase G route still serving correctly after the parallel Phase I + Phase J work).

### In flight
- None.

### Next up
- Backlog has thinned out. Remaining items: re-enable browser smoke tests against `/admin/users` and `/admin` after a fresh admin login; extend Vitest coverage to `useCommandStream` / `discovery.ts` once an SSE shim lands.
- **Phase H** still deferred per the user's direction; `backend/tech-assessment-engine` remains stranded but in place.

### Later
- Consolidate the Phase G dashboard query batch into a single round-trip if it ever becomes hot.
- Audit the candidate engines' direct `fetch()` calls — they bypass `apiFetch`, so they don't get the 401 retry/refresh path.

### Blocked
- **Phase A6** - still needs real design reference assets.

---

## Snapshot - 2026-05-15 (Phase J - Vitest + plugin smoke tests)

### Just completed
- **J1 - Vitest scaffolding** (`frontend/`):
  - Added dev deps: `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`.
  - `vitest.config.ts` - jsdom env, globals enabled, `@` alias resolved to the frontend root so `@/lib/api` works inside tests.
  - `vitest.setup.ts` - registers `@testing-library/jest-dom/vitest` matchers.
  - `package.json` scripts: `npm test` (CI: `vitest run`) + `npm run test:watch`.
- **J2 - Smoke tests**:
  - `plugins/eventBus.test.ts` - fan-out across subscribers, error isolation, unsubscribe disposer, tap fan-out, tap error isolation. 5 tests.
  - `plugins/registry.test.ts` - registry is non-empty, every manifest has a stable id, no duplicate ids, every surface targets a known `SurfaceMount`, the seven first-party proctoring plugins are present. 5 tests.
  - `plugins/PluginProvider.test.tsx` - integration test that mocks the registry with a fixture and `@/lib/api`, then asserts: provider renders all contributed surfaces, the enabled filter scopes to a subset, fallback renders for an empty mount, runtime hook fires once per enabled plugin. 4 tests.

### Verification
- `npm test` - 3 files, 14 tests, all green (~3.3s).
- `npx tsc --noEmit` - green.
- `npx eslint plugins/{eventBus,registry,PluginProvider}.test.{ts,tsx} vitest.config.ts vitest.setup.ts` - 0 errors, 0 warnings.
- Pre-existing `lib/api.ts` lint debt unchanged (outside Phase J files).

### In flight
- None.

### Next up
1. Backlog cleanup pass: clear the `lib/api.ts` `@typescript-eslint/no-explicit-any` debt and the `AdaptiveBlockController` double-prefix bug (`api/api/assessment/adaptive`).
2. **Phase H** still skipped per the latest user direction - `backend/tech-assessment-engine` remains stranded but in place. Revisit when candidate engines migrate off `assessment-service`.
3. Operator follow-ups: enable `ASSESSMENT_AUTH=on` in shared dev once the candidate UI starts attaching Cognito access tokens to assessment requests.

### Later
- Extend the Vitest suite to cover `useCommandStream` and `discovery.ts` once an SSE shim is in place.

### Blocked
- **Phase A6** - still needs real design reference assets.

---

## Snapshot - 2026-05-15 (Phase I - assessment-service Cognito auth guard)

### Just completed
- **I1 - Auth scaffolding** (`backend/assessment-service/src/auth/`):
  - `public.decorator.ts` — `@Public()` (`IS_PUBLIC_KEY` metadata) to opt routes out of JWT verification at the controller or handler level.
  - `cognito-auth.guard.ts` — `CognitoAuthGuard` implements `CanActivate`. Builds a `CognitoJwtVerifier` (`aws-jwt-verify`, already a dep) over `COGNITO_USER_POOL_ID` / `COGNITO_APP_CLIENT_ID`, `tokenUse: 'access'`. Extracts the bearer token from `Authorization`, calls `verifier.verify`, attaches the decoded payload to `req.user`, and throws `UnauthorizedException` on missing/invalid tokens.
  - **Feature-flagged** by `ASSESSMENT_AUTH` env (`on` / `true` / `1` → enforce; anything else → passthrough). Bootstrap logs the active mode on startup; if `ASSESSMENT_AUTH=on` but the Cognito vars are missing, the service refuses to start with a clear error.
  - `auth.module.ts` — registers the guard as a global `APP_GUARD`.
- **I2 - AppModule wiring**:
  - `AppModule` now imports `AuthModule` (guard) and declares a new `HealthController`.
  - New `health/health.controller.ts` (`GET /api/health`) is marked `@Public()` so the operator probe always works regardless of auth mode.
- **I3 - Env documentation**: `backend/assessment-service/.env.local` gained a commented `ASSESSMENT_AUTH=on` + `COGNITO_USER_POOL_ID` / `COGNITO_APP_CLIENT_ID` block, mirroring the Cognito values already used by the frontend.

### Verification
- `npx nest build` clean in `backend/assessment-service`; `dist/auth/` and `dist/health/` produced.
- Runtime (passthrough mode, default):
  - `GET /api/health` → 200 (Public route).
  - `GET /api/assessment/attempts-stats` → 200 (guard short-circuits because `ASSESSMENT_AUTH` is unset).
- Hot-reloader picked up the new modules; no manual restart needed.
- Strict-mode smoke is left to the operator: set `ASSESSMENT_AUTH=on` + the two Cognito vars in `.env.local`, restart `npm run start:dev`, then expect 401 on assessment routes without an `Authorization: Bearer <cognito access token>` header.

### In flight
- None.

### Next up
1. **Phase J - Vitest setup + smoke tests for plugin loading** (`frontend/`) so future plugin manifests have a regression net.
2. **Phase H decision pending**: still skipped per the latest user direction. `backend/tech-assessment-engine` remains stranded but in place; revisit when the candidate-side engines move off `assessment-service`.
3. Flip `ASSESSMENT_AUTH=on` in shared dev environments after the candidate UI starts sending Cognito access tokens on every assessment request (currently it sends none).

### Later
- Backlog cleanup: `lib/api.ts` `no-explicit-any` debt; the `AdaptiveBlockController` double-prefix bug (declares `api/assessment/adaptive` while global prefix is `api`, producing `/api/api/...`).

### Blocked
- **Phase A6** - still needs real design reference assets.

---

## Snapshot - 2026-05-15 (Phase G - Dashboard real-data pass)

### Just completed
- **G1 - Backend `GET /v1/admin/dashboard-summary`** (`backend/exam-engine/internal/server/admin_dashboard.go`, route in `server.go:158`):
  - Single round-trip aggregate. Returns `{ kpis, liveAssessments, recentActivity, series }`.
  - **kpis**: `activeCandidates` (distinct candidates with attempts in last 24h), `activeCandidatesOnline` (in-progress + last_seen_at < 5m), `questionBankTotal` (`questions` minus archived/deleted), `questionBankPluginCount` (plugins where `category='assessment'`), `liveSessions` / `liveSessionsMonitored`, `flaggedToday` (today's `plugin_decisions`), `flaggedAwaitingReview` (`attempts.status='under_review'`).
  - **liveAssessments**: latest 8 `exam_versions` joined with their parent `exams`. Each row carries `examVersionId`, derived `module` from `exams.audience`, UI `status` (live / scheduled / draft), `total`/`completed` attempt counts, `durationMinutes`, and `updatedAt`.
  - **recentActivity**: latest 8 `plugin_decisions` joined to `plugins.name`, `attempts.candidate_user_id`, and the exam title. Each item exposes `actor`, `action`, formatted `target` (exam title · OB-#####), tone derived from the decision verb, and `createdAt`.
  - **series**: `submissionsPerDay` (7-day count of `attempts.submitted_at`), `proctorIncidentsPerDay` (7-day count of `plugin_decisions`), plus weekly totals and an `avgPassRateWeek` computed over evaluated attempts whose exam version sets `pass_score`. Uses `generate_series` so empty days still appear.
  - Admin-gated via `requireAdmin`.
- **G2 - Frontend client + dashboard rewrite**:
  - `frontend/lib/api.ts::getAdminDashboardSummary()` + `AdminDashboardSummary` / `AdminDashboardKPIs` / `AdminDashboardLiveAssessment` / `AdminDashboardActivityItem` / `AdminDashboardSeries` types.
  - `frontend/app/admin/page.tsx` now drives **all** KPI strip values, Live Assessments table, Recent Activity feed, and the three sparkline cards (Submissions / Pass rate / Proctor incidents) from the live endpoint. Removed the `liveAssessments`, `recentActivity` mock arrays and the staged `listAdminQuestions / listPlugins / listExamPackages` triple-fetch.
  - Refresh button on the Recent Activity card now re-pulls the whole summary via a `refreshNonce` dependency.
  - Loading / empty / error states added inline; relative time formatter shared across the live tables.

### Verification
- `go build ./...`, `go vet ./...`, `go test ./...` all green in `backend/exam-engine`.
- `npx tsc --noEmit` green in `frontend`.
- `npx eslint app/admin/page.tsx` clean (zero errors, zero warnings).
- Engine route smoke: still returns 404 because the **running engine binary needs a second restart to pick up the new `/v1/admin/dashboard-summary` route** (the previous restart only included the Phase F users endpoint). The frontend gracefully degrades to an `admin-error` banner if the route is missing, so no client-side crash.
- Browser smoke against `/admin` redirected to `/admin/login?next=/admin` (session expired in the preview); zero console errors during the dev-server compile of the rewritten page.

### In flight
- None.

### Next up
1. Restart the engine (`go run ./cmd/server`) so the new dashboard-summary route is served, then re-load `/admin` after login to smoke the live KPIs + sparklines end-to-end.
2. **Phase H - Delete `tech-assessment-engine`** after every consumer is on exam-engine endpoints (audit `frontend/lib/api.ts` and the assessment-service for residual `TECH_API_BASE` usage first).
3. **Phase I - Auth guard module on NestJS `assessment-service`** (currently unprotected per the original audit).
4. **Phase J - Vitest setup + smoke tests for plugin loading**.

### Later
- Same as before — Phases H-J as enumerated, plus follow-on backlog cleanup (e.g. clear the pre-existing `lib/api.ts` `no-explicit-any` debt).

### Blocked
- **Phase A6** - still needs real design reference assets.

---

## Snapshot - 2026-05-15 (Phase F - Real admin users roster)

### Just completed
- **F1 - Backend `GET /v1/admin/users`** (`backend/exam-engine/internal/server/admin_users.go`, route in `server.go:158`):
  - Returns `{ users, total, limit, offset, counts }`. `counts` is unfiltered (Total / Students / Admins / Proctors / Blocked) so the StatCards stay stable while the table is filtered.
  - Query params: `q` (ILIKE on email + registrations.full_name), `role` (`admin` / `proctor` / `student`), `status` (`active` / `blocked` / `pending`), `limit` (default 50, max 200), `offset`.
  - Per row: `id`, `email`, `fullName`, raw `role`, derived `roleGroup` (Admin / Proctor / Student), `status` (derived from `is_blocked` / `is_active`), `institutionName`, `assessments` (subquery `COUNT(*)` from `attempts.candidate_user_id`), `lastSeenAt` (RFC3339), `createdAt`.
  - Targets the Cognito-era `users` schema (`role`, `is_active`, `is_blocked`, `last_login_at`, `created_at`) and LEFT JOINs `registrations` for `full_name` / `institution_name`. Args are parameterised so search terms can't inject.
  - Admin-gated via `requireAdmin`.
- **F2 - Frontend client + page rewrite**:
  - `frontend/lib/api.ts::listAdminUsers()` + `AdminUserRow` / `AdminUserCounts` / `AdminUsersResponse` types.
  - `frontend/app/admin/users/page.tsx` now drives the roster, StatCards, and PillTabs from the live endpoint with a 250ms debounced search box, role filter, loading / empty / error states, OB-ID derived from `id.padStart(5, '0')`, and a relative "last seen" formatter. Drawer pulls institution / assessments / joined / last-seen from the row instead of the deleted `sampleUsers` mock.

### Verification
- `go build ./...` and `go vet ./...` clean in `backend/exam-engine`.
- `go test ./...` green in `backend/exam-engine` (server, migrate, pluginhost, assessment-coding, evaluation-llm, evaluation-testcase, proctoring-tab-switch).
- `npx eslint app/admin/users/page.tsx` green; only pre-existing `no-explicit-any` debt in `lib/api.ts` remains (outside the Phase F additions).
- `npx tsc --noEmit` green in `frontend`.
- Browser smoke against `http://localhost:3000/admin/users` redirected to `/admin/login?next=/admin/users` (session expired in the preview, not a regression). Engine binary at PID 48536 is still serving the pre-F build and returns 404 for `/v1/admin/users` — **needs an engine restart (`go run ./cmd/server`) to pick up the new route**.

### In flight
- None.

### Next up
1. **Phase G - Dashboard real-data pass** - replace `app/admin/page.tsx` mock arrays (Active Candidates / Live Sessions / Recent Activity / Live Assessments) with real aggregate endpoints.
2. Restart the running exam-engine binary so the new `/v1/admin/users` route is served, then re-run the `/admin/users` page in the browser as a live smoke (login required).
3. Re-run full frontend lint after the existing app-wide lint backlog is cleared (api.ts `no-explicit-any` debt unblocks F too).

### Later
- Phases H-J as previously enumerated.

### Blocked
- **Phase A6** - still needs real design reference assets.

---

## Snapshot - 2026-05-15 (Phase E - Settings proctoring plugins)

### Just completed
- **E1 - Admin config persistence**:
  - Added `PUT /v1/admin/plugins/{plugin_id}/config`.
  - The endpoint accepts plugin UUIDs or slugs, upserts `platform_plugin_entitlements.config`, preserves/sets platform state, reloads the plugin registry, and returns the refreshed plugin DTO.
  - Added `frontend/lib/api.ts::updatePluginConfig()` for plugin settings UIs.
- **E2 - First-party Settings card plugins**:
  - Added migration `017_proctoring_settings_plugins.sql` for Camera & Vision, Microphone & Audio, Screen & Browser, AI Monitoring, Identity Verification, and Network & Location.
  - Added matching frontend plugin manifests under `frontend/plugins/proctoring-*/`.
  - Added shared `ProctorCard`, `ProctorRow`, `Pills`, `IntervalSlider`, and `usePersistedPluginConfig` helpers.
  - Updated `proctoring.tab-switch` settings to persist through the same helper.
- **E3 - Thin Settings page**:
  - `app/admin/settings/page.tsx` now renders `<MountPoint id="settings.proctoring" />` instead of hardcoded proctoring cards.
  - `AdminShell` now fetches `/v1/admin/plugins?context=admin` and passes resolved platform configs into `PluginProvider`.
  - Admin discovery merges plugin schema defaults with persisted platform config.
- **Verification**:
  - `go test ./...` green in `backend/exam-engine`.
  - `npx tsc --noEmit` green in `frontend`.
  - `npx eslint app/admin/settings/page.tsx components/admin/AdminShell.tsx plugins` green except the pre-existing `@next/next/no-img-element` warning in `AdminShell`.
  - `GET http://localhost:3000/admin/settings` returned 200 from the running Next dev server.
  - `npx eslint lib/api.ts` still fails on older auth-helper lint debt (`no-explicit-any` / unused `res`) outside the Phase E helper.

### In flight
- None.

### Next up
1. **Phase F - Backend `listAdminUsers` + real Users page** - add `GET /v1/admin/users` and replace the mock roster in `app/admin/users/page.tsx`.
2. **Phase G - Dashboard real-data pass** - replace dashboard mock arrays with live aggregate endpoints.
3. Re-run full frontend lint after the existing app-wide lint backlog is cleared.

### Later
- Phases H-J as previously enumerated.

### Blocked
- **Phase A6** - still needs real design reference assets.

---

## Snapshot - 2026-05-15 (Phase D - proctoring tab-switch lighthouse)

### Just completed
- **D1 - Backend plugin** (`backend/exam-engine/plugins/proctoring-tab-switch/`):
  - Added first-party Go subscriber for `proctoring.tab.switched`.
  - Maintains per-attempt counts, emits `attempt.warning-toast` before the threshold, records an `auto_terminate` row in `plugin_decisions` at 3 switches, and emits `attempt.terminate` over the command hub.
  - Registered from `server.AttachPluginRegistry`.
  - Added `plugin.json` and migration `016_proctoring_tab_switch_plugin.sql`, upgrading the legacy `proct.tab_switch` seed row to `proctoring.tab-switch` with defaults, event metadata, constraints, and UI surfaces.
- **D2 - Frontend plugin** (`frontend/plugins/proctoring-tab-switch/manifest.tsx`):
  - Added `visibilitychange` runtime publishing `proctoring.tab.switched` / `proctoring.tab.refocused`.
  - Added Settings card on `settings.proctoring`.
  - Added candidate warning toast on `attempt.warning-toast`.
- **Candidate runtime wiring**:
  - `/assessment/coding` now fetches `GET /v1/me/plugin-config?attempt_id=...`, wraps the attempt in `PluginProvider`, and passes the active attempt id.
  - `CodingAssessment` renders `attempt.background`, `attempt.toolbar`, and `attempt.warning-toast` mount points.
  - `CodingAssessment` subscribes to `attempt.terminate`, pauses the timer, shows the lock warning, and starts the existing resilient submit flow.
  - `useCommandStream` now uses authenticated `fetch()` streaming against `/v1/attempts/{id}/commands` instead of the missing `/api/proxy` EventSource path.
  - `PluginProvider` mirrors frontend plugin events through `sendAttemptEvents` and uses an event-bus tap instead of mutating the bus.
- **Verification**:
  - `go test ./...` green in `backend/exam-engine`.
  - `npx tsc --noEmit` green in `frontend`.
  - `npx eslint plugins app/assessment/coding/page.tsx components/assessment/coding/CodingAssessment.tsx` green.

### In flight
- None.

### Next up
1. **Phase E - Migrate existing Settings proctoring cards into plugins** - move Camera & Vision, Microphone & Audio, Screen & Browser, AI Monitoring, Identity Verification, and Network & Location into first-party `settings.proctoring` plugins.
2. Add the admin config persistence endpoint from Phase E: `PUT /v1/admin/plugins/{id}/config`.
3. Re-run full frontend lint only after the existing app-wide lint backlog is addressed; current full `npm run lint` still fails outside the Phase D files.

### Later
- Phases F-J as previously enumerated.

### Blocked
- **Phase A6** - still needs real design reference assets.

---

## Snapshot — 2026-05-15 (Phase C — frontend plugins folder)

### Just completed
- **C1 — Plugin scaffold** (`frontend/plugins/`):
  - `types.ts` — `SurfaceMount` union (sidebar nav · topbar · dashboard · settings · attempt mounts), `PluginCtx`, `FrontendPlugin`, `PluginSurface`, `MountSlot`, `PluginRuntime`, `EnabledPluginConfig`.
  - `eventBus.ts` — `createEventBus()` mirroring the Go bus (per-kind subscribe, sync fan-out, error-isolated).
  - `PluginProvider.tsx` — React provider that resolves enabled plugins, boots each `runtime`, exposes the runtime via context, and mirrors published events onto `POST /v1/attempts/{id}/events` when an `attemptId` is set (debounced 750 ms).
  - `MountPoint.tsx` — collects every `Surface` whose `mount` matches the rendered id and renders each component with a composed `PluginCtx`.
  - `registry.ts` + `index.ts` — static registry barrel; new plugins land by importing their manifest here.
- **C2 — Kernel mount points** wired:
  - `components/admin/AdminNav.tsx` → `<MountPoint id="sidebar.nav.workspace" />` and `id="sidebar.nav.system"` at the tail of each nav section.
  - `components/admin/AdminTopbar.tsx` → `<MountPoint id="topbar.actions" />` between page-meta actions and the bell button.
  - `components/admin/AdminShell.tsx` → wraps the admin layout in `<PluginProvider enabled={null}>` (defaults to all-on until per-context resolution lands).
  - `app/admin/page.tsx` → `<MountPoint id="dashboard.kpi" />` at the end of the KPI strip and `id="dashboard.tiles"` at the bottom of the module card.
  - `app/admin/settings/page.tsx` → `<MountPoint id="settings.proctoring" />` after the kernel proctor cards (Phase E moves the kernel cards behind this mount).
- **C3 — Frontend event bus** lives in `PluginProvider`. Plugins publish/subscribe via `ctx.publish/ctx.subscribe`; an `attemptId`-bound mirror flushes batches to the backend on a 750 ms debounce.
- **C4 — SSE consumer** (`plugins/useCommandStream.ts`):
  - Opens `/api/proxy/v1/attempts/{id}/commands` while an attempt is active.
  - Each SSE `event:<kind>` is republished onto the frontend bus under the same kind, so plugins subscribe without caring whether the event came from local DOM or the engine.
  - Browser-managed reconnect; transport errors logged, not fatal.
- **C5 — Discovery** (`plugins/discovery.ts`):
  - `fetchCandidatePluginConfig(attemptId?)` calls `/v1/me/plugin-config` and returns `EnabledPluginConfig[]`.
  - `fetchAdminPluginConfig()` reuses `/v1/admin/plugins?context=admin`.
  - Both degrade to `[]` on failure so the runtime stays usable without a backend.
- **C6 — Verification — example-noop plugin** (`frontend/plugins/example-noop/manifest.tsx`):
  - Renders a `data-testid="noop-mount"` pill on `topbar.actions`.
  - Verified in the preview: `/admin` shows the "hello" pill in the topbar. DOM query returns the element. `tsc --noEmit` is green.

### In flight (🟡)
- None.

### Next up (⏭)
1. **Phase D — First real proctoring plugin (lighthouse)** — `proctoring-tab-switch` end-to-end: backend subscriber that counts `proctoring.tab.switched`, decides terminate after 3, writes a `plugin_decisions` row, emits `attempt.terminate` over SSE. Frontend manifest with a `visibilitychange` runtime + WarningToast on `attempt.warning-toast`.
2. **Phase E — Migrate existing Settings proctoring cards into plugins** (each card becomes a `settings.proctoring` mount). Includes new admin endpoint `PUT /v1/admin/plugins/{id}/config`.

### Later (⏳)
- Phases F – J as previously enumerated.

### Blocked (🔴)
- **Phase A6** — still needs real design reference assets.

---

## Snapshot — 2026-05-15 (Phase B — backend plugin host)

### Just completed
- **B1 — Event bus** (`internal/pluginhost/eventbus.go`):
  - `EventBus.Subscribe(kind, sub)` / `Publish(ctx, evt)` with synchronous fan-out and "one bad subscriber doesn't poison the rest" semantics.
  - `(*Registry).Events()` lazy-initialises a process-wide bus.
  - `POST /v1/attempts/{id}/events` now persists telemetry first (durable record) then republishes accepted events onto the bus. Subscriber errors logged at warn, never returned to the client.
  - Kernel-originated lifecycle events (`attempt.started`, `attempt.resumed`, `attempt.submitted`) are published after commit by `publishLifecycleEvent` in `server/events.go`.
- **B2 — Engine→client SSE command channel** (`internal/pluginhost/commands.go`, `server/events.go`):
  - `CommandHub.Send(attemptID, cmd)` is non-blocking; buffers up to 64 commands per attempt while no listener is connected.
  - `GET /v1/attempts/{id}/commands` serves `text/event-stream` with per-event `event:` lines and a 20-second keep-alive heartbeat. Ownership-checked the same way as `/events` ingest.
- **B3 — Decision audit** (`internal/migrate/sql/015_plugin_decisions.sql`):
  - New `plugin_decisions` table (FK to `attempts` ON DELETE CASCADE and to `plugins`; indexes on attempt_id, plugin_id, decision).
  - `(*Registry).RecordDecision(ctx, in)` writes a row and returns the new id.
- **B4 — Extended manifest fields** (`internal/pluginhost/manifest.go`):
  - New `ManifestExtensions` view exposing `emits`, `subscribes`, `client_constraints`, `admin_ui`, `candidate_ui` decoded out of the existing `plugins.schema` JSONB column. Backwards compatible — old manifests decode to a zero-value view, no migration needed.
- **B5 — Per-attempt plugin config endpoint** (`server/plugin_config.go`):
  - `GET /v1/me/plugin-config[?attempt_id=…]` returns the resolved plugin set, declared constraints, and admin/candidate surface manifests. Org/package overrides are stubbed with a TODO; default schema values are surfaced via the manifest's `defaults` key.
- **B6 — Verification** (`internal/pluginhost/eventbus_test.go`):
  - Four tests cover bus fan-out, error isolation, command buffering, and live command delivery.
  - `go test ./...` is green across `migrate`, `pluginhost`, `server`, `assessment-coding`, `evaluation-llm`, `evaluation-testcase`. `go build ./...` and `go vet ./...` are clean.

### In flight (🟡)
- None.

### Next up (⏭)
1. **Phase C — Frontend `plugins/` folder + mount-point registry** — `frontend/plugins/`, `PluginProvider`, `useMount`, kernel mount-point sites, frontend event bus + SSE consumer, dummy plugin verification.
2. **Phase D — First real proctoring plugin (lighthouse)** — `proctoring-tab-switch` end-to-end (backend subscriber + frontend runtime).

### Later (⏳)
- Phase E – J as previously enumerated.

### Blocked (🔴)
- **Phase A6** — still needs real design reference assets.

---

## Snapshot — 2026-05-15 (Phase A5)

### Just completed
- **A5 — Dashboard rhythm pass** (`frontend/app/admin/page.tsx`, `frontend/app/globals.css`):
  - **5-tile module preview** now matches the Question Banks landing design — full titles ("Aptitude Assessment", "MNC Career Prep", "Communication Skills", "Role-Based Technical", "Coding Challenges"), accent icon backgrounds via per-tile `--admin-acc` / `--admin-acc-bg` CSS variables, total-Qs count in monospace at the top-right, description copy, and category chips at the bottom of each tile. "View all" CTA now points to `/admin/question-banks` (was `/admin/coding`).
  - **Sparkline cards** got a typography polish: bar charts now show a 7-day weekday axis (MON–SUN) in mono caps below each chart, KPI numerals trimmed to 26px so the chart breathes.
  - 4-up KPI strip and Live Assessments / Recent Activity panels were already on-spec from the earlier admin pass (delta pills, status pills with dots, "X / Y" progress bar text, leading dot per activity row); validated visually with no changes needed.
- New CSS scoped under `.admin-panel-root`: `.admin-dashboard-modules` (5/3/2 responsive grid), `.admin-dashboard-module-tile`, `.admin-dashboard-module-chips`, `.admin-spark-card` (with `.admin-spark-foot` weekday axis row).
- `tsc --noEmit` green; full-page screenshots captured in the preview.

### In flight (🟡)
- None.

### Next up (⏭)
1. **Phase A6 — Eyeball verification pass** — open `/admin/*` next to the design reference at the same viewport. **Still blocked on a real `public/design-reference.html` from the user.** Until that lands, A6 cannot sign off; recommend asking the user to drop reference screenshots before we pick this up.
2. **Phase B — Backend plugin host extensions** (event bus + SSE command channel + plugin_decisions table). 3 days est.
3. **Phase C — Frontend `plugins/` folder + mount-point registry**.

### Later (⏳)
- Phases D – J as previously enumerated.

### Blocked (🔴)
- **Phase A6** — needs real design reference assets (current `public/design-reference.html` is a placeholder SVG thumbnail).

---

## Snapshot — 2026-05-15 (Phase A4)

### Just completed
- **A4 — Exam Settings · other tabs** (`frontend/app/admin/settings/page.tsx`, `frontend/app/globals.css`):
  - **General Exam tab**: Session Defaults card (Default duration with Minutes/Hours select, Default # of questions, Allowed attempts, Time-per-question optional row with inline toggle) + Behaviour card with the design's 7 toggles (Shuffle questions, Shuffle answer options, Allow review, Show timer, Show progress indicator, Auto-submit on timeout, Adaptive difficulty) + Branding & Customization card (Exam title prefix, 5 accent color swatches, Welcome message textarea). Verified visually in the preview.
  - **Scoring & Pass tab**: New `admin-marks-table` (Easy / Medium / Hard rows × Marks + Negative inputs, monospaced + centered) with a per-difficulty colored dot. "Enable negative marking" toggle below disables the Negative column when off. Pass criteria card with threshold input + three toggles (Show score to candidate, Issue certificate, Share with employer pool). Verified visually.
  - **Notifications tab**: New `admin-notifications-table` rendering events × channels (Email / Slack / Webhook), per-cell `ToggleSwitch` wired to local state. Each row carries an event name + one-line hint. Channel-routing header card with "3 channels live" badge. Verified visually.
  - **Integrations tab**: 6-tile grid (Judge0 / MOSS / AWS Cognito / Cloudflare / Slack / Webhook) with accent-tinted icons, status pill (Connected / Available), short description, meta line, and primary CTA (Configure when connected, Connect when available). Connected tiles also expose a help-icon ghost button next to the CTA. Verified visually.
- All new admin CSS scoped under `.admin-panel-root`: `.admin-settings-stack`, `.admin-accent-swatches/.admin-accent-swatch`, `.admin-marks-table` (head/row/input/difficulty), `.admin-notifications-table` (row/head/event-name/event-hint), `.admin-integration-tile`.
- `tsc --noEmit` green.

### In flight (🟡)
- None.

### Next up (⏭)
1. **Phase A5 — Dashboard rhythm** (4-up KPI strip with delta pills, 5-tile module preview parity, Live Assessments table styling, Recent Activity dot rhythm, sparkline bar polish).
2. **Phase A6 — Verification eyeball pass** vs the design — note: `public/design-reference.html` is still a placeholder SVG, so A6 cannot sign off until real reference shots arrive from the user.

### Later (⏳)
- Phase B – J as previously enumerated.

### Blocked (🔴)
- *(none)*

---

## Snapshot — 2026-05-15 (Phase A1–A3)

### Just completed
- **A1 — Token + utility pass** (`frontend/app/globals.css`):
  - Added `--admin-r-3xl: 22px` and `--admin-r-4xl: 24px` to the admin token block.
  - Added a `--space-0…--space-16` 4-px spacing scale to `.admin-panel-root`.
  - Added `.split-1-aside`, `.split-2-1`, `.split-50` grid utilities and `.sticky-rail` scoped under `.admin-panel-root` (collapse to a single column under 960px).
- **A2 — Question Banks landing** (`frontend/app/admin/question-banks/page.tsx`, new route):
  - 3-column responsive `.admin-qb-grid` (collapses to 2/1 col).
  - 5 module tiles: Aptitude Assessment, MNC Career Prep, Communication Skills, Role-Based Technical, Coding Challenges (with NEW MODULE badge).
  - Per tile: 48×48 accent icon, title + description, TRIAL/MAIN stat block, category chips, Settings + Manage Questions buttons (Manage Questions uses each tile's accent color via `var(--admin-acc)` / `var(--admin-acc-bg)`).
  - Bulk-import bottom card with Bulk Import / View Schema / CSV Template buttons.
  - `AdminNav` "Question Banks" entry repointed from `/admin/coding` → `/admin/question-banks`. `/admin/coding` is now the deep route reached via the Coding tile's "Manage Questions" button.
- **A3 — Exam Settings → Proctoring tab** (`frontend/app/admin/settings/page.tsx`):
  - Replaced the vertical toggle list with the design's card structure using new `ProctorCard`, `ProctorRow`, `Pills<T>`, and `IntervalSlider` components.
  - Six cards: Camera & Vision (capture-mode pills, interval slider with monospaced readout, face detection, multi-face response pills), Microphone & Audio, Screen & Browser ("Always on" badge, fullscreen lock, allowed-exits pills 0/1/2/3/5, tab-switch number, screen-sharing), AI Monitoring BETA (eye/gaze, suspicious activity, lip-sync, plagiarism), Identity Verification, Network & Location (IP logging, VPN block, geofence pills).
  - Right rail using new `.sticky-rail`: Candidate View Preview (LIVE pill + Q12/30 mini), Active Layers list with live dot indicators driven by toggle state, Auto-Actions card (auto-terminate, warning-before-action slider, record session, retention days), Save / Reset CTA stack.
  - Rail-specific CSS keeps slider rows from cramping at narrow widths (stacks label / control).
- Verified end-to-end in the preview server (port 3000): both `/admin/question-banks` and `/admin/settings` render with the intended layout. `tsc --noEmit` is green.

### In flight (🟡)
- None — A1–A3 landed. Awaiting decision on whether to continue with A4–A6 next.

### Next up (⏭)
1. **Phase A4 — Other Settings tabs** (General Exam session defaults / behaviour / branding cards; Scoring & Pass marks-schema editor; Notifications event-by-channel matrix; Integrations 6-tile grid). 1 day est.
2. **Phase A5 — Dashboard rhythm pass** (KPI delta pills, 5-tile module preview parity, live-assessments table styling, recent-activity dot rhythm).
3. **Phase A6 — Verification eyeball pass** vs `public/design-reference.html` — note: the current `design-reference.html` is a placeholder SVG; we may need real reference shots from the user before A6 can sign off.

### Later (⏳)
- Phase B — Backend plugin host extensions (event bus + SSE + decisions table).
- Phase C — Frontend `plugins/` folder + mount-point registry.
- Phases D–J as previously enumerated.

### Blocked (🔴)
- *(none)*

---

## Snapshot — 2026-05-14 17:30

### Just completed
- **Architecture audit (parallel)** across exam-engine, frontend, assessment-service, tech-assessment-engine, shared, Judge0. Findings live in `ARCHITECTURE.md`.
- **Plugin architecture proposal** drafted in `PLUGIN_ARCHITECTURE.md` — covers extended manifest, event bus, engine↔client command channel (SSE), `frontend/plugins/` folder, mount points, lifecycle of a proctoring violation.
- **AI image-generator prompts** for 7 grouped diagrams + 1 consolidated poster in `IMAGE_PROMPTS.md`.
- **Roadmap** with phases A–E in `ROADMAP.md`.
- All four docs created under `docs/architecture/`.

### Standing context (earlier this session — for the running record)
- Admin pages rebuilt to match the prototype: Dashboard, Users, Coding Question Bank, MCQ Authoring, Exam Packages, Plugins, Languages, Proctoring, Settings.
- Auth chain fixed end-to-end:
  - safeJson no longer dumps HTML 404 payloads as error messages
  - login writes the colon-dash localStorage keys (`originbi:id-token`, `originbi:access-token`)
  - apiFetch prefers the access token (engine's Cognito verifier requires `token_use=access`)
  - apiFetch injects `X-User-Id` from the stored user object
  - apiFetch redirects to `/admin/login?next=…` on a final 401 and clears tokens
  - AdminGuard checks both the admin-session flag *and* a token before allowing render
  - login page honours `?next=` after success
- Backend fixes:
  - migration 012's prose comment that contained a literal `-- +goose` directive (broke parsing) was reworded
  - synthetic kernel manifests injected so `assessment.coding`'s `requires: ["runtime.exam-session"]` resolves cleanly
  - `isAdmin` rewritten to read `users.role` (the actual column) instead of the missing `is_admin` column
  - exam-engine's CORS allow-headers extended to include `X-User-Context`
- Visual polish to match the design (post-audit):
  - Sidebar bottom replaced "Exam engine" health probe with a user card (avatar, name, status dot, role chip, sign-out)
  - Active nav rail flush against the sidebar edge, vertically centered
  - KPI value typography bumped to 32px / 800
  - Module tiles get full 22px padding and 44px icon
  - Topbar title 22px / 700 with -0.01em tracking
- Verified end-to-end in `mcp__Claude_Preview__*` browser: login with `ariyappan@touchmarkdes.com` → lands on `/admin`, real data flowing for questions/packages/plugins.
- TypeScript `tsc --noEmit` is green.

### In flight (🟡)
- None right now — awaiting user sign-off on the proposed roadmap before starting Phase A.

### Next up (⏭)
*To start once the user signs off on `ROADMAP.md`.*
1. **Phase A — Design parity** (high-fidelity pass over Question Banks page + Settings/Proctoring full layout per the user's reference screenshots). 2 days est.
2. **Phase B — Backend plugin host extensions** (event bus + SSE command channel + plugin_decisions table). 3 days est.
3. **Phase C — Frontend `plugins/` folder + mount-point registry**. 2 days est.

### Later (⏳)
- Phase D — First proctoring plugin (tab-switch detector) wired end-to-end as the lighthouse.
- Phase E — Migrate the existing Settings page Proctoring cards into the plugin model (each card becomes a plugin).
- Phase F — Backend list-users endpoint + remove the mock roster on `/admin/users`.
- Phase G — Replace dashboard mock arrays (Active Candidates / Live Sessions / Recent Activity) with real APIs.
- Phase H — Delete `tech-assessment-engine` after every consumer has moved to exam-engine endpoints.
- Phase I — Add an auth guard module to NestJS `assessment-service` (currently unprotected).
- Phase J — Add Vitest setup and at least smoke tests for plugin loading.

### Blocked (🔴)
- *(none right now)*

---

## How to use this file

- On every meaningful commit-sized unit of work, add a new "Snapshot" block at the top with three subsections: **Just completed**, **In flight**, **Next up**. Move stale items into a `Snapshot — <prev-date>` block below.
- Keep individual line items short — one phrase, no paragraphs.
- File-path references use repo-relative paths.
- Per the user's instruction this file must always exist and always reflect the latest state. If we forget to update it, that's a process error worth flagging.
