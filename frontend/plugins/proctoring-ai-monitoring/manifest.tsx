"use client";

import { Sparkles } from "lucide-react";
import { Badge, ToggleSwitch } from "@/components/admin/ui";
import type { FrontendPlugin, PluginCtx } from "../types";
import {
  ProctorCard,
  ProctorRow,
  usePersistedPluginConfig,
} from "../proctoringControls";

interface AiMonitoringConfig {
  enabled: boolean;
  eyeTracking: boolean;
  suspiciousActivity: boolean;
  lipSync: boolean;
  plagiarism: boolean;
}

const defaults: AiMonitoringConfig = {
  enabled: true,
  eyeTracking: false,
  suspiciousActivity: true,
  lipSync: false,
  plagiarism: true,
};

function AiMonitoringCard({ ctx }: { ctx: PluginCtx }) {
  const [config, update] = usePersistedPluginConfig(ctx, defaults);

  return (
    <ProctorCard
      icon={<Sparkles size={20} />}
      title="AI Monitoring"
      subtitle="Heuristic models for behaviour anomalies."
      badge={<Badge tone="purple">BETA</Badge>}
      toggle={{ checked: config.enabled, onChange: (value) => update("enabled", value) }}
    >
      <ProctorRow
        label="Eye / gaze tracking"
        hint="Track gaze direction within the exam window."
        control={<ToggleSwitch checked={config.eyeTracking} onChange={(value) => update("eyeTracking", value)} />}
      />
      <ProctorRow
        label="Suspicious activity AI"
        hint="Detect off-screen consultation and pose anomalies."
        control={
          <ToggleSwitch
            checked={config.suspiciousActivity}
            onChange={(value) => update("suspiciousActivity", value)}
          />
        }
      />
      <ProctorRow
        label="Lip-sync verification"
        hint="Match speech audio to lip movement during oral sections."
        control={<ToggleSwitch checked={config.lipSync} onChange={(value) => update("lipSync", value)} />}
      />
      <ProctorRow
        label="Plagiarism / similarity"
        hint="MOSS-style similarity across coding submissions."
        control={<ToggleSwitch checked={config.plagiarism} onChange={(value) => update("plagiarism", value)} />}
      />
    </ProctorCard>
  );
}

const plugin: FrontendPlugin = {
  id: "proctoring.ai-monitoring",
  priority: 40,
  surfaces: [{ mount: "settings.proctoring", label: "AI Monitoring", Component: AiMonitoringCard }],
};

export default plugin;
