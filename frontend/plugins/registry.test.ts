import { describe, expect, it } from "vitest";
import { plugins } from "./registry";

describe("plugin registry", () => {
  it("loads at least one plugin manifest", () => {
    expect(plugins.length).toBeGreaterThan(0);
  });

  it("requires every manifest to declare a stable id", () => {
    for (const p of plugins) {
      expect(typeof p.id).toBe("string");
      expect(p.id.length).toBeGreaterThan(0);
    }
  });

  it("rejects duplicate ids", () => {
    const ids = plugins.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("every surface targets a known SurfaceMount id", () => {
    const known = new Set([
      "sidebar.nav.workspace",
      "sidebar.nav.system",
      "topbar.actions",
      "dashboard.kpi",
      "dashboard.tiles",
      "settings.proctoring",
      "settings.scoring",
      "settings.notifications",
      "settings.integrations",
      "attempt.toolbar",
      "attempt.warning-toast",
      "attempt.background",
    ]);
    for (const p of plugins) {
      for (const s of p.surfaces ?? []) {
        expect(known.has(s.mount)).toBe(true);
      }
    }
  });

  it("includes the expected first-party proctoring plugins", () => {
    const ids = new Set(plugins.map((p) => p.id));
    for (const expected of [
      "proctoring.camera-vision",
      "proctoring.microphone-audio",
      "proctoring.screen-browser",
      "proctoring.tab-switch",
      "proctoring.ai-monitoring",
      "proctoring.identity-verification",
      "proctoring.network-location",
    ]) {
      expect(ids.has(expected)).toBe(true);
    }
  });
});
