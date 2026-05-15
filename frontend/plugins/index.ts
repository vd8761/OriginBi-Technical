export { PluginProvider, usePluginRuntime } from "./PluginProvider";
export { MountPoint } from "./MountPoint";
export { createEventBus } from "./eventBus";
export { plugins } from "./registry";
export { useCommandStream } from "./useCommandStream";
export { fetchCandidatePluginConfig, fetchAdminPluginConfig } from "./discovery";
export type {
  EnabledPluginConfig,
  FrontendPlugin,
  MountSlot,
  PluginCtx,
  PluginRuntime,
  PluginSurface,
  SurfaceMount,
  WithChildren,
} from "./types";
export type { FrontendEventBus, EventHandler } from "./eventBus";
