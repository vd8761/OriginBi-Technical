"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminGuard from "@/components/admin/AdminGuard";
import { bulkImportAdminQuestions, type AdminQuestionInput } from "@/lib/api";

const SAMPLE = JSON.stringify(
  {
    questions: [
      {
        title: "Two Sum",
        plugin_slug: "assessment.coding",
        difficulty: 2,
        max_score: 100,
        body: {
          type: "coding",
          responseType: "code",
          promptFormat: "markdown",
          prompt: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers that add up to target.",
          allowedLanguages: ["language.python", "language.java"],
        },
        test_cases: [
          { name: "sample 1", is_sample: true, stdin: "2 7 11 15\n9", expected_stdout: "0 1", weight: 1 },
        ],
      },
    ],
  },
  null,
  2,
);

function BulkImportInner() {
  const router = useRouter();
  const [text, setText] = useState(SAMPLE);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number } | null>(null);

  const submit = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const parsed = JSON.parse(text);
      const questions: AdminQuestionInput[] = Array.isArray(parsed)
        ? parsed
        : parsed.questions ?? [];
      const res = await bulkImportAdminQuestions({ questions });
      setResult({ created: res.created.length });
      setTimeout(() => router.push("/admin/coding"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="px-4 sm:px-6 py-6 sm:py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <p className="text-xs text-slate-400">
          <Link href="/admin/coding" className="hover:text-emerald-600">
            ← Coding Questions
          </Link>
        </p>
        <header className="border-b border-slate-200 pb-5 dark:border-white/10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
            Content · Coding · Bulk import
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Bulk Import Questions</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Paste a JSON document. Each question is validated against the{" "}
            <span className="font-mono">assessment.coding</span> body schema. Per-row errors are reported and
            nothing is written if any row fails validation.
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}
        {result && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            Imported {result.created} question{result.created !== 1 ? "s" : ""}. Redirecting…
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          rows={24}
          className="input-base font-mono text-xs leading-relaxed"
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Importing…" : "Import"}
          </button>
          <Link href="/admin/coding" className="text-sm text-slate-500 hover:text-slate-700">
            Cancel
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function BulkImportPage() {
  return (
    <AdminGuard>
      <BulkImportInner />
    </AdminGuard>
  );
}
