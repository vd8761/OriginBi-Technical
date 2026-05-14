"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Upload } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import { Card, ErrorState } from "@/components/admin/ui";
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
          prompt:
            "Given an array of integers `nums` and an integer `target`, return indices of the two numbers that add up to target.",
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
  useRegisterAdminPage({
    eyebrow: "Question Banks",
    title: "Bulk Import",
    subtitle: "Paste validated JSON to upload coding problems in batch.",
    breadcrumb: [
      { label: "Admin Hub", href: "/admin" },
      { label: "Question Banks", href: "/admin/coding" },
      { label: "Bulk Import" },
    ],
  });

  const router = useRouter();
  const [text, setText] = useState(SAMPLE);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number } | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
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
      setError(err instanceof Error ? err : new Error("Import failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-control-row">
        <Link href="/admin/coding" className="admin-btn admin-btn-ghost">
          <ArrowLeft size={14} /> Back to Coding
        </Link>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="admin-btn admin-btn-primary"
        >
          <Upload size={14} /> {busy ? "Importing..." : "Import"}
        </button>
      </div>

      {result && (
        <div
          className="admin-row"
          style={{
            padding: "12px 14px",
            borderRadius: "var(--admin-r-md)",
            border: "1px solid rgba(30,211,106,0.32)",
            background: "var(--admin-green-soft)",
            color: "var(--admin-green)",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={16} /> Imported {result.created} question{result.created !== 1 ? "s" : ""}. Redirecting...
        </div>
      )}

      {error !== null && <ErrorState title="Import failed" error={error} />}

      <Card>
        <p className="admin-card-subtitle" style={{ marginBottom: 12 }}>
          Each question is validated against the <code className="admin-mono">assessment.coding</code> body schema.
          If any row fails validation, the whole batch is rejected.
        </p>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          rows={22}
          className="admin-field admin-mono"
          style={{ width: "100%", fontSize: 12, lineHeight: 1.55, padding: 14 }}
        />
      </Card>
    </div>
  );
}

export default function BulkImportPage() {
  return (
    <AdminGuard>
      <BulkImportInner />
    </AdminGuard>
  );
}
