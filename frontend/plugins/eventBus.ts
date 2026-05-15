/**
 * Minimal in-process publish/subscribe for the frontend.
 *
 * Symmetric to `internal/pluginhost/eventbus.go`: subscribers run
 * synchronously and an error in one does not stop the others. Plugin
 * runtimes publish events here; `PluginProvider` mirrors publications onto
 * `POST /v1/attempts/{id}/events` when an attempt is in progress so the
 * engine sees the same stream.
 */
export type EventHandler = (payload: unknown) => void;
export type EventTap = (kind: string, payload: unknown) => void;

export interface FrontendEventBus {
  publish: (kind: string, payload?: unknown) => void;
  subscribe: (kind: string, handler: EventHandler) => () => void;
  tap: (handler: EventTap) => () => void;
  /** Test hook: how many subscribers are listening for `kind`. */
  listenerCount: (kind: string) => number;
}

export function createEventBus(onError?: (kind: string, err: unknown) => void): FrontendEventBus {
  const handlers = new Map<string, Set<EventHandler>>();
  const taps = new Set<EventTap>();

  return {
    publish(kind, payload) {
      const subs = handlers.get(kind);
      for (const handler of subs ?? []) {
        try {
          handler(payload);
        } catch (err) {
          if (onError) onError(kind, err);
          else if (typeof console !== "undefined") console.error(`[plugins] subscriber for "${kind}" threw`, err);
        }
      }
      for (const tap of taps) {
        try {
          tap(kind, payload);
        } catch (err) {
          if (onError) onError(kind, err);
          else if (typeof console !== "undefined") console.error(`[plugins] tap for "${kind}" threw`, err);
        }
      }
    },
    subscribe(kind, handler) {
      let subs = handlers.get(kind);
      if (!subs) {
        subs = new Set();
        handlers.set(kind, subs);
      }
      subs.add(handler);
      return () => {
        subs!.delete(handler);
        if (subs!.size === 0) handlers.delete(kind);
      };
    },
    tap(handler) {
      taps.add(handler);
      return () => taps.delete(handler);
    },
    listenerCount(kind) {
      return handlers.get(kind)?.size ?? 0;
    },
  };
}
