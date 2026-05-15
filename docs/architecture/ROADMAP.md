# Implementation Roadmap

> Phased plan to (a) bring admin pages to **pixel-parity** with the reference design and (b) introduce the **plugin-based architecture** described in `PLUGIN_ARCHITECTURE.md`. Pair with `STATUS.md` for the running tracker.

Each phase ends with a **verification step**. Don't start Phase N+1 before Phase N's verification is green.

---

## Phase A — Design parity (visual)

**Goal:** every admin page matches the design screenshots the user referenced — Question Banks landing, Exam Settings (Proctoring / General / Scoring / Notifications / Integrations), Dashboard rhythm, Users, Coding bank, Proctoring monitor.

### A1. Token + utility pass
- Adopt the design's `--space-*` scale into `app/globals.css` admin block.
- Add `--admin-r-4xl: 24px` for dashboard panels.
- Add the design's split utilities (`.split-1-aside`, `.split-2-1`, `.split-50`) and `.sticky-rail` directly in the admin block.

### A2. Question Banks landing
- Rebuild `/admin/coding` (or move to `/admin/question-banks` per design naming) as a 3-column module grid: Aptitude Assessment / MNC Career Prep / Communication Skills / Role-Based Technical / Coding Challenges (with NEW MODULE badge). Each tile: 48×48 icon, title, description, TRIAL/MAIN stat block, category chips, Settings + Manage Questions buttons (where Manage Questions uses the module accent color).
- Bottom card: "Bulk import via JSON or CSV" with Bulk Import + View Schema buttons.

### A3. Exam Settings — Proctoring tab
- Replace the current vertical toggle list with the design's card structure:
  - **Camera & Vision** — header toggle, ProctorRow controls for Capture mode (Pill: Interval / Random / On Event), Interval slider with monospaced "30s" readout, Face Detection toggle, Multi-face response Pills (Flag / Warn / Terminate)
  - **Microphone & Audio** — header toggle, Background noise alert toggle
  - **Screen & Browser** — "Always on" badge, Fullscreen lock, Allowed fullscreen exits (Pills 0 / 1 / 2 / 3 / 5), Tab switch limit number input, Screen sharing required
  - **AI Monitoring (BETA)** — Eye/gaze tracking, Suspicious activity AI, Lip-sync verification, Plagiarism / similarity detection
  - **Identity Verification** — Government ID upload, Liveness check, Photo at exam start
  - **Network & Location** — IP address logging, Block VPN/proxy, Geofence (Pills Off / Country / City)
- Right rail (sticky): Candidate View Preview (mini Q12/30 card with LIVE pill), Active Layers list with dot indicators, Auto-Actions block (Auto-terminate toggle, Warning before auto-action slider, Record session toggle, Retention number), Save / Reset CTA stack.

### A4. Exam Settings — other tabs
- **General Exam:** Session Defaults card (Default duration + Minutes select, Default # of questions, Allowed attempts, Time per question optional) + Behaviour card (7 toggles per design) + Branding & Customization card (Exam title prefix, 5 accent color swatches, Welcome message).
- **Scoring & Pass:** match design's marks schema editor (Easy / Medium / Hard rows × marks + negative) and Pass criteria card.
- **Notifications:** table of events × channels (Email / Slack / Webhook) with per-cell toggles.
- **Integrations:** 6-tile grid (Judge0 / MOSS / AWS Cognito / Cloudflare / Slack / Webhook) with Connect or Configure CTAs.

### A5. Dashboard rhythm
- 4-up KPI strip with delta pills, 5-tile module preview (matches Question Banks design), Live Assessments table styled to match (status pill with dot, progress bar with text "X / Y"), Recent Activity panel with leading dot per entry.
- Sparkline cards at the bottom — keep mock data for now, but improve the bar typography per design.

### A6. Verification
- Open `/design-reference.html` (already in `public/`) next to each admin route at the same viewport size. Eyeball each card for radius/padding/typography/icon-size match. No regressions on `tsc --noEmit` or `npm run lint`.

**Definition of done:** the user looks at the admin tab and the design tab side-by-side and confirms parity.

---

## Phase B — Backend plugin host extensions

**Goal:** make the engine support the runtime surfaces a real plugin system needs.

### B1. Event bus
- Add `pluginhost.EventBus{Subscribe, Publish}` in `internal/pluginhost/eventbus.go`.
- Wire `POST /v1/attempts/{id}/events` to publish each ingested event to the bus after persisting it (telemetry is still source of truth; the bus is for reactions).
- Emit internal lifecycle events: `attempt.started`, `attempt.paused`, `attempt.submitted`, `attempt.timed_out` at the points they happen in `attempt_handlers.go`.

### B2. Engine→client command channel (SSE)
- New handler at `GET /v1/attempts/{id}/commands` returning `text/event-stream`. Authorized like other attempt routes.
- New `runtime/commands` kernel package exposing `Send(attemptID, kind, payload)` — fans out to connected SSE clients keyed by attempt id, buffers up to N=64 messages while no consumer.
- Add manifest schema kind `runtime.command.*` for type safety.

### B3. Decisions audit table
- Migration `015_plugin_decisions.sql` per `PLUGIN_ARCHITECTURE.md` §4.3.
- Helper `pluginhost.RecordDecision(ctx, ...)` used by any plugin that takes action.

### B4. Extended manifest fields
- New JSONB columns or sub-keys on `plugins.schema`: `emits`, `subscribes`, `client_constraints`, `admin_ui`, `candidate_ui`.
- Update the admin "plugin detail" page to expose them read-only for now.

### B5. Per-attempt plugin config endpoint
- `GET /v1/me/plugin-config?attempt_id=…` returns the resolved plugin set + per-plugin config + flattened constraints. Resolves by joining `plugin_entitlements` × org/platform overrides × exam package settings.

### B6. Verification
- Integration test: emit a `proctoring.tab.switched` event via POST → confirm a subscriber registered in tests sees it → write a `plugin_decisions` row → SSE consumer in the test sees the command. Use Go stdlib testing.
- No regression on existing exam workflows (start attempt, run code, submit).

---

## Phase C — Frontend `plugins/` folder + mount-point registry

**Goal:** introduce the extension surface so plugins can contribute UI without page edits.

### C1. Scaffold
- New `frontend/plugins/` folder per `PLUGIN_ARCHITECTURE.md` §5.1.
- `types.ts` (manifest, SurfaceMount, PluginCtx), `index.ts` (static registry of all installed plugin manifests), `PluginProvider.tsx`, `useMount.ts`.
- A `MountPoint` component used by the kernel pages.

### C2. Wire the kernel mount points
- `<MountPoint id="sidebar.nav.workspace" />` and `id="sidebar.nav.system"` in `AdminNav` — plugin nav items render after the hardcoded ones.
- `<MountPoint id="topbar.actions" />` in `AdminTopbar`.
- `<MountPoint id="dashboard.kpi" />` and `id="dashboard.tiles"` in `app/admin/page.tsx`.
- `<MountPoint id="settings.proctoring" />` in `app/admin/settings/page.tsx` (replaces the static proctoring cards in Phase E).
- `<MountPoint id="attempt.toolbar" />`, `id="attempt.warning-toast"`, `id="attempt.background"` in the candidate attempt screen.

### C3. Frontend event bus
- Minimal pub/sub keyed on same event kinds as the backend.
- Plugin runtimes publish → frontend bus → mirrored to `POST /events`.

### C4. SSE consumer
- During an active attempt, open `EventSource('/v1/attempts/{id}/commands')`. Dispatch each command to the matching plugin handler.

### C5. Per-attempt plugin discovery
- On admin pages: call `GET /v1/admin/plugins?context=admin` to get the enabled-for-admin list, instantiate.
- On candidate pages: call the Phase B5 endpoint at attempt start.

### C6. Verification
- Drop a dummy plugin (`frontend/plugins/example-noop/`) that mounts `<div data-testid="noop-mount">hello</div>` on `topbar.actions`. Smoke test: load `/admin`, see the div.

---

## Phase D — First real proctoring plugin (lighthouse)

**Goal:** prove the architecture by shipping one full plugin end-to-end.

Choose **`proctoring-tab-switch`** because it's the simplest signal with the cleanest reaction.

### D1. Backend plugin
- `backend/exam-engine/plugins/proctoring-tab-switch/plugin.json` with manifest per `PLUGIN_ARCHITECTURE.md` §3.
- `register.go` subscribes to `proctoring.tab.switched`. Maintains a per-attempt counter. After 3 switches → records decision `auto_terminate` → emits `attempt.terminate` command via SSE.

### D2. Frontend plugin
- `frontend/plugins/proctoring-tab-switch/manifest.ts` exporting:
  - `runtime`: registers `visibilitychange` listener, publishes events.
  - `surfaces`: SettingsCard for `settings.proctoring` mount (toggle + threshold input); WarningToast for `attempt.warning-toast` mount.

### D3. Verification
- Manual: start an attempt, switch tabs 3 times → the attempt locks and the admin proctoring page shows the flag.
- Unit: backend subscriber test (third event triggers decision).

---

## Phase E — Migrate existing Settings cards into plugins

**Goal:** move from hardcoded cards to fully-pluggable.

For each card on `app/admin/settings/page.tsx` Proctoring tab — Camera & Vision, Microphone & Audio, Screen & Browser, AI Monitoring, Identity Verification, Network & Location — create a first-party plugin that mounts a SettingsCard on `settings.proctoring`. The Settings page becomes a thin shell calling `<MountPoint id="settings.proctoring" />`.

This is also the moment to remove dead inline JSX from the Settings page and replace per-card local state with persistence via the per-plugin config API (new admin endpoint: `PUT /v1/admin/plugins/{id}/config`).

### Verification
- All settings cards still visible and functional. Toggling persists to the engine. Reloading the page restores state.

---

## Phase F — Backend `listAdminUsers` + real Users page

**Goal:** kill the mock roster.

Add `GET /v1/admin/users` to exam-engine with filters (role, status, search). Replace the mock array in `app/admin/users/page.tsx`. Keep the entitlement lookup card as it is.

---

## Phase G — Dashboard real-data pass

**Goal:** remove the remaining mock arrays on the Dashboard.

- "Active Candidates" → count from a new `GET /v1/admin/sessions/active` endpoint.
- "Live Sessions" → same endpoint, status filter.
- "Flagged Today" → count from `plugin_decisions` joined to today.
- "Recent Activity" → unioned feed of `plugin_decisions` + admin audit events.
- "Submissions / day", "Avg Pass Rate", "Proctor Incidents" → aggregated reads from existing tables.

---

## Phase H — Retire `tech-assessment-engine`

**Goal:** reduce service count.

- Move whatever the legacy module endpoints still serve (start/fetch/submit) onto exam-engine's plugin model.
- Update `start-all.ps1` to stop launching it.
- Delete `backend/tech-assessment-engine/`.

---

## Phase I — Lock down `assessment-service`

**Goal:** stop exposing admin endpoints without auth.

- Add a Cognito `AuthGuard` per Nest's pattern. Reuse the same JWT verifier the exam-engine uses (or call out to it for verification).
- Mark `/admin/me` as the only route allowed for unauthenticated Cognito users with `ADMIN` group claim.
- Reject all other origins until proven authenticated.

---

## Phase J — Testing baseline

**Goal:** put a safety net under the plugin work.

- Add Vitest to the frontend. First tests: PluginProvider mount registry, apiFetch token handling, ErrorState rendering, AdminGuard branching.
- Add Go integration tests to exam-engine for the event bus + SSE channel.

---

## Cross-cutting

- Update `STATUS.md` at the end of every phase. Add a "Snapshot — <date>" block.
- Update `ARCHITECTURE.md` when a phase changes the surface area (routes, schema, services).
- Keep `IMAGE_PROMPTS.md` in sync if Phase G introduces new data flows visible on the consolidated poster.

---

## What I will NOT do without an explicit user OK

- Delete `tech-assessment-engine` (Phase H) — flagged for retire, but I'll wait for the user to confirm no internal team is still using it.
- Run database migrations on a non-local environment.
- Push to any remote.
- Modify Cognito user pool config.
