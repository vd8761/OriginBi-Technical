# Plugin Architecture — Proposal

> Companion to `ARCHITECTURE.md`. This document proposes a true plugin-based system covering **both backend and frontend**, addressing the user-stated goals: core assessment + assessment-settings as the kernel; tab-switch monitor, copy-paste blocker, mouse-focus, fullscreen, right-click block, devtools detection as "exam-security plugins"; and a frontend `plugins/` folder for dynamic UI addons.
>
> Nothing here is implemented yet. Implementation is gated on `STATUS.md` and the user's go-ahead per `ROADMAP.md`.

---

## 1. Goals & non-goals

**Goals**
- Make the engine + admin shell **the kernel**. Everything else is a plugin.
- A plugin is a single coherent unit: backend manifest + handler code + frontend UI surface(s) + admin schema for its settings.
- Plugins can declare **constraints they enforce on the candidate runtime** (e.g. "block copy in editor", "require fullscreen") and the candidate frontend honours those constraints **without page edits**.
- Plugins emit and consume **typed events**.
- Adding a plugin is an `INSERT` + dropping a folder. No core code changes.

**Non-goals (for v1)**
- Hot reload of installed plugins at runtime.
- Untrusted-plugin sandboxing. We assume admin-vetted plugins.
- A third-party marketplace.
- Replacing the existing in-process Go action handlers — they become **first-party plugins** that happen to ship with the binary.

---

## 2. Conceptual model

```
                       ╔══════════════════════════════════╗
                       ║              KERNEL              ║
                       ║                                  ║
                       ║  - Exam session lifecycle        ║
                       ║  - Time authority (heartbeat)    ║
                       ║  - Telemetry ingest              ║
                       ║  - Engine→client command channel ║
                       ║  - Assessment+Question schema    ║
                       ║  - Auth + entitlement resolution ║
                       ║  - Plugin registry + dispatcher  ║
                       ║  - Event bus                     ║
                       ╚════════════════╤═════════════════╝
                                        │
       ┌───────────────────┬────────────┼────────────┬───────────────────┐
       ▼                   ▼            ▼            ▼                   ▼
  ┌──────────┐     ┌──────────────┐ ┌────────┐ ┌─────────────┐   ┌──────────────┐
  │  coding  │     │ proctoring.* │ │  llm.* │ │ runner.*    │   │ language.*   │
  │assessment│     │ (plugins)    │ │        │ │ (judge0,…)  │   │ (per lang)   │
  │ plugin   │     │              │ │        │ │             │   │              │
  └──────────┘     └──────────────┘ └────────┘ └─────────────┘   └──────────────┘
   base / assess    addon / proctor   base/eval   addon/runner    addon/language
```

Every box other than the kernel is a plugin. The kernel only knows them through their manifest + the typed surfaces they bind to.

---

## 3. Plugin manifest (extended)

The current `plugins` row already carries `requires/extends/provides`. We extend the manifest schema (in the JSONB `schema` column or a new `plugin_manifest_v2` column) with three new sections:

```jsonc
{
  "id":   "proctoring.tab-switch",
  "kind": "addon",
  "category": "proctoring",
  "requires": ["runtime.exam-session"],
  "extends":  ["assessment.coding", "assessment.mcq"],   // which assessment types it applies to
  "provides": ["proctoring.constraint.tab-focus"],

  // NEW: events the plugin emits, with payload JSON Schema
  "emits": [
    {
      "kind": "proctoring.tab.switched",
      "severity": "warn",
      "payload_schema_ref": "#/schemas/tab_switched"
    },
    { "kind": "proctoring.tab.refocused", "severity": "info" }
  ],

  // NEW: events the plugin reacts to (server-side handlers)
  "subscribes": ["attempt.started", "attempt.submitted"],

  // NEW: client-side constraints this plugin enforces
  "client_constraints": [
    {
      "id": "tab-focus",
      "kind": "focus-required",
      "config_schema": { "$ref": "#/schemas/tab_focus_config" }
    }
  ],

  // NEW: admin UI surfaces this plugin contributes
  "admin_ui": [
    {
      "mount": "settings.proctoring",
      "label": "Tab Switching",
      "schema": "#/schemas/tab_focus_config",
      "component": "frontend/plugins/proctoring-tab-switch/SettingsCard.tsx"
    }
  ],

  // NEW: candidate UI surfaces (e.g. an in-attempt warning toast)
  "candidate_ui": [
    {
      "mount": "attempt.warning-toast",
      "component": "frontend/plugins/proctoring-tab-switch/WarningToast.tsx"
    }
  ],

  "schemas": { "tab_switched": { /* JSON Schema */ }, "tab_focus_config": { /* JSON Schema */ } }
}
```

The existing topological resolver already handles `requires`/`extends`. New fields are inert until consumed by the new event bus, constraint resolver, or UI surface registry described below.

---

## 4. Backend extensions

### 4.1 Event bus

A small in-process publish/subscribe registered alongside `pluginhost.Registry`:

```go
type Event struct {
    Kind        string
    AttemptID   uuid.UUID
    UserID      int64
    PluginID    uuid.UUID
    Severity    int16
    OccurredAt  time.Time
    Payload     json.RawMessage
}

type Subscriber func(ctx context.Context, e Event) error

func (r *Registry) Subscribe(kind string, sub Subscriber)
func (r *Registry) Publish(ctx context.Context, e Event) error
```

- `POST /v1/attempts/{id}/events` continues to write to `attempt_events` for audit, **and** publishes each ingested event onto the bus so subscriber plugins react in-process.
- Internal lifecycle events (`attempt.started`, `attempt.paused`, `attempt.submitted`, …) are published by the engine itself.

### 4.2 Engine → client command channel

A new `runtime/commands` plugin (kernel-class) exposes:

- Server-Sent Events at `GET /v1/attempts/{id}/commands` (Bearer auth; opens for the lifetime of the attempt).
- Commands are JSON messages: `{ "kind": "block-copy", "payload": {…}, "issued_at": "…" }`.
- The client always listens to this stream while an attempt is in progress.
- Plugins emit commands by calling `commands.Send(attemptID, kind, payload)`.

This is what lets a proctoring plugin **react** to a tab-switch event by issuing `attempt.lock` to the client, instead of just logging.

### 4.3 Decision audit table

```sql
CREATE TABLE plugin_decisions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id  uuid NOT NULL,
  plugin_id   uuid NOT NULL,
  trigger_event_id uuid,            -- references attempt_events row
  decision    text NOT NULL,        -- 'flag' | 'warn' | 'auto_terminate' | …
  reason      text,
  payload     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

Closes the gap noted in `ARCHITECTURE.md` §8: a separate log of what the engine *did* in response to what the client *reported*.

### 4.4 Folder layout

```
backend/exam-engine/
  internal/
    pluginhost/        # registry, manifest, dispatcher, eventbus (NEW), commands (NEW)
  plugins/
    assessment-coding/      (existing) — base, assessment type
    runner-judge0/          (existing) — addon, runner
    evaluation-testcase/    (existing) — base, evaluation
    evaluation-llm/         (existing)
    evaluator-anthropic/    (existing)
    evaluator-openai/       (existing)
    language-*/             (existing) — language plugins
    proctoring-tab-switch/  NEW — emits proctoring.tab.{switched,refocused}; constraint: tab-focus
    proctoring-clipboard/   NEW — blocks copy/paste in candidate editor
    proctoring-fullscreen/  NEW — emits fullscreen.exited; constraint: fullscreen
    proctoring-mouse-focus/ NEW — emits focus.lost
    proctoring-devtools/    NEW — emits devtools.opened
    proctoring-rightclick/  NEW — blocks contextmenu
    proctoring-network-vpn/ NEW — server-side IP/ASN check on attempt start
```

Each plugin folder has:
- `plugin.json` (extended manifest).
- For first-party Go plugins: `register.go` exporting a `Register(r *pluginhost.Registry)` function called at `server.AttachPluginRegistry()`.
- Schema files in `schemas/`.

### 4.5 First-party-only for v1

To avoid the sandbox problem, all plugins are first-party Go packages compiled into the binary. The plugin model still gates them through the registry, so the loose-coupling story is real — but loading is at compile time.

Out of scope for v1: Wasm/Go-plugin/binary sandboxing.

---

## 5. Frontend extensions

### 5.1 `frontend/plugins/` folder

```
frontend/
  plugins/
    index.ts                       # registry: discovers all plugin manifests
    types.ts                       # SurfaceMount, PluginManifest, EventEmitter, etc.
    PluginProvider.tsx             # React Context — exposes mount points and event bus
    useMount.ts                    # hook: `<MountPoint id="settings.proctoring" />`
    useEventBus.ts                 # hook: pub/sub for frontend lifecycle events
    runtime.ts                     # bootstraps in candidate app: opens SSE, executes constraints
    proctoring-tab-switch/
      manifest.ts                  # ⇒ same id as backend plugin.json
      SettingsCard.tsx             # mounted at settings.proctoring
      WarningToast.tsx             # mounted at attempt.warning-toast
      runtime.ts                   # registers visibilitychange listener; publishes proctoring.tab.switched
    proctoring-clipboard/
      ...
    proctoring-fullscreen/
      ...
    proctoring-mouse-focus/
      ...
    proctoring-devtools/
      ...
    proctoring-rightclick/
      ...
```

### 5.2 Mount points

A small registry of named "slots" the kernel renders. Plugins declare which slot they mount on; pages render `<MountPoint id="…" />` and the registry collects all matching components.

| Mount ID | Lives in | Purpose |
|---|---|---|
| `sidebar.nav.workspace` | `AdminNav` | Extra workspace nav items |
| `sidebar.nav.system` | `AdminNav` | Extra system nav items |
| `topbar.actions` | `AdminTopbar` | Extra topbar buttons |
| `dashboard.kpi` | `app/admin/page.tsx` | Extra KPI cards |
| `settings.proctoring` | `app/admin/settings/page.tsx` | Proctoring plugin settings cards |
| `settings.scoring` | … | extra scoring rule editors |
| `attempt.toolbar` | candidate attempt screen | Extra in-attempt controls |
| `attempt.warning-toast` | candidate attempt screen | Plugin-emitted warnings |
| `attempt.background` | candidate attempt screen | Headless plugins (e.g. devtools detector) |

Implementation sketch:

```tsx
// types.ts
export type SurfaceMount =
  | "sidebar.nav.workspace" | "sidebar.nav.system"
  | "topbar.actions" | "dashboard.kpi"
  | "settings.proctoring" | "settings.scoring"
  | "attempt.toolbar" | "attempt.warning-toast" | "attempt.background";

export interface FrontendPlugin {
  id: string;                                                 // same as backend slug
  surfaces: { mount: SurfaceMount; Component: ComponentType<{ ctx: PluginCtx }> }[];
  runtime?: (ctx: PluginCtx) => () => void;                   // returns cleanup
}

// index.ts (auto-collected at build time)
import tabSwitch from "./proctoring-tab-switch/manifest";
import clipboard from "./proctoring-clipboard/manifest";
// ...
export const plugins: FrontendPlugin[] = [tabSwitch, clipboard, ...];
```

```tsx
// PluginProvider.tsx
const Ctx = createContext<PluginRuntime | null>(null);
export function PluginProvider({ enabled, children }: { enabled: string[]; children: ReactNode }) {
  const active = useMemo(() => plugins.filter(p => enabled.includes(p.id)), [enabled]);
  // ... start `runtime` for each active plugin, expose mount registry
  return <Ctx.Provider value={runtime}>{children}</Ctx.Provider>;
}

// useMount.tsx
export function MountPoint({ id, ctx }: { id: SurfaceMount; ctx: PluginCtx }) {
  const runtime = useContext(Ctx);
  const slots = runtime.slotsFor(id);
  return <>{slots.map(({ pluginId, Component }) => <Component key={pluginId} ctx={ctx} />)}</>;
}
```

### 5.3 Event bus (frontend)

Minimal pub/sub keyed on the same event kinds the backend uses (`proctoring.tab.switched`, etc.). Plugins publish; the runtime mirrors publications onto the `POST /v1/attempts/{id}/events` batch so the engine sees the same stream.

### 5.4 Enabled-plugin discovery

On attempt start (or admin page load), call `GET /v1/me/plugin-config?attempt_id=…` (new endpoint). The engine returns:

```json
{
  "plugins": [
    { "id": "proctoring.tab-switch", "enabled": true, "config": { "warn_after": 2 } },
    { "id": "proctoring.clipboard",  "enabled": true, "config": { "allow_paste_in": ["textarea#explain"] } }
  ],
  "constraints": [
    { "id": "tab-focus",   "config": { "warn_after": 2 } },
    { "id": "fullscreen",  "config": { "allow_exits": 2 } }
  ]
}
```

The frontend's `PluginProvider` instantiates only plugins in that list. This gives per-attempt and per-org plugin selection without code changes.

---

## 6. Admin Settings page rebuild

The user's reference screenshot shows the Proctoring tab as one card per concern (Camera & Vision, Microphone & Audio, Screen & Browser, AI Monitoring, Identity Verification, Network & Location).

In the new model **each card is a plugin's settings UI**, mounted at `settings.proctoring`. The Settings page becomes:

```tsx
export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("proctoring");
  return (
    <div className="admin-page">
      <PillTabs value={tab} onChange={setTab} tabs={[…]} />
      {tab === "proctoring" && (
        <div className="split-1-aside">
          <MountPoint id="settings.proctoring" />
          <CandidateViewPreview />     {/* kernel-rendered right rail */}
        </div>
      )}
      {tab === "general"        && <KernelGeneralSettings />}
      {tab === "scoring"        && <KernelScoringSettings />}
      {tab === "notifications"  && <MountPoint id="settings.notifications" />}
      {tab === "integrations"   && <MountPoint id="settings.integrations" />}
    </div>
  );
}
```

The cards visible in the design today (Camera & Vision, Microphone & Audio, …) become first-party plugins shipping with the repo. New cards can be added later by dropping a new plugin folder.

---

## 7. Lifecycle of a proctoring violation (worked example)

1. Candidate switches tabs.
2. `proctoring-tab-switch/runtime.ts` (frontend) catches `document.visibilitychange`, publishes `proctoring.tab.switched`.
3. The frontend event bus batches it and `POST /v1/attempts/{id}/events` sends it to the engine.
4. Engine stores it in `attempt_events` and **publishes it on the backend bus**.
5. `proctoring-tab-switch` Go subscriber runs: increments a counter, decides "this is the 3rd switch → terminate".
6. The plugin writes a row to `plugin_decisions` (audit) and emits a command via `runtime/commands`:
   - `POST` → SSE listener on the candidate browser receives `{ kind: "attempt.terminate", reason: "tab-switch-limit-exceeded" }`.
7. Candidate frontend's `runtime/commands` handler routes to the attempt UI, which submits and locks.
8. Admin proctoring page subscribes to `plugin_decisions` updates over SSE and shows the flag in real time.

Every step is plugin-driven. The kernel only knows that *something* emitted an event, *something* decided to terminate, and the candidate has been told.

---

## 8. Open design questions (call out before implementation)

1. **Multi-tenant config:** plugin enable/disable today is platform-wide. Do we need per-org or per-package overrides for v1?
2. **Backwards compatibility:** existing in-process Go handlers (e.g. `assessment.coding`) — leave as kernel-class for now, or refactor through the same Register surface?
3. **Frontend bundle:** lazy-import each plugin to keep the candidate bundle small, or eager-load (simpler)?
4. **SSE vs WebSocket** for the command channel: SSE is enough for engine→client only; WebSocket gives a duplex channel and would let the client-side plugin negotiate with the engine. Recommend SSE for v1.
5. **Test strategy:** plugin developer needs a way to ship integration tests. Pick Vitest for frontend, keep Go's stdlib for backend, define a fixtures dir.

These need user input before §1 of `ROADMAP.md` starts.
