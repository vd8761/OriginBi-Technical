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

export interface CandidatePluginConfigArgs {
  /** Coding attempts pass this to resolve org/package overrides on the backend. */
  attemptId?: string;
  /** Non-coding engines pass their assessment package (e.g. "aptitude").
   *  The backend then filters plugins to those whose `extends` is empty,
   *  contains "*", or includes "assessment.<packageSlug>". */
  packageSlug?: string;
}

export async function fetchCandidatePluginConfig(
  arg?: string | CandidatePluginConfigArgs,
): Promise<EnabledPluginConfig[]> {
  const args: CandidatePluginConfigArgs =
    typeof arg === "string" ? { attemptId: arg } : arg ?? {};

  const params = new URLSearchParams();
  if (args.attemptId) params.set("attempt_id", args.attemptId);
  if (args.packageSlug) params.set("package", args.packageSlug);
  const query = params.toString() ? `?${params.toString()}` : "";

  try {
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
  try {
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
  } catch (err) {
    console.warn("[plugins] admin plugin config fetch failed", err);
    return [];
  }
}

function recordFromUnknown(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
