"use client";

import React, { useEffect, useMemo, useState } from "react";
import { listPlugins, updatePlugin, type Plugin } from "@/lib/api";

const states: Plugin["platformState"][] = ["enabled", "restricted", "disabled"];

export default function AdminPluginsPage() {
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        listPlugins()
            .then((data) => setPlugins(data.plugins))
            .catch((err) => setError(err instanceof Error ? err.message : "Unable to load plugins."));
    }, []);

    const grouped = useMemo(() => {
        return plugins.reduce<Record<string, Plugin[]>>((acc, plugin) => {
            acc[plugin.kind] = [...(acc[plugin.kind] ?? []), plugin];
            return acc;
        }, {});
    }, [plugins]);

    const setPluginState = async (plugin: Plugin, state: Plugin["platformState"]) => {
        setSaving(plugin.id);
        setError("");
        try {
            await updatePlugin(plugin.id, { state, config: plugin.platformConfig ?? {} });
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
        <main className="min-h-screen bg-[#f6faf7] px-6 py-8 text-slate-900 dark:bg-[#0f1712] dark:text-white">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">
                <header className="flex flex-col gap-2 border-b border-slate-200 pb-5 dark:border-white/10">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                        Admin
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight">Plugin Registry</h1>
                    <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        Platform-level plugin controls for assessment authoring, proctoring signals, and evaluators.
                    </p>
                </header>

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                        {error}
                    </div>
                )}

                {Object.entries(grouped).map(([kind, items]) => (
                    <section key={kind} className="flex flex-col gap-3">
                        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            {kind.replaceAll("_", " ")}
                        </h2>
                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
                            {items.map((plugin) => (
                                <div
                                    key={plugin.id}
                                    className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 dark:border-white/10 md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold">{plugin.name}</p>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            {plugin.slug} v{plugin.version}
                                            {plugin.requiresLicense ? " - licensed" : ""}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {states.map((state) => {
                                            const active = plugin.platformState === state;
                                            return (
                                                <button
                                                    key={state}
                                                    type="button"
                                                    onClick={() => setPluginState(plugin, state)}
                                                    disabled={saving === plugin.id || active}
                                                    className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                                                        active
                                                            ? "bg-emerald-600 text-white"
                                                            : "border border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-600 dark:border-white/10 dark:text-slate-300"
                                                    } disabled:cursor-not-allowed disabled:opacity-70`}
                                                >
                                                    {state}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </main>
    );
}
