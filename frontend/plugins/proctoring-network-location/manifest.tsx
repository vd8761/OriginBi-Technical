"use client";

import { MapPin } from "lucide-react";
import { ToggleSwitch } from "@/components/admin/ui";
import type { FrontendPlugin, PluginCtx } from "../types";
import {
  Pills,
  ProctorCard,
  ProctorRow,
  usePersistedPluginConfig,
} from "../proctoringControls";

type GeofenceMode = "off" | "country" | "city";

interface NetworkLocationConfig {
  ipLogging: boolean;
  vpnBlock: boolean;
  geofence: GeofenceMode;
}

const defaults: NetworkLocationConfig = {
  ipLogging: true,
  vpnBlock: true,
  geofence: "country",
};

function NetworkLocationCard({ ctx }: { ctx: PluginCtx }) {
  const [config, update] = usePersistedPluginConfig(ctx, defaults);

  return (
    <ProctorCard
      icon={<MapPin size={20} />}
      title="Network & Location"
      subtitle="Where candidates are allowed to take the exam from."
    >
      <ProctorRow
        label="IP address logging"
        hint="Record candidate IP at every session event."
        control={<ToggleSwitch checked={config.ipLogging} onChange={(value) => update("ipLogging", value)} />}
      />
      <ProctorRow
        label="Block VPN / proxy"
        hint="Reject sessions from known VPN ranges and datacenter ASNs."
        control={<ToggleSwitch checked={config.vpnBlock} onChange={(value) => update("vpnBlock", value)} />}
      />
      <ProctorRow
        label="Geofence"
        hint="Restrict where attempts can start from."
        control={
          <Pills<GeofenceMode>
            value={config.geofence}
            onChange={(value) => update("geofence", value)}
            ariaLabel="Geofence"
            options={[
              { value: "off", label: "Off" },
              { value: "country", label: "Country" },
              { value: "city", label: "City" },
            ]}
          />
        }
      />
    </ProctorCard>
  );
}

const plugin: FrontendPlugin = {
  id: "proctoring.network-location",
  priority: 60,
  surfaces: [{ mount: "settings.proctoring", label: "Network & Location", Component: NetworkLocationCard }],
};

export default plugin;
