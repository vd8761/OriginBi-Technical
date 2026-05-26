import { describe, expect, it, vi } from "vitest";
import { createEventBus } from "./eventBus";

describe("eventBus", () => {
  it("fans out a publish to every subscriber for that kind", () => {
    const bus = createEventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe("proctoring.tab.switched", a);
    bus.subscribe("proctoring.tab.switched", b);
    bus.publish("proctoring.tab.switched", { count: 1 });
    expect(a).toHaveBeenCalledWith({ count: 1 });
    expect(b).toHaveBeenCalledWith({ count: 1 });
  });

  it("isolates a thrown subscriber error so siblings still receive the payload", () => {
    const onError = vi.fn();
    const bus = createEventBus(onError);
    const survivor = vi.fn();
    bus.subscribe("kind.x", () => {
      throw new Error("boom");
    });
    bus.subscribe("kind.x", survivor);
    bus.publish("kind.x", "payload");
    expect(survivor).toHaveBeenCalledWith("payload");
    expect(onError).toHaveBeenCalledTimes(1);
    const [kind, err] = onError.mock.calls[0];
    expect(kind).toBe("kind.x");
    expect((err as Error).message).toBe("boom");
  });

  it("unsubscribes when the returned disposer is called", () => {
    const bus = createEventBus();
    const handler = vi.fn();
    const dispose = bus.subscribe("kind.y", handler);
    bus.publish("kind.y", 1);
    dispose();
    bus.publish("kind.y", 2);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount("kind.y")).toBe(0);
  });

  it("delivers to taps in addition to per-kind subscribers", () => {
    const bus = createEventBus();
    const tap = vi.fn();
    const untap = bus.tap(tap);
    bus.publish("any.kind", { ok: true });
    expect(tap).toHaveBeenCalledWith("any.kind", { ok: true });
    untap();
    bus.publish("any.kind", { ok: false });
    expect(tap).toHaveBeenCalledTimes(1);
  });

  it("tap errors are isolated and routed through onError", () => {
    const onError = vi.fn();
    const bus = createEventBus(onError);
    bus.tap(() => {
      throw new Error("tap-failed");
    });
    bus.publish("kind.z", 42);
    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0][1] as Error).message).toBe("tap-failed");
  });
});
