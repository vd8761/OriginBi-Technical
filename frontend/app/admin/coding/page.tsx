"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Code2,
  Download,
  FileText,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import {
  archiveAdminQuestion,
  listAdminQuestions,
  type AdminQuestion,
} from "@/lib/api";

const topics = ["Arrays", "Strings", "Trees", "Graphs", "Dynamic Programming", "Greedy"];

function difficultyLabel(n: number) {
  return ["-", "Easy", "Easy+", "Medium", "Hard", "Hard+"][n] ?? "?";
}

function difficultyTone(n: number) {
  if (n <= 2) return "admin-badge-green";
  if (n === 3) return "admin-badge-amber";
  return "admin-badge-red";
}

function getBodyText(q: AdminQuestion, key: string, fallback = "") {
  const value = q.body?.[key];
  return typeof value === "string" ? value : fallback;
}

function CodingListInner() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<number>(0);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [mode, setMode] = useState<"trial" | "main">("main");
  const [topic, setTopic] = useState("all");
  const [loading, setLoading] = useState(true);

  const reload = React.useCallback(() => {
    setLoading(true);
    listAdminQuestions({
      pluginSlug: "assessment.coding",
      search: search.trim() || undefined,
      difficulty: difficulty || undefined,
      includeArchived,
    })
      .then((data) => setQuestions(data.questions))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Question lookup failed."),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeArchived]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (topic === "all") return true;
      return getBodyText(q, "category", "").toLowerCase() === topic.toLowerCase();
    });
  }, [questions, topic]);

  const onArchive = async (id: string) => {
    if (!confirm("Archive this question? It will be hidden from new exams but in-flight attempts continue.")) {
      return;
    }
    try {
      await archiveAdminQuestion(id);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive failed.");
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-page-eyebrow">Content / Question Banks</p>
          <h2 className="admin-page-title">Coding Question Bank</h2>
          <p className="admin-page-copy">
            Manage coding problems from the redesigned admin surface. The data stays backed by the
            assessment.coding plugin, versioned questions, and test-case APIs.
          </p>
        </div>
        <div className="admin-row">
          <Link href="/admin/coding/bulk-import" className="admin-btn admin-btn-secondary">
            <Upload size={14} /> Bulk Import
          </Link>
          <Link href="/admin/coding/new" className="admin-btn admin-btn-primary">
            <Plus size={14} /> New Problem
          </Link>
        </div>
      </div>

      <section className="admin-grid-3">
        <div className="admin-module-card">
          <div className="admin-control-row">
            <span className="admin-module-icon" style={{ background: "rgba(255,183,3,0.14)", color: "var(--admin-amber)" }}>
              <Code2 size={20} />
            </span>
            <span className="admin-badge admin-badge-amber">Primary</span>
          </div>
          <div>
            <h3 className="admin-card-title">Coding Problems</h3>
            <p className="admin-card-subtitle">Starter code, limits, judge options, and test cases.</p>
          </div>
          <div className="admin-row">
            <span className="admin-badge">Trial 12</span>
            <span className="admin-badge">Main {questions.length}</span>
          </div>
        </div>
        <div className="admin-module-card">
          <div className="admin-control-row">
            <span className="admin-module-icon" style={{ background: "rgba(30,211,106,0.14)", color: "var(--admin-green)" }}>
              <FileText size={20} />
            </span>
            <span className="admin-badge admin-badge-green">Versioned</span>
          </div>
          <div>
            <h3 className="admin-card-title">Question Snapshots</h3>
            <p className="admin-card-subtitle">Published attempts keep their original frozen version.</p>
          </div>
          <div className="admin-row">
            <span className="admin-badge">Draft safe</span>
            <span className="admin-badge">Immutable attempts</span>
          </div>
        </div>
        <div className="admin-module-card">
          <div className="admin-control-row">
            <span className="admin-module-icon" style={{ background: "rgba(56,189,248,0.14)", color: "var(--admin-blue)" }}>
              <Archive size={20} />
            </span>
            <span className="admin-badge">Archive</span>
          </div>
          <div>
            <h3 className="admin-card-title">Lifecycle Controls</h3>
            <p className="admin-card-subtitle">Hide questions without breaking in-flight assessments.</p>
          </div>
          <div className="admin-row">
            <label className="admin-row admin-muted" style={{ fontSize: 12 }}>
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => setIncludeArchived(event.target.checked)}
                style={{ accentColor: "var(--admin-green)" }}
              />
              Show archived
            </label>
          </div>
        </div>
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          reload();
        }}
        className="admin-control-row"
      >
        <div className="admin-row">
          <div className="admin-segment">
            <button type="button" className={mode === "trial" ? "is-active" : ""} onClick={() => setMode("trial")}>
              Trial
            </button>
            <button type="button" className={mode === "main" ? "is-active" : ""} onClick={() => setMode("main")}>
              Main
            </button>
          </div>
          <select className="admin-select" value={topic} onChange={(event) => setTopic(event.target.value)}>
            <option value="all">All topics</option>
            {topics.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            className="admin-select"
            value={difficulty}
            onChange={(event) => setDifficulty(Number(event.target.value))}
          >
            <option value={0}>Any difficulty</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {difficultyLabel(value)}
              </option>
            ))}
          </select>
          <label className="admin-search" style={{ width: 260 }}>
            <Search size={14} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search problems..."
            />
          </label>
        </div>
        <div className="admin-row">
          <button type="submit" className="admin-btn admin-btn-secondary">
            <Search size={14} /> Search
          </button>
          <button type="button" className="admin-btn admin-btn-secondary">
            <Download size={14} /> Export
          </button>
        </div>
      </form>

      {error && <div className="admin-error">{error}</div>}

      <section className="admin-grid-2">
        {filtered.map((q) => {
          const category = getBodyText(q, "category", "Coding");
          const description = getBodyText(q, "description", "No description has been added for this problem yet.");
          const tags = Array.isArray(q.body?.tags) ? (q.body.tags as string[]).slice(0, 3) : [];
          return (
            <article key={q.id} className="admin-problem-card">
              <div className="admin-control-row">
                <div className="admin-row">
                  <span className="admin-mono admin-muted" style={{ fontSize: 11 }}>
                    {q.id.slice(0, 8)}
                  </span>
                  <span className={`admin-badge ${q.isArchived ? "" : "admin-badge-green"}`}>
                    <span className="admin-dot" />
                    {q.isArchived ? "archived" : "active"}
                  </span>
                </div>
                <span className={`admin-badge ${difficultyTone(q.difficulty)}`}>
                  {difficultyLabel(q.difficulty)}
                </span>
              </div>

              <div>
                <Link href={`/admin/coding/${q.id}`} style={{ fontSize: 16, fontWeight: 850, color: "var(--admin-fg)" }}>
                  {q.title}
                </Link>
                <p className="admin-card-subtitle" style={{ lineHeight: 1.55 }}>
                  {description.replace(/[`*]/g, "").slice(0, 170)}
                  {description.length > 170 ? "..." : ""}
                </p>
              </div>

              <div className="admin-grid-4" style={{ gap: 8 }}>
                <div className="admin-card admin-card-pad" style={{ padding: 10 }}>
                  <p className="admin-stat-label">Score</p>
                  <strong>{q.maxScore}</strong>
                </div>
                <div className="admin-card admin-card-pad" style={{ padding: 10 }}>
                  <p className="admin-stat-label">Version</p>
                  <strong>v{q.versionNumber}</strong>
                </div>
                <div className="admin-card admin-card-pad" style={{ padding: 10 }}>
                  <p className="admin-stat-label">Topic</p>
                  <strong>{category}</strong>
                </div>
                <div className="admin-card admin-card-pad" style={{ padding: 10 }}>
                  <p className="admin-stat-label">Mode</p>
                  <strong>{mode}</strong>
                </div>
              </div>

              <div className="admin-control-row">
                <div className="admin-row">
                  {tags.length > 0 ? (
                    tags.map((tag) => (
                      <span key={tag} className="admin-badge">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="admin-badge">{category}</span>
                  )}
                </div>
                <div className="admin-row">
                  <Link href={`/admin/coding/${q.id}`} className="admin-btn admin-btn-secondary">
                    Edit
                  </Link>
                  {!q.isArchived && (
                    <button type="button" onClick={() => onArchive(q.id)} className="admin-btn admin-btn-ghost">
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {filtered.length === 0 && !loading && (
        <div className="admin-card admin-card-pad" style={{ textAlign: "center", padding: 48 }}>
          <Code2 size={32} color="var(--admin-fg-4)" />
          <h3 className="admin-card-title" style={{ marginTop: 14 }}>No coding problems found</h3>
          <p className="admin-card-subtitle">Try adjusting the filters or create your first redesigned problem.</p>
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
