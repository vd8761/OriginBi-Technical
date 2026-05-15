"use client";

import { Fingerprint } from "lucide-react";
import { ToggleSwitch } from "@/components/admin/ui";
import type { FrontendPlugin, PluginCtx } from "../types";
import {
  ProctorCard,
  ProctorRow,
  usePersistedPluginConfig,
} from "../proctoringControls";

interface IdentityVerificationConfig {
  enabled: boolean;
  idUpload: boolean;
  livenessCheck: boolean;
  photoAtStart: boolean;
}

const defaults: IdentityVerificationConfig = {
  enabled: true,
  idUpload: true,
  livenessCheck: true,
  photoAtStart: true,
};

function IdentityVerificationCard({ ctx }: { ctx: PluginCtx }) {
  const [config, update] = usePersistedPluginConfig(ctx, defaults);

  return (
    <ProctorCard
      icon={<Fingerprint size={20} />}
      title="Identity Verification"
      subtitle="Pre-exam identity proofing."
      toggle={{ checked: config.enabled, onChange: (value) => update("enabled", value) }}
    >
      <ProctorRow
        label="Government ID upload"
        hint="Require government photo ID before the session begins."
        control={<ToggleSwitch checked={config.idUpload} onChange={(value) => update("idUpload", value)} />}
      />
      <ProctorRow
        label="Liveness check"
        hint="3-second blink / head-turn before entering the exam."
        control={<ToggleSwitch checked={config.livenessCheck} onChange={(value) => update("livenessCheck", value)} />}
      />
      <ProctorRow
        label="Photo at exam start"
        hint="Capture a baseline photo to match against later frames."
        control={<ToggleSwitch checked={config.photoAtStart} onChange={(value) => update("photoAtStart", value)} />}
      />
    </ProctorCard>
  );
}

const plugin: FrontendPlugin = {
  id: "proctoring.identity-verification",
  priority: 50,
  surfaces: [{ mount: "settings.proctoring", label: "Identity Verification", Component: IdentityVerificationCard }],
};

export default plugin;
