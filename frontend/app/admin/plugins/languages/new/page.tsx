"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminGuard from "@/components/admin/AdminGuard";
import { apiFetch, createPlugin } from "@/lib/api";

interface Judge0Language {
  id: number;
  name: string;
}

interface Judge0HealthResponse {
  status?: string;
  available?: Judge0Language[];
}

interface FormState {
  slug: string;
  displayName: string;
  judge0LanguageId: number;
  fileExtension: string;
  monacoLanguageId: string;
  defaultEntryFile: string;
  timeLimitMs: number;
  memoryLimitKb: number;
  stackLimitKb: number;
  processesLimit: number;
  outputLimitKb: number;
  supportsMultiFile: boolean;
  compileFlags: string;
  legacyItemRef: string;
  icon: string;
}

const initial: FormState = {
  slug: "language.",
  displayName: "",
  judge0LanguageId: 0,
  fileExtension: "",
  monacoLanguageId: "",
  defaultEntryFile: "",
  timeLimitMs: 3000,
  memoryLimitKb: 131072,
  stackLimitKb: 32768,
  processesLimit: 32,
  outputLimitKb: 4096,
  supportsMultiFile: true,
  compileFlags: "",
  legacyItemRef: "",
  icon: "",
};

function NewLanguageInner() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  // Live list of Judge0 language IDs from the deployed image. Used to warn
  // (not block) the admin when the entered judge0LanguageId is unrecognized.
  // Empty array = not loaded yet OR Judge0 is unreachable; in both cases we
  // suppress the warning to avoid false positives.
  const [knownJudge0Ids, setKnownJudge0Ids] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Judge0HealthResponse>("/v1/admin/judge0/health")
      .then((resp) => {
        if (cancelled) return;
        const ids = (resp.available ?? []).map((l) => l.id).filter((id) => typeof id === "number");
        setKnownJudge0Ids(ids);
      })
      .catch(() => {
        // Judge0 unreachable — leave knownJudge0Ids empty so we render no warning.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const judge0IdWarning =
    knownJudge0Ids.length > 0 && form.judge0LanguageId > 0 && !knownJudge0Ids.includes(form.judge0LanguageId)
      ? `ID ${form.judge0LanguageId} is not exposed by the deployed Judge0 image. Save anyway if you're staging for a future upgrade.`
      : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const schema = {
        displayName: form.displayName,
        judge0LanguageId: form.judge0LanguageId,
        fileExtension: form.fileExtension,
        defaultEntryFile: form.defaultEntryFile || `main${form.fileExtension}`,
        compileFlags: form.compileFlags ? form.compileFlags : null,
        timeLimitMs: form.timeLimitMs,
        memoryLimitKb: form.memoryLimitKb,
        stackLimitKb: form.stackLimitKb,
        processesLimit: form.processesLimit,
        outputLimitKb: form.outputLimitKb,
        supportsMultiFile: form.supportsMultiFile,
        monacoLanguageId: form.monacoLanguageId,
        icon: form.icon || null,
        legacyItemRef: form.legacyItemRef || null,
      };
      const plugin = await createPlugin({
        kind: "language",
        slug: form.slug.trim(),
        name: form.displayName,
        version: "1.0.0",
        schema,
        plugin_type: "addon",
        category: "language",
        requires: ["assessment.coding", "code.runner"],
        extends: ["assessment.coding"],
        provides: ["language.runtime"],
        requires_license: false,
        enabled_by_default: true,
      });
      router.push(`/admin/plugins/${plugin.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((cur) => ({ ...cur, [k]: v }));

  return (
    <main className="px-4 sm:px-6 py-6 sm:py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <p className="text-xs text-slate-400">
          <Link href="/admin/plugins/languages" className="hover:text-emerald-600">
            â† Languages
          </Link>
        </p>
        <header className="flex flex-col gap-2 border-b border-slate-200 pb-5 dark:border-white/10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
            Plugins Â· New language
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Add a language plugin</h1>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Creates a new <span className="font-mono">language.*</span> plugin row. Once enabled, it appears in the
            coding-question authoring multi-select and the candidate language picker (subject to entitlements).
          </p>
        </header>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <Field label="Slug" hint="Must start with language.">
            <input
              required
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="language.rust"
              className="input-base font-mono"
            />
          </Field>

          <Field label="Display name" hint="Shown in editor + candidate picker.">
            <input
              required
              value={form.displayName}
              onChange={(e) => set("displayName", e.target.value)}
              placeholder="Rust 1.75"
              className="input-base"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Judge0 language ID" hint="Confirm in Judge0 /languages.">
              <input
                required
                type="number"
                value={form.judge0LanguageId}
                onChange={(e) => set("judge0LanguageId", Number(e.target.value))}
                className="input-base"
              />
              {judge0IdWarning && (
                <p className="mt-1 text-[12px] text-amber-600 dark:text-amber-400">
                  {judge0IdWarning}
                </p>
              )}
            </Field>
            <Field label="Monaco language ID">
              <input
                required
                value={form.monacoLanguageId}
                onChange={(e) => set("monacoLanguageId", e.target.value)}
                placeholder="rust"
                className="input-base font-mono"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="File extension">
              <input
                required
                value={form.fileExtension}
                onChange={(e) => set("fileExtension", e.target.value)}
                placeholder=".rs"
                className="input-base font-mono"
              />
            </Field>
            <Field label="Default entry file">
              <input
                value={form.defaultEntryFile}
                onChange={(e) => set("defaultEntryFile", e.target.value)}
                placeholder="main.rs"
                className="input-base font-mono"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Time limit (ms)">
              <input type="number" value={form.timeLimitMs} onChange={(e) => set("timeLimitMs", Number(e.target.value))} className="input-base" />
            </Field>
            <Field label="Memory (KB)">
              <input type="number" value={form.memoryLimitKb} onChange={(e) => set("memoryLimitKb", Number(e.target.value))} className="input-base" />
            </Field>
            <Field label="Stack (KB)">
              <input type="number" value={form.stackLimitKb} onChange={(e) => set("stackLimitKb", Number(e.target.value))} className="input-base" />
            </Field>
            <Field label="Output (KB)" hint="Judge0 image caps at 4096; higher values are silently clamped.">
              <input type="number" max={4096} value={form.outputLimitKb} onChange={(e) => set("outputLimitKb", Math.min(4096, Number(e.target.value)))} className="input-base" />
            </Field>
          </div>

          <Field label="Compile flags" hint="Optional. Passed to compiler at runtime.">
            <input value={form.compileFlags} onChange={(e) => set("compileFlags", e.target.value)} placeholder="-O2 -std=c++20" className="input-base font-mono" />
          </Field>

          <Field label="Legacy item_ref" hint="Optional. e.g. 'coding:rust' for legacy pricing.">
            <input value={form.legacyItemRef} onChange={(e) => set("legacyItemRef", e.target.value)} placeholder="coding:rust" className="input-base font-mono" />
          </Field>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.supportsMultiFile}
              onChange={(e) => set("supportsMultiFile", e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            Supports multi-file submissions (Judge0 language ID 89 zip flow)
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Creatingâ€¦" : "Create language plugin"}
            </button>
            <Link href="/admin/plugins/languages" className="text-sm text-slate-500 hover:text-slate-700">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export default function NewLanguagePage() {
  return (
    <AdminGuard>
      <NewLanguageInner />
    </AdminGuard>
  );
}

