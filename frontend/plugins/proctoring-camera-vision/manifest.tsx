"use client";

import { Camera } from "lucide-react";
import { ToggleSwitch } from "@/components/admin/ui";
import type { FrontendPlugin, PluginCtx } from "../types";
import {
  IntervalSlider,
  Pills,
  ProctorCard,
  ProctorRow,
  usePersistedPluginConfig,
} from "../proctoringControls";

type CaptureMode = "interval" | "random" | "event";
type MultiFaceResponse = "flag" | "warn" | "terminate";

interface CameraConfig {
  enabled: boolean;
  captureMode: CaptureMode;
  intervalSec: number;
  faceDetect: boolean;
  multiFace: MultiFaceResponse;
}

const defaults: CameraConfig = {
  enabled: true,
  captureMode: "interval",
  intervalSec: 30,
  faceDetect: true,
  multiFace: "flag",
};

function CameraVisionCard({ ctx }: { ctx: PluginCtx }) {
  const [config, update] = usePersistedPluginConfig(ctx, defaults);

  return (
    <ProctorCard
      icon={<Camera size={20} />}
      title="Camera & Vision"
      subtitle="Capture cadence, face detection, multi-face response."
      toggle={{ checked: config.enabled, onChange: (value) => update("enabled", value) }}
    >
      <ProctorRow
        label="Capture mode"
        hint="How webcam snapshots are sampled during the exam."
        control={
          <Pills<CaptureMode>
            value={config.captureMode}
            onChange={(value) => update("captureMode", value)}
            ariaLabel="Capture mode"
            options={[
              { value: "interval", label: "Interval" },
              { value: "random", label: "Random" },
              { value: "event", label: "On Event" },
            ]}
          />
        }
      />
      <ProctorRow
        label="Capture interval"
        hint="Used when capture mode is Interval."
        control={
          <IntervalSlider
            value={config.intervalSec}
            onChange={(value) => update("intervalSec", value)}
            min={5}
            max={120}
          />
        }
      />
      <ProctorRow
        label="Face detection"
        hint="Pause exams when no face is detected for more than 10s."
        control={<ToggleSwitch checked={config.faceDetect} onChange={(value) => update("faceDetect", value)} />}
      />
      <ProctorRow
        label="Multi-face response"
        hint="What to do when more than one face is in frame."
        control={
          <Pills<MultiFaceResponse>
            value={config.multiFace}
            onChange={(value) => update("multiFace", value)}
            ariaLabel="Multi-face response"
            options={[
              { value: "flag", label: "Flag" },
              { value: "warn", label: "Warn" },
              { value: "terminate", label: "Terminate" },
            ]}
          />
        }
      />
    </ProctorCard>
  );
}

const plugin: FrontendPlugin = {
  id: "proctoring.camera-vision",
  priority: 10,
  surfaces: [{ mount: "settings.proctoring", label: "Camera & Vision", Component: CameraVisionCard }],
};

export default plugin;
