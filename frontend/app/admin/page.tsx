"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Brain,
  Code2,
  Database,
  MessageSquare,
  PackageCheck,
  RefreshCw,
  Target,
  Users,
} from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import { Badge, Card, StatCard, StatusDot } from "@/components/admin/ui";
import { listAdminQuestions, listExamPackages, listPlugins } from "@/lib/api";

interface ModuleTile {
  href: string;
  label: string;
  desc: string;
  icon: typeof Code2;
  accent: string;
  trial: number;
  main: number;
  categories: string[];
}

const moduleTiles: ModuleTile[] = [
  {
    href: "/admin/questions",
    label: "Aptitude",
    desc: "Quantitative, logical, and verbal reasoning",
    icon: Brain,
    accent: "var(--admin-acc-aptitude)",
    trial: 18,
    main: 132,
    categories: ["Quant", "Logic", "Verbal", "Abstract"],
  },
  {
    href: "/admin/questions",
    label: "MNC Prep",
    desc: "Company-style problem packs and case studies",
    icon: Banknote,
    accent: "var(--admin-acc-mnc)",
    trial: 12,
    main: 86,
    categories: ["Aptitude", "Coding", "Communication"],
  },
  {
    href: "/admin/questions",
    label: "Communication",
    desc: "Email, comprehension and speaking prompts",
    icon: MessageSquare,
    accent: "var(--admin-acc-comm)",
    trial: 8,
    main: 64,
    categories: ["Reading", "Writing", "Speaking"],
  },
  {
    href: "/admin/questions",
    label: "Role-Based",
    desc: "Curated bundles per job role and level",
    icon: Target,
    accent: "var(--admin-acc-role)",
    trial: 14,
    main: 96,
    categories: ["Frontend", "Backend", "Data", "DevOps"],
  },
  {
    href: "/admin/coding",
    label: "Coding",
    desc: "Problems, test cases, languages, judge",
    icon: Code2,
    accent: "var(--admin-acc-coding)",
    trial: 12,
    main: 48,
    categories: ["Arrays", "Graphs", "DP", "Strings"],
  },
];

const recentActivity = [
  { user: "Priya Iyer", action: "published", target: "FAANG Coding Final v3", tone: "green", time: "2m ago" },
  { user: "System", action: "auto-paused", target: "Session OB-90431 (high motion)", tone: "amber", time: "8m ago" },
  { user: "Karthik R.", action: "approved", target: "MCQ pack — Aptitude L2", tone: "green", time: "21m ago" },
  { user: "Mira S.", action: "flagged", target: "Coding submission OB-77329", tone: "red", time: "32m ago" },
  { user: "Neha P.", action: "invited", target: "12 candidates to Tech Screen", tone: "blue", time: "1h ago" },
  { user: "System", action: "synced", target: "Plugin: assessment.coding v1.4", tone: "neutral", time: "2h ago" },
] as const;

const liveAssessments = [
  { name: "Frontend Engineer Trial", module: "Coding", status: "live", completed: 24, total: 32, duration: 60, updated: "2m" },
  { name: "Aptitude Round 1 — Cohort A", module: "Aptitude", status: "live", completed: 312, total: 480, duration: 45, updated: "5m" },
  { name: "Communication Mock — March", module: "Communication", status: "scheduled", completed: 0, total: 120, duration: 30, updated: "1h" },
  { name: "DSA Hard — Senior bench", module: "Coding", status: "draft", completed: 0, total: 0, duration: 90, updated: "yday" },
] as const;

function MiniBar({ data, max, accent = "var(--admin-green)" }: { data: number[]; max: number; accent?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 56, marginTop: 12 }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${Math.max(4, (v / max) * 100)}%`,
            background: i === data.length - 1 ? accent : "rgba(30,211,106,0.32)",
            borderRadius: 3,
          }}
        />
      ))}
    </div>
  );
}

function ToneDot({ tone }: { tone: "green" | "amber" | "red" | "blue" | "neutral" }) {
  if (tone === "neutral") return <StatusDot tone="grey" />;
  return <StatusDot tone={tone} pulse={tone === "green"} />;
}

function DashboardInner() {
  useRegisterAdminPage({
    eyebrow: "Dashboard",
    title: "Welcome back, Admin",
    subtitle: "Here's what's happening across all assessments today.",
    breadcrumb: [{ label: "Admin Hub" }],
  });

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

  const totalCandidates = useMemo(
    () => liveAssessments.reduce((a, x) => a + x.total, 0).toLocaleString(),
    [],
  );

  return (
    <div className="admin-page">
      <section className="admin-grid-4">
        <StatCard
          label="Active Candidates"
          value={totalCandidates}
          delta={{ direction: "up", value: "+12%" }}
          sub="208 online now"
          icon={<Users size={18} />}
          iconBg="rgba(30,211,106,0.16)"
          iconColor="var(--admin-green)"
        />
        <StatCard
          label="Question Bank"
          value={(questionCount ?? 0).toLocaleString()}
          delta={{ direction: "up", value: "+4%" }}
          sub={`${pluginCount ?? "-"} plugins linked`}
          icon={<Database size={18} />}
          iconBg="rgba(139,109,240,0.18)"
          iconColor="var(--admin-purple)"
        />
        <StatCard
          label="Live Sessions"
          value="92"
          delta={{ direction: "down", value: "-3%" }}
          sub="86 monitored"
          icon={<Activity size={18} />}
          iconBg="rgba(74,198,234,0.16)"
          iconColor="var(--admin-blue)"
        />
        <StatCard
          label="Flagged Today"
          value="14"
          delta={{ direction: "up", value: "+28%" }}
          sub="3 await review"
          icon={<AlertTriangle size={18} />}
          iconBg="rgba(255,183,3,0.18)"
          iconColor="var(--admin-amber)"
        />
      </section>

      <Card>
        <div className="admin-control-row" style={{ marginBottom: 16 }}>
          <div>
            <h3 className="admin-card-title">Question Banks</h3>
            <p className="admin-card-subtitle">Tap a module to manage its questions</p>
          </div>
          <Link href="/admin/coding" className="admin-btn admin-btn-secondary">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div
          className="admin-grid-3"
          style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}
        >
          {moduleTiles.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.label}
                href={m.href}
                className="admin-module-card"
                style={{ padding: 16, gap: 12 }}
              >
                <span
                  className="admin-module-icon"
                  style={{ background: `color-mix(in srgb, ${m.accent} 18%, transparent)`, color: m.accent, width: 36, height: 36 }}
                >
                  <Icon size={17} />
                </span>
                <div>
                  <h3 className="admin-card-title" style={{ fontSize: 13.5 }}>{m.label}</h3>
                  <p className="admin-card-subtitle" style={{ fontSize: 11.5, minHeight: 30 }}>{m.desc}</p>
                </div>
                <div className="admin-row" style={{ fontSize: 11, color: "var(--admin-fg-3)", gap: 8 }}>
                  <span>
                    <b style={{ color: "var(--admin-fg-2)" }}>{m.trial + m.main}</b> Qs
                  </span>
                  <span style={{ color: "var(--admin-fg-4)" }}>·</span>
                  <span>
                    <b style={{ color: m.accent }}>{m.categories.length}</b> cats
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <Card pad={false}>
          <div className="admin-control-row" style={{ padding: "20px 22px 12px" }}>
            <div>
              <h3 className="admin-card-title">Live Assessments</h3>
              <p className="admin-card-subtitle">Currently active or scheduled</p>
            </div>
            <Link href="/admin/exam-packages" className="admin-btn admin-btn-ghost" style={{ fontSize: 12 }}>
              See all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="admin-table-wrap" style={{ borderRadius: 0, border: 0, borderTop: "1px solid var(--admin-border)" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Module</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {liveAssessments.map((a) => {
                  const pct = a.total > 0 ? Math.round((a.completed / a.total) * 100) : 0;
                  const tone = a.status === "live" ? "green" : a.status === "scheduled" ? "amber" : "neutral";
                  return (
                    <tr key={a.name}>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--admin-fg)" }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: "var(--admin-fg-4)", marginTop: 2 }}>
                          {a.duration} min · updated {a.updated}
                        </div>
                      </td>
                      <td>
                        <span className="admin-badge admin-badge-neutral" style={{ fontWeight: 700 }}>
                          {a.module}
                        </span>
                      </td>
                      <td>
                        <Badge tone={tone} dot>{a.status}</Badge>
                      </td>
                      <td>
                        <div style={{ minWidth: 130 }}>
                          <div style={{ fontSize: 11.5, color: "var(--admin-fg-2)", fontWeight: 700, marginBottom: 6 }}>
                            {a.completed} / {a.total}
                          </div>
                          <div className="admin-progress">
                            <div className="admin-progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="admin-control-row" style={{ marginBottom: 12 }}>
            <h3 className="admin-card-title">Recent Activity</h3>
            <button className="admin-icon-btn" type="button" aria-label="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {recentActivity.map((row, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: i < recentActivity.length - 1 ? "1px solid var(--admin-border)" : "none",
                }}
              >
                <ToneDot tone={row.tone} />
                <div style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>
                  <strong style={{ color: "var(--admin-fg)" }}>{row.user}</strong>
                  <span style={{ color: "var(--admin-fg-3)" }}> {row.action} </span>
                  <span style={{ color: "var(--admin-fg-2)", fontWeight: 700 }}>{row.target}</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--admin-fg-4)", whiteSpace: "nowrap" }}>{row.time}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            style={{ marginTop: 14, width: "100%" }}
          >
            View full audit log
          </button>
        </Card>
      </section>

      <section className="admin-grid-3">
        <Card>
          <div className="admin-control-row">
            <p className="admin-stat-label">Submissions / day</p>
            <Badge tone="green">Last 7d</Badge>
          </div>
          <p className="admin-kpi-value" style={{ marginTop: 8 }}>1,842</p>
          <MiniBar data={[120, 180, 142, 210, 196, 248, 322]} max={350} />
        </Card>
        <Card>
          <div className="admin-control-row">
            <p className="admin-stat-label">Avg pass rate</p>
            <Badge tone="blue">All modules</Badge>
          </div>
          <p className="admin-kpi-value" style={{ marginTop: 8 }}>68.4%</p>
          <MiniBar data={[58, 62, 65, 64, 67, 71, 68]} max={80} accent="var(--admin-blue)" />
        </Card>
        <Card>
          <div className="admin-control-row">
            <p className="admin-stat-label">Proctor incidents</p>
            <Badge tone="amber">+12% wow</Badge>
          </div>
          <p className="admin-kpi-value" style={{ marginTop: 8 }}>{packageCount === null ? "47" : Math.max(packageCount, 8)}</p>
          <MiniBar data={[8, 6, 9, 12, 7, 11, 14]} max={20} accent="var(--admin-amber)" />
        </Card>
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
