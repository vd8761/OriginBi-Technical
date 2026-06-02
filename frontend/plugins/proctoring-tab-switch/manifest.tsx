"use client";

import { PanelTopClose } from "lucide-react";
import { Badge } from "@/components/admin/ui";
import type { FrontendPlugin, PluginCtx } from "../types";
import {
  IntervalSlider,
  ProctorCard,
  ProctorRow,
  usePersistedPluginConfig,
} from "../proctoringControls";

const PLUGIN_ID = "proctoring.tab-switch";
const EVENT_SWITCHED = "proctoring.tab.switched";
const EVENT_REFOCUSED = "proctoring.tab.refocused";

interface TabSwitchConfig {
  enabled: boolean;
  threshold: number;
  graceMs: number;
}

const defaults: TabSwitchConfig = {
  enabled: true,
  threshold: 3,
  graceMs: 10000,
};

function boolConfig(config: Record<string, unknown>, key: string, fallback: boolean) {
  const value = config[key];
  return typeof value === "boolean" ? value : fallback;
}

function numConfig(config: Record<string, unknown>, key: string, fallback: number) {
  const value = config[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function TabSwitchSettingsCard({ ctx }: { ctx: PluginCtx }) {
  const [config, update] = usePersistedPluginConfig(ctx, defaults);

  return (
    <ProctorCard
      icon={<PanelTopClose size={20} />}
      title="Tab Switching"
      subtitle="Detects tab/window focus loss and auto-terminates after the limit."
      badge={<Badge tone="green" dot>Plugin</Badge>}
      toggle={{ checked: config.enabled, onChange: (value) => update("enabled", value) }}
    >
      <ProctorRow
        label="Switch limit"
        hint="The backend emits an auto-terminate command at this count."
        control={
          <input
            type="number"
            min={1}
            max={20}
            value={config.threshold}
            onChange={(event) => update("threshold", Number(event.target.value))}
            className="admin-field admin-proctor-num"
          />
        }
      />
      <ProctorRow
        label="Grace period"
        hint="Ignored after the attempt first opens."
        control={
          <IntervalSlider
            value={Math.round(config.graceMs / 1000)}
            onChange={(value) => update("graceMs", value * 1000)}
            min={0}
            max={60}
          />
        }
      />
    </ProctorCard>
  );
}

// NOTE: this plugin no longer renders its own warning toast. All proctoring
// warnings (tab-switch, camera, fullscreen, copy/paste, backend
// attempt.warning-toast, attempt.terminate) are funnelled into the single
// kernel toast in CodingAssessment so only ONE message shows at a time. This
// plugin keeps its visibility-detection runtime (which feeds the backend
// counter) and its settings card.

const proctoringTabSwitch: FrontendPlugin = {
  id: PLUGIN_ID,
  priority: 35,
  runtime(ctx) {
    if (typeof document === "undefined") return () => {};
    if (!boolConfig(ctx.config, "enabled", true)) return () => {};

    const threshold = numConfig(ctx.config, "threshold", 3);
    const graceMs = numConfig(ctx.config, "graceMs", 10000);
    const graceUntil = Date.now() + graceMs;
    let count = 0;
    let hiddenAt: number | null = null;

    const onVisibility = () => {
      const now = Date.now();
      if (document.visibilityState === "hidden") {
        if (now < graceUntil) return;
        count += 1;
        hiddenAt = now;
        ctx.publish(EVENT_SWITCHED, {
          reason: "visibilitychange",
          visibilityState: document.visibilityState,
          count,
          threshold,
          hiddenAt: new Date(now).toISOString(),
        });
        return;
      }
      if (document.visibilityState === "visible" && hiddenAt != null) {
        ctx.publish(EVENT_REFOCUSED, {
          count,
          durationMs: now - hiddenAt,
          returnedAt: new Date(now).toISOString(),
        });
        hiddenAt = null;
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  },
  surfaces: [
    {
      mount: "settings.proctoring",
      label: "Tab Switching",
      Component: TabSwitchSettingsCard,
    },
  ],
};

export default proctoringTabSwitch;
