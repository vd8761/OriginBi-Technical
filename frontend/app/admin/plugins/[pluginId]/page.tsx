"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/admin/AdminGuard";
import {
  getPlugin,
  updatePluginMetadata,
  updatePluginState,
  type Plugin,
} from "@/lib/api";

function PluginDetailInner({ pluginId }: { pluginId: string }) {
  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"overview" | "config" | "deps">("overview");
  const [schemaText, setSchemaText] = useState("");

  useEffect(() => {
    getPlugin(pluginId)
      .then((p) => {
        setPlugin(p);
        setSchemaText(JSON.stringify(p.schema ?? {}, null, 2));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Plugin lookup failed."));
  }, [pluginId]);

  const saveSchema = async () => {
    if (!plugin) return;
    setSaving(true);
    setError("");
    try {
      const parsed = JSON.parse(schemaText);
      const updated = await updatePluginMetadata(plugin.id, { schema: parsed });
      setPlugin(updated);
      setSchemaText(JSON.stringify(updated.schema ?? {}, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Schema save failed.");
    } finally {
      setSaving(false);
    }
  };

  const setState = async (state: Plugin["platformState"]) => {
    if (!plugin) return;
    setSaving(true);
    setError("");
    try {
      await updatePluginState(plugin.id, { state, config: plugin.platformConfig ?? {} });
      setPlugin({ ...plugin, platformState: state });
    } catch (err) {
      setError(err instanceof Error ? err.message : "State update failed.");
    } finally {
      setSaving(false);
    }
  };

  if (error && !plugin) {
    return <ErrorPanel msg={error} />;
  }
  if (!plugin) {
    return <div className="px-6 py-8 text-sm text-slate-500">Loading…</div>;
  }

  return (
    <main className="px-4 sm:px-6 py-6 sm:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Breadcrumbs slug={plugin.slug} />

        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{plugin.name}</h1>
            {plugin.pluginType && (
              <Pill>{plugin.pluginType}</Pill>
            )}
            {plugin.category && <Pill tone="emerald">{plugin.category}</Pill>}
            {plugin.requiresLicense && <Pill tone="amber">licensed</Pill>}
          </div>
          <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
            {plugin.slug} · v{plugin.version} · kind={plugin.kind}
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          {(["enabled", "restricted", "disabled"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setState(s)}
              disabled={saving || plugin.platformState === s}
              className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                plugin.platformState === s
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-600 dark:border-white/10 dark:text-slate-300"
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              {s}
            </button>
          ))}
        </div>

        <nav className="-mx-4 sm:mx-0 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 sm:px-0 dark:border-white/10">
          {(["overview", "config", "deps"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-semibold transition border-b-2 ${
                tab === t
                  ? "border-emerald-600 text-emerald-600 dark:text-emerald-300"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {t === "overview" ? "Overview" : t === "config" ? "Configuration" : "Dependencies"}
            </button>
          ))}
        </nav>

        {error && <ErrorPanel msg={error} />}

        {tab === "overview" && (
          <section className="flex flex-col gap-3 text-sm">
            <Row label="ID" value={plugin.id} mono />
            <Row label="Slug" value={plugin.slug} mono />
            <Row label="Version" value={plugin.version} />
            <Row label="State" value={plugin.platformState} />
            <Row label="Enabled by default" value={plugin.enabledByDefault ? "yes" : "no"} />
            <Row label="Requires license" value={plugin.requiresLicense ? "yes" : "no"} />
            <Row label="Provides" value={(plugin.provides ?? []).join(", ") || "—"} mono />
          </section>
        )}

        {tab === "config" && (
          <section className="flex flex-col gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Plugin schema (JSONB)
            </label>
            <textarea
              value={schemaText}
              onChange={(e) => setSchemaText(e.target.value)}
              spellCheck={false}
              className="min-h-[320px] rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-slate-800 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-200"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveSchema}
                disabled={saving}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save schema"}
              </button>
              <p className="text-xs text-slate-400">
                Must be valid JSON. Persisted to <span className="font-mono">plugins.schema</span>.
              </p>
            </div>
          </section>
        )}

        {tab === "deps" && (
          <section className="flex flex-col gap-4 text-sm">
            <DepList label="Requires" items={plugin.requires ?? []} />
            <DepList label="Extends" items={plugin.extends ?? []} />
            <DepList label="Dependents (plugins that need this one)" items={plugin.dependents ?? []} />
          </section>
        )}
      </div>
    </main>
  );
}

function Breadcrumbs({ slug }: { slug: string }) {
  return (
    <p className="text-xs text-slate-400">
      <Link className="hover:text-emerald-600" href="/admin/plugins">
        Plugins
      </Link>{" "}
      / <span className="font-mono">{slug}</span>
    </p>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-3 items-baseline border-b border-slate-100 dark:border-white/[0.05] py-2">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className={`break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone?: "emerald" | "amber" }) {
  const cls =
    tone === "emerald"
      ? "border border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
      : tone === "amber"
        ? "border border-amber-300 dark:border-amber-500/30 text-amber-600 dark:text-amber-300"
        : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-300";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${cls}`}>
      {children}
    </span>
  );
}

function DepList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">None</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((i) => (
            <li key={i} className="font-mono text-xs rounded-md bg-slate-100 dark:bg-white/[0.04] px-2 py-1">
              {i}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ErrorPanel({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
      {msg}
    </div>
  );
}

export default function PluginDetailPage({
  params,
}: {
  params: Promise<{ pluginId: string }>;
}) {
  const { pluginId } = use(params);
  return (
    <AdminGuard>
      <PluginDetailInner pluginId={pluginId} />
    </AdminGuard>
  );
}
