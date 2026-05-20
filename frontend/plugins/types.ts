import type { ComponentType, ReactNode } from "react";

/**
 * The set of mount-point ids the kernel renders.
 *
 * Adding a new id here is a kernel change. Plugins themselves only reference
 * these by string — `SurfaceMount` exists to keep them in sync at compile
 * time so a typo doesn't silently render nothing.
 *
 * Mount points live in:
 *  - `sidebar.nav.workspace` / `sidebar.nav.system` → components/admin/AdminNav.tsx
 *  - `topbar.actions`                                → components/admin/AdminTopbar.tsx
 *  - `dashboard.kpi` / `dashboard.tiles`             → app/admin/page.tsx
 *  - `settings.proctoring`                           → app/admin/settings/page.tsx (Phase E)
 *  - `assessment.settings.general`                   → components/admin/questions/AssessmentSettingsPage.tsx
 *  - `attempt.toolbar` / `attempt.warning-toast` /
 *    `attempt.background`                            → candidate attempt screen
 */
export type SurfaceMount =
  | "sidebar.nav.workspace"
  | "sidebar.nav.system"
  | "topbar.actions"
  | "dashboard.kpi"
  | "dashboard.tiles"
  | "settings.proctoring"
  | "settings.scoring"
  | "settings.notifications"
  | "settings.integrations"
  | "assessment.settings.general"
  | "assessment.aptitude.engine"
  | "assessment.aptitude.report"
  | "attempt.toolbar"
  | "attempt.warning-toast"
  | "attempt.background";

/**
 * `PluginCtx` is what the kernel hands to every plugin surface and runtime.
 * It exposes the bits a plugin legitimately needs (publish events, send
 * commands back to the engine, read its resolved config) without giving it
 * a backdoor to the rest of the app state.
 */
export interface PluginCtx {
  pluginId: string;
  /** The plugin's resolved configuration for this session/attempt. */
  config: Record<string, unknown>;
  /** Publish a typed event onto the frontend bus. Mirrored to the engine if an attempt is active. */
  publish: (kind: string, payload?: unknown) => void;
  /** Subscribe to events on the frontend bus. Returns an unsubscribe fn. */
  subscribe: (kind: string, handler: (payload: unknown) => void) => () => void;
  /** Surface metadata for the host component (e.g. mount id, label). */
  surface?: {
    mount: SurfaceMount;
    label?: string;
  };
}

/**
 * A single contribution a plugin makes to a kernel mount point. The kernel
 * collects every `Surface` whose `mount` matches the rendered `<MountPoint>`
 * id and renders each `Component` in registration order.
 */
export interface PluginSurface {
  mount: SurfaceMount;
  label?: string;
  Component: ComponentType<{ ctx: PluginCtx }>;
}

/**
 * A frontend plugin manifest. Mirrors the backend manifest in spirit but
 * names match the React side: surfaces, not admin_ui/candidate_ui. The same
 * plugin's backend and frontend halves share `id`.
 *
 * `runtime` is the side-effect hook: it boots when the plugin is enabled
 * (e.g. registers a `visibilitychange` listener) and returns a cleanup fn.
 */
export interface FrontendPlugin {
  id: string;
  /** Higher number = registers later. Stable ordering inside a mount. */
  priority?: number;
  /** When true, this plugin is always active in admin regardless of the backend enabled list. */
  alwaysActive?: boolean;
  surfaces?: PluginSurface[];
  runtime?: (ctx: PluginCtx) => () => void;
}

/**
 * The shape of a single entry in the kernel's slot table — what
 * `useMount` returns. `pluginId` is included so the kernel can key on it.
 */
export interface MountSlot {
  pluginId: string;
  Component: ComponentType<{ ctx: PluginCtx }>;
  label?: string;
}

/**
 * `EnabledPluginConfig` is the per-plugin config the kernel resolved on
 * boot. Mirrors `pluginConfigEntry` returned by GET /v1/me/plugin-config.
 */
export interface EnabledPluginConfig {
  id: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

/**
 * Plugin runtime exposed via the React context. Pages call `slotsFor(id)`
 * to render mount points; plugins inside their components / runtimes call
 * `publish` / `subscribe` to drive behaviour.
 */
export interface PluginRuntime {
  slotsFor: (mount: SurfaceMount) => MountSlot[];
  publish: (kind: string, payload?: unknown) => void;
  subscribe: (kind: string, handler: (payload: unknown) => void) => () => void;
  configFor: (pluginId: string) => Record<string, unknown>;
}

/** Helper for typed `children` on the provider without leaking React imports. */
export type WithChildren<T = unknown> = T & { children?: ReactNode };
