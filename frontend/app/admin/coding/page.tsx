"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Code2,
  Download,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import BulkImportModal from "@/components/admin/coding/BulkImportModal";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  SegmentedToggle,
  useConfirm,
} from "@/components/admin/ui";
import CustomSelect from "@/components/ui/CustomSelect";
import { Switch } from "@/components/ui/Switch";
import {
  archiveAdminQuestion,
  deleteAdminQuestion,
  listAdminQuestions,
  setAdminQuestionArchived,
  updateAdminQuestion,
  type AdminQuestion,
} from "@/lib/api";

const PAGE_SIZE = 25;

// Type filter values. 'all' omits the plugin_slug filter so the backend
// returns every question; the rest map 1:1 to the assessment.* plugin slugs.
type BankType = "all" | "coding" | "mcq" | "fillblank";

const PLUGIN_SLUG_BY_BANK_TYPE: Record<Exclude<BankType, "all">, string> = {
  coding: "assessment.coding",
  mcq: "assessment.mcq",
  fillblank: "assessment.fillblank",
};

// Reverse lookup so we can show a "Type" chip in the table when the All
// filter is active. Falls back to the raw slug for unknown plugins.
function bankTypeLabel(pluginSlug: string): string {
  switch (pluginSlug) {
    case "assessment.coding": return "Coding";
    case "assessment.mcq": return "MCQ";
    case "assessment.fillblank": return "Fill-blank";
    default: return pluginSlug;
  }
}

function typeBadgeTone(pluginSlug: string): "amber" | "blue" | "purple" | "neutral" {
  switch (pluginSlug) {
    case "assessment.coding": return "amber";
    case "assessment.mcq": return "blue";
    case "assessment.fillblank": return "purple";
    default: return "neutral";
  }
}

// Each question type has its own dedicated editor route — MCQ and Fill-blank
// rows would mangle their body if routed through the coding editor.
function editHrefFor(q: { id: string; pluginSlug: string }): string {
  switch (q.pluginSlug) {
    case "assessment.mcq": return `/admin/mcq/${q.id}`;
    case "assessment.fillblank": return `/admin/fillblank/${q.id}`;
    default: return `/admin/coding/${q.id}`;
  }
}

// Resolve the language(s) attached to a question regardless of its type:
//   - Coding stores body.allowedLanguages (array)
//   - MCQ / FillBlank store body.language (string)
// Both forms are normalized to the bare-slug ('python' instead of
// 'language.python') the filter UI uses.
function questionLanguages(q: AdminQuestion): string[] {
  const out = getBodyArray(q, "allowedLanguages").map((l) => l.replace(/^language\./, ""));
  if (out.length === 0) {
    const single = getBodyText(q, "language", "");
    if (single) out.push(single.replace(/^language\./, ""));
  }
  return out;
}

// The schema allows difficulty 1..5 but the product surface is three buckets:
// 1–2 = Easy, 3–4 = Medium, 5 = Hard. 0 / negative shows as "—" so unset
// legacy rows still render without crashing the table.
function difficultyLabel(n: number): string {
  if (n <= 0) return "—";
  if (n <= 2) return "Easy";
  if (n <= 4) return "Medium";
  return "Hard";
}

function difficultyTone(n: number): "green" | "amber" | "red" {
  if (n <= 2) return "green";
  if (n <= 4) return "amber";
  return "red";
}

function getBodyText(q: AdminQuestion, key: string, fallback = "") {
  const value = q.body?.[key];
  return typeof value === "string" ? value : fallback;
}

function getBodyArray(q: AdminQuestion, key: string): string[] {
  const value = q.body?.[key];
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}

function getQuestionMode(q: AdminQuestion): "trial" | "main" {
  return getBodyText(q, "mode", "main") === "trial" ? "trial" : "main";
}

// FilterField wraps one control in the shared eyebrow-label rhythm and a width
// tier the admin-filter-bar grid expects. `w` controls how aggressively the
// field shrinks/grows when wrapped:
//   seg  — sizes to content (use for segmented toggles)
//   sm   — ~140px (compact dropdowns)
//   md   — ~180px (standard dropdowns)
//   lg   — fills row (search, free-form input)
//   grow — alias of lg
function FilterField({
  label,
  w = "md",
  children,
}: {
  label: string;
  w?: "seg" | "sm" | "md" | "lg" | "grow";
  children: React.ReactNode;
}) {
  return (
    <div className="admin-filter-field" data-w={w}>
      <span className="admin-filter-label">{label}</span>
      {children}
    </div>
  );
}

function downloadBlob(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function CodingListInner() {
  useRegisterAdminPage({
    eyebrow: "Question Banks",
    title: "Question Bank",
    subtitle: "Coding, MCQ, and Fill-in-the-Blank questions in one place. Filter by type, language, topic, and difficulty.",
    breadcrumb: [
      { label: "Question Banks", href: "/admin/questions" },
      { label: "All Types" },
    ],
  });

  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<string>("0");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [mode, setMode] = useState<"trial" | "main">("main");
  const [topic, setTopic] = useState("all");
  const [language, setLanguage] = useState("all");
  const [bankType, setBankType] = useState<BankType>("all");
  // Pagination is reset whenever any filter changes by including the filter
  // signature in a memoized key; the rendered page is `Math.min(page, totalPages)`
  // so a filter change naturally clamps without an extra effect.
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pendingToggle, setPendingToggle] = useState<Record<string, boolean>>({});
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const confirm = useConfirm();

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    // 'all' omits the plugin_slug filter so the backend returns every type;
    // any other value maps to its concrete assessment.* slug.
    const pluginSlug = bankType === "all" ? undefined : PLUGIN_SLUG_BY_BANK_TYPE[bankType];
    listAdminQuestions({
      pluginSlug,
      search: search.trim() || undefined,
      difficulty: Number(difficulty) || undefined,
      includeArchived,
    })
      .then((data) => setQuestions(data.questions))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [bankType, includeArchived, search, difficulty]);

  // Initial + filter-driven reload. Reload talks to the server, so it must
  // run from an effect — the rule-of-thumb exception to set-state-in-effect.
   
  useEffect(() => {
    reload();
  }, [reload]);

  const allTopics = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      const t = getBodyText(q, "category", "") || getBodyText(q, "section", "");
      if (t) set.add(t);
    });
    return Array.from(set).sort();
  }, [questions]);

  const allLanguages = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      questionLanguages(q).forEach((l) => set.add(l));
    });
    return Array.from(set).sort();
  }, [questions]);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (mode !== getQuestionMode(q)) return false;
      if (topic !== "all") {
        const cat = (getBodyText(q, "category", "") || getBodyText(q, "section", "")).toLowerCase();
        if (cat !== topic.toLowerCase()) return false;
      }
      if (language !== "all") {
        if (!questionLanguages(q).includes(language)) return false;
      }
      return true;
    });
  }, [questions, topic, language, mode]);

  // Derive the effective page during render — when filters shrink the list
  // below the current page, clamp instead of triggering a setState effect.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const effectivePage = Math.min(page, totalPages);
  const pageStart = (effectivePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const toggleArchived = async (q: AdminQuestion, nextActive: boolean) => {
    setPendingToggle((p) => ({ ...p, [q.id]: true }));
    const archived = !nextActive;
    // Optimistic update
    setQuestions((curr) => curr.map((x) => (x.id === q.id ? { ...x, isArchived: archived } : x)));
    try {
      await setAdminQuestionArchived(q.id, archived);
    } catch (err) {
      setQuestions((curr) => curr.map((x) => (x.id === q.id ? { ...x, isArchived: !archived } : x)));
      setError(err);
    } finally {
      setPendingToggle((p) => {
        const next = { ...p };
        delete next[q.id];
        return next;
      });
    }
  };

  const toggleMode = async (q: AdminQuestion, nextSample: boolean) => {
    setPendingToggle((p) => ({ ...p, [q.id + ":mode"]: true }));
    const newMode = nextSample ? "trial" : "main";
    const optimistic: AdminQuestion = { ...q, body: { ...q.body, mode: newMode } };
    setQuestions((curr) => curr.map((x) => (x.id === q.id ? optimistic : x)));
    try {
      await updateAdminQuestion(q.id, {
        title: q.title,
        body: { ...q.body, mode: newMode } as Record<string, unknown>,
        max_score: q.maxScore,
        is_negative_marked: q.isNegativeMarked,
        negative_score: q.negativeScore,
        difficulty: q.difficulty,
      });
    } catch (err) {
      setQuestions((curr) => curr.map((x) => (x.id === q.id ? q : x)));
      setError(err);
    } finally {
      setPendingToggle((p) => {
        const next = { ...p };
        delete next[q.id + ":mode"];
        return next;
      });
    }
  };

  const onDelete = async (q: AdminQuestion) => {
    // Try a hard delete first. If the question has been pulled into an exam
    // or attempted, the server returns in_use and we fall back to a confirm-
    // to-archive flow so the admin still has a way to hide the row.
    const confirmed = await confirm({
      title: "Delete this question?",
      message: `“${q.title}” and its test cases will be permanently removed. This can't be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!confirmed) return;

    setPendingToggle((p) => ({ ...p, [q.id + ":del"]: true }));
    try {
      const result = await deleteAdminQuestion(q.id);
      if (result.status === "deleted") {
        setQuestions((curr) => curr.filter((x) => x.id !== q.id));
        return;
      }
      if (result.status === "in_use") {
        const parts: string[] = [];
        if (result.examCount > 0) parts.push(`${result.examCount} exam${result.examCount === 1 ? "" : "s"}`);
        if (result.attemptCount > 0) parts.push(`${result.attemptCount} attempt${result.attemptCount === 1 ? "" : "s"}`);
        const usage = parts.join(" and ") || "active exams or attempts";
        const archiveOk = await confirm({
          title: "Question is in use",
          message: `This problem is referenced by ${usage}, so it can't be hard-deleted. Archive it instead — candidates won't see it on new exams.`,
          confirmLabel: "Archive",
          cancelLabel: "Cancel",
          variant: "warning",
        });
        if (!archiveOk) return;
        await archiveAdminQuestion(q.id);
        setQuestions((curr) =>
          curr.map((x) => (x.id === q.id ? { ...x, isArchived: true } : x)),
        );
      }
    } catch (err) {
      setError(err);
    } finally {
      setPendingToggle((p) => {
        const next = { ...p };
        delete next[q.id + ":del"];
        return next;
      });
    }
  };

  const onExport = () => {
    const exportSet = filtered.map((q) => ({
      title: q.title,
      plugin_slug: q.pluginSlug,
      body: q.body,
      max_score: q.maxScore,
      is_negative_marked: q.isNegativeMarked,
      negative_score: q.negativeScore,
      difficulty: q.difficulty,
    }));
    const payload = JSON.stringify({ questions: exportSet }, null, 2);
    const today = new Date().toISOString().slice(0, 10);
    downloadBlob(`coding-questions-${today}.json`, payload, "application/json");
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-page-eyebrow">Content / Question Banks</p>
          <h2 className="admin-page-title">Question Bank</h2>
          <p className="admin-page-copy">
            Coding, MCQ, and Fill-in-the-Blank questions in one bank. Filter by Type to focus on a single category, or All to see everything. Toggle pool membership and visibility inline; use Export to snapshot the filtered set.
          </p>
        </div>
        <div className="admin-row">
          <button
            type="button"
            onClick={() => setBulkImportOpen(true)}
            className="admin-btn admin-btn-secondary"
          >
            <Upload size={14} /> Bulk Import
          </button>
          <button type="button" onClick={onExport} className="admin-btn admin-btn-secondary" disabled={filtered.length === 0}>
            <Download size={14} /> Export
          </button>
          {/* One primary New button per type. Coding stays primary; the other
              two use the secondary style so the visual weight matches the
              current Coding-first usage pattern. */}
          <Link href="/admin/coding/new" className="admin-btn admin-btn-primary">
            <Plus size={14} /> New Coding
          </Link>
          <Link href="/admin/mcq/new" className="admin-btn admin-btn-secondary">
            <Plus size={14} /> New MCQ
          </Link>
          <Link href="/admin/fillblank/new" className="admin-btn admin-btn-secondary">
            <Plus size={14} /> New Fill-blank
          </Link>
        </div>
      </div>

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            reload();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {/* admin-filter-bar is a flex-wrap row: every control shares the same
              40px baseline and sizes to its content. On narrow viewports the
              row wraps naturally — no horizontal scroll, no chip wrapping. */}
          <div className="admin-filter-bar">
            <FilterField label="Type" w="seg">
              <SegmentedToggle
                className="is-compact"
                value={bankType}
                onChange={(v) => setBankType(v as BankType)}
                options={[
                  { value: "all", label: "All" },
                  { value: "coding", label: "Coding" },
                  { value: "mcq", label: "MCQ" },
                  { value: "fillblank", label: "Fill-blank" },
                ]}
              />
            </FilterField>
            <FilterField label="Pool" w="seg">
              <SegmentedToggle
                className="is-compact"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "trial", label: "Trial" },
                  { value: "main", label: "Main" },
                ]}
              />
            </FilterField>
            <FilterField label="Language" w="md">
              <CustomSelect
                value={language}
                onChange={setLanguage}
                options={[{ value: "all", label: "All languages" }, ...allLanguages.map((l) => ({ value: l, label: l }))]}
              />
            </FilterField>
            <FilterField label="Topic" w="md">
              <CustomSelect
                value={topic}
                onChange={setTopic}
                options={[{ value: "all", label: "All topics" }, ...allTopics.map((t) => ({ value: t, label: t }))]}
              />
            </FilterField>
            <FilterField label="Difficulty" w="sm">
              <CustomSelect
                value={difficulty}
                onChange={setDifficulty}
                options={[
                  { value: "0", label: "Any difficulty" },
                  { value: "1", label: "Easy" },
                  { value: "3", label: "Medium" },
                  { value: "5", label: "Hard" },
                ]}
              />
            </FilterField>
            <FilterField label="Search" w="grow">
              <label className="admin-search">
                <Search size={14} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search questions…"
                />
              </label>
            </FilterField>
            <button
              type="submit"
              className="admin-btn admin-btn-secondary admin-filter-submit"
            >
              <Search size={14} /> Search
            </button>
          </div>
          <label
            className="admin-row"
            style={{ fontSize: 12, color: "var(--admin-fg-3)", cursor: "pointer", gap: 8 }}
          >
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              style={{ accentColor: "var(--admin-green)" }}
            />
            Show archived
          </label>
        </form>
      </Card>

      {error !== null ? (
        <ErrorState
          title="Couldn't load questions"
          error={error}
          onRetry={reload}
          hint="If you just started the dev server, make sure NEXT_PUBLIC_API_BASE points at the Go exam-engine."
        />
      ) : null}

      {!error && (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--admin-fg-3)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1.2 }}>
                  <th style={{ padding: "8px 10px" }}>Title</th>
                  <th style={{ padding: "8px 10px" }}>Type</th>
                  <th style={{ padding: "8px 10px" }}>Topic</th>
                  <th style={{ padding: "8px 10px" }}>Language</th>
                  <th style={{ padding: "8px 10px" }}>Difficulty</th>
                  <th style={{ padding: "8px 10px" }}>Score</th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>Active</th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>Sample</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((q) => {
                  const cat = getBodyText(q, "category", "") || getBodyText(q, "section", "") || "—";
                  const langs = questionLanguages(q);
                  const active = !q.isArchived;
                  const sample = getQuestionMode(q) === "trial";
                  return (
                    <tr key={q.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                      <td style={{ padding: "10px" }}>
                        <Link href={editHrefFor(q)} style={{ color: "var(--admin-fg)", fontWeight: 700, textDecoration: "none" }}>
                          {q.title}
                        </Link>
                        <div className="admin-mono" style={{ fontSize: 10.5, color: "var(--admin-fg-4)" }}>
                          {q.id.slice(0, 8)} · v{q.versionNumber}
                        </div>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <Badge tone={typeBadgeTone(q.pluginSlug)}>
                          {bankTypeLabel(q.pluginSlug)}
                        </Badge>
                      </td>
                      <td style={{ padding: "10px", color: "var(--admin-fg-2)" }}>{cat}</td>
                      <td style={{ padding: "10px", color: "var(--admin-fg-2)" }}>
                        {langs.length === 0 ? <span style={{ color: "var(--admin-fg-4)" }}>any</span> : langs.slice(0, 3).join(", ") + (langs.length > 3 ? `+${langs.length - 3}` : "")}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <Badge tone={difficultyTone(q.difficulty)}>{difficultyLabel(q.difficulty)}</Badge>
                      </td>
                      <td style={{ padding: "10px", color: "var(--admin-fg-2)" }}>{q.maxScore}</td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <Switch
                          checked={active}
                          disabled={pendingToggle[q.id]}
                          onCheckedChange={(val) => toggleArchived(q, val)}
                        />
                      </td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <Switch
                          checked={sample}
                          disabled={pendingToggle[q.id + ":mode"]}
                          onCheckedChange={(val) => toggleMode(q, val)}
                        />
                      </td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        <div className="admin-row" style={{ justifyContent: "flex-end", gap: 6 }}>
                          <Link href={editHrefFor(q)} className="admin-btn admin-btn-secondary">
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="admin-btn admin-btn-ghost"
                            onClick={() => toggleArchived(q, !active)}
                            disabled={pendingToggle[q.id]}
                            title={active ? "Archive" : "Restore"}
                            aria-label={active ? "Archive" : "Restore"}
                          >
                            {active ? <Archive size={14} /> : <ArchiveRestore size={14} />}
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-ghost"
                            onClick={() => void onDelete(q)}
                            disabled={pendingToggle[q.id + ":del"]}
                            title="Delete"
                            aria-label="Delete"
                            style={{ color: "var(--admin-red, #ed2f34)" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="admin-control-row" style={{ marginTop: 12 }}>
              <span style={{ fontSize: 12, color: "var(--admin-fg-3)" }}>
                Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="admin-row" style={{ gap: 6 }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  disabled={effectivePage <= 1}
                  onClick={() => setPage(Math.max(1, effectivePage - 1))}
                >
                  Prev
                </button>
                <span style={{ fontSize: 12, padding: "0 10px", color: "var(--admin-fg-3)" }}>
                  Page {effectivePage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  disabled={effectivePage >= totalPages}
                  onClick={() => setPage(Math.min(totalPages, effectivePage + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {!error && !loading && filtered.length === 0 && (
        <EmptyState
          icon={<Code2 size={26} />}
          title="No questions found"
          description="Try adjusting the Type or other filters above, or import a batch from JSON / XLSX."
          action={
            <Link
              href={
                bankType === "mcq"
                  ? "/admin/mcq/new"
                  : bankType === "fillblank"
                    ? "/admin/fillblank/new"
                    : "/admin/coding/new"
              }
              className="admin-btn admin-btn-primary"
            >
              <Plus size={14} />{" "}
              {bankType === "mcq"
                ? "New MCQ"
                : bankType === "fillblank"
                  ? "New Fill-blank"
                  : "New Coding"}
            </Link>
          }
        />
      )}

      {loading && !error && (
        <div className="admin-grid-2">
          {[0, 1].map((i) => (
            <div key={i} className="admin-skeleton" style={{ height: 120 }} />
          ))}
        </div>
      )}

      <BulkImportModal
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onImported={() => {
          // Refresh the list whenever the modal reports a successful import
          // so the new questions show up immediately without a manual reload.
          reload();
        }}
      />
    </div>
  );
}

export default function CodingListPage() {
  return (
    <AdminGuard>
      <CodingListInner />
    </AdminGuard>
  );
}
