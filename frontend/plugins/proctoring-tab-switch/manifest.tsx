"use client";

import { useEffect, useRef, useState } from "react";
import { PanelTopClose, ShieldAlert } from "lucide-react";
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
const EVENT_WARNING = "attempt.warning-toast";
const EVENT_TERMINATE = "attempt.terminate";

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

function WarningToast({ ctx }: { ctx: PluginCtx }) {
  const [message, setMessage] = useState<{ title: string; body: string; tone: "warn" | "danger" } | null>(null);
  const hideTimer = useRef<number | null>(null);

  const show = (title: string, body: string, tone: "warn" | "danger" = "warn", sticky = false) => {
    setMessage({ title, body, tone });
    if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
    if (!sticky) {
      hideTimer.current = window.setTimeout(() => setMessage(null), 4500);
    }
  };

  useEffect(() => {
    const cleanups = [
      ctx.subscribe(EVENT_SWITCHED, (payload) => {
        const data = payloadToRecord(payload);
        const count = Number(data.count ?? 1);
        const threshold = Number(data.threshold ?? ctx.config.threshold ?? 3);
        const remaining = Math.max(0, threshold - count);
        show(
          "Tab switch detected",
          remaining > 0
            ? `${count} of ${threshold} recorded. Stay on this tab to avoid auto-submit.`
            : "The tab-switch limit has been reached.",
        );
      }),
      ctx.subscribe(EVENT_WARNING, (payload) => {
        const data = payloadToRecord(payload);
        show(
          String(data.title ?? "Proctoring warning"),
          String(data.message ?? "Stay on this tab during the assessment."),
        );
      }),
      ctx.subscribe(EVENT_TERMINATE, (payload) => {
        const data = payloadToRecord(payload);
        show(
          String(data.title ?? "Assessment locked"),
          String(data.message ?? "Your attempt is being submitted."),
          "danger",
          true,
        );
      }),
    ];
    return () => {
      for (const cleanup of cleanups) cleanup();
      if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
    };
  }, [ctx]);

  if (!message) return null;

  const danger = message.tone === "danger";
  return (
    <div className="pointer-events-none fixed left-1/2 top-20 z-[170] -translate-x-1/2">
      <div
        className="flex max-w-[440px] items-start gap-3 rounded-2xl px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        style={{
          background: "color-mix(in srgb, var(--c-card) 96%, transparent)",
          border: `1px solid ${danger ? "rgba(237,47,52,0.55)" : "rgba(255,183,3,0.45)"}`,
        }}
      >
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
          style={{
            background: danger ? "rgba(237,47,52,0.16)" : "rgba(255,183,3,0.16)",
            color: danger ? "#ED2F34" : "#FFB703",
          }}
        >
          <ShieldAlert size={16} />
        </div>
        <div className="text-[12.5px] leading-snug">
          <div className="font-bold" style={{ color: danger ? "#ff8a8d" : "var(--c-warn)" }}>
            {message.title}
          </div>
          <div className="mt-0.5" style={{ color: "var(--c-text-soft)" }}>{message.body}</div>
        </div>
      </div>
    </div>
  );
}

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
    {
      mount: "attempt.warning-toast",
      label: "Tab switch warnings",
      Component: WarningToast,
    },
  ],
};

function payloadToRecord(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

export default proctoringTabSwitch;
