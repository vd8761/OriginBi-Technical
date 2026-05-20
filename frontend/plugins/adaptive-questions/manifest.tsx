"use client";

import React, { lazy, Suspense } from "react";
import { Switch } from "@/components/ui/Switch";
import type { FrontendPlugin, PluginCtx } from "../types";

const PLUGIN_ID = "feature.adaptive-questions";

const SUPPORTED_MODULES = new Set(["aptitude", "communication", "grammar", "mnc", "role"]);

// ── Lazy-load the v2 engine and report so they don't bloat the main bundle ────
const AdaptiveEngineV2 = lazy(() =>
  import("@/components/assessment/aptitude/AdaptiveEngineV2"),
);
const AdaptiveReportV2 = lazy(() =>
  import("@/components/assessment/aptitude/AdaptiveReportV2"),
);

// ── Settings toggle (admin assessment settings page) ──────────────────────────
function AdaptiveQuestionsSettingsCard({ ctx }: { ctx: PluginCtx }) {
  const moduleType = String(ctx.config.moduleType ?? "");
  const enabled = Boolean(ctx.config.adaptiveEnabled ?? false);

  if (!SUPPORTED_MODULES.has(moduleType)) return null;

  const handleChange = (checked: boolean) => {
    ctx.publish("adaptive.enabled.change", { enabled: checked });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
      <div className="sm:max-w-md">
        <label className="block text-[15px] font-bold leading-tight text-slate-900 dark:text-white">
          Adaptive Questions (v2)
        </label>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
          Snapshot-Based Marks Blueprint Block Adaptive Assessment. Questions are
          selected by marks target, mixed categories, and subcategory rotation.
          Difficulty adapts block-by-block using readiness score, skip impact,
          and time efficiency. Candidates can edit previous answers — reliability
          score tracks how much changed after the adaptive path was set.
        </p>
        <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          Requires blueprint setup via Admin → Assessment → Setup Blueprint.
          Available for Aptitude, Communication, MNC, and Role-Based assessments.
        </p>
      </div>
      <div className="sm:max-w-[400px] w-full flex justify-end">
        <Switch
          checked={enabled}
          onCheckedChange={handleChange}
          aria-label="Enable Adaptive Questions v2"
        />
      </div>
    </div>
  );
}

// ── Adaptive engine surface (replaces the standard aptitude engine) ───────────
function AdaptiveEngineMount({ ctx }: { ctx: PluginCtx }) {
  const {
    assessmentId,
    userId,
    attemptToken,
    mode = "main",
    onComplete,
    adaptiveEnabled,
  } = ctx.config as {
    assessmentId?: number;
    userId?: number;
    attemptToken?: string;
    mode?: "trial" | "main";
    onComplete?: (report: any) => void;
    adaptiveEnabled?: boolean;
  };

  // Only render if adaptive is enabled and we have the required props
  if (!adaptiveEnabled || !assessmentId || !userId || !attemptToken || !onComplete) {
    return null;
  }

  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8f5] dark:bg-[#0f1712]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
      </div>
    }>
      <AdaptiveEngineV2
        assessmentId={assessmentId}
        userId={userId}
        attemptToken={attemptToken}
        mode={mode}
        onComplete={onComplete}
      />
    </Suspense>
  );
}

// ── Adaptive report surface ───────────────────────────────────────────────────
function AdaptiveReportMount({ ctx }: { ctx: PluginCtx }) {
  const { report, onClose, adaptiveEnabled } = ctx.config as {
    report?: any;
    onClose?: () => void;
    adaptiveEnabled?: boolean;
  };

  if (!adaptiveEnabled || !report) return null;

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading report...</div>}>
      <AdaptiveReportV2 report={report} onClose={onClose} />
    </Suspense>
  );
}

// ── Plugin definition ─────────────────────────────────────────────────────────
const adaptiveQuestionsPlugin: FrontendPlugin = {
  id: PLUGIN_ID,
  priority: 10,
  alwaysActive: true,
  surfaces: [
    {
      mount: "assessment.settings.general",
      label: "Adaptive Questions",
      Component: AdaptiveQuestionsSettingsCard,
    },
    {
      // Host page mounts this surface when adaptive is enabled.
      // If the plugin renders (returns non-null), the host should
      // skip rendering the standard AptitudeEngine.
      mount: "assessment.aptitude.engine",
      label: "Adaptive Engine v2",
      Component: AdaptiveEngineMount,
    },
    {
      // Host page mounts this surface on the results/score page.
      mount: "assessment.aptitude.report",
      label: "Adaptive Report v2",
      Component: AdaptiveReportMount,
    },
  ],
};

export default adaptiveQuestionsPlugin;
