import { apiFetch } from "@/lib/api";
import type { EnabledPluginConfig } from "./types";

export interface PluginConfigResponse {
  plugins: Array<{
    id: string;
    slug: string;
    name: string;
    category: string;
    version: string;
    enabled: boolean;
    config: Record<string, unknown>;
    emits?: Array<{ kind: string; severity?: string }>;
    subscribes?: string[];
  }>;
  constraints?: Array<{ id: string; kind: string; config?: Record<string, unknown> }>;
  surfaces?: {
    admin?: Array<{ mount: string; label?: string; component?: string }>;
    candidate?: Array<{ mount: string; label?: string; component?: string }>;
  };
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(path, init);
}

export async function fetchCandidatePluginConfig(
  attemptId?: string,
): Promise<EnabledPluginConfig[]> {
  try {
    const query = attemptId ? `?attempt_id=${encodeURIComponent(attemptId)}` : "";
    const data = await fetchJson<PluginConfigResponse>(`/v1/me/plugin-config${query}`);
    return data.plugins.map((p) => ({
      id: p.slug || p.id,
      enabled: p.enabled,
      config: p.config ?? {},
    }));
  } catch (err) {
    console.warn("[plugins] candidate plugin-config fetch failed", err);
    return [];
  }
}

export async function fetchAdminPluginConfig(): Promise<EnabledPluginConfig[]> {
  const data = await fetchJson<{
    plugins?: Array<{
      slug: string;
      enabled?: boolean;
      enabledByDefault?: boolean;
      platformState?: string;
      schema?: Record<string, unknown>;
      platformConfig?: Record<string, unknown>;
    }>;
  }>(`/v1/admin/plugins?context=admin`);
  return (data.plugins ?? []).map((p) => {
    const defaults = recordFromUnknown(p.schema?.defaults);
    const platformConfig = recordFromUnknown(p.platformConfig);

    return {
      id: p.slug,
      enabled: p.enabled !== false && p.platformState !== "disabled",
      config: { ...defaults, ...platformConfig },
    };
  });
}

function recordFromUnknown(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
