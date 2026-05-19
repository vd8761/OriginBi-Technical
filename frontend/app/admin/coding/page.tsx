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
  Upload,
} from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  SegmentedToggle,
} from "@/components/admin/ui";
import CustomSelect from "@/components/ui/CustomSelect";
import { Switch } from "@/components/ui/Switch";
import {
  listAdminQuestions,
  setAdminQuestionArchived,
  updateAdminQuestion,
  type AdminQuestion,
} from "@/lib/api";

const PAGE_SIZE = 25;

function difficultyLabel(n: number) {
  return ["—", "Easy", "Easy+", "Medium", "Hard", "Hard+"][n] ?? "?";
}

function difficultyTone(n: number): "green" | "amber" | "red" {
  if (n <= 2) return "green";
  if (n === 3) return "amber";
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
    title: "Coding Question Bank",
    subtitle: "List of problems with inline status and pool toggles, filterable by language, topic, and difficulty.",
    breadcrumb: [
      { label: "Admin Hub", href: "/admin" },
      { label: "Question Banks", href: "/admin/question-banks" },
      { label: "Coding" },
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
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pendingToggle, setPendingToggle] = useState<Record<string, boolean>>({});

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    listAdminQuestions({
      pluginSlug: "assessment.coding",
      search: search.trim() || undefined,
      difficulty: Number(difficulty) || undefined,
      includeArchived,
    })
      .then((data) => setQuestions(data.questions))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [includeArchived, search, difficulty]);

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
      getBodyArray(q, "allowedLanguages").forEach((l) =>
        set.add(l.replace(/^language\./, "")),
      );
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
        const langs = getBodyArray(q, "allowedLanguages").map((l) => l.replace(/^language\./, ""));
        if (!langs.includes(language)) return false;
      }
      return true;
    });
  }, [questions, topic, language, mode]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [topic, language, mode, difficulty, search, includeArchived]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
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
          <h2 className="admin-page-title">Coding Question Bank</h2>
          <p className="admin-page-copy">
            Backed by the assessment.coding plugin. Toggle pool membership and visibility inline; use Export to snapshot the filtered set.
          </p>
        </div>
        <div className="admin-row">
          <Link href="/admin/coding/bulk-import" className="admin-btn admin-btn-secondary">
            <Upload size={14} /> Bulk Import
          </Link>
          <button type="button" onClick={onExport} className="admin-btn admin-btn-secondary" disabled={filtered.length === 0}>
            <Download size={14} /> Export
          </button>
          <Link href="/admin/coding/new" className="admin-btn admin-btn-primary">
            <Plus size={14} /> New Problem
          </Link>
        </div>
      </div>

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            reload();
          }}
          className="admin-control-row"
          style={{ flexWrap: "wrap", gap: 12 }}
        >
          <div className="admin-row" style={{ flexWrap: "wrap", gap: 12, alignItems: "flex-end", flex: 1 }}>
            <SegmentedToggle
              value={mode}
              onChange={setMode}
              options={[
                { value: "trial", label: "Trial / Sample" },
                { value: "main", label: "Main" },
              ]}
            />
            <div style={{ width: 180 }}>
              <CustomSelect
                label="Language"
                value={language}
                onChange={setLanguage}
                options={[{ value: "all", label: "All languages" }, ...allLanguages.map((l) => ({ value: l, label: l }))]}
              />
            </div>
            <div style={{ width: 180 }}>
              <CustomSelect
                label="Topic"
                value={topic}
                onChange={setTopic}
                options={[{ value: "all", label: "All topics" }, ...allTopics.map((t) => ({ value: t, label: t }))]}
              />
            </div>
            <div style={{ width: 160 }}>
              <CustomSelect
                label="Difficulty"
                value={difficulty}
                onChange={setDifficulty}
                options={[
                  { value: "0", label: "Any difficulty" },
                  { value: "1", label: "Easy" },
                  { value: "2", label: "Easy+" },
                  { value: "3", label: "Medium" },
                  { value: "4", label: "Hard" },
                  { value: "5", label: "Hard+" },
                ]}
              />
            </div>
            <label className="admin-search" style={{ width: 280 }}>
              <Search size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search problems…"
              />
            </label>
            <label className="admin-row" style={{ fontSize: 12, color: "var(--admin-fg-3)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                style={{ accentColor: "var(--admin-green)" }}
              />
              Show archived
            </label>
          </div>
          <button type="submit" className="admin-btn admin-btn-secondary">
            <Search size={14} /> Search
          </button>
        </form>
      </Card>

      {error !== null ? (
        <ErrorState
          title="Couldn't load coding problems"
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
                  <th style={{ padding: "8px 10px" }}>Topic</th>
                  <th style={{ padding: "8px 10px" }}>Languages</th>
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
                  const langs = getBodyArray(q, "allowedLanguages").map((l) => l.replace(/^language\./, ""));
                  const active = !q.isArchived;
                  const sample = getQuestionMode(q) === "trial";
                  return (
                    <tr key={q.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                      <td style={{ padding: "10px" }}>
                        <Link href={`/admin/coding/${q.id}`} style={{ color: "var(--admin-fg)", fontWeight: 700, textDecoration: "none" }}>
                          {q.title}
                        </Link>
                        <div className="admin-mono" style={{ fontSize: 10.5, color: "var(--admin-fg-4)" }}>
                          {q.id.slice(0, 8)} · v{q.versionNumber}
                        </div>
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
                          <Link href={`/admin/coding/${q.id}`} className="admin-btn admin-btn-secondary">
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="admin-btn admin-btn-ghost"
                            onClick={() => toggleArchived(q, !active)}
                            disabled={pendingToggle[q.id]}
                            title={active ? "Archive" : "Restore"}
                          >
                            {active ? <Archive size={13} /> : <ArchiveRestore size={13} />}
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
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span style={{ fontSize: 12, padding: "0 10px", color: "var(--admin-fg-3)" }}>
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
          title="No coding problems found"
          description="Try adjusting the filters above or create your first problem."
          action={
            <Link href="/admin/coding/new" className="admin-btn admin-btn-primary">
              <Plus size={14} /> New Problem
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
