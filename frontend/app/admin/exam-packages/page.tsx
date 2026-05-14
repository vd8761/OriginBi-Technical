"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Copy,
  Edit3,
  IndianRupee,
  MoreHorizontal,
  PackageCheck,
  Plus,
  Users,
} from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Modal,
  PillTabs,
  StatusDot,
} from "@/components/admin/ui";
import {
  createExamPackage,
  listExamPackages,
  listPlugins,
  type AdminExamPackage,
  type Plugin,
} from "@/lib/api";

type PackageStatus = "all" | "published" | "draft" | "archived";

function ExamPackagesInner() {
  useRegisterAdminPage({
    eyebrow: "Catalog / Assessments",
    title: "Exam Packages",
    subtitle: "Bundle exams with language plugins, duration limits, score caps, and pricing.",
    breadcrumb: [
      { label: "Admin Hub", href: "/admin" },
      { label: "Assessments" },
    ],
  });

  const [packages, setPackages] = useState<AdminExamPackage[]>([]);
  const [languages, setLanguages] = useState<Plugin[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PackageStatus>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string>("");
  const [newPkg, setNewPkg] = useState({
    title: "",
    slug: "",
    description: "",
    languages: [] as string[],
    priceCents: 0,
    totalTimeSeconds: 5400,
    maxScore: 100,
  });

  const reload = React.useCallback(() => {
    setLoading(true);
    setError(null);
    listExamPackages()
      .then((data) => setPackages(data.examPackages))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    listPlugins({ category: "language" })
      .then((data) => setLanguages(data.plugins))
      .catch(() => undefined);
  }, [reload]);

  const counts = useMemo(() => {
    const byStatus = packages.reduce<Record<string, number>>((acc, pkg) => {
      acc[pkg.status] = (acc[pkg.status] ?? 0) + 1;
      return acc;
    }, {});
    return {
      all: packages.length,
      published: byStatus.published ?? 0,
      draft: byStatus.draft ?? 0,
      archived: byStatus.archived ?? 0,
    };
  }, [packages]);

  const filtered = useMemo(() => {
    if (filter === "all") return packages;
    return packages.filter((p) => p.status === filter);
  }, [filter, packages]);

  const toggleLang = (slug: string) => {
    setNewPkg((pkg) => ({
      ...pkg,
      languages: pkg.languages.includes(slug)
        ? pkg.languages.filter((item) => item !== slug)
        : [...pkg.languages, slug],
    }));
  };

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      await createExamPackage({
        title: newPkg.title,
        slug: newPkg.slug,
        description: newPkg.description || undefined,
        languages: newPkg.languages,
        price_cents: newPkg.priceCents > 0 ? newPkg.priceCents : undefined,
        total_time_seconds: newPkg.totalTimeSeconds,
        max_score: newPkg.maxScore,
        currency: "INR",
      });
      setCreateOpen(false);
      setNewPkg({
        title: "",
        slug: "",
        description: "",
        languages: [],
        priceCents: 0,
        totalTimeSeconds: 5400,
        maxScore: 100,
      });
      reload();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-control-row">
        <PillTabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: "all", label: "All", count: counts.all },
            { value: "published", label: "Published", count: counts.published },
            { value: "draft", label: "Drafts", count: counts.draft },
            { value: "archived", label: "Archived", count: counts.archived },
          ]}
        />
        <div className="admin-row">
          <button type="button" className="admin-btn admin-btn-secondary">
            <Copy size={14} /> Duplicate
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={14} /> New Package
          </button>
        </div>
      </div>

      {error !== null ? (
        <ErrorState
          title="Couldn't load exam packages"
          error={error}
          onRetry={reload}
          hint="Make sure NEXT_PUBLIC_API_BASE points at the running exam-engine."
        />
      ) : null}

      {!error && (
        <section className="admin-grid-2">
          {filtered.map((pkg) => {
            const tone = pkg.status === "published" ? "green" : pkg.status === "draft" ? "amber" : "neutral";
            const minutes = Math.round(pkg.totalTimeSeconds / 60);
            return (
              <Card key={pkg.id}>
                <div className="admin-control-row" style={{ marginBottom: 14 }}>
                  <div className="admin-row">
                    <span
                      className="admin-module-icon"
                      style={{ background: "var(--admin-blue-soft)", color: "var(--admin-blue)" }}
                    >
                      <PackageCheck size={20} />
                    </span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "var(--admin-fg)" }}>
                        {pkg.title}
                      </div>
                      <div className="admin-row" style={{ marginTop: 4, gap: 6 }}>
                        <Badge tone="neutral">{pkg.slug}</Badge>
                        <Badge tone={tone} dot>{pkg.status}</Badge>
                      </div>
                    </div>
                  </div>
                  <button className="admin-icon-btn" type="button" aria-label="More">
                    <MoreHorizontal size={14} />
                  </button>
                </div>

                <div className="admin-grid-4" style={{ gap: 8, marginBottom: 14 }}>
                  {[
                    { label: "Score", value: pkg.maxScore },
                    { label: "Duration", value: `${minutes}m` },
                    { label: "Status", value: pkg.status },
                    { label: "Created", value: new Date(pkg.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        padding: "10px 12px",
                        border: "1px solid var(--admin-border)",
                        borderRadius: "var(--admin-r-md)",
                        background: "rgba(255,255,255,0.025)",
                      }}
                    >
                      <p className="admin-stat-label">{s.label}</p>
                      <strong style={{ color: "var(--admin-fg)", fontSize: 15 }}>{s.value}</strong>
                    </div>
                  ))}
                </div>

                <div
                  className="admin-control-row"
                  style={{ paddingTop: 14, borderTop: "1px solid var(--admin-border)" }}
                >
                  <span style={{ fontSize: 11.5, color: "var(--admin-fg-4)" }}>
                    Created {new Date(pkg.createdAt).toLocaleDateString()}
                  </span>
                  <div className="admin-row">
                    <button type="button" className="admin-btn admin-btn-ghost" style={{ fontSize: 11.5 }}>
                      Analytics
                    </button>
                    <Link
                      href={`/admin/exam-packages/${pkg.id}`}
                      className="admin-btn admin-btn-secondary"
                      style={{ fontSize: 11.5 }}
                    >
                      <Edit3 size={12} /> Edit
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </section>
      )}

      {!error && !loading && filtered.length === 0 && (
        <EmptyState
          icon={<PackageCheck size={26} />}
          title="No exam packages yet"
          description="Create your first package to bundle a set of questions, languages, and time limits."
          action={
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> New Package
            </button>
          }
        />
      )}

      {loading && !error && (
        <div className="admin-grid-2">
          {[0, 1].map((i) => (
            <div key={i} className="admin-skeleton" style={{ height: 220 }} />
          ))}
        </div>
      )}

      {!loading && !error && (
        <p style={{ display: "inline-flex", gap: 8, color: "var(--admin-fg-3)", fontSize: 12, alignItems: "center" }}>
          <StatusDot tone="green" /> Showing {filtered.length} of {counts.all} packages
        </p>
      )}

      <Modal
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        eyebrow="New Exam Package"
        title="Bundle questions, languages, and limits"
        footer={
          <>
            <span className="admin-autosave">
              <Users size={13} color="var(--admin-fg-3)" /> Visible in catalog after publish
            </span>
            <div className="admin-row">
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="new-package-form"
                className="admin-btn admin-btn-primary"
                disabled={creating}
              >
                <Plus size={14} /> {creating ? "Creating..." : "Create Package"}
              </button>
            </div>
          </>
        }
      >
        <form id="new-package-form" onSubmit={submitCreate} className="admin-grid-2">
          <Field label="Title">
            <input
              required
              value={newPkg.title}
              onChange={(event) => setNewPkg({ ...newPkg, title: event.target.value })}
              className="admin-field"
              placeholder="Python Coding Challenge"
            />
          </Field>
          <Field label="Slug">
            <input
              required
              value={newPkg.slug}
              onChange={(event) => setNewPkg({ ...newPkg, slug: event.target.value })}
              placeholder="python-coding-test"
              className="admin-field admin-mono"
            />
          </Field>
          <Field label="Description" className="admin-grid-span">
            <textarea
              value={newPkg.description}
              onChange={(event) => setNewPkg({ ...newPkg, description: event.target.value })}
              rows={3}
              className="admin-field"
              style={{ paddingTop: 10, minHeight: 90 }}
              placeholder="Optional internal note that helps editors understand the bundle."
            />
          </Field>
          <Field label="Time limit (seconds)">
            <input
              type="number"
              value={newPkg.totalTimeSeconds}
              onChange={(event) =>
                setNewPkg({ ...newPkg, totalTimeSeconds: Number(event.target.value) })
              }
              className="admin-field"
            />
          </Field>
          <Field label="Max score">
            <input
              type="number"
              value={newPkg.maxScore}
              onChange={(event) => setNewPkg({ ...newPkg, maxScore: Number(event.target.value) })}
              className="admin-field"
            />
          </Field>
          <Field label="Price (paise)">
            <input
              type="number"
              value={newPkg.priceCents}
              onChange={(event) => setNewPkg({ ...newPkg, priceCents: Number(event.target.value) })}
              className="admin-field"
            />
          </Field>
          <div className="admin-grid-span">
            <p className="admin-form-label" style={{ marginBottom: 8 }}>Bound languages</p>
            <div className="admin-row" style={{ flexWrap: "wrap", gap: 6 }}>
              {languages.length === 0 && (
                <span className="admin-card-subtitle">No language plugins available yet.</span>
              )}
              {languages.map((language) => {
                const enabled = newPkg.languages.includes(language.slug);
                return (
                  <button
                    key={language.id}
                    type="button"
                    onClick={() => toggleLang(language.slug)}
                    className={`admin-btn ${enabled ? "admin-btn-primary" : "admin-btn-secondary"}`}
                  >
                    {language.name}
                  </button>
                );
              })}
            </div>
          </div>
          {createError && (
            <div className="admin-error admin-grid-span" style={{ whiteSpace: "normal" }}>
              {createError}
            </div>
          )}
        </form>
      </Modal>

      {/* Footer hint with currency icon to keep parity with the design "₹ catalog" badge */}
      <div className="admin-row" style={{ color: "var(--admin-fg-4)", fontSize: 11, gap: 6 }}>
        <Clock size={12} />
        <IndianRupee size={12} /> Priced packages appear in the public catalog automatically when published.
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`admin-form-label ${className ?? ""}`}>
      {label}
      {children}
    </label>
  );
}

export default function ExamPackagesPage() {
  return (
    <AdminGuard>
      <ExamPackagesInner />
    </AdminGuard>
  );
}
