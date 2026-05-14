"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Blocks, CheckCircle2, SlidersHorizontal } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { listPlugins, updatePluginState, type Plugin } from "@/lib/api";

const states: Plugin["platformState"][] = ["enabled", "restricted", "disabled"];

const categoryFacets = [
  { value: "", label: "All" },
  { value: "assessment", label: "Assessment" },
  { value: "evaluation", label: "Evaluation" },
  { value: "language", label: "Languages" },
  { value: "runner", label: "Runners" },
  { value: "proctoring", label: "Proctoring" },
  { value: "feature", label: "Features" },
  { value: "media", label: "Media" },
];

function stateClass(state: Plugin["platformState"]) {
  if (state === "enabled") return "admin-badge-green";
  if (state === "restricted") return "admin-badge-amber";
  return "";
}

function AdminPluginsInner() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("");

  useEffect(() => {
    listPlugins(category ? { category } : {})
      .then((data) => setPlugins(data.plugins))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load plugins."));
  }, [category]);

  const grouped = useMemo(() => {
    return plugins.reduce<Record<string, Plugin[]>>((acc, plugin) => {
      const bucket = plugin.category || plugin.kind || "uncategorized";
      acc[bucket] = [...(acc[bucket] ?? []), plugin];
      return acc;
    }, {});
  }, [plugins]);

  const setPluginState = async (plugin: Plugin, state: Plugin["platformState"]) => {
    setSaving(plugin.id);
    setError("");
    try {
      await updatePluginState(plugin.id, { state, config: plugin.platformConfig ?? {} });
      setPlugins((current) =>
        current.map((item) =>
          item.id === plugin.id ? { ...item, platformState: state } : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plugin update failed.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-page-eyebrow">System / Plugins</p>
          <h2 className="admin-page-title">Plugin Registry</h2>
          <p className="admin-page-copy">
            Platform-level controls for assessment plugins, language runtimes, evaluators, runners, and addons.
          </p>
        </div>
        <div className="admin-row">
          <span className="admin-badge admin-badge-green">
            <span className="admin-dot" />
            {plugins.filter((plugin) => plugin.platformState === "enabled").length} enabled
          </span>
          <span className="admin-badge">
            {plugins.length} total
          </span>
        </div>
      </div>

      <div className="admin-row" style={{ flexWrap: "wrap" }}>
        {categoryFacets.map((facet) => (
          <button
            key={facet.value || "all"}
            type="button"
            onClick={() => setCategory(facet.value)}
            className={`admin-btn ${category === facet.value ? "admin-btn-primary" : "admin-btn-secondary"}`}
          >
            {facet.value === "language" ? <SlidersHorizontal size={13} /> : <Blocks size={13} />}
            {facet.label}
          </button>
        ))}
      </div>

      {error && <div className="admin-error">{error}</div>}

      {Object.entries(grouped).map(([bucket, items]) => (
        <section key={bucket} className="admin-stack">
          <div className="admin-control-row">
            <div>
              <p className="admin-page-eyebrow">{bucket.replaceAll("_", " ")}</p>
              <h3 className="admin-card-title">{items.length} plugins</h3>
            </div>
          </div>
          <div className="admin-grid-2">
            {items.map((plugin) => (
              <article key={plugin.id} className="admin-card admin-card-pad admin-stack">
                <div className="admin-control-row">
                  <div>
                    <Link href={`/admin/plugins/${plugin.id}`} style={{ color: "var(--admin-fg)", fontWeight: 850 }}>
                      {plugin.name}
                    </Link>
                    <p className="admin-card-subtitle admin-mono">
                      {plugin.slug} / v{plugin.version}
                    </p>
                  </div>
                  <span className={`admin-badge ${stateClass(plugin.platformState)}`}>
                    <span className="admin-dot" />
                    {plugin.platformState}
                  </span>
                </div>

                <div className="admin-row">
                  {plugin.pluginType && <span className="admin-badge">{plugin.pluginType}</span>}
                  {plugin.category && <span className="admin-badge">{plugin.category}</span>}
                  {plugin.requiresLicense && <span className="admin-badge admin-badge-amber">licensed</span>}
                  {plugin.configSchema && <span className="admin-badge admin-badge-green">schema</span>}
                </div>

                {plugin.dependents && plugin.dependents.length > 0 && (
                  <p className="admin-card-subtitle">Used by: {plugin.dependents.join(", ")}</p>
                )}

                <div className="admin-row" style={{ marginTop: "auto" }}>
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
                        {active && <CheckCircle2 size={13} />}
                        {state}
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
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
