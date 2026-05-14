"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Check,
  Code2,
  Download,
  FileText,
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
  StatusDot,
} from "@/components/admin/ui";
import {
  archiveAdminQuestion,
  listAdminQuestions,
  type AdminQuestion,
} from "@/lib/api";

const topics = ["Arrays", "Strings", "Trees", "Graphs", "Dynamic Programming", "Greedy"];

function difficultyLabel(n: number) {
  return ["-", "Easy", "Easy+", "Medium", "Hard", "Hard+"][n] ?? "?";
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

function CodingListInner() {
  useRegisterAdminPage({
    eyebrow: "Question Banks",
    title: "Coding Question Bank",
    subtitle: "Manage problems, judge limits, and test cases for the assessment.coding plugin.",
    breadcrumb: [
      { label: "Admin Hub", href: "/admin" },
      { label: "Question Banks", href: "/admin/coding" },
      { label: "Coding" },
    ],
  });

  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<number>(0);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [mode, setMode] = useState<"trial" | "main">("main");
  const [topic, setTopic] = useState("all");
  const [loading, setLoading] = useState(true);

  const reload = React.useCallback(() => {
    setLoading(true);
    setError(null);
    listAdminQuestions({
      pluginSlug: "assessment.coding",
      search: search.trim() || undefined,
      difficulty: difficulty || undefined,
      includeArchived,
    })
      .then((data) => setQuestions(data.questions))
      .catch((err) => setError(err))
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
      setError(err);
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
        <Card className="admin-module-card" pad={false}>
          <div className="admin-control-row">
            <span
              className="admin-module-icon"
              style={{ background: "var(--admin-amber-soft)", color: "var(--admin-amber)" }}
            >
              <Code2 size={20} />
            </span>
            <Badge tone="amber">Primary</Badge>
          </div>
          <div>
            <h3 className="admin-card-title">Coding Problems</h3>
            <p className="admin-card-subtitle">
              Starter code, limits, judge options, and test cases.
            </p>
          </div>
          <div className="admin-row">
            <Badge tone="neutral">Trial 12</Badge>
            <Badge tone="neutral">Main {questions.length}</Badge>
          </div>
        </Card>
        <Card className="admin-module-card" pad={false}>
          <div className="admin-control-row">
            <span
              className="admin-module-icon"
              style={{ background: "var(--admin-green-soft)", color: "var(--admin-green)" }}
            >
              <FileText size={20} />
            </span>
            <Badge tone="green">Versioned</Badge>
          </div>
          <div>
            <h3 className="admin-card-title">Question Snapshots</h3>
            <p className="admin-card-subtitle">
              Published attempts keep their original frozen version.
            </p>
          </div>
          <div className="admin-row">
            <Badge tone="neutral">Draft safe</Badge>
            <Badge tone="neutral">Immutable attempts</Badge>
          </div>
        </Card>
        <Card className="admin-module-card" pad={false}>
          <div className="admin-control-row">
            <span
              className="admin-module-icon"
              style={{ background: "var(--admin-blue-soft)", color: "var(--admin-blue)" }}
            >
              <Archive size={20} />
            </span>
            <Badge tone="blue">Archive</Badge>
          </div>
          <div>
            <h3 className="admin-card-title">Lifecycle Controls</h3>
            <p className="admin-card-subtitle">
              Hide questions without breaking in-flight assessments.
            </p>
          </div>
          <label className="admin-row" style={{ fontSize: 12, color: "var(--admin-fg-3)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
              style={{ accentColor: "var(--admin-green)" }}
            />
            Show archived
          </label>
        </Card>
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          reload();
        }}
        className="admin-control-row"
      >
        <div className="admin-row" style={{ flexWrap: "wrap", gap: 10 }}>
          <SegmentedToggle
            value={mode}
            onChange={setMode}
            options={[
              { value: "trial", label: "Trial" },
              { value: "main", label: "Main" },
            ]}
          />
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
          <label className="admin-search" style={{ width: 280 }}>
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

      {error !== null ? (
        <ErrorState
          title="Couldn't load coding problems"
          error={error}
          onRetry={reload}
          hint="If you just started the dev server, make sure NEXT_PUBLIC_API_BASE points at the Go exam-engine."
        />
      ) : null}

      {!error && (
        <section className="admin-grid-2">
          {filtered.map((q) => {
            const category = getBodyText(q, "category", "Coding");
            const description = getBodyText(
              q,
              "description",
              "No description has been added for this problem yet.",
            );
            const tags = Array.isArray(q.body?.tags)
              ? (q.body.tags as string[]).slice(0, 4)
              : [];
            return (
              <article key={q.id} className="admin-problem-card">
                <div className="admin-control-row">
                  <div className="admin-row">
                    <span className="admin-mono" style={{ fontSize: 11.5, color: "var(--admin-fg-3)" }}>
                      {q.id.slice(0, 8)}
                    </span>
                    <Badge tone={q.isArchived ? "neutral" : "green"} dot>
                      {q.isArchived ? "archived" : "active"}
                    </Badge>
                  </div>
                  <Badge tone={difficultyTone(q.difficulty)}>{difficultyLabel(q.difficulty)}</Badge>
                </div>

                <div>
                  <Link
                    href={`/admin/coding/${q.id}`}
                    style={{ fontSize: 16, fontWeight: 800, color: "var(--admin-fg)", textDecoration: "none" }}
                  >
                    {q.title}
                  </Link>
                  <p
                    className="admin-card-subtitle"
                    style={{ lineHeight: 1.55, marginTop: 6 }}
                  >
                    {description.replace(/[`*]/g, "").slice(0, 170)}
                    {description.length > 170 ? "..." : ""}
                  </p>
                </div>

                <div className="admin-grid-4" style={{ gap: 8 }}>
                  {[
                    { label: "Score", value: q.maxScore },
                    { label: "Version", value: `v${q.versionNumber}` },
                    { label: "Topic", value: category },
                    { label: "Mode", value: mode },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      style={{
                        padding: "10px 12px",
                        border: "1px solid var(--admin-border)",
                        borderRadius: "var(--admin-r-md)",
                        background: "rgba(255,255,255,0.025)",
                      }}
                    >
                      <p className="admin-stat-label">{stat.label}</p>
                      <strong style={{ color: "var(--admin-fg)", fontSize: 13 }}>{stat.value}</strong>
                    </div>
                  ))}
                </div>

                <div className="admin-control-row">
                  <div className="admin-row" style={{ flexWrap: "wrap", gap: 6 }}>
                    {(tags.length > 0 ? tags : [category]).map((tag) => (
                      <Badge key={tag} tone="neutral">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="admin-row">
                    <Link href={`/admin/coding/${q.id}`} className="admin-btn admin-btn-secondary">
                      Edit
                    </Link>
                    {!q.isArchived && (
                      <button
                        type="button"
                        onClick={() => onArchive(q.id)}
                        className="admin-btn admin-btn-ghost"
                      >
                        <Archive size={13} /> Archive
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {!error && !loading && filtered.length === 0 && (
        <EmptyState
          icon={<Code2 size={26} />}
          title="No coding problems found"
          description="Try adjusting the filters above or create your first redesigned problem."
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
            <div key={i} className="admin-skeleton" style={{ height: 200 }} />
          ))}
        </div>
      )}

      {!loading && !error && questions.length > 0 && (
        <p style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--admin-fg-3)", fontSize: 12 }}>
          <Check size={13} color="var(--admin-green)" />
          Showing {filtered.length} of {questions.length} problems · {mode} pool
          <StatusDot tone="green" />
        </p>
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
