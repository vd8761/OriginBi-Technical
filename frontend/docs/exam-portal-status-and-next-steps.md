# Exam Portal Frontend Status and Next Steps

Last updated: 2026-05-08

This document is continuation context for the OriginBI Exam Portal frontend. It records what is implemented now, what remains planned, and which backend documents should be used as the source of truth.

The older Exam Portal Plan still defines the product intent: a multi-tenant assessment platform where every assessment capability is a plugin. The current implementation is an early but functional student-facing slice focused on individual coding assessments, local Judge0 execution through the Go engine, and the runtime foundation needed for future Admin and Organization flows.

## Related Documents

- Backend schema source of truth: [database-plan.md](../../backend/exam-engine/docs/database-plan.md)
- Go exam-engine status: [implementation-status-and-next-steps.md](../../backend/exam-engine/docs/implementation-status-and-next-steps.md)
- Judge0 service status: [service-status-and-next-steps.md](../../backend/judge0/docs/service-status-and-next-steps.md)

## Completed

### Next.js Runtime Shape

- The frontend remains a Next.js app under `frontend/`.
- `output: "export"` has been removed from `frontend/next.config.ts`, so the app can use middleware and server-backed route protection.
- `frontend/proxy.ts` protects these route groups:
  - `/dashboard`
  - `/explore/*`
  - `/assessment/*`
  - `/admin/*`
- Middleware validates the `ob_session` cookie by calling the Go engine `GET /v1/auth/session`.
- Unauthenticated users are redirected to `/?login=required&next=...`.
- The default engine URL is `http://localhost:8088`.
- Frontend API calls use `NEXT_PUBLIC_API_BASE` when present.
- Middleware can use `ENGINE_INTERNAL_URL` when the internal server-to-engine URL differs from the public browser API URL.
- In production, the browser API client no longer falls back to `localhost`; it uses `NEXT_PUBLIC_API_BASE` or same-origin `/v1` routes for a reverse-proxy deployment.

### API Client

`frontend/lib/api.ts` is the shared client for the implemented Go exam-engine routes.

Implemented client calls:

- `registerUser`
- `loginUser`
- `logoutUser`
- `getSession`
- `listAssignments`
- `demoPurchase`
- `startAttempt`
- `saveAttemptAnswer`
- `runAttemptCode`
- `submitAttempt`
- `listPlugins`
- `updatePlugin`

All browser API calls send credentials so the HttpOnly `ob_session` cookie is included.

### Authentication UI

The previous frontend-local login flow has been replaced for the main entry path.

Implemented:

- Signup calls `POST /v1/auth/register`.
- Login calls `POST /v1/auth/login`.
- Logout calls `POST /v1/auth/logout`.
- Initial page load calls `GET /v1/auth/session` to restore the logged-in state.
- Register and login both receive the backend session cookie.
- Login expiry is controlled by the Go engine session TTL, currently 24 hours from login.
- Re-login creates a new 24-hour session.

Current registration fields collected or sent:

- Email.
- Password.
- Name.
- Gender.
- Country code.
- Phone.
- Role.

The backend table also supports optional DOB, city, state, country, education, institution, graduation year, work status, and metadata. The UI does not yet expose all optional fields.

### Student Portal

The student portal remains the first complete product surface.

Implemented views:

- Dashboard.
- Assessment library.
- Explore.
- Profile placeholder.
- Assessment detail modal.
- Pre-test modals.
- Completion feedback through frontend state and route query handling.

Implemented assessment tracks:

- Aptitude Assessment.
- Communication Assessment.
- Coding Assessment.
- MNC Career Assessment.
- Role Based Questions.

The catalog is still defined in `frontend/lib/exams.tsx`. Backend-driven catalog loading is not implemented yet.

### Payment And Assignment Flow

Coding language unlocks now use the backend demo purchase API.

Implemented:

- The Coding detail page loads backend assignments with `GET /v1/me/assignments`.
- Paying for a coding language calls `POST /v1/purchases/demo`.
- Demo purchase creates or reuses one active assignment for the selected language.
- Assignment refs use the stable format:
  - `coding:python`
  - `coding:java`
  - `coding:cpp`
  - `coding:javascript`
  - `coding:c`
- Paid coding assignments are immediately available.
- Coding assignments have no expiry in this slice.
- Completed coding assignments show as completed and do not create a retake yet.

Local browser storage is still used by some non-coding prototype flows and harmless UI preferences. Coding payment and completion state now come from the backend.

### Coding Assessment Runtime

The Coding route now starts or resumes a backend attempt before rendering the assessment.

Implemented flow:

1. User visits `/assessment/coding?lang=python` or another supported language.
2. Route validates the language.
3. Route calls `POST /v1/attempts/start` with `assignmentRef: "coding:<language>"`.
4. The Go engine validates the logged-in user and active assignment.
5. The engine creates or resumes an active attempt.
6. The route receives an attempt snapshot.
7. The assessment UI hydrates saved answer/status payloads from that snapshot.

Supported languages:

- Python.
- Java.
- C++.
- JavaScript.
- C.

Implemented coding UI:

- Full-screen exam layout.
- Question sidebar.
- Monaco editor.
- File tree.
- File tabs.
- Multi-file workspace support.
- Language-specific starter files.
- Read-only starter files.
- Custom stdin execution.
- Test-case execution.
- Run result display.
- Timer.
- Submit modal.
- Completion screen after successful backend submit.
- Theme toggle.
- Guidelines modal.
- Development controls.
- Frontend proctoring warning counters and tab-switch warnings.

Important runtime persistence:

- Code workspace changes are kept in component state and autosaved to the backend every 10 seconds.
- Navigation between questions saves the current question before moving.
- MCQ answers are saved to the backend.
- Mark solved and flag actions are saved to the backend.
- Final submit sends the latest answer payloads and only shows completion after `POST /v1/attempts/{attempt_id}/submit` succeeds.
- Run and Run Tests call the Go engine. The browser no longer calls Judge0 directly during the backend-backed coding flow.
- The active coding UI sends heartbeats every 15 seconds to `POST /v1/attempts/{attempt_id}/heartbeat`.
- The active coding UI batches trace events to `POST /v1/attempts/{attempt_id}/events` for proctoring violations, tab switches, navigation, status changes, MCQ selections, workspace changes, autosaves, code-run completion, submit success/failure, and heartbeat failures.

The UI still uses the static frontend question definitions in `frontend/components/assessment/coding/data.ts` for rich display details such as starter code, prompts, sections, and local editor behavior. The backend snapshot currently supplies authoritative attempt/question ids, ordering, time remaining, and saved payloads. Fully rendering the authoring payload directly from the backend snapshot is still a next step.

### Server-Side Code Runs

`CodeEditor` accepts a server run adapter when a backend attempt is active.

Implemented behavior:

- Run and Run Tests call `POST /v1/attempts/{attempt_id}/answers/{exam_question_id}/runs`.
- The frontend sends:
  - mode,
  - language,
  - files,
  - entry file,
  - optional custom stdin.
- The engine returns the allowed run feedback.
- The frontend displays:
  - stdout,
  - stderr or compile output,
  - pass/fail testcase rows,
  - time,
  - memory,
  - summary.

The old browser Judge0 client remains as a fallback for non-backend demo use. It should not be used in production.

### Admin Plugin Panel

A first authenticated Admin plugin panel exists at:

```text
/admin/plugins
```

Implemented:

- Lists plugins from `GET /v1/admin/plugins`.
- Shows slug, name, version, kind, license flag, default behavior, platform state, and config.
- Lets an admin change the platform plugin state.
- Saves through `PUT /v1/admin/plugins/{plugin_id}`.

The backend enforces `users.is_admin = true` for these routes.

## Planned

The planned product remains broader than this slice.

Frontend experiences still needed:

- Platform Admin dashboard.
- Organization Admin dashboard.
- Corporate and college tenant management.
- Organization user dashboard.
- Individual public exam catalog backed entirely by server data.
- Exam authoring.
- Question bank management.
- Plugin entitlement screens at platform, organization, exam, and question levels.
- Assignment and scheduling screens.
- Live monitoring dashboards.
- Manual review screens.
- Result publishing and reports.

## Not Yet Implemented

Frontend gaps:

- Full RBAC-aware navigation.
- Deployment reverse-proxy configuration for same-origin `/v1` engine routes when `NEXT_PUBLIC_API_BASE` is intentionally omitted.
- Tenant and organization context selection.
- Backend-driven catalog for all assessment tracks.
- Backend-backed Aptitude, Communication, MNC, and Role assessments.
- Admin/Organization exam builder.
- Organization assignment workflows.
- Full backend-snapshot rendering for the coding assessment body and starter code.
- Real payment provider checkout and webhook handling.
- Persisted server results display in candidate dashboard.
- Manual review UI.
- LLM evaluation UI.
- Live monitor UI.

## Open Decisions

- Whether Next.js should keep talking directly to the Go engine in v1, or whether NestJS should become the browser-facing gateway for all business APIs.
- How much coding feedback candidates should see during active attempts versus after publication.
- Whether custom stdin should be globally available or controlled by plugin/exam config.
- Final naming/versioning policy for official frontend telemetry event kinds.
- Whether non-coding prototype flows should be kept local while coding moves to backend, or all assessment tracks should be migrated together.
- How admin plugin config should be shaped for language allowlists, proctoring switches, evaluator switches, and organization overrides.

## Current Repository Notes

- `frontend/docs/` was created during the documentation pass.
- Before the documentation pass, frontend had no dirty tracked changes.
- The current implementation pass now modifies frontend runtime files for auth, route protection, purchase, assignments, coding attempt persistence, server code runs, heartbeat, telemetry event batching, and admin plugins.
- Focused lint currently passes for the coding assessment files touched by the runtime work; full `npm run lint --if-present` still reports unrelated existing lint debt elsewhere.
- `npm run build` currently succeeds. Remote `next/font/google` usage was removed so production builds no longer need network access to Google Fonts.
- Route protection uses the Next.js `proxy.ts` convention instead of deprecated `middleware.ts`.
- `backend/exam-engine/` is currently untracked in git.
- Keep `backend/exam-engine/docs/database-plan.md` as the schema source of truth.
