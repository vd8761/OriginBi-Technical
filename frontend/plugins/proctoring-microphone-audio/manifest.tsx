"use client";

import { Mic } from "lucide-react";
import { ToggleSwitch } from "@/components/admin/ui";
import type { FrontendPlugin, PluginCtx } from "../types";
import {
  ProctorCard,
  ProctorRow,
  usePersistedPluginConfig,
} from "../proctoringControls";

interface MicrophoneConfig {
  enabled: boolean;
  noiseAlert: boolean;
}

const defaults: MicrophoneConfig = {
  enabled: true,
  noiseAlert: true,
};

function MicrophoneAudioCard({ ctx }: { ctx: PluginCtx }) {
  const [config, update] = usePersistedPluginConfig(ctx, defaults);

  return (
    <ProctorCard
      icon={<Mic size={20} />}
      title="Microphone & Audio"
      subtitle="Voice and background-noise sensitivity."
      toggle={{ checked: config.enabled, onChange: (value) => update("enabled", value) }}
    >
      <ProctorRow
        label="Background noise alert"
        hint="Flag continuous voices or external speech in audio stream."
        control={<ToggleSwitch checked={config.noiseAlert} onChange={(value) => update("noiseAlert", value)} />}
      />
    </ProctorCard>
  );
}

const plugin: FrontendPlugin = {
  id: "proctoring.microphone-audio",
  priority: 20,
  surfaces: [{ mount: "settings.proctoring", label: "Microphone & Audio", Component: MicrophoneAudioCard }],
};

export default plugin;
