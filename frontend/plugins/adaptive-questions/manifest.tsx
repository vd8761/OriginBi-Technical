"use client";

import type { FrontendPlugin, PluginCtx } from "../types";

const PLUGIN_ID = "feature.adaptive-questions";

/**
 * Adaptive Questions Plugin
 *
 * Mounts an enable/disable toggle in the General settings tab of each
 * per-assessment settings page (mount: "assessment.settings.general").
 *
 * Only shown for aptitude, communication (grammar), mnc, and role assessments.
 * Coding assessments are excluded — the host page passes `moduleType` via ctx.config.
 *
 * When toggled, the plugin publishes "adaptive.enabled.change" with
 * { enabled: boolean } so the host page can include it in the save payload.
 */

const SUPPORTED_MODULES = new Set(["aptitude", "communication", "grammar", "mnc", "role"]);

function AdaptiveQuestionsSettingsCard({ ctx }: { ctx: PluginCtx }) {
  const moduleType = String(ctx.config.moduleType ?? "");
  const enabled = Boolean(ctx.config.adaptiveEnabled ?? false);

  // Don't render for coding or unsupported modules
  if (!SUPPORTED_MODULES.has(moduleType)) return null;

  const handleChange = (checked: boolean) => {
    ctx.publish("adaptive.enabled.change", { enabled: checked });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
      <div className="sm:max-w-md">
        <label className="block text-[15px] font-bold leading-tight text-slate-900 dark:text-white">
          Adaptive Questions
        </label>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
          Dynamically adjust question difficulty based on candidate performance.
          Each block of questions adapts to how well the candidate answered the
          previous block — upgrading difficulty on strong performance and
          downgrading on weak performance.
        </p>
        <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          Only available for Aptitude, Communication, MNC, and Role-Based assessments.
        </p>
      </div>
      <div className="sm:max-w-[400px] w-full flex justify-end">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => handleChange(!enabled)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 ${
            enabled ? "bg-brand-green" : "bg-slate-200 dark:bg-white/10"
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

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
  ],
};

export default adaptiveQuestionsPlugin;
