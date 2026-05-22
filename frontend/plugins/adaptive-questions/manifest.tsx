"use client";

import React, { lazy, Suspense } from "react";
import type { FrontendPlugin, PluginCtx } from "../types";

const PLUGIN_ID = "feature.adaptive-questions";

// ── Lazy-load the v2 engine and report so they don't bloat the main bundle ────
const AdaptiveEngineV2 = lazy(() =>
  import("@/components/assessment/aptitude/AdaptiveEngineV2"),
);
const AdaptiveReportV2 = lazy(() =>
  import("@/components/assessment/aptitude/AdaptiveReportV2"),
);

// ── Adaptive engine surface (replaces the standard aptitude engine) ───────────
// The host page mounts this surface when adaptive_enabled is true.
// If this component renders (returns non-null), the host skips the standard engine.
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
// Host page mounts this on the results/score page when adaptive_enabled is true.
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
// NOTE: The settings toggle has been moved to the dedicated "Adaptive" tab in
// Assessment Settings (AssessmentSettingsPage.tsx). The plugin no longer mounts
// anything on assessment.settings.general — that surface is intentionally empty.
const adaptiveQuestionsPlugin: FrontendPlugin = {
  id: PLUGIN_ID,
  priority: 10,
  alwaysActive: true,
  surfaces: [
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
