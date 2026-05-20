"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Download, FileUp, Upload } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import { Card, ErrorState } from "@/components/admin/ui";
import {
  bulkImportAdminQuestions,
  bulkImportAdminQuestionsFile,
  type AdminQuestionInput,
} from "@/lib/api";

const SAMPLE = JSON.stringify(
  {
    questions: [
      {
        title: "Two Sum",
        plugin_slug: "assessment.coding",
        difficulty: 1,
        max_score: 10,
        body: {
          type: "coding",
          responseType: "code",
          promptFormat: "markdown",
          prompt: "## Two Sum\n\nRead two integers and print their sum.",
          allowedLanguages: ["language.python"],
          tags: ["arrays", "warmup"],
          mode: "main",
          inputFormat: { kind: "markdown", content: "Two integers `a b`." },
          outputFormat: { kind: "markdown", content: "Their sum." },
          hintsEnabled: true,
          hints: [{ afterFailures: 2, text: "Split the line and cast to int." }],
        },
        test_cases: [
          {
            name: "sample",
            is_sample: true,
            stdin: "2 3",
            expected_stdout: "5",
            explanation: "2 + 3 = 5",
            weight: 1,
          },
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
    subtitle: "Upload coding questions as JSON or CSV, or paste JSON directly.",
    breadcrumb: [
      { label: "Admin Hub", href: "/admin" },
      { label: "Question Banks", href: "/admin/coding" },
      { label: "Bulk Import" },
    ],
  });

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(SAMPLE);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<{ created: number; via: string } | null>(null);

  const finish = (created: number, via: string) => {
    setResult({ created, via });
    setTimeout(() => router.push("/admin/coding"), 1400);
  };

  // Paste-area submit — always JSON.
  const submitPasted = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const parsed = JSON.parse(text);
      const questions: AdminQuestionInput[] = Array.isArray(parsed)
        ? parsed
        : parsed.questions ?? [];
      const res = await bulkImportAdminQuestions({ questions });
      finish(res.created.length, "pasted JSON");
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Import failed."));
    } finally {
      setBusy(false);
    }
  };

  // File submit — auto-detects .json vs .csv by extension; the backend routes
  // a .csv filename through the CSV decoder and everything else through JSON.
  const submitFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const isCsv = file.name.toLowerCase().endsWith(".csv");
      const res = await bulkImportAdminQuestionsFile(file);
      finish(res.created.length, isCsv ? "CSV file" : "JSON file");
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
          <CheckCircle2 size={16} /> Imported {result.created} question
          {result.created !== 1 ? "s" : ""} from {result.via}. Redirecting...
        </div>
      )}

      {error !== null && <ErrorState title="Import failed" error={error} />}

      <Card>
        <p className="admin-card-subtitle" style={{ marginBottom: 12 }}>
          Drop a <code className="admin-mono">.json</code> or{" "}
          <code className="admin-mono">.csv</code> file below. Each question is
          validated against the <code className="admin-mono">assessment.coding</code>{" "}
          body schema; if any row fails, the whole batch is rejected.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) submitFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            padding: "32px 16px",
            borderRadius: "var(--admin-r-md)",
            border: `2px dashed ${dragging ? "var(--admin-green)" : "rgba(148,163,184,0.4)"}`,
            background: dragging ? "var(--admin-green-soft)" : "transparent",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          <FileUp size={26} style={{ opacity: 0.6 }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            {busy ? "Importing..." : "Drop a .json or .csv file, or click to browse"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) submitFile(file);
              e.target.value = "";
            }}
          />
        </div>

        <div className="admin-row" style={{ gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <a
            href="/templates/coding_questions_full.json"
            download
            className="admin-btn admin-btn-ghost"
          >
            <Download size={14} /> JSON template
          </a>
          <a
            href="/templates/coding_questions_full.csv"
            download
            className="admin-btn admin-btn-ghost"
          >
            <Download size={14} /> CSV template
          </a>
        </div>
      </Card>

      <Card>
        <div className="admin-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <p className="admin-card-subtitle" style={{ margin: 0 }}>
            Or paste JSON directly.
          </p>
          <button
            type="button"
            onClick={submitPasted}
            disabled={busy}
            className="admin-btn admin-btn-primary"
          >
            <Upload size={14} /> {busy ? "Importing..." : "Import pasted JSON"}
          </button>
        </div>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          rows={20}
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
