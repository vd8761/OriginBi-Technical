"use client";

// CodingEditor — the 5-tab admin authoring panel for coding questions.
//
// Tabs:
//   1. Problem        — title, difficulty, markdown statement, samples, constraints, hints
//   2. Test Cases     — visible/hidden, weights, comparator, stdin/expected per case
//   3. Languages      — pick allowed language plugins; per-language starter files w/ readOnly + lockedRegions
//   4. Limits & Judge — per-question overrides for time/memory + judge toggles
//   5. Settings       — copy-paste lock, line numbers, proctoring toggles
//
// State shape mirrors the assessment.coding question-body.schema.json. On save
// the editor POSTs / PUTs to /v1/admin/questions with the body + test_cases.

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MonacoEditor from "@/components/assessment/coding/MonacoEditor";
import CustomSelect from "@/components/ui/CustomSelect";
import { Switch } from "@/components/ui/Switch";
import { Image as ImageIcon, Trash2, Upload as UploadIcon, Eye, Code } from "lucide-react";
import {
  createAdminQuestion,
  updateAdminQuestion,
  getAdminQuestion,
  listAdminTestCases,
  listPlugins,
  appendAdminTestCase,
  updateAdminTestCase,
  deleteAdminTestCase,
  type AdminTestCase,
  type LanguageSchema,
  type Plugin,
} from "@/lib/api";
import { uploadQuestionAsset } from "@/components/admin/questions/api";

// ── Body shape (matches plugins/assessment-coding/schemas/question-body.schema.json) ──

interface LockedRegion {
  startLine: number;
  endLine: number;
  reason?: string;
}

interface StarterFile {
  path: string;
  content: string;
  readOnly?: boolean;
  language?: string;
  lockedRegions?: LockedRegion[];
}

interface MediaAsset {
  url: string;
  key?: string;
  fileName?: string;
  alt?: string;
  mime?: string;
}

interface QuestionBody {
  type: "coding";
  responseType: "code";
  promptFormat: "markdown" | "html" | "plain";
  prompt: string;
  title?: string;
  difficulty?: "easy" | "medium" | "hard";
  section?: string;
  category?: string;
  mode?: "trial" | "main";
  allowedLanguages?: string[];
  entryFile?: Record<string, string>;
  starterFiles?: Record<string, StarterFile[]>;
  starterCode?: Record<string, string>;
  samples?: { input: string; output: string; explanation?: string }[];
  constraints?: string;
  hints?: { afterFailures: number; text: string }[];
  media?: MediaAsset[];
  judgeConfig?: {
    strictWhitespace?: boolean;
    showDiff?: boolean;
    partialCredit?: boolean;
    stopOnFailure?: boolean;
  };
  uxSettings?: {
    disableCopyPaste?: boolean;
    lineNumbers?: boolean;
    lockOnSubmit?: boolean;
  };
}

interface FormState {
  title: string;
  difficulty: number;
  maxScore: number;
  isNegativeMarked: boolean;
  negativeScore: number;
  body: QuestionBody;
}

const EMPTY: FormState = {
  title: "",
  difficulty: 1,
  maxScore: 100,
  isNegativeMarked: false,
  negativeScore: 0,
  body: {
    type: "coding",
    responseType: "code",
    promptFormat: "markdown",
    prompt: "## Problem\n\nDescribe the problem here.",
    samples: [],
    hints: [],
    allowedLanguages: [],
    starterFiles: {},
    entryFile: {},
    judgeConfig: {
      strictWhitespace: false,
      showDiff: true,
      partialCredit: true,
      stopOnFailure: false,
    },
    uxSettings: { disableCopyPaste: true, lineNumbers: true, lockOnSubmit: false },
  },
};

type Tab = "problem" | "tests" | "languages" | "limits" | "settings";

interface CodingEditorProps {
  mode: "new" | "edit";
  questionId?: string;
}

// Canonicalise a language slug to the `language.<name>` form the backend
// authoring validator uses. Mirrors NormalizeLanguageSlug in the runner-judge0
// Go package — keep these two in sync.
function canonicalLanguageSlug(slug: string): string {
  const s = slug.trim().toLowerCase();
  if (!s || s.startsWith("language.")) return s;
  return `language.${s}`;
}

// Reshape body before it leaves the form so it matches the backend contract:
//   1. Canonicalise every language key (e.g. "python" -> "language.python") so
//      starterCode["python"] and starterCode["language.python"] don't both end
//      up in the payload — the form's edit lifecycle was leaving both forms.
//   2. Drop starterCode / starterFiles / entryFile entries whose canonical key
//      isn't in allowedLanguages. The form hides toggled-off language tabs but
//      preserves their starters in state in case the admin toggles them back
//      on; without this step those stale entries ship to the backend and
//      trigger LANGUAGE_NOT_ALLOWED.
//   3. Canonicalise allowedLanguages itself and de-dup.
function sanitizeBodyForPayload(body: QuestionBody): QuestionBody {
  const allowed = (body.allowedLanguages ?? [])
    .map(canonicalLanguageSlug)
    .filter((s) => s.length > 0);
  const allowedSet = new Set(allowed);
  const allowedUnique = Array.from(allowedSet);

  // When the admin hasn't restricted the language list at all, treat every
  // language present in the starters as implicitly permitted.
  const permits = (slug: string) =>
    allowedSet.size === 0 || allowedSet.has(canonicalLanguageSlug(slug));

  const filterMap = <V,>(
    src: Record<string, V> | undefined,
  ): Record<string, V> | undefined => {
    if (!src) return src;
    const out: Record<string, V> = {};
    for (const [k, v] of Object.entries(src)) {
      if (!permits(k)) continue;
      const canonical = canonicalLanguageSlug(k);
      // If both "python" and "language.python" exist, the last write wins —
      // good enough; the duplicate is a form-state artefact, not real data.
      out[canonical] = v;
    }
    return out;
  };

  return {
    ...body,
    allowedLanguages: allowedUnique,
    starterCode: filterMap(body.starterCode),
    starterFiles: filterMap(body.starterFiles),
    entryFile: filterMap(body.entryFile),
  };
}

export default function CodingEditor({ mode, questionId }: CodingEditorProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("problem");
  const [state, setState] = useState<FormState>(EMPTY);
  const [tests, setTests] = useState<AdminTestCase[]>([]);
  const [languages, setLanguages] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Initial load.
  useEffect(() => {
    listPlugins({ category: "language" }).then((d) => setLanguages(d.plugins));
    if (mode === "edit" && questionId) {
      Promise.all([getAdminQuestion(questionId), listAdminTestCases(questionId)])
        .then(([q, tc]) => {
          setState({
            title: q.title,
            difficulty: q.difficulty,
            maxScore: q.maxScore,
            isNegativeMarked: q.isNegativeMarked,
            negativeScore: q.negativeScore,
            body: { ...EMPTY.body, ...(q.body as unknown as QuestionBody) },
          });
          setTests(tc.testCases);
          setLoading(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Question load failed.");
          setLoading(false);
        });
    }
  }, [mode, questionId]);

  // Save question (body + difficulty + score). Test cases use their own endpoints
  // in edit mode; in new mode we send them with the create payload.
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const sanitizedBody = sanitizeBodyForPayload({
        ...state.body,
        // The schema (assessment-coding/question-body.schema.json) requires
        // body.title; the outer state.title was the only source of truth so
        // make sure it lands in the body too — otherwise the create payload
        // fails validation with a non-obvious "title required" error.
        title: state.title,
        prompt: state.body.prompt || "Describe the problem here.",
      });
      const payload = {
        title: state.title,
        plugin_slug: "assessment.coding",
        body: sanitizedBody as unknown as Record<string, unknown>,
        max_score: state.maxScore,
        is_negative_marked: state.isNegativeMarked,
        negative_score: state.negativeScore,
        difficulty: state.difficulty,
        test_cases: mode === "new" ? tests.map(testToInput) : undefined,
      };
      if (mode === "new") {
        const created = await createAdminQuestion(payload);
        router.push(`/admin/coding/${created.id}`);
        return;
      }
      await updateAdminQuestion(questionId!, payload);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="px-6 py-8 text-sm text-slate-500">Loading question…</div>;
  }

  return (
    <main className="px-4 sm:px-6 py-6 sm:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
              Content · Coding · {mode === "new" ? "New" : "Edit"}
            </p>
            <input
              value={state.title}
              onChange={(e) => setState({ ...state, title: e.target.value })}
              placeholder="Question title"
              className="mt-2 w-full bg-transparent text-xl sm:text-2xl md:text-3xl font-bold tracking-tight outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            {savedAt && <span className="text-xs text-slate-500">Saved {savedAt}</span>}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-md bg-emerald-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 whitespace-nowrap"
            >
              {saving ? "Saving…" : mode === "new" ? "Create" : "Publish new version"}
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <nav className="-mx-4 sm:mx-0 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 sm:px-0 dark:border-white/10">
          {(["problem", "tests", "languages", "limits", "settings"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`shrink-0 px-3 sm:px-4 py-2 text-sm font-semibold transition border-b-2 ${
                tab === t
                  ? "border-emerald-600 text-emerald-600 dark:text-emerald-300"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {tabLabels[t]}
            </button>
          ))}
        </nav>

        {tab === "problem" && (
          <ProblemTab state={state} onChange={setState} />
        )}
        {tab === "tests" && (
          <TestsTab
            tests={tests}
            setTests={setTests}
            mode={mode}
            questionId={questionId}
            onError={setError}
          />
        )}
        {tab === "languages" && (
          <LanguagesTab state={state} onChange={setState} languages={languages} />
        )}
        {tab === "limits" && <LimitsTab state={state} onChange={setState} />}
        {tab === "settings" && <SettingsTab state={state} onChange={setState} />}
      </div>
    </main>
  );
}

const tabLabels: Record<Tab, string> = {
  problem: "Problem",
  tests: "Test Cases",
  languages: "Languages & Starter",
  limits: "Limits & Judge",
  settings: "Settings",
};

// ── PROBLEM TAB ───────────────────────────────────────────────────────────

function ProblemTab({
  state,
  onChange,
}: {
  state: FormState;
  onChange: (s: FormState) => void;
}) {
  const setBody = (patch: Partial<QuestionBody>) =>
    onChange({ ...state, body: { ...state.body, ...patch } });

  const [pane, setPane] = useState<"edit" | "preview">("edit");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const media = state.body.media ?? [];

  const promptFormat = state.body.promptFormat;
  const monacoLang =
    promptFormat === "markdown" ? "markdown" : promptFormat === "html" ? "html" : "plaintext";

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded: MediaAsset[] = [];
      for (const file of Array.from(files)) {
        const res = await uploadQuestionAsset("coding", file);
        uploaded.push({
          url: res.url,
          key: res.key,
          fileName: res.fileName,
          alt: file.name,
          mime: file.type,
        });
      }
      setBody({ media: [...media, ...uploaded] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const snippetFor = (m: MediaAsset): string => {
    const alt = (m.alt ?? m.fileName ?? "media").replace(/[\]\\]/g, "");
    if (promptFormat === "html") return `<img src="${m.url}" alt="${alt}" />`;
    if (promptFormat === "plain") return `[media: ${m.url}]`;
    return `![${alt}](${m.url})`;
  };

  const appendToPrompt = (snippet: string) => {
    const sep = state.body.prompt && !state.body.prompt.endsWith("\n") ? "\n\n" : "";
    setBody({ prompt: state.body.prompt + sep + snippet + "\n" });
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore — admin can manually copy from the snippet preview
    }
  };

  const removeMedia = (idx: number) => {
    setBody({ media: media.filter((_, i) => i !== idx) });
  };

  return (
    <section className="grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] gap-6">
      <div className="flex flex-col gap-4">
        <FieldSelect
          label="Difficulty"
          value={state.difficulty}
          onChange={(v) => onChange({ ...state, difficulty: v })}
          options={[
            { value: 1, label: "Easy" },
            { value: 2, label: "Easy+" },
            { value: 3, label: "Medium" },
            { value: 4, label: "Hard" },
            { value: 5, label: "Hard+" },
          ]}
        />
        <FieldSelect
          label="Prompt format"
          value={state.body.promptFormat}
          onChange={(v) => setBody({ promptFormat: v as QuestionBody["promptFormat"] })}
          options={[
            { value: "markdown", label: "Markdown (recommended)" },
            { value: "html", label: "HTML" },
            { value: "plain", label: "Plain text" },
          ]}
        />
        <Field label="Section / topic">
          <input
            value={state.body.section ?? ""}
            onChange={(e) => setBody({ section: e.target.value, category: e.target.value })}
            placeholder="Arrays & Hashing"
            className="input-base"
          />
        </Field>
        <Field label="Constraints" hint="Free-form text shown below the prompt.">
          <textarea
            value={state.body.constraints ?? ""}
            onChange={(e) => setBody({ constraints: e.target.value })}
            rows={4}
            className="input-base font-mono text-xs"
          />
        </Field>

        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ImageIcon size={12} /> Question Pool
            </span>
            <Switch
              checked={(state.body.mode ?? "main") === "trial"}
              onCheckedChange={(val) => setBody({ mode: val ? "trial" : "main" })}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            On = Sample / Trial pool (visible during practice); Off = Main pool (live exam set).
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ImageIcon size={12} /> Media ({media.length})
            </span>
            <label className="cursor-pointer text-xs font-bold text-emerald-600 hover:underline">
              <UploadIcon size={11} className="inline mr-1" />
              {uploading ? "Uploading…" : "Add"}
              <input
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {uploadError && (
            <p className="text-[11px] text-red-500">{uploadError}</p>
          )}
          {media.length === 0 ? (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Optional. Upload images / video / audio, then insert into the statement using the snippet for the selected format. Inserted media renders inline in the candidate's preview.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {media.map((m, i) => (
                <li key={i} className="flex items-center gap-2 text-[11px] bg-slate-50 dark:bg-white/5 rounded-lg p-2">
                  {m.mime?.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.alt ?? ""} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }} />
                  ) : (
                    <div style={{ width: 32, height: 32, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.1)", borderRadius: 4 }}>
                      <ImageIcon size={14} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate text-slate-900 dark:text-white">{m.fileName ?? m.url}</div>
                    <div className="flex gap-1.5">
                      <button type="button" className="text-emerald-600 hover:underline" onClick={() => appendToPrompt(snippetFor(m))}>Insert</button>
                      <button type="button" className="text-slate-500 hover:underline" onClick={() => copy(snippetFor(m))}>Copy</button>
                    </div>
                  </div>
                  <button type="button" className="text-red-500 hover:text-red-700" onClick={() => removeMedia(i)} title="Remove">
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Statement ({promptFormat})
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden text-xs font-bold">
            <button
              type="button"
              onClick={() => setPane("edit")}
              className={`flex items-center gap-1 px-3 py-1.5 ${pane === "edit" ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-300"}`}
            >
              <Code size={12} /> Edit
            </button>
            <button
              type="button"
              onClick={() => setPane("preview")}
              className={`flex items-center gap-1 px-3 py-1.5 ${pane === "preview" ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-300"}`}
            >
              <Eye size={12} /> Preview
            </button>
          </div>
        </div>
        {pane === "edit" ? (
          <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden" style={{ height: 520 }}>
            <MonacoEditor
              path={`prompt.${promptFormat}`}
              value={state.body.prompt}
              language={monacoLang}
              fontSize={13}
              theme={typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light"}
              suggestionsEnabled={false}
              lintsEnabled={false}
              onChange={(v) => setBody({ prompt: v })}
            />
          </div>
        ) : (
          <div className="border border-slate-200 dark:border-white/10 rounded-lg p-4 overflow-auto bg-white dark:bg-[#0f1411]" style={{ height: 520 }}>
            <PromptPreview prompt={state.body.prompt} format={promptFormat} />
          </div>
        )}
        <p className="text-xs text-slate-400">
          The candidate-side renderer matches the selected format. HTML preview is sandboxed.
        </p>
      </div>
    </section>
  );
}

function PromptPreview({ prompt, format }: { prompt: string; format: QuestionBody["promptFormat"] }) {
  if (format === "markdown") {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{prompt}</ReactMarkdown>
      </div>
    );
  }
  if (format === "html") {
    return (
      <iframe
        title="HTML preview"
        srcDoc={prompt}
        sandbox="allow-same-origin"
        style={{ width: "100%", height: "100%", border: 0, background: "white" }}
      />
    );
  }
  return <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{prompt}</pre>;
}

// ── TEST CASES TAB ────────────────────────────────────────────────────────

function testToInput(tc: AdminTestCase) {
  return {
    name: tc.name,
    is_sample: tc.isSample,
    is_hidden: tc.isHidden,
    weight: tc.weight,
    stdin: tc.stdin,
    expected_stdout: tc.expectedStdout,
    comparator: tc.comparator,
    comparator_config: tc.comparatorConfig,
  };
}

function TestsTab({
  tests,
  setTests,
  mode,
  questionId,
  onError,
}: {
  tests: AdminTestCase[];
  setTests: React.Dispatch<React.SetStateAction<AdminTestCase[]>>;
  mode: "new" | "edit";
  questionId?: string;
  onError: (msg: string) => void;
}) {
  const [selected, setSelected] = useState(0);

  const updateLocal = (i: number, patch: Partial<AdminTestCase>) =>
    setTests((cur) => cur.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const persistTest = async (i: number) => {
    if (mode === "new") return; // saved with the question on create
    if (!questionId) return;
    const t = tests[i];
    try {
      if (t.id && t.id !== "__pending__") {
        await updateAdminTestCase(questionId, t.id, testToInput(t));
      } else {
        const created = await appendAdminTestCase(questionId, testToInput(t));
        updateLocal(i, created);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Test case save failed.");
    }
  };

  const addTest = () => {
    const next: AdminTestCase = {
      id: "__pending__",
      questionVersionId: "",
      ordinal: tests.length + 1,
      name: `Case ${tests.length + 1}`,
      isSample: tests.length < 2,
      isHidden: tests.length >= 2,
      weight: 1,
      stdin: "",
      expectedStdout: "",
      comparator: "trim_equal",
      comparatorConfig: {},
    };
    setTests([...tests, next]);
    setSelected(tests.length);
  };

  const removeTest = async (i: number) => {
    const t = tests[i];
    if (mode === "edit" && questionId && t.id && t.id !== "__pending__") {
      try {
        await deleteAdminTestCase(questionId, t.id);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Delete failed.");
        return;
      }
    }
    setTests((cur) => cur.filter((_, idx) => idx !== i));
    setSelected(Math.max(0, selected - 1));
  };

  const current = tests[selected];

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6">
      <aside className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {tests.length} test case{tests.length !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={addTest}
            className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700"
          >
            + Add
          </button>
        </div>
        <ul className="flex flex-col gap-1">
          {tests.map((t, i) => (
            <li key={t.id + ":" + i}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                className={`w-full rounded-md px-3 py-2 text-left text-xs transition ${
                  selected === i
                    ? "bg-emerald-600 text-white"
                    : "hover:bg-emerald-50 dark:hover:bg-white/[0.04]"
                }`}
              >
                <span className="block truncate font-mono">
                  #{i + 1} {t.name || "Unnamed"}
                </span>
                <span className={`text-[10px] uppercase tracking-wider ${selected === i ? "text-white/70" : "text-slate-400"}`}>
                  {t.isHidden ? "hidden" : "visible"} · weight {t.weight}
                </span>
              </button>
            </li>
          ))}
          {tests.length === 0 && <p className="text-xs text-slate-400 px-2 py-3">No test cases yet.</p>}
        </ul>
      </aside>

      {current ? (
        <div className="flex flex-col gap-4">
          <Field label="Name">
            <input
              value={current.name}
              onChange={(e) => updateLocal(selected, { name: e.target.value })}
              onBlur={() => persistTest(selected)}
              className="input-base"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Weight">
              <input
                type="number"
                step="0.5"
                value={current.weight}
                onChange={(e) => updateLocal(selected, { weight: Number(e.target.value) })}
                onBlur={() => persistTest(selected)}
                className="input-base"
              />
            </Field>
            <FieldSelect
              label="Comparator"
              value={current.comparator}
              onChange={(v) => {
                updateLocal(selected, { comparator: v as string });
              }}
              onBlur={() => persistTest(selected)}
              options={[
                { value: "trim_equal", label: "Trim equal" },
                { value: "strict", label: "Strict" },
                { value: "json", label: "JSON" },
                { value: "regex", label: "Regex" },
              ]}
            />
            <div className="flex flex-col gap-2 sm:pt-6">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-600"
                  checked={current.isSample}
                  onChange={(e) => {
                    updateLocal(selected, { isSample: e.target.checked });
                    persistTest(selected);
                  }}
                />
                Sample (shown to candidate)
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-600"
                  checked={current.isHidden}
                  onChange={(e) => {
                    updateLocal(selected, { isHidden: e.target.checked });
                    persistTest(selected);
                  }}
                />
                Hidden (not shown — final scoring only)
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Stdin">
              <textarea
                value={current.stdin}
                onChange={(e) => updateLocal(selected, { stdin: e.target.value })}
                onBlur={() => persistTest(selected)}
                rows={8}
                className="input-base font-mono text-xs"
              />
            </Field>
            <Field label="Expected stdout">
              <textarea
                value={current.expectedStdout}
                onChange={(e) => updateLocal(selected, { expectedStdout: e.target.value })}
                onBlur={() => persistTest(selected)}
                rows={8}
                className="input-base font-mono text-xs"
              />
            </Field>
          </div>
          <div className="flex">
            <button
              type="button"
              onClick={() => removeTest(selected)}
              className="text-xs text-slate-400 hover:text-red-500"
            >
              Delete this case
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-500">Pick a test case or add one.</div>
      )}
    </section>
  );
}

// ── LANGUAGES TAB ─────────────────────────────────────────────────────────

function LanguagesTab({
  state,
  onChange,
  languages,
}: {
  state: FormState;
  onChange: (s: FormState) => void;
  languages: Plugin[];
}) {
  const allowed = state.body.allowedLanguages ?? [];
  const [activeLangState, setActiveLang] = useState<string>("");
  // Derive (instead of effect-syncing) so the active tab follows the allowed
  // set without a cascading render.
  const activeLang =
    activeLangState && allowed.includes(activeLangState) ? activeLangState : allowed[0] ?? "";

  const toggleLang = (slug: string) => {
    const next = allowed.includes(slug)
      ? allowed.filter((s) => s !== slug)
      : [...allowed, slug];
    onChange({ ...state, body: { ...state.body, allowedLanguages: next } });
  };

  const files = state.body.starterFiles?.[activeLang] ?? [];
  const setFiles = (next: StarterFile[]) =>
    onChange({
      ...state,
      body: {
        ...state.body,
        starterFiles: { ...(state.body.starterFiles ?? {}), [activeLang]: next },
      },
    });

  const setEntryFile = (path: string) =>
    onChange({
      ...state,
      body: {
        ...state.body,
        entryFile: { ...(state.body.entryFile ?? {}), [activeLang]: path },
      },
    });

  const langSchema: LanguageSchema | undefined = useMemo(() => {
    const plug = languages.find((p) => p.slug === activeLang);
    return plug?.schema as LanguageSchema | undefined;
  }, [activeLang, languages]);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Allowed languages
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {languages.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => toggleLang(l.slug)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                allowed.includes(l.slug)
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 dark:border-white/10 dark:text-slate-300"
              }`}
            >
              {(l.schema as LanguageSchema | undefined)?.displayName ?? l.name}
            </button>
          ))}
        </div>
      </div>

      {allowed.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-white/10">
            {allowed.map((slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => setActiveLang(slug)}
                className={`px-3 py-2 text-xs font-mono transition border-b-2 ${
                  activeLang === slug
                    ? "border-emerald-600 text-emerald-600 dark:text-emerald-300"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {slug}
              </button>
            ))}
          </div>

          {activeLang && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Entry file" hint="The file Judge0 runs. Defaults to the language's default.">
                  <input
                    value={(state.body.entryFile ?? {})[activeLang] ?? ""}
                    onChange={(e) => setEntryFile(e.target.value)}
                    placeholder={langSchema?.defaultEntryFile ?? ""}
                    className="input-base font-mono"
                  />
                </Field>
                <div className="text-xs text-slate-500 sm:pt-6">
                  Default extension <span className="font-mono">{langSchema?.fileExtension ?? "?"}</span>{" "}
                  · multi-file{" "}
                  <span className="font-mono">{langSchema?.supportsMultiFile ? "yes" : "no"}</span>
                </div>
              </div>

              <StarterFilesEditor
                files={files}
                setFiles={setFiles}
                extension={langSchema?.fileExtension ?? ""}
                monacoLanguageId={langSchema?.monacoLanguageId ?? "plaintext"}
                editorKey={activeLang}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}

function StarterFilesEditor({
  files,
  setFiles,
  extension,
  monacoLanguageId,
  editorKey,
}: {
  files: StarterFile[];
  setFiles: (next: StarterFile[]) => void;
  extension: string;
  monacoLanguageId: string;
  editorKey: string;
}) {
  const [activeIdxState, setActiveIdx] = useState(0);
  // Clamp inline rather than syncing via effect.
  const activeIdx = Math.min(activeIdxState, Math.max(0, files.length - 1));

  const update = (i: number, patch: Partial<StarterFile>) =>
    setFiles(files.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const addFile = () => {
    setFiles([
      ...files,
      {
        path: `solution${extension || ".py"}`,
        content: "",
        readOnly: false,
      },
    ]);
    setActiveIdx(files.length);
  };

  const removeFile = (i: number) => {
    setFiles(files.filter((_, idx) => idx !== i));
  };

  const current = files[activeIdx];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-4">
      <aside className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Files
          </span>
          <button
            type="button"
            onClick={addFile}
            className="rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-emerald-700"
          >
            + Add
          </button>
        </div>
        {files.map((f, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIdx(i)}
            className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs transition ${
              activeIdx === i
                ? "bg-emerald-600 text-white"
                : "hover:bg-emerald-50 dark:hover:bg-white/[0.04]"
            }`}
          >
            <span className="font-mono truncate">{f.path}</span>
            {f.readOnly && (
              <span className={activeIdx === i ? "text-white/70" : "text-slate-400"}>🔒</span>
            )}
          </button>
        ))}
        {files.length === 0 && (
          <p className="text-xs text-slate-400 px-2 py-2">No files yet.</p>
        )}
      </aside>

      {current && (
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Field label="Path" className="flex-1 min-w-[160px]">
              <input
                value={current.path}
                onChange={(e) => update(activeIdx, { path: e.target.value })}
                className="input-base font-mono"
              />
            </Field>
            <label className="flex items-center gap-2 text-xs sm:pt-6">
              <input
                type="checkbox"
                checked={current.readOnly ?? false}
                onChange={(e) => update(activeIdx, { readOnly: e.target.checked })}
                className="h-4 w-4 accent-emerald-600"
              />
              File read-only
            </label>
            <button
              type="button"
              onClick={() => removeFile(activeIdx)}
              className="text-xs text-slate-400 hover:text-red-500 sm:pt-6"
            >
              Delete
            </button>
          </div>

          <div className="h-[440px] rounded-md border border-slate-200 dark:border-white/10 overflow-hidden">
            <MonacoEditor
              // Path must change when the language tab changes — otherwise the
              // model is reused with the wrong language. Composite key gives
              // each {language,file} pair its own undo stack.
              path={`${editorKey}::${current.path}`}
              value={current.content}
              language={monacoLanguageId}
              fontSize={13}
              theme="dark"
              lockedRegions={current.lockedRegions}
              // Admin is *authoring* the locked regions — they need to edit
              // those lines too. The decorations stay visible; the revert
              // logic is bypassed.
              enforceLockedRegions={false}
              suggestionsEnabled={false}
              lintsEnabled={false}
              onChange={(v) => update(activeIdx, { content: v })}
            />
          </div>

          <LockedRegionsEditor
            regions={current.lockedRegions ?? []}
            setRegions={(next) => update(activeIdx, { lockedRegions: next })}
          />
        </div>
      )}
    </div>
  );
}

function LockedRegionsEditor({
  regions,
  setRegions,
}: {
  regions: LockedRegion[];
  setRegions: (next: LockedRegion[]) => void;
}) {
  const [startLine, setStartLine] = useState(1);
  const [endLine, setEndLine] = useState(1);
  const [reason, setReason] = useState("");

  const addRegion = () => {
    if (endLine < startLine) return;
    setRegions([...regions, { startLine, endLine, reason: reason || undefined }]);
    setStartLine(endLine + 1);
    setEndLine(endLine + 1);
    setReason("");
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Locked line ranges
      </span>
      <p className="text-xs text-slate-400">
        Lines in these ranges cannot be edited by the candidate. The backend re-validates every run.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Start line">
          <input
            type="number"
            min={1}
            value={startLine}
            onChange={(e) => setStartLine(Number(e.target.value))}
            className="input-base w-24"
          />
        </Field>
        <Field label="End line">
          <input
            type="number"
            min={1}
            value={endLine}
            onChange={(e) => setEndLine(Number(e.target.value))}
            className="input-base w-24"
          />
        </Field>
        <Field label="Reason (optional)" className="flex-1 min-w-[200px]">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="function signature"
            className="input-base"
          />
        </Field>
        <button
          type="button"
          onClick={addRegion}
          className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
        >
          Add region
        </button>
      </div>
      {regions.length > 0 && (
        <ul className="flex flex-col gap-1">
          {regions.map((r, i) => (
            <li
              key={i}
              className="flex items-center justify-between text-xs rounded-md bg-slate-100 dark:bg-white/[0.04] px-3 py-1.5"
            >
              <span className="font-mono">
                Lines {r.startLine}–{r.endLine}
                {r.reason && <span className="text-slate-500"> · {r.reason}</span>}
              </span>
              <button
                type="button"
                onClick={() => setRegions(regions.filter((_, idx) => idx !== i))}
                className="text-slate-400 hover:text-red-500"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── LIMITS & JUDGE TAB ────────────────────────────────────────────────────

function LimitsTab({
  state,
  onChange,
}: {
  state: FormState;
  onChange: (s: FormState) => void;
}) {
  const setBody = (patch: Partial<QuestionBody>) =>
    onChange({ ...state, body: { ...state.body, ...patch } });
  const judge = state.body.judgeConfig ?? {};
  const setJudge = (patch: Partial<typeof judge>) =>
    setBody({ judgeConfig: { ...judge, ...patch } });

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Scoring</h3>
        <Field label="Max score">
          <input
            type="number"
            value={state.maxScore}
            onChange={(e) => onChange({ ...state, maxScore: Number(e.target.value) })}
            className="input-base"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.isNegativeMarked}
            onChange={(e) => onChange({ ...state, isNegativeMarked: e.target.checked })}
            className="h-4 w-4 accent-emerald-600"
          />
          Negative marking (applies when no test cases pass)
        </label>
        {state.isNegativeMarked && (
          <Field label="Negative score">
            <input
              type="number"
              value={state.negativeScore}
              onChange={(e) => onChange({ ...state, negativeScore: Number(e.target.value) })}
              className="input-base"
            />
          </Field>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Judge behavior</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={judge.partialCredit ?? true}
            onChange={(e) => setJudge({ partialCredit: e.target.checked })}
            className="h-4 w-4 accent-emerald-600"
          />
          Partial credit by weighted test-case score
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={judge.strictWhitespace ?? false}
            onChange={(e) => setJudge({ strictWhitespace: e.target.checked })}
            className="h-4 w-4 accent-emerald-600"
          />
          Strict whitespace comparison
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={judge.showDiff ?? true}
            onChange={(e) => setJudge({ showDiff: e.target.checked })}
            className="h-4 w-4 accent-emerald-600"
          />
          Show expected/actual diff for visible cases
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={judge.stopOnFailure ?? false}
            onChange={(e) => setJudge({ stopOnFailure: e.target.checked })}
            className="h-4 w-4 accent-emerald-600"
          />
          Stop running on first failure
        </label>
      </div>
    </section>
  );
}

// ── SETTINGS TAB ──────────────────────────────────────────────────────────

function SettingsTab({
  state,
  onChange,
}: {
  state: FormState;
  onChange: (s: FormState) => void;
}) {
  const ux = state.body.uxSettings ?? {};
  const setUX = (patch: Partial<typeof ux>) =>
    onChange({ ...state, body: { ...state.body, uxSettings: { ...ux, ...patch } } });

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Candidate experience</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ux.disableCopyPaste ?? true}
            onChange={(e) => setUX({ disableCopyPaste: e.target.checked })}
            className="h-4 w-4 accent-emerald-600"
          />
          Disable copy/paste in editor
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ux.lineNumbers ?? true}
            onChange={(e) => setUX({ lineNumbers: e.target.checked })}
            className="h-4 w-4 accent-emerald-600"
          />
          Show line numbers
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ux.lockOnSubmit ?? false}
            onChange={(e) => setUX({ lockOnSubmit: e.target.checked })}
            className="h-4 w-4 accent-emerald-600"
          />
          Lock editor after submit
        </label>
      </div>

      <div className="text-xs text-slate-500 leading-relaxed">
        Proctoring toggles (full-screen lock, tab-switch detection, webcam capture) are configured at the exam
        package level, not per question. Visit{" "}
        <Link href="/admin/exam-packages" className="text-emerald-600 hover:underline">
          Exam Packages
        </Link>{" "}
        to wire them.
      </div>
    </section>
  );
}

// ── Small UI helpers ──────────────────────────────────────────────────────

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function FieldSelect<T extends string | number>({
  label,
  value,
  onChange,
  onBlur,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  onBlur?: () => void;
  options: { value: T; label: string }[];
}) {
  const isNumeric = typeof value === "number" || options.some((o) => typeof o.value === "number");
  return (
    <Field label={label}>
      <CustomSelect
        value={String(value)}
        options={options.map((o) => ({ value: String(o.value), label: o.label }))}
        onChange={(v) => {
          const next = (isNumeric ? Number(v) : v) as T;
          onChange(next);
        }}
        onOpenChange={(open) => {
          if (!open) onBlur?.();
        }}
      />
    </Field>
  );
}
