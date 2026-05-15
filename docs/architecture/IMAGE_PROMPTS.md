# AI Image-Generator Prompts — System Flowcharts

> Prompts engineered for production-grade text-to-image models (Midjourney, DALL·E 3, Imagen 3, Flux Pro, Stable Diffusion XL). Each prompt is self-contained — paste verbatim. Six **grouped diagrams** capture distinct subsystems; one **consolidated diagram** covers the full end-to-end flow.
>
> Style is uniform across all eight prompts so generated images compose into a coherent system poster: dark background, Origin BI green accent (#1ED36A), clean monospace labels for ID strings, flat 2D iso-perspective, no skeuomorphic gradients.

Common style header used in every prompt (do not omit):

```
Flat 2D system diagram, dark studio background #0F1411, primary accent green #1ED36A,
secondary accents amber #FFB703 / red #ED2F34 / blue #4AC6EA / purple #8B6DF0,
Plus Jakarta Sans labels for headings, JetBrains Mono for endpoint paths and IDs,
subtle hairline grid (~52px, 4% opacity green), rounded 14px node corners,
single-pixel #FFFFFF/12% strokes, no drop shadows except 10px/25% black on container groups,
left-to-right primary flow with vertical secondary branches, arrows with 2px stroke + filled green arrowheads,
no emoji, no photorealism, no 3D, no clutter, presentation-deck quality.
```

---

## Prompt 1 — Candidate session lifecycle

```
[Common style header]

Flowchart titled "Candidate Exam Session — Lifecycle". Left-to-right.

Lane 1 — BROWSER (Candidate SPA, Next.js 16): node "Login" → "Discover Exam" → "Attempt: not_started" → "Attempt: in_progress" → "Heartbeat loop" parallel with "Code Editor" and "Event Emitter (visibility, copy, focus)" → "Submit" → "Result View".

Lane 2 — EDGE: a single oval "Authorization: Bearer <access JWT>" intercepting every arrow that crosses lane boundaries.

Lane 3 — EXAM ENGINE (Go, :8088): nodes "sessionMiddleware (Cognito Verify)", "POST /v1/attempts/{id}/start", "POST /v1/attempts/{id}/heartbeat (authoritative clock)", "POST /v1/attempts/{id}/events (200/batch)", "POST /v1/attempts/{id}/answers/{q}/runs", "POST /v1/attempts/{id}/submit".

Lane 4 — DATA STORES: cylinders "attempts", "attempt_events (partitioned monthly)", "attempt_heartbeats", "answers", "code_runs". Arrows from engine nodes into matching cylinders.

Lane 5 — EXTERNAL: square "Judge0 sandbox :2358" connected from "code_runs" with bidirectional arrow.

Annotate: server is the time authority — heartbeat node has a small clock glyph and tag "client clock ignored". Events node has tag "append-only".

Output a single rectangular composition, 16:9 aspect ratio.
```

---

## Prompt 2 — Authentication & admin gate

```
[Common style header]

Flowchart titled "Authentication & Admin Authorization". Top-to-bottom.

Row 1: "Admin opens /admin/login (Next.js)" → "AWS Cognito SignIn (ap-south-1_3KNYmKGUG)" → returns "ID Token" and "Access Token" (two parallel pills, mono font).

Row 2: "POST /admin/me (NestJS assessment-service :5000)" — branch on response: ok → continues, !ADMIN → "Sign out + show error".

Row 3: localStorage block listing keys in a stacked card: originbi:id-token, originbi:access-token, originbi:refresh-token, originbi:admin-session=true, user{id,name,email,role}.

Row 4: "Page navigation /admin/* → AdminGuard checks flag + token" → "apiFetch (lib/api.ts)" → "Authorization: Bearer <access-token>, X-User-Id, X-User-Context".

Row 5: "exam-engine :8088 sessionMiddleware":
  - "Cognito JWKS verify (token_use=access)" — red strike-through label "id tokens rejected"
  - "SELECT users WHERE cognito_sub=$sub AND is_active AND NOT is_blocked"
  - "isAdmin(): role ∈ {ADMIN, SUPER_ADMIN, STAFF}"
  - On 403/401 → "clearTokens() + redirect /admin/login?next=…" with a curved arrow back to Row 1.

Annotate two dotted side-notes:
  - "Legacy header trust path X-User-Id/X-Org-Id is wired but dormant"
  - "Schema drift FIXED: isAdmin now reads users.role, not users.is_admin column"

Output a single vertical composition, 9:16 aspect ratio.
```

---

## Prompt 3 — Plugin host & dispatcher (current state)

```
[Common style header]

Flowchart titled "Plugin Host — In-Process Dispatcher". Hub-and-spoke.

Center hub: hexagon "pluginhost.Registry" with sub-labels "Bootstrap → load DB → resolveGraph → topological order".

Spoke 1 (down): cylinder "plugins table (Postgres)" with stack of manifest rows "{id, slug, kind, category, requires[], extends[], provides[], schema(jsonb)}".

Spoke 2 (up-left): card "Manifest verification" listing checks "missing-require, missing-extends, cycle". Side-arrow into "kernelSlugs() injects runtime.exam-session as synthetic manifest".

Spoke 3 (up-right): card "Action dispatcher" with code-style line "Dispatch(ctx, ActionRequest{action_id, payload}) → ActionHandler".

Spoke 4 (right): 7 small node tiles around the hub representing installed plugins, each with category badge:
  - assessment.coding (assessment / base)
  - runner.judge0 (runner / addon)
  - evaluation.testcase (evaluation / base)
  - evaluation.llm (evaluation / base)
  - evaluator.anthropic (evaluation / addon, extends evaluation.llm)
  - evaluator.openai (evaluation / addon, extends evaluation.llm)
  - language.* (language / addon, ×8 grouped)

Spoke 5 (left): "server.AttachPluginRegistry()" registering Go handlers from packages assessmentcoding, evaluationllm — call out "plugins are metadata + in-process Go funcs; no dynamic code loading".

Annotate at bottom: "Dispatch path for code run: POST /v1/attempts/{id}/answers/{q}/runs → action runtime.action.coding.run-tests → handleCodingAction() → runnerjudge0.Submit() → Judge0".

Output a single rectangular composition, 16:9 aspect ratio.
```

---

## Prompt 4 — Frontend admin shell & data flow

```
[Common style header]

Flowchart titled "Admin SPA — Shell, Context, Data Flow". Three vertical columns.

Column A (Shell hierarchy, top-to-bottom):
  RootLayout (app/layout.tsx) — wraps in SessionProvider / PaymentProvider / ThemeProvider
  ↓ AdminLayout (app/admin/layout.tsx) — AdminPageProvider + AdminShell
  ↓ AdminShell — branch:
     · if pathname starts with /admin/login → centered single-column container (no sidebar/topbar)
     · else → sidebar 260px + main column (AdminTopbar sticky + page content)
  ↓ Page (e.g. app/admin/coding/page.tsx) — wraps in <AdminGuard>

Column B (page metadata propagation):
  useRegisterAdminPage({ eyebrow, title, subtitle, breadcrumb, actions })
  → AdminPageContext stores meta
  → AdminTopbar consumes via useAdminPageMeta()
  → renders BreadcrumbBar + title

Column C (data flow):
  Page useEffect → listAdminQuestions() / listExamPackages() / listPlugins() from lib/api.ts
  → apiFetch<T>(path) — handles JWT injection, X-User-Id, X-User-Context, single-flight refresh, 401 redirect
  → fetch('http://localhost:8088/v1/admin/…')
  → exam-engine returns JSON
  → setState in page

Bottom band — "REUSABLE UI KIT" listed as small chips: Card, Badge, StatusDot, SegmentedToggle, PillTabs, StatCard, EmptyState, ErrorState, Drawer, Modal, Avatar, BreadcrumbBar, ToggleSwitch.

Sidebar mini-preview at top-left: shows nav grouped Workspace / System, count chips, "ADMIN" brand chip, user card at bottom.

Output a single rectangular composition, 16:9 aspect ratio.
```

---

## Prompt 5 — Telemetry, heartbeat & event pipeline

```
[Common style header]

Flowchart titled "Telemetry Pipeline — Heartbeats & Events". Left-to-right with two parallel streams.

Stream 1 (top): HEARTBEAT
  Browser interval timer (every 10s) → POST /v1/attempts/{id}/heartbeat with HeartbeatRequest{sent_at, client_state}
  → server discards client time, reads attempts.deadline_at, computes time_remaining_ms
  → INSERT attempt_heartbeats
  → returns HeartbeatResponse{received_at, rtt_ms, server_time_remaining_ms, deadline_at, status}
  → browser updates timer display

Stream 2 (bottom): EVENTS
  Browser collectors (visibilitychange listener, clipboard, contextmenu, devtools detect, mouse focus) → EventBuffer (batched, max 200) → POST /v1/attempts/{id}/events
  → server validates kinds + payloads
  → INSERT attempt_events (partitioned monthly, append-only)
  → returns {accepted, rejected} counts

Join point on right: "attempt_events table → daily roll-up → attempt_event_summary". Side-arrow into "Admin Proctoring Live Monitor page (mock today; SSE in proposal)".

Call out missing piece in red dashed box: "NO real-time engine→client reaction channel today. Proposal: SSE on /v1/attempts/{id}/commands lets plugins push commands back to candidate browser."

Output a single rectangular composition, 16:9 aspect ratio.
```

---

## Prompt 6 — Database schema overview

```
[Common style header]

Entity-relationship diagram titled "Postgres Schema — obidatanew (highlights)". Grouped by domain.

Group A — Identity & Org (top-left, blue accent):
  users (id pk, email uq, cognito_sub, role, is_active, is_blocked)
  organizations
  organization_members
  registrations (user_id fk → users.id, full_name, gender, country_code, phone, …)

Group B — Catalog (top-right, purple accent):
  exam_templates → exam_template_versions
  questions → question_versions → question_options, question_test_cases
  media_assets
  tags
  exams → exam_versions → exam_sections → exam_questions
  exam_packages → exam_package_versions
  pricing_items → purchases

Group C — Plugin model (center, green accent):
  plugins (id, kind, slug uq, plugin_type {base|addon|kernel}, category, requires jsonb, extends jsonb, provides jsonb, schema jsonb)
  plugin_entitlements
  platform_plugin_entitlements

Group D — Runtime (bottom, amber accent):
  attempts (id, exam_version_id, user_id, status enum, deadline_at, …)
  attempt_question_state
  answers
  code_runs
  code_submissions
  evaluations → evaluation_criterion_scores
  rubrics, manual_review_assignments
  result_publications

Group E — Telemetry (right side, red accent):
  attempt_events (PARTITIONED BY RANGE (occurred_at) monthly) → attempt_events_2026_05, _2026_06, …
  attempt_event_summary
  attempt_heartbeats (PARTITIONED daily)
  attempt_connectivity_gaps

Annotate proposed addition (green dashed border): "plugin_decisions (id, attempt_id, plugin_id, trigger_event_id, decision, reason, payload, created_at) — closes the audit-of-decisions gap."

Output a single rectangular composition, 16:9 aspect ratio.
```

---

## Prompt 7 — Proposed plugin architecture (target state)

```
[Common style header]

Flowchart titled "Proposed Plugin Architecture — Target State". Concentric rings.

Inner core (kernel, solid green ring): nodes "exam session lifecycle", "time authority (heartbeat)", "telemetry ingest", "engine↔client command channel (SSE)", "auth + entitlements", "plugin registry + dispatcher", "event bus".

Middle ring (first-party plugins, dashed green): tiles each in their category color
  assessment-coding · runner-judge0 · evaluation-testcase · evaluation-llm · evaluator-anthropic · evaluator-openai · language-* · proctoring-tab-switch · proctoring-clipboard · proctoring-fullscreen · proctoring-mouse-focus · proctoring-devtools · proctoring-rightclick · proctoring-network-vpn

Outer ring (frontend mount surfaces): labels
  sidebar.nav.workspace / sidebar.nav.system
  topbar.actions
  dashboard.kpi
  settings.proctoring · settings.scoring · settings.notifications · settings.integrations
  attempt.toolbar · attempt.warning-toast · attempt.background

Arrows: from plugins to mount surfaces — each plugin connects to one or more outer-ring slots.

Side panel — "Manifest schema (extended)" code-style block listing fields: id, kind, category, requires[], extends[], provides[], emits[], subscribes[], client_constraints[], admin_ui[], candidate_ui[], schemas{}.

Bottom band — "Lifecycle of a violation" mini-flow: candidate switches tab → frontend plugin emits proctoring.tab.switched → POST /events → backend bus → proctoring plugin decides terminate → write plugin_decisions row → engine SSE → candidate browser → attempt locks → admin sees flag.

Output a single square composition, 1:1 aspect ratio. High-detail concentric layout.
```

---

## Prompt 8 — Consolidated end-to-end workflow

```
[Common style header]

System poster titled "OriginBi-Technical — End-to-End System Workflow". Single composition with five horizontal bands stacked top-to-bottom. 21:9 aspect ratio.

BAND 1 — CLIENTS:
  · Candidate browser (Next.js 16, candidate routes /, /explore, /assessment/*)
  · Admin browser (Next.js 16, admin routes /admin/*)
  Both shown as monitor frames with mini wireframes inside.

BAND 2 — EDGE & AUTH:
  · AWS Cognito user pool ap-south-1_3KNYmKGUG (label "verifies id+access tokens")
  · Next.js dev server :3000 (single instance; AGENTS.md note: Next.js 16, breaking changes)

BAND 3 — APPLICATION SERVICES:
  · exam-engine :8088 (Go, chi) — primary runtime, plugin registry, attempts, telemetry, code runs
  · assessment-service :5000 (NestJS) — legacy adaptive flow + /admin/me + R2 file uploads
  · tech-assessment-engine :5001 (Go, Gin) — legacy grader (marked DEPRECATED in red strikethrough)

BAND 4 — RUNTIME & SANDBOX:
  · Judge0 :2358 (server + workers + Postgres + Redis containers) — called only from exam-engine via runner.judge0 plugin
  · Plugin dispatcher inside exam-engine (small inner box) calling action handlers for assessment.coding.*, evaluation.*

BAND 5 — DATA:
  · Postgres :5432 obidatanew (single tenant) — large central cylinder with five sub-cylinders labelled: identity & org / catalog / plugin model / runtime / telemetry (partitioned)
  · Cloudflare R2 (object storage) — for question media uploads via assessment-service

Cross-band arrows:
  · Candidate browser → exam-engine (Authorization Bearer, X-User-Id, X-User-Context)
  · Candidate browser → exam-engine SSE /v1/attempts/{id}/commands (DASHED — proposed)
  · Admin browser → assessment-service /admin/me (authentication path)
  · Admin browser → exam-engine /v1/admin/* (every admin CRUD)
  · exam-engine ↔ Postgres
  · exam-engine ↔ Cognito JWKS (cached)
  · exam-engine → Judge0 (code execution)
  · assessment-service → Postgres
  · assessment-service → R2

Annotate three callouts on the right margin:
  ① "Plugins drive everything outside the kernel. Categories: assessment, evaluation, runner, language, proctoring."
  ② "Telemetry is append-only & partitioned. attempt_events + attempt_heartbeats."
  ③ "Engine→client reaction channel (SSE) is the missing piece for real-time proctoring."

Use color coding consistently across the poster:
  · Identity/auth — blue
  · Catalog/content — purple
  · Plugin/control — green
  · Runtime/attempt — amber
  · Telemetry/audit — red

Output a single ultra-wide composition, 21:9 aspect ratio.
```

---

## Usage notes

- **For Midjourney**: append `--ar <aspect>` and `--style raw --v 6` to each prompt.
- **For DALL·E / Imagen**: paste verbatim; the style header in front handles tone.
- **For Flux Pro**: prepend "infographic, technical diagram, presentation deck quality," and keep prompt length under 1500 chars (split if needed).
- If a model produces unreadable labels, regenerate with: append "all text rendered crisp, vector-quality, no blur, no glyph artifacts; if any label is unreadable, abort and redraw".
- To compose into one poster, render prompts 1–7 at 1920×1080 each and arrange in a 4×2 grid; render prompt 8 at 3840×1640 as the cover.
