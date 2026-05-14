"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Blocks, CheckCircle2 } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import { Badge, Card, EmptyState, ErrorState, PillTabs } from "@/components/admin/ui";
import { listPlugins, updatePluginState, type Plugin } from "@/lib/api";

const states: Plugin["platformState"][] = ["enabled", "restricted", "disabled"];

type CategoryValue = "" | "assessment" | "evaluation" | "language" | "runner" | "proctoring" | "feature" | "media";

const categoryFacets: { value: CategoryValue; label: string }[] = [
  { value: "", label: "All" },
  { value: "assessment", label: "Assessment" },
  { value: "evaluation", label: "Evaluation" },
  { value: "language", label: "Languages" },
  { value: "runner", label: "Runners" },
  { value: "proctoring", label: "Proctoring" },
  { value: "feature", label: "Features" },
  { value: "media", label: "Media" },
];

function stateTone(state: Plugin["platformState"]) {
  if (state === "enabled") return "green" as const;
  if (state === "restricted") return "amber" as const;
  return "neutral" as const;
}

function AdminPluginsInner() {
  useRegisterAdminPage({
    eyebrow: "System / Plugins",
    title: "Plugin Registry",
    subtitle: "Platform controls for assessment plugins, language runtimes, evaluators, runners, and addons.",
    breadcrumb: [
      { label: "Admin Hub", href: "/admin" },
      { label: "Plugins" },
    ],
  });

  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryValue>("");

  const reload = React.useCallback(() => {
    setLoading(true);
    setError(null);
    listPlugins(category ? { category } : {})
      .then((data) => setPlugins(data.plugins))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const grouped = useMemo(() => {
    return plugins.reduce<Record<string, Plugin[]>>((acc, plugin) => {
      const bucket = plugin.category || plugin.kind || "uncategorized";
      acc[bucket] = [...(acc[bucket] ?? []), plugin];
      return acc;
    }, {});
  }, [plugins]);

  const setPluginState = async (plugin: Plugin, state: Plugin["platformState"]) => {
    setSaving(plugin.id);
    setError(null);
    try {
      await updatePluginState(plugin.id, { state, config: plugin.platformConfig ?? {} });
      setPlugins((current) =>
        current.map((item) => (item.id === plugin.id ? { ...item, platformState: state } : item)),
      );
    } catch (err) {
      setError(err);
    } finally {
      setSaving(null);
    }
  };

  const enabledCount = plugins.filter((p) => p.platformState === "enabled").length;

  return (
    <div className="admin-page">
      <div className="admin-control-row">
        <PillTabs
          value={category}
          onChange={(next) => setCategory(next as CategoryValue)}
          tabs={categoryFacets.map((f) => ({ value: f.value, label: f.label }))}
        />
        <div className="admin-row">
          <Badge tone="green" dot>{enabledCount} enabled</Badge>
          <Badge tone="neutral">{plugins.length} total</Badge>
        </div>
      </div>

      {error !== null ? <ErrorState title="Couldn't load plugins" error={error} onRetry={reload} /> : null}

      {!error && Object.entries(grouped).map(([bucket, items]) => (
        <section key={bucket} className="admin-stack">
          <div className="admin-control-row">
            <div>
              <p className="admin-page-eyebrow">{bucket.replaceAll("_", " ")}</p>
              <h3 className="admin-card-title">{items.length} plugins</h3>
            </div>
          </div>
          <div className="admin-grid-2">
            {items.map((plugin) => (
              <Card key={plugin.id}>
                <div className="admin-control-row">
                  <div>
                    <Link
                      href={`/admin/plugins/${plugin.id}`}
                      style={{ color: "var(--admin-fg)", fontWeight: 800, textDecoration: "none" }}
                    >
                      {plugin.name}
                    </Link>
                    <p className="admin-card-subtitle admin-mono">
                      {plugin.slug} · v{plugin.version}
                    </p>
                  </div>
                  <Badge tone={stateTone(plugin.platformState)} dot>
                    {plugin.platformState}
                  </Badge>
                </div>

                <div className="admin-row" style={{ marginTop: 14, flexWrap: "wrap", gap: 6 }}>
                  {plugin.pluginType && <Badge tone="neutral">{plugin.pluginType}</Badge>}
                  {plugin.category && <Badge tone="blue">{plugin.category}</Badge>}
                  {plugin.requiresLicense && <Badge tone="amber">licensed</Badge>}
                  {plugin.configSchema && <Badge tone="green">schema</Badge>}
                </div>

                {plugin.dependents && plugin.dependents.length > 0 && (
                  <p className="admin-card-subtitle" style={{ marginTop: 12 }}>
                    Used by: {plugin.dependents.join(", ")}
                  </p>
                )}

                <div className="admin-row" style={{ marginTop: 16, gap: 6 }}>
                  {states.map((state) => {
                    const active = plugin.platformState === state;
                    return (
                      <button
                        key={state}
                        type="button"
                        onClick={() => setPluginState(plugin, state)}
                        disabled={saving === plugin.id || active}
                        className={`admin-btn ${active ? "admin-btn-primary" : "admin-btn-secondary"}`}
                      >
                        {active && <CheckCircle2 size={12} />}
                        {state}
                      </button>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {!error && !loading && plugins.length === 0 && (
        <EmptyState
          icon={<Blocks size={26} />}
          title="No plugins available"
          description="Plugins are loaded from the exam-engine. Confirm the service is running and registered."
        />
      )}

      {loading && !error && (
        <div className="admin-grid-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="admin-skeleton" style={{ height: 180 }} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPluginsPage() {
  return (
    <AdminGuard>
      <AdminPluginsInner />
    </AdminGuard>
  );
}
