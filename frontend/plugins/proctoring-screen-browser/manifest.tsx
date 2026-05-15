"use client";

import { Monitor } from "lucide-react";
import { Badge, ToggleSwitch } from "@/components/admin/ui";
import type { FrontendPlugin, PluginCtx } from "../types";
import {
  Pills,
  ProctorCard,
  ProctorRow,
  usePersistedPluginConfig,
} from "../proctoringControls";

interface ScreenBrowserConfig {
  fullscreenLock: boolean;
  allowExits: number;
  screenShare: boolean;
}

const defaults: ScreenBrowserConfig = {
  fullscreenLock: true,
  allowExits: 2,
  screenShare: true,
};

function ScreenBrowserCard({ ctx }: { ctx: PluginCtx }) {
  const [config, update] = usePersistedPluginConfig(ctx, defaults);

  return (
    <ProctorCard
      icon={<Monitor size={20} />}
      title="Screen & Browser"
      subtitle="Browser hardening for in-progress exams."
      badge={<Badge tone="green" dot>Always on</Badge>}
    >
      <ProctorRow
        label="Fullscreen lock"
        hint="Force fullscreen at start; pause and warn on exit."
        control={<ToggleSwitch checked={config.fullscreenLock} onChange={(value) => update("fullscreenLock", value)} />}
      />
      <ProctorRow
        label="Allowed fullscreen exits"
        hint="Number of exits before auto-action triggers."
        control={
          <Pills<number>
            value={config.allowExits}
            onChange={(value) => update("allowExits", value)}
            ariaLabel="Allowed fullscreen exits"
            options={[
              { value: 0, label: "0" },
              { value: 1, label: "1" },
              { value: 2, label: "2" },
              { value: 3, label: "3" },
              { value: 5, label: "5" },
            ]}
          />
        }
      />
      <ProctorRow
        label="Screen sharing required"
        hint="Candidate must share their primary screen via getDisplayMedia."
        control={<ToggleSwitch checked={config.screenShare} onChange={(value) => update("screenShare", value)} />}
      />
    </ProctorCard>
  );
}

const plugin: FrontendPlugin = {
  id: "proctoring.screen-browser",
  priority: 30,
  surfaces: [{ mount: "settings.proctoring", label: "Screen & Browser", Component: ScreenBrowserCard }],
};

export default plugin;
