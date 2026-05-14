"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Blocks,
  Code2,
  Database,
  FileText,
  PackageCheck,
  ShieldCheck,
  Users,
} from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { listAdminQuestions, listExamPackages, listPlugins } from "@/lib/api";

const modules = [
  {
    href: "/admin/coding",
    label: "Coding",
    desc: "Problems, test cases, languages, judge settings",
    icon: Code2,
    color: "#ffb703",
    trial: 12,
    main: 48,
    tags: ["Arrays", "Graphs", "DP", "Strings"],
  },
  {
    href: "/admin/questions",
    label: "Aptitude",
    desc: "MCQs for quantitative, logical, and verbal rounds",
    icon: Banknote,
    color: "#1ed36a",
    trial: 18,
    main: 132,
    tags: ["Quant", "Logic", "Verbal"],
  },
  {
    href: "/admin/exam-packages",
    label: "Assessments",
    desc: "Packages, pricing, durations, and language bindings",
    icon: PackageCheck,
    color: "#38bdf8",
    trial: 5,
    main: 14,
    tags: ["Live", "Drafts", "Catalog"],
  },
];

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: ComponentType<{ size?: number }>;
  color: string;
}) {
  return (
    <div className="admin-card admin-stat">
      <div className="admin-stat-top">
        <span className="admin-stat-icon" style={{ background: `${color}20`, color }}>
          <Icon size={18} />
        </span>
        <span className="admin-badge admin-badge-green">Live</span>
      </div>
      <p className="admin-stat-label">{label}</p>
      <p className="admin-stat-value">{value}</p>
      <p className="admin-stat-sub">{sub}</p>
    </div>
  );
}

function DashboardInner() {
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [pluginCount, setPluginCount] = useState<number | null>(null);
  const [packageCount, setPackageCount] = useState<number | null>(null);

  useEffect(() => {
    listAdminQuestions({ pluginSlug: "assessment.coding" })
      .then((data) => setQuestionCount(data.questions.length))
      .catch(() => setQuestionCount(null));
    listPlugins()
      .then((data) => setPluginCount(data.plugins.length))
      .catch(() => setPluginCount(null));
    listExamPackages()
      .then((data) => setPackageCount(data.examPackages.length))
      .catch(() => setPackageCount(null));
  }, []);

  const activity = useMemo(
    () => [
      { icon: Database, label: "Question authoring APIs are connected", tone: "green" },
      { icon: Blocks, label: "Plugin registry exposes config schemas", tone: "amber" },
      { icon: ShieldCheck, label: "Proctoring workspace is ready for wiring", tone: "blue" },
      { icon: FileText, label: "Exam package catalog is available", tone: "green" },
    ],
    [],
  );

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-page-eyebrow">Origin BI Technical</p>
          <h2 className="admin-page-title">Admin Dashboard</h2>
          <p className="admin-page-copy">
            A redesigned control surface for coding assessments, plugins, exam packages, and user entitlements.
          </p>
        </div>
        <div className="admin-row">
          <Link href="/admin/coding/new" className="admin-btn admin-btn-secondary">
            <Code2 size={14} /> New Problem
          </Link>
          <Link href="/admin/exam-packages" className="admin-btn admin-btn-primary">
            <PackageCheck size={14} /> Build Assessment
          </Link>
        </div>
      </div>

      <section className="admin-grid-4">
        <StatCard
          label="Coding Questions"
          value={questionCount ?? "-"}
          sub="assessment.coding bank"
          icon={Database}
          color="#ffb703"
        />
        <StatCard
          label="Plugins"
          value={pluginCount ?? "-"}
          sub="languages, runners, evaluators"
          icon={Blocks}
          color="#1ed36a"
        />
        <StatCard
          label="Exam Packages"
          value={packageCount ?? "-"}
          sub="catalog entries"
          icon={PackageCheck}
          color="#38bdf8"
        />
        <StatCard
          label="Review Queue"
          value="14"
          sub="proctor incidents pending"
          icon={AlertTriangle}
          color="#f17074"
        />
      </section>

      <section className="admin-card admin-card-pad">
        <div className="admin-control-row" style={{ marginBottom: 16 }}>
          <div>
            <h3 className="admin-card-title">Question Banks</h3>
            <p className="admin-card-subtitle">Manage modules from the redesigned admin workflow.</p>
          </div>
          <Link href="/admin/coding" className="admin-btn admin-btn-secondary">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="admin-grid-3">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.label} href={module.href} className="admin-module-card">
                <div className="admin-control-row">
                  <span
                    className="admin-module-icon"
                    style={{ background: `${module.color}20`, color: module.color }}
                  >
                    <Icon size={20} />
                  </span>
                  <span className="admin-badge" style={{ color: module.color, borderColor: `${module.color}44` }}>
                    Module
                  </span>
                </div>
                <div>
                  <h3 className="admin-card-title">{module.label}</h3>
                  <p className="admin-card-subtitle">{module.desc}</p>
                </div>
                <div className="admin-row">
                  <span className="admin-badge">Trial {module.trial}</span>
                  <span className="admin-badge">Main {module.main}</span>
                </div>
                <div className="admin-row">
                  {module.tags.map((tag) => (
                    <span key={tag} className="admin-badge">
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="admin-grid-2">
        <div className="admin-card admin-card-pad">
          <div className="admin-control-row" style={{ marginBottom: 10 }}>
            <h3 className="admin-card-title">Live Assessments</h3>
            <Activity size={16} color="var(--admin-green)" />
          </div>
          <div className="admin-stack">
            {["Technical Assessment - Python", "Full Stack Screening", "Data Structures Trial"].map((name, index) => (
              <div key={name} className="admin-control-row">
                <div>
                  <strong style={{ fontSize: 13 }}>{name}</strong>
                  <p className="admin-card-subtitle">{index === 0 ? "Live" : index === 1 ? "Scheduled" : "Draft"}</p>
                </div>
                <span className={`admin-badge ${index === 0 ? "admin-badge-green" : index === 1 ? "admin-badge-amber" : ""}`}>
                  <span className="admin-dot" />
                  {index === 0 ? "Live" : index === 1 ? "Soon" : "Draft"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card admin-card-pad">
          <div className="admin-control-row" style={{ marginBottom: 10 }}>
            <h3 className="admin-card-title">Recent Activity</h3>
            <Users size={16} color="var(--admin-blue)" />
          </div>
          <div className="admin-stack">
            {activity.map((item) => {
              const Icon = item.icon;
              const color =
                item.tone === "green"
                  ? "var(--admin-green)"
                  : item.tone === "amber"
                    ? "var(--admin-amber)"
                    : "var(--admin-blue)";
              const bg =
                item.tone === "green"
                  ? "rgba(30,211,106,0.14)"
                  : item.tone === "amber"
                    ? "rgba(255,183,3,0.14)"
                    : "rgba(56,189,248,0.14)";
              return (
                <div key={item.label} className="admin-row" style={{ alignItems: "flex-start" }}>
                  <span className="admin-module-icon" style={{ width: 30, height: 30, background: bg, color }}>
                    <Icon size={15} />
                  </span>
                  <div>
                    <strong style={{ fontSize: 12.5 }}>{item.label}</strong>
                    <p className="admin-card-subtitle">Updated just now</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <DashboardInner />
    </AdminGuard>
  );
}
