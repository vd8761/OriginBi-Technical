"use client";

// FormatAwareEditor — a single reusable Monaco + live-preview editor used for
// the coding-question Statement, Input Format, Output Format and Constraints
// panels. Each panel independently chooses a renderer (markdown / html /
// plain) and toggles between an Edit and a Preview pane.
//
// The shape it edits is `FormattedText` — a content blob plus a renderer hint
// — which mirrors the Go `FormattedText` struct in
// plugins/assessment-coding/types.go.

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Code, Eye } from "lucide-react";
import MonacoEditor, { type MonacoEditorApi } from "@/components/assessment/coding/MonacoEditor";
import CustomSelect from "@/components/ui/CustomSelect";

export type FormatKind = "markdown" | "html" | "plain";

export interface FormattedText {
  kind: FormatKind;
  content: string;
}

const KIND_OPTIONS = [
  { value: "markdown", label: "Markdown" },
  { value: "html", label: "HTML" },
  { value: "plain", label: "Plain text" },
];

function monacoLanguageFor(kind: FormatKind): string {
  if (kind === "markdown") return "markdown";
  if (kind === "html") return "html";
  return "plaintext";
}

export function FormattedPreview({
  value,
  height,
}: {
  value: FormattedText;
  height: number;
}) {
  if (value.kind === "markdown") {
    return (
      <div className="admin-coding-preview prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{value.content}</ReactMarkdown>
      </div>
    );
  }
  if (value.kind === "html") {
    // sandbox deliberately excludes allow-scripts — the same HTML renders on
    // the candidate side, so we harden the admin preview against XSS too.
    return (
      <iframe
        title="HTML preview"
        srcDoc={value.content}
        sandbox="allow-same-origin"
        style={{ width: "100%", height, border: 0, background: "white" }}
      />
    );
  }
  return (
    <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
      {value.content}
    </pre>
  );
}

export default function FormatAwareEditor({
  label,
  value,
  onChange,
  height = 320,
  monacoPathKey,
  onReady,
}: {
  label: string;
  value: FormattedText;
  onChange: (next: FormattedText) => void;
  height?: number;
  /** Stable key fragment so each editor gets its own Monaco model. */
  monacoPathKey: string;
  /** Receives an imperative API for inserting text at the caret. */
  onReady?: (api: MonacoEditorApi) => void;
}) {
  const [pane, setPane] = useState<"edit" | "preview">("edit");
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <div style={{ width: 140 }}>
            <CustomSelect
              value={value.kind}
              options={KIND_OPTIONS}
              onChange={(v) => onChange({ ...value, kind: v as FormatKind })}
            />
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden text-xs font-bold">
            <button
              type="button"
              onClick={() => setPane("edit")}
              className={`flex items-center gap-1 px-3 py-1.5 ${
                pane === "edit"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              <Code size={12} /> Edit
            </button>
            <button
              type="button"
              onClick={() => setPane("preview")}
              className={`flex items-center gap-1 px-3 py-1.5 ${
                pane === "preview"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              <Eye size={12} /> Preview
            </button>
          </div>
        </div>
      </div>

      {pane === "edit" ? (
        <div
          className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden"
          style={{ height }}
        >
          <MonacoEditor
            path={`${monacoPathKey}.${value.kind}`}
            value={value.content}
            language={monacoLanguageFor(value.kind)}
            fontSize={13}
            theme={isDark ? "dark" : "light"}
            suggestionsEnabled={false}
            lintsEnabled={false}
            onChange={(content) => onChange({ ...value, content })}
            onReady={onReady}
          />
        </div>
      ) : (
        <div
          className="border border-slate-200 dark:border-white/10 rounded-lg p-4 overflow-auto bg-white dark:bg-[#0f1411]"
          style={{ height }}
        >
          <FormattedPreview value={value} height={height - 32} />
        </div>
      )}
    </div>
  );
}
