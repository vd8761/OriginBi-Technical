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

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MonacoEditor, { type MonacoEditorApi } from "@/components/assessment/coding/MonacoEditor";
import CustomSelect from "@/components/ui/CustomSelect";
import { Switch } from "@/components/ui/Switch";
import { Image as ImageIcon, Trash2, Upload as UploadIcon } from "lucide-react";
import FormatAwareEditor, { type FormattedText } from "./FormatAwareEditor";
import TagChips from "./TagChips";
import {
  createAdminQuestion,
  updateAdminQuestion,
  getAdminQuestion,
  listAdminQuestions,
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

interface AttachmentAsset {
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
  // Authoring-spec fields (mirror plugins/assessment-coding/types.go).
  tags?: string[];
  inputFormat?: FormattedText;
  outputFormat?: FormattedText;
  constraintsFormat?: FormattedText;
  hintsEnabled?: boolean;
  multiFile?: boolean;
  // The plugin schema reserves `media` for a single embedded video/audio
  // object, so multi-file question attachments live under `attachments`.
  // Schema root allows additionalProperties so the backend accepts it.
  attachments?: AttachmentAsset[];
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
    tags: [],
    mode: "main",
    hintsEnabled: false,
    multiFile: false,
    inputFormat: { kind: "markdown", content: "" },
    outputFormat: { kind: "markdown", content: "" },
    constraintsFormat: { kind: "markdown", content: "" },
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

const EMPTY_FORMAT: FormattedText = { kind: "markdown", content: "" };

// migrateBodyOnLoad heals a question body loaded from the backend so the
// editor always has the authoring-spec fields. Legacy bodies (migration
// 011/021) round-trip: missing fields default empty, and a legacy plain
// `constraints` string is lifted into `constraintsFormat` (kind: plain) so the
// admin still sees what was there.
function migrateBodyOnLoad(raw: QuestionBody): QuestionBody {
  const body: QuestionBody = { ...EMPTY.body, ...raw };
  body.tags = raw.tags ?? [];
  body.inputFormat = raw.inputFormat ?? { ...EMPTY_FORMAT };
  body.outputFormat = raw.outputFormat ?? { ...EMPTY_FORMAT };
  if (raw.constraintsFormat) {
    body.constraintsFormat = raw.constraintsFormat;
  } else if (raw.constraints && raw.constraints.trim()) {
    body.constraintsFormat = { kind: "plain", content: raw.constraints };
  } else {
    body.constraintsFormat = { ...EMPTY_FORMAT };
  }
  body.hintsEnabled = raw.hintsEnabled ?? (raw.hints?.length ?? 0) > 0;
  body.multiFile =
    raw.multiFile ??
    Object.values(raw.starterFiles ?? {}).some((files) => (files?.length ?? 0) > 1);
  body.mode = raw.mode ?? "main";
  return body;
}

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
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  // Initial load.
  useEffect(() => {
    listPlugins({ category: "language" }).then((d) => setLanguages(d.plugins));
    // Pull the union of tags used across existing coding questions so the tag
    // input can autocomplete. Best-effort — failures just yield no suggestions.
    listAdminQuestions({ pluginSlug: "assessment.coding" })
      .then((d) => {
        const set = new Set<string>();
        for (const q of d.questions) {
          const tags = (q.body as { tags?: string[] } | undefined)?.tags ?? [];
          for (const t of tags) if (typeof t === "string") set.add(t);
        }
        setTagSuggestions(Array.from(set).sort());
      })
      .catch(() => setTagSuggestions([]));
    if (mode === "edit" && questionId) {
      Promise.all([getAdminQuestion(questionId), listAdminTestCases(questionId)])
        .then(([q, tc]) => {
          setState({
            title: q.title,
            difficulty: q.difficulty,
            maxScore: q.maxScore,
            isNegativeMarked: q.isNegativeMarked,
            negativeScore: q.negativeScore,
            body: migrateBodyOnLoad(q.body as unknown as QuestionBody),
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
            <label className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-white/10 px-3 py-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {(state.body.mode ?? "main") === "trial" ? "Trial pool" : "Main pool"}
              </span>
              <Switch
                checked={(state.body.mode ?? "main") === "trial"}
                onCheckedChange={(val) =>
                  setState({
                    ...state,
                    body: { ...state.body, mode: val ? "trial" : "main" },
                  })
                }
              />
            </label>
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
          <ProblemTab
            state={state}
            onChange={setState}
            tagSuggestions={tagSuggestions}
          />
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

// Difficulty is stored as an integer (question_versions.difficulty); the
// authoring UI exposes three named buckets. easy=1, medium=3, hard=5.
function difficultyToWord(n: number): "easy" | "medium" | "hard" {
  if (n <= 2) return "easy";
  if (n === 3) return "medium";
  return "hard";
}
function wordToDifficulty(w: string): number {
  return w === "easy" ? 1 : w === "medium" ? 3 : 5;
}

function ProblemTab({
  state,
  onChange,
  tagSuggestions,
}: {
  state: FormState;
  onChange: (s: FormState) => void;
  tagSuggestions: string[];
}) {
  const setBody = (patch: Partial<QuestionBody>) =>
    onChange({ ...state, body: { ...state.body, ...patch } });

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const attachments = state.body.attachments ?? [];

  // The Statement editor hands back an imperative API so the media chips can
  // insert a snippet at the caret instead of appending to end-of-file.
  const statementApiRef = useRef<MonacoEditorApi | null>(null);

  const promptFormat = state.body.promptFormat;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded: AttachmentAsset[] = [];
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
      setBody({ attachments: [...attachments, ...uploaded] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const snippetFor = (m: AttachmentAsset): string => {
    const alt = (m.alt ?? m.fileName ?? "media").replace(/[\]\\]/g, "");
    if (promptFormat === "html") return `<img src="${m.url}" alt="${alt}" />`;
    if (promptFormat === "plain") return `[media: ${m.url}]`;
    return `![${alt}](${m.url})`;
  };

  const insertSnippet = (m: AttachmentAsset) => {
    const snippet = snippetFor(m);
    if (statementApiRef.current) {
      statementApiRef.current.insertAtCursor(snippet);
    } else {
      // Fallback when the statement editor is in preview mode.
      const sep =
        state.body.prompt && !state.body.prompt.endsWith("\n") ? "\n\n" : "";
      setBody({ prompt: state.body.prompt + sep + snippet + "\n" });
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore — admin can manually copy from the snippet preview
    }
  };

  const removeAttachment = (idx: number) => {
    setBody({ attachments: attachments.filter((_, i) => i !== idx) });
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6">
        {/* Main stacked column */}
        <div className="flex flex-col gap-5 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Topic">
              <input
                value={state.body.section ?? ""}
                onChange={(e) =>
                  setBody({ section: e.target.value, category: e.target.value })
                }
                placeholder="Arrays & Hashing"
                className="input-base"
              />
            </Field>
            <FieldSelect
              label="Difficulty"
              value={difficultyToWord(state.difficulty)}
              onChange={(v) =>
                onChange({ ...state, difficulty: wordToDifficulty(v) })
              }
              options={[
                { value: "easy", label: "Easy" },
                { value: "medium", label: "Medium" },
                { value: "hard", label: "Hard" },
              ]}
            />
            <Field label="Marks">
              <input
                type="number"
                min={1}
                value={state.maxScore}
                onChange={(e) =>
                  onChange({ ...state, maxScore: Number(e.target.value) })
                }
                className="input-base"
              />
            </Field>
          </div>

          <Field label="Tags">
            <TagChips
              value={state.body.tags ?? []}
              onChange={(tags) => setBody({ tags })}
              suggestions={tagSuggestions}
            />
          </Field>

          <FormatAwareEditor
            label="Question Statement"
            monacoPathKey="statement"
            height={480}
            value={{ kind: promptFormat, content: state.body.prompt }}
            onChange={(ft) =>
              setBody({ promptFormat: ft.kind, prompt: ft.content })
            }
            onReady={(api) => {
              statementApiRef.current = api;
            }}
          />

          <FormatAwareEditor
            label="Input Format"
            monacoPathKey="input-format"
            height={200}
            value={state.body.inputFormat ?? { kind: "markdown", content: "" }}
            onChange={(ft) => setBody({ inputFormat: ft })}
          />

          <FormatAwareEditor
            label="Output Format"
            monacoPathKey="output-format"
            height={200}
            value={state.body.outputFormat ?? { kind: "markdown", content: "" }}
            onChange={(ft) => setBody({ outputFormat: ft })}
          />

          <FormatAwareEditor
            label="Constraints"
            monacoPathKey="constraints"
            height={200}
            value={
              state.body.constraintsFormat ?? { kind: "markdown", content: "" }
            }
            onChange={(ft) =>
              // Keep the legacy plain `constraints` string in sync so older
              // candidate renderers still have something to show.
              setBody({
                constraintsFormat: ft,
                constraints: ft.kind === "plain" ? ft.content : state.body.constraints,
              })
            }
          />
        </div>

        {/* Sticky media rail */}
        <aside className="lg:sticky lg:top-4 self-start">
          <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ImageIcon size={12} /> Media ({attachments.length})
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
            {uploadError && <p className="text-[11px] text-red-500">{uploadError}</p>}
            {attachments.length === 0 ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Optional. Upload images / video / audio, then click Insert to
                drop the snippet at your cursor in the statement.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {attachments.map((m, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-[11px] bg-slate-50 dark:bg-white/5 rounded-lg p-2"
                  >
                    {m.mime?.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.url}
                        alt={m.alt ?? ""}
                        style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          display: "grid",
                          placeItems: "center",
                          background: "rgba(0,0,0,0.1)",
                          borderRadius: 4,
                        }}
                      >
                        <ImageIcon size={14} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate text-slate-900 dark:text-white">
                        {m.fileName ?? m.url}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          className="text-emerald-600 hover:underline"
                          onClick={() => insertSnippet(m)}
                        >
                          Insert
                        </button>
                        <button
                          type="button"
                          className="text-slate-500 hover:underline"
                          onClick={() => copy(snippetFor(m))}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => removeAttachment(i)}
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <HintsCard state={state} onChange={onChange} />
    </section>
  );
}

// ── HINTS ─────────────────────────────────────────────────────────────────

function HintsCard({
  state,
  onChange,
}: {
  state: FormState;
  onChange: (s: FormState) => void;
}) {
  const setBody = (patch: Partial<QuestionBody>) =>
    onChange({ ...state, body: { ...state.body, ...patch } });
  const hints = state.body.hints ?? [];
  const enabled = state.body.hintsEnabled ?? false;

  const setHint = (i: number, patch: Partial<{ afterFailures: number; text: string }>) =>
    setBody({ hints: hints.map((h, idx) => (idx === i ? { ...h, ...patch } : h)) });

  const addHint = () => {
    const last = hints[hints.length - 1];
    const next = last ? last.afterFailures + 2 : 2;
    setBody({ hints: [...hints, { afterFailures: next, text: "" }] });
  };

  const removeHint = (i: number) =>
    setBody({ hints: hints.filter((_, idx) => idx !== i) });

  // Non-monotonic afterFailures is allowed by the backend but usually a
  // mistake; surface a soft warning.
  const nonMonotonic = hints.some(
    (h, i) => i > 0 && h.afterFailures <= hints[i - 1].afterFailures,
  );

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Hints
        </span>
        <label className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Show hints to candidate
          </span>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => setBody({ hintsEnabled: v })}
          />
        </label>
      </div>

      {enabled && (
        <>
          {nonMonotonic && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Tip: &quot;Show after N failures&quot; values usually increase
              hint-by-hint so each hint unlocks later than the previous one.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {hints.map((h, i) => (
              <li
                key={i}
                className="flex flex-col sm:flex-row gap-2 sm:items-start rounded-lg bg-slate-50 dark:bg-white/[0.04] p-2"
              >
                <label className="flex flex-col gap-1 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    After N failures
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={h.afterFailures}
                    onChange={(e) =>
                      setHint(i, {
                        afterFailures: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="input-base w-28"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Hint text
                  </span>
                  <textarea
                    value={h.text}
                    maxLength={2000}
                    rows={2}
                    onChange={(e) => setHint(i, { text: e.target.value })}
                    className="input-base text-xs"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeHint(i)}
                  className="text-xs text-slate-400 hover:text-red-500 sm:pt-5"
                >
                  Remove
                </button>
              </li>
            ))}
            {hints.length === 0 && (
              <p className="text-xs text-slate-400">No hints yet.</p>
            )}
          </ul>
          <button
            type="button"
            onClick={addHint}
            className="self-start rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700"
          >
            + Add hint
          </button>
        </>
      )}
    </div>
  );
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
    explanation: tc.explanation,
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
    // The first case defaults to a visible sample; every later one is hidden.
    const isFirst = tests.length === 0;
    const next: AdminTestCase = {
      id: "__pending__",
      questionVersionId: "",
      ordinal: tests.length + 1,
      name: `Case ${tests.length + 1}`,
      isSample: isFirst,
      isHidden: !isFirst,
      weight: 1,
      stdin: "",
      expectedStdout: "",
      explanation: "",
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
                  {t.isSample ? "sample" : "hidden"} · weight {t.weight}
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
            <div className="flex flex-col gap-1.5 sm:pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Visibility
              </span>
              <label className="flex items-center gap-2">
                <Switch
                  checked={current.isSample}
                  onCheckedChange={(v) => {
                    // Sample on → visible; off → hidden. The two flags are kept
                    // mutually exclusive so the candidate side is unambiguous.
                    updateLocal(selected, { isSample: v, isHidden: !v });
                    persistTest(selected);
                  }}
                />
                <span className="text-xs">
                  {current.isSample
                    ? "Shown to candidate as a sample"
                    : "Hidden — final scoring only"}
                </span>
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
          <Field
            label="Explanation"
            hint="Shown to the candidate beneath this case's I/O when it is a sample."
          >
            <textarea
              value={current.explanation}
              onChange={(e) => updateLocal(selected, { explanation: e.target.value })}
              onBlur={() => persistTest(selected)}
              rows={3}
              className="input-base text-xs"
            />
          </Field>
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

// Default runner-file extension per bare language slug. Mirrors
// solutionExtForLang in the Go CSV decoder — keep the two in sync.
const SOLUTION_EXT: Record<string, string> = {
  python: "py",
  python3: "py",
  java: "java",
  cpp: "cpp",
  javascript: "js",
  c: "c",
  go: "go",
  csharp: "cs",
  typescript: "ts",
};

function solutionExtFor(slug: string, schemaExt?: string): string {
  const bare = slug.replace(/^language\./, "").toLowerCase();
  if (SOLUTION_EXT[bare]) return SOLUTION_EXT[bare];
  if (schemaExt) return schemaExt.replace(/^\./, "");
  return "txt";
}

function LanguagesTab({
  state,
  onChange,
  languages,
}: {
  state: FormState;
  onChange: (s: FormState) => void;
  languages: Plugin[];
}) {
  // Single language per question — the first (and only) allowedLanguages entry.
  const activeLang = (state.body.allowedLanguages ?? [])[0] ?? "";
  const multiFile = state.body.multiFile ?? false;

  const langSchema: LanguageSchema | undefined = useMemo(() => {
    const plug = languages.find((p) => p.slug === activeLang);
    return plug?.schema as LanguageSchema | undefined;
  }, [activeLang, languages]);

  const ext = solutionExtFor(activeLang, langSchema?.fileExtension);
  const solutionPath = `solution.${ext}`;

  // Switching language wipes all language-keyed starters so a stale Python
  // starter never leaks into a Java question.
  const selectLanguage = (slug: string) => {
    onChange({
      ...state,
      body: {
        ...state.body,
        allowedLanguages: slug ? [slug] : [],
        starterCode: {},
        starterFiles: {},
        entryFile: {},
      },
    });
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

  const singleContent = state.body.starterCode?.[activeLang] ?? "";
  const setSingleContent = (content: string) =>
    onChange({
      ...state,
      body: {
        ...state.body,
        starterCode: { ...(state.body.starterCode ?? {}), [activeLang]: content },
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

  // Toggling multi-file converts the starter representation in place so no
  // content is lost.
  const toggleMultiFile = (on: boolean) => {
    if (!activeLang) {
      onChange({ ...state, body: { ...state.body, multiFile: on } });
      return;
    }
    if (on) {
      // Single → multi: seed the protected solution file with whatever the
      // single-file editor held.
      const existing = state.body.starterFiles?.[activeLang] ?? [];
      const hasSolution = existing.some((f) =>
        f.path.split(/[\\/]/).pop()?.toLowerCase().startsWith("solution."),
      );
      const seeded: StarterFile[] = hasSolution
        ? existing
        : [{ path: solutionPath, content: singleContent, readOnly: false }, ...existing];
      onChange({
        ...state,
        body: {
          ...state.body,
          multiFile: true,
          starterFiles: { ...(state.body.starterFiles ?? {}), [activeLang]: seeded },
          starterCode: {},
        },
      });
    } else {
      // Multi → single: collapse to the solution file's content.
      const solution = files.find((f) =>
        f.path.split(/[\\/]/).pop()?.toLowerCase().startsWith("solution."),
      );
      onChange({
        ...state,
        body: {
          ...state.body,
          multiFile: false,
          starterCode: {
            ...(state.body.starterCode ?? {}),
            [activeLang]: solution?.content ?? singleContent,
          },
          starterFiles: {},
          entryFile: {},
        },
      });
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Language"
          hint="One language per question. Changing it clears starter code."
        >
          <CustomSelect
            value={activeLang}
            placeholder="Select a language"
            options={languages.map((l) => ({
              value: l.slug,
              label: (l.schema as LanguageSchema | undefined)?.displayName ?? l.name,
            }))}
            onChange={selectLanguage}
          />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Multi-file workspace
          </span>
          <label className="flex items-center gap-2">
            <Switch checked={multiFile} onCheckedChange={toggleMultiFile} />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {multiFile
                ? `On — protected runner file ${solutionPath}`
                : "Off — single starter file"}
            </span>
          </label>
        </div>
      </div>

      {!activeLang && (
        <p className="text-sm text-slate-500">
          Pick a language to author starter code.
        </p>
      )}

      {activeLang && !multiFile && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Starter code ({solutionPath})
          </span>
          <div className="h-[440px] rounded-md border border-slate-200 dark:border-white/10 overflow-hidden">
            <MonacoEditor
              path={`single::${activeLang}`}
              value={singleContent}
              language={langSchema?.monacoLanguageId ?? "plaintext"}
              fontSize={13}
              theme="dark"
              suggestionsEnabled={false}
              lintsEnabled={false}
              onChange={setSingleContent}
            />
          </div>
        </div>
      )}

      {activeLang && multiFile && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Entry file"
              hint="The file Judge0 runs. Defaults to the language's default."
            >
              <input
                value={(state.body.entryFile ?? {})[activeLang] ?? ""}
                onChange={(e) => setEntryFile(e.target.value)}
                placeholder={langSchema?.defaultEntryFile ?? solutionPath}
                className="input-base font-mono"
              />
            </Field>
            <div className="text-xs text-slate-500 sm:pt-6">
              Default extension{" "}
              <span className="font-mono">{langSchema?.fileExtension ?? `.${ext}`}</span>
            </div>
          </div>

          <StarterFilesEditor
            files={files}
            setFiles={setFiles}
            extension={langSchema?.fileExtension ?? `.${ext}`}
            monacoLanguageId={langSchema?.monacoLanguageId ?? "plaintext"}
            editorKey={activeLang}
            protectedBasename="solution."
          />
        </div>
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
  protectedBasename,
}: {
  files: StarterFile[];
  setFiles: (next: StarterFile[]) => void;
  extension: string;
  monacoLanguageId: string;
  editorKey: string;
  /** Files whose basename starts with this prefix cannot be renamed or
   * deleted (the protected runner file, e.g. "solution."). */
  protectedBasename?: string;
}) {
  const [activeIdxState, setActiveIdx] = useState(0);
  // Clamp inline rather than syncing via effect.
  const activeIdx = Math.min(activeIdxState, Math.max(0, files.length - 1));

  const isProtected = (f: StarterFile) =>
    !!protectedBasename &&
    (f.path.split(/[\\/]/).pop() ?? "")
      .toLowerCase()
      .startsWith(protectedBasename.toLowerCase());

  const update = (i: number, patch: Partial<StarterFile>) =>
    setFiles(files.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const addFile = () => {
    setFiles([
      ...files,
      {
        path: `helper${extension || ".txt"}`,
        content: "",
        readOnly: false,
      },
    ]);
    setActiveIdx(files.length);
  };

  const removeFile = (i: number) => {
    if (isProtected(files[i])) return;
    setFiles(files.filter((_, idx) => idx !== i));
  };

  const current = files[activeIdx];
  const currentProtected = current ? isProtected(current) : false;

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
            {(f.readOnly || isProtected(f)) && (
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
                readOnly={currentProtected}
                className={`input-base font-mono ${currentProtected ? "opacity-60" : ""}`}
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
            {currentProtected ? (
              <span className="text-xs text-slate-400 sm:pt-6">🔒 Runner file</span>
            ) : (
              <button
                type="button"
                onClick={() => removeFile(activeIdx)}
                className="text-xs text-slate-400 hover:text-red-500 sm:pt-6"
              >
                Delete
              </button>
            )}
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
        Proctoring toggles (full-screen lock, tab-switch detection, webcam capture) are configured at the group
        level, not per question. Visit{" "}
        <Link href="/admin/groups" className="text-emerald-600 hover:underline">
          Groups Management
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
