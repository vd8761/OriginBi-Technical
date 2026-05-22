"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { sendAttemptEvents, type AttemptEventInput } from "@/lib/api";
import { createEventBus, type FrontendEventBus } from "./eventBus";
import { plugins as installedPlugins } from "./registry";
import type {
  EnabledPluginConfig,
  MountSlot,
  PluginCtx,
  PluginRuntime,
  SurfaceMount,
} from "./types";

const RuntimeContext = createContext<PluginRuntime | null>(null);

interface ProviderProps {
  enabled?: EnabledPluginConfig[] | null;
  attemptId?: string | null;
  children: ReactNode;
}

const PUBLISH_DEBOUNCE_MS = 750;

export function PluginProvider({ enabled, attemptId, children }: ProviderProps) {
  const bus = useMemo<FrontendEventBus>(() => createEventBus(), []);
  const pendingEventsRef = useRef<AttemptEventInput[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { active, configByPlugin } = useMemo(() => {
    const ordered = installedPlugins.slice().sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
    );
    if (enabled === null || enabled === undefined) {
      return { active: ordered, configByPlugin: {} as Record<string, Record<string, unknown>> };
    }
    const byId = new Map(enabled.filter((e) => e.enabled).map((e) => [e.id, e]));
    // Always include plugins marked alwaysActive (frontend-only plugins not in backend registry)
    const filtered = ordered.filter((p) => p.alwaysActive || byId.has(p.id));
    const configMap: Record<string, Record<string, unknown>> = {};
    for (const p of filtered) {
      configMap[p.id] = byId.get(p.id)?.config ?? {};
    }
    return { active: filtered, configByPlugin: configMap };
  }, [enabled]);

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    for (const plugin of active) {
      if (!plugin.runtime) continue;
      const ctx: PluginCtx = {
        pluginId: plugin.id,
        config: configByPlugin[plugin.id] ?? {},
        publish: (kind, payload) => bus.publish(kind, payload),
        subscribe: (kind, handler) => bus.subscribe(kind, handler),
      };
      try {
        const cleanup = plugin.runtime(ctx);
        if (typeof cleanup === "function") cleanups.push(cleanup);
      } catch (err) {
        console.error(`[plugins] runtime for "${plugin.id}" threw at boot`, err);
      }
    }
    return () => {
      for (const cleanup of cleanups) {
        try {
          cleanup();
        } catch (err) {
          console.warn("[plugins] cleanup threw", err);
        }
      }
    };
  }, [active, bus, configByPlugin]);

  useEffect(() => {
    if (!attemptId) return;

    const flush = (keepalive = false) => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      const batch = pendingEventsRef.current;
      if (batch.length === 0) return;
      pendingEventsRef.current = [];
      void sendAttemptEvents(attemptId, batch, { keepalive }).catch((err) => {
        console.warn("[plugins] mirror to backend failed", err);
        pendingEventsRef.current = [...batch, ...pendingEventsRef.current].slice(0, 200);
      });
    };

    const untap = bus.tap((kind, payload) => {
      if (!shouldMirrorEvent(kind)) return;
      pendingEventsRef.current.push({
        kind,
        occurred_at: new Date().toISOString(),
        severity: severityForKind(kind),
        payload: payloadToRecord(payload),
      });
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => flush(false), PUBLISH_DEBOUNCE_MS);
      }
    });

    const flushOnExit = () => flush(true);
    window.addEventListener("pagehide", flushOnExit);
    document.addEventListener("visibilitychange", flushOnExit);

    return () => {
      untap();
      window.removeEventListener("pagehide", flushOnExit);
      document.removeEventListener("visibilitychange", flushOnExit);
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      flush(true);
    };
  }, [attemptId, bus]);

  const runtime = useMemo<PluginRuntime>(() => {
    const slotsByMount = new Map<SurfaceMount, MountSlot[]>();
    for (const plugin of active) {
      for (const surface of plugin.surfaces ?? []) {
        const list = slotsByMount.get(surface.mount) ?? [];
        list.push({
          pluginId: plugin.id,
          Component: surface.Component,
          label: surface.label,
        });
        slotsByMount.set(surface.mount, list);
      }
    }
    return {
      slotsFor: (mount) => slotsByMount.get(mount) ?? [],
      publish: (kind, payload) => bus.publish(kind, payload),
      subscribe: (kind, handler) => bus.subscribe(kind, handler),
      configFor: (pluginId) => configByPlugin[pluginId] ?? {},
    };
  }, [active, bus, configByPlugin]);

  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}

export function usePluginRuntime(): PluginRuntime | null {
  return useContext(RuntimeContext);
}

function shouldMirrorEvent(kind: string) {
  if (kind.startsWith("attempt.")) return false;
  if (kind === "warning.show") return false;
  return true;
}

function severityForKind(kind: string) {
  if (kind === "proctoring.tab.switched") return 2;
  if (kind.startsWith("proctoring.")) return 1;
  return 0;
}

function payloadToRecord(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  if (payload == null) return {};
  return { value: payload };
}
