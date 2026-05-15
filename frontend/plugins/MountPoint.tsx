"use client";

import { usePluginRuntime } from "./PluginProvider";
import type { PluginCtx, SurfaceMount } from "./types";

interface Props {
  id: SurfaceMount;
  /**
   * If a plugin needs a piece of host state inside its surface (e.g. the
   * current attempt id), the host page passes it in via `ctx` — this hook is
   * optional and most mount points can leave it undefined.
   */
  ctx?: Partial<PluginCtx>;
  /**
   * Optional fallback to render when no plugin contributes to this mount.
   * Default is nothing (the mount disappears). Useful for sections that
   * should always show a heading or divider even if empty.
   */
  fallback?: React.ReactNode;
}

export function MountPoint({ id, ctx, fallback = null }: Props) {
  const runtime = usePluginRuntime();
  if (!runtime) return <>{fallback}</>;

  const slots = runtime.slotsFor(id);
  if (slots.length === 0) return <>{fallback}</>;

  return (
    <>
      {slots.map(({ pluginId, Component, label }) => {
        const composed: PluginCtx = {
          pluginId,
          config: runtime.configFor(pluginId),
          publish: runtime.publish,
          subscribe: runtime.subscribe,
          surface: { mount: id, label },
          ...ctx,
        };
        return <Component key={`${id}:${pluginId}`} ctx={composed} />;
      })}
    </>
  );
}
