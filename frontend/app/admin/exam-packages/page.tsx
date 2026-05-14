"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, IndianRupee, PackageCheck, Plus } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import {
  createExamPackage,
  listExamPackages,
  listPlugins,
  type AdminExamPackage,
  type Plugin,
} from "@/lib/api";

function ExamPackagesInner() {
  const [packages, setPackages] = useState<AdminExamPackage[]>([]);
  const [languages, setLanguages] = useState<Plugin[]>([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newPkg, setNewPkg] = useState({
    title: "",
    slug: "",
    description: "",
    languages: [] as string[],
    priceCents: 0,
    totalTimeSeconds: 5400,
    maxScore: 100,
  });

  useEffect(() => {
    listExamPackages()
      .then((data) => setPackages(data.examPackages))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load packages."));
    listPlugins({ category: "language" })
      .then((data) => setLanguages(data.plugins))
      .catch(() => undefined);
  }, []);

  const toggleLang = (slug: string) => {
    setNewPkg((pkg) => ({
      ...pkg,
      languages: pkg.languages.includes(slug)
        ? pkg.languages.filter((item) => item !== slug)
        : [...pkg.languages, slug],
    }));
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError("");
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
      const refreshed = await listExamPackages();
      setPackages(refreshed.examPackages);
      setNewPkg({
        title: "",
        slug: "",
        description: "",
        languages: [],
        priceCents: 0,
        totalTimeSeconds: 5400,
        maxScore: 100,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-page-eyebrow">Catalog / Assessments</p>
          <h2 className="admin-page-title">Exam Packages</h2>
          <p className="admin-page-copy">
            Bundle exams with language plugins, duration limits, score caps, and optional purchase pricing.
          </p>
        </div>
        <span className="admin-badge admin-badge-green">
          <span className="admin-dot" />
          {packages.length} packages
        </span>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <section className="admin-card admin-card-pad">
        <div className="admin-control-row" style={{ marginBottom: 16 }}>
          <div>
            <h3 className="admin-card-title">Create New Package</h3>
            <p className="admin-card-subtitle">Use the same backend package API with the updated admin UI.</p>
          </div>
          <PackageCheck size={18} color="var(--admin-green)" />
        </div>
        <form onSubmit={create} className="admin-grid-2">
          <Field label="Title">
            <input
              required
              value={newPkg.title}
              onChange={(event) => setNewPkg({ ...newPkg, title: event.target.value })}
              className="admin-field"
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
              style={{ paddingTop: 10, minHeight: 88 }}
            />
          </Field>
          <Field label="Time Limit">
            <input
              type="number"
              value={newPkg.totalTimeSeconds}
              onChange={(event) => setNewPkg({ ...newPkg, totalTimeSeconds: Number(event.target.value) })}
              className="admin-field"
            />
          </Field>
          <Field label="Max Score">
            <input
              type="number"
              value={newPkg.maxScore}
              onChange={(event) => setNewPkg({ ...newPkg, maxScore: Number(event.target.value) })}
              className="admin-field"
            />
          </Field>
          <Field label="Price in paise">
            <input
              type="number"
              value={newPkg.priceCents}
              onChange={(event) => setNewPkg({ ...newPkg, priceCents: Number(event.target.value) })}
              className="admin-field"
            />
          </Field>
          <div className="admin-form-label">
            Bound Languages
            <div className="admin-row" style={{ flexWrap: "wrap" }}>
              {languages.map((language) => (
                <button
                  key={language.id}
                  type="button"
                  onClick={() => toggleLang(language.slug)}
                  className={`admin-btn ${newPkg.languages.includes(language.slug) ? "admin-btn-primary" : "admin-btn-secondary"}`}
                >
                  {language.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <button type="submit" disabled={creating} className="admin-btn admin-btn-primary">
              <Plus size={14} /> {creating ? "Creating..." : "Create Package"}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-grid-3">
        {packages.map((pkg) => (
          <Link key={pkg.id} href={`/admin/exam-packages/${pkg.id}`} className="admin-module-card">
            <div className="admin-control-row">
              <span className="admin-module-icon" style={{ background: "rgba(56,189,248,0.14)", color: "var(--admin-blue)" }}>
                <PackageCheck size={20} />
              </span>
              <span className={`admin-badge ${pkg.status === "published" ? "admin-badge-green" : "admin-badge-amber"}`}>
                <span className="admin-dot" />
                {pkg.status}
              </span>
            </div>
            <div>
              <h3 className="admin-card-title">{pkg.title}</h3>
              <p className="admin-card-subtitle admin-mono">{pkg.slug}</p>
            </div>
            <div className="admin-row">
              <span className="admin-badge">
                <Clock size={12} /> {Math.round(pkg.totalTimeSeconds / 60)} min
              </span>
              <span className="admin-badge">Score {pkg.maxScore}</span>
              <span className="admin-badge">
                <IndianRupee size={12} /> catalog
              </span>
            </div>
            <p className="admin-card-subtitle">Created {new Date(pkg.createdAt).toLocaleDateString()}</p>
          </Link>
        ))}
      </section>

      {packages.length === 0 && (
        <div className="admin-card admin-card-pad" style={{ textAlign: "center", padding: 44 }}>
          <PackageCheck size={32} color="var(--admin-fg-4)" />
          <h3 className="admin-card-title" style={{ marginTop: 14 }}>No exam packages yet</h3>
        </div>
      )}
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
