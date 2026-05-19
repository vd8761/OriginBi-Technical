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
  RefreshCw,
  Target,
  Users,
} from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import { Badge, Card, StatCard, StatusDot } from "@/components/admin/ui";
import {
  getAdminDashboardSummary,
  type AdminDashboardActivityItem,
  type AdminDashboardLiveAssessment,
  type AdminDashboardSummary,
} from "@/lib/api";
import { MountPoint } from "@/plugins";

interface ModuleTile {
  href: string;
  label: string;
  desc: string;
  icon: typeof Code2;
  accentVar: string;
  accentBgVar: string;
  trial: number;
  main: number;
  categories: string[];
}

const moduleConfig: Record<string, { icon: any; accentVar: string; accentBgVar: string; href: string }> = {
  "mcq.aptitude": { icon: Brain, accentVar: "--admin-acc-aptitude", accentBgVar: "rgba(30, 211, 106, 0.14)", href: "/admin/question-banks/aptitude" },
  "mcq.verbal": { icon: MessageSquare, accentVar: "--admin-acc-comm", accentBgVar: "rgba(6, 182, 212, 0.16)", href: "/admin/question-banks/communication" },
  "mcq.technical": { icon: Target, accentVar: "--admin-acc-role", accentBgVar: "rgba(132, 204, 22, 0.16)", href: "/admin/question-banks/role" },
  "assessment.coding": { icon: Code2, accentVar: "--admin-acc-coding", accentBgVar: "rgba(255, 183, 3, 0.18)", href: "/admin/coding" },
  "essay": { icon: Banknote, accentVar: "--admin-acc-mnc", accentBgVar: "rgba(139, 109, 240, 0.16)", href: "/admin/question-banks/mnc" },
  "default": { icon: Database, accentVar: "--admin-acc-role", accentBgVar: "rgba(132, 204, 22, 0.16)", href: "/admin/question-banks" },
};

const moduleTiles: ModuleTile[] = [
  {
    href: "/admin/question-banks",
    label: "Aptitude Assessment",
    desc: "Quantitative, logical, verbal and abstract reasoning.",
    icon: Brain,
    accentVar: "--admin-acc-aptitude",
    accentBgVar: "rgba(30, 211, 106, 0.14)",
    trial: 18,
    main: 132,
    categories: ["Quant", "Logic", "Verbal", "Abstract"],
  },
  {
    href: "/admin/question-banks",
    label: "MNC Career Prep",
    desc: "Company-style problem packs and case studies.",
    icon: Banknote,
    accentVar: "--admin-acc-mnc",
    accentBgVar: "rgba(139, 109, 240, 0.16)",
    trial: 12,
    main: 86,
    categories: ["Aptitude", "Coding", "HR"],
  },
  {
    href: "/admin/question-banks",
    label: "Communication Skills",
    desc: "Email, comprehension and speaking prompts.",
    icon: MessageSquare,
    accentVar: "--admin-acc-comm",
    accentBgVar: "rgba(6, 182, 212, 0.16)",
    trial: 8,
    main: 64,
    categories: ["Reading", "Writing", "Speaking"],
  },
  {
    href: "/admin/question-banks",
    label: "Role-Based Technical",
    desc: "Curated bundles per job role and level.",
    icon: Target,
    accentVar: "--admin-acc-role",
    accentBgVar: "rgba(132, 204, 22, 0.16)",
    trial: 14,
    main: 96,
    categories: ["Frontend", "Backend", "Data", "DevOps"],
  },
  {
    href: "/admin/coding",
    label: "Coding Challenges",
    desc: "Problems, test cases, languages, Judge0.",
    icon: Code2,
    accentVar: "--admin-acc-coding",
    accentBgVar: "rgba(255, 183, 3, 0.18)",
    trial: 12,
    main: 48,
    categories: ["Arrays", "Graphs", "DP", "Strings"],
  },
];

function MiniBar({ data, max, accent = "var(--admin-green)" }: { data: number[]; max: number; accent?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 56, marginTop: 12 }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${Math.max(4, (v / Math.max(1, max)) * 100)}%`,
            background: i === data.length - 1 ? accent : "rgba(30,211,106,0.32)",
            borderRadius: 3,
          }}
        />
      ))}
    </div>
  );
}

function ToneDot({ tone }: { tone: AdminDashboardActivityItem["tone"] }) {
  if (tone === "neutral") return <StatusDot tone="grey" />;
  return <StatusDot tone={tone} pulse={tone === "green"} />;
}

function liveAssessmentTone(status: AdminDashboardLiveAssessment["status"]): "green" | "amber" | "neutral" {
  if (status === "live") return "green";
  if (status === "scheduled") return "amber";
  return "neutral";
}

function relativeFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return "Just now";
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function humanizeAction(action: string): string {
  return action.replace(/_/g, " ");
}

function DashboardInner() {
  useRegisterAdminPage({
    eyebrow: "Dashboard",
    title: "Welcome back, Admin",
    subtitle: "Here's what's happening across all assessments today.",
    breadcrumb: [{ label: "Admin Hub" }],
  });

  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getAdminDashboardSummary()
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      });
    return () => {
      cancelled = true;
    };
  }, [refreshNonce]);

  const kpis = summary?.kpis;
  const liveAssessments = summary?.liveAssessments ?? [];
  const recentActivity = summary?.recentActivity ?? [];
  const submissionsSeries = useMemo(
    () => summary?.series.submissionsPerDay ?? [],
    [summary],
  );
  const incidentsSeries = useMemo(
    () => summary?.series.proctorIncidentsPerDay ?? [],
    [summary],
  );

  const submissionsTotal = summary?.series.submissionsWeekTotal ?? 0;
  const incidentsTotal = summary?.series.proctorIncidentsWeek ?? 0;
  const avgPassRate = summary?.series.avgPassRateWeek;

  const submissionsMax = useMemo(
    () => Math.max(1, ...submissionsSeries.map((d) => d.count)),
    [submissionsSeries],
  );
  const incidentsMax = useMemo(
    () => Math.max(1, ...incidentsSeries.map((d) => d.count)),
    [incidentsSeries],
  );

  return (
    <div className="admin-page">
      {error && (
        <div className="admin-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      <section className="admin-grid-4">
        <StatCard
          label="Active Candidates"
          value={(kpis?.activeCandidates ?? 0).toLocaleString()}
          sub={`${(kpis?.activeCandidatesOnline ?? 0).toLocaleString()} online now`}
          icon={<Users size={18} />}
          iconBg="rgba(30,211,106,0.16)"
          iconColor="var(--admin-green)"
        />
        <StatCard
          label="Question Bank"
          value={(kpis?.questionBankTotal ?? 0).toLocaleString()}
          sub={`${kpis?.questionBankPluginCount ?? 0} plugins linked`}
          icon={<Database size={18} />}
          iconBg="rgba(139,109,240,0.18)"
          iconColor="var(--admin-purple)"
        />
        <StatCard
          label="Live Sessions"
          value={(kpis?.liveSessions ?? 0).toLocaleString()}
          sub={`${kpis?.liveSessionsMonitored ?? 0} monitored`}
          icon={<Activity size={18} />}
          iconBg="rgba(74,198,234,0.16)"
          iconColor="var(--admin-blue)"
        />
        <StatCard
          label="Flagged Today"
          value={(kpis?.flaggedToday ?? 0).toLocaleString()}
          sub={`${kpis?.flaggedAwaitingReview ?? 0} await review`}
          icon={<AlertTriangle size={18} />}
          iconBg="rgba(255,183,3,0.18)"
          iconColor="var(--admin-amber)"
        />
        <MountPoint id="dashboard.kpi" />
      </section>

      <Card>
        <div className="admin-control-row" style={{ marginBottom: 16 }}>
          <div>
            <h3 className="admin-card-title">Question Banks</h3>
            <p className="admin-card-subtitle">Tap a module to manage its questions.</p>
          </div>
          <Link href="/admin/question-banks" className="admin-btn admin-btn-secondary">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="admin-dashboard-modules">
          {(summary?.questionBreakdown || moduleTiles).map((m: any) => {
            const isDynamic = !!summary?.questionBreakdown;
            const config = isDynamic ? (moduleConfig[m.slug] || moduleConfig.default) : m;
            const Icon = config.icon;
            
            return (
              <Link
                key={isDynamic ? m.slug : m.label}
                href={config.href}
                className="admin-module-card admin-dashboard-module-tile"
                style={
                  {
                    "--admin-acc": `var(${config.accentVar})`,
                    "--admin-acc-bg": config.accentBgVar,
                  } as React.CSSProperties
                }
              >
                <div className="admin-control-row">
                  <span
                    className="admin-module-icon"
                    style={{ background: "var(--admin-acc-bg)", color: "var(--admin-acc)" }}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="admin-mono" style={{ fontSize: 10.5, color: "var(--admin-fg-4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {isDynamic ? m.count : (m.trial + m.main)} Qs
                  </span>
                </div>
                <div>
                  <h3 className="admin-card-title" style={{ fontSize: 13.5 }}>{isDynamic ? m.name : m.label}</h3>
                  <p className="admin-card-subtitle" style={{ fontSize: 11.5, marginTop: 4, lineHeight: 1.45 }}>
                    {isDynamic ? `Manage ${m.name} assessment content.` : m.desc}
                  </p>
                </div>
                <div className="admin-row admin-dashboard-module-chips">
                  {(isDynamic ? ["Assessment"] : m.categories.slice(0, 3)).map((c: string) => (
                    <span key={c} className="admin-badge admin-badge-neutral" style={{ fontSize: 10 }}>{c}</span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
        <MountPoint id="dashboard.tiles" />
      </Card>

      <section className="admin-dashboard-row">
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
                {summary == null ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: 24, color: "var(--admin-fg-3)" }}>
                      Loading…
                    </td>
                  </tr>
                ) : liveAssessments.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: 24, color: "var(--admin-fg-3)" }}>
                      No assessments published yet.
                    </td>
                  </tr>
                ) : (
                  liveAssessments.map((a) => {
                    const pct = a.total > 0 ? Math.round((a.completed / a.total) * 100) : 0;
                    const tone = liveAssessmentTone(a.status);
                    return (
                      <tr key={a.examVersionId}>
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--admin-fg)" }}>{a.name}</div>
                          <div style={{ fontSize: 11, color: "var(--admin-fg-4)", marginTop: 2 }}>
                            {a.durationMinutes} min · updated {relativeFromIso(a.updatedAt)}
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="admin-control-row" style={{ marginBottom: 12 }}>
            <h3 className="admin-card-title">Recent Activity</h3>
            <button
              className="admin-icon-btn"
              type="button"
              aria-label="Refresh"
              onClick={() => setRefreshNonce((n) => n + 1)}
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {summary == null ? (
              <div style={{ padding: "16px 0", color: "var(--admin-fg-3)", fontSize: 12 }}>Loading…</div>
            ) : recentActivity.length === 0 ? (
              <div style={{ padding: "16px 0", color: "var(--admin-fg-3)", fontSize: 12 }}>
                No plugin decisions recorded yet.
              </div>
            ) : (
              recentActivity.map((row, i) => (
                <div
                  key={row.id}
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
                    <strong style={{ color: "var(--admin-fg)" }}>{row.actor}</strong>
                    <span style={{ color: "var(--admin-fg-3)" }}> {humanizeAction(row.action)} </span>
                    <span style={{ color: "var(--admin-fg-2)", fontWeight: 700 }}>{row.target}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--admin-fg-4)", whiteSpace: "nowrap" }}>
                    {relativeFromIso(row.createdAt)}
                  </span>
                </div>
              ))
            )}
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
        <Card className="admin-spark-card">
          <div className="admin-control-row">
            <p className="admin-stat-label">Submissions / day</p>
            <Badge tone="green">Last 7d</Badge>
          </div>
          <p className="admin-kpi-value">{submissionsTotal.toLocaleString()}</p>
          <MiniBar data={submissionsSeries.map((d) => d.count)} max={submissionsMax} />
          <div className="admin-spark-foot">
            {submissionsSeries.map((d) => (
              <span key={d.day}>{d.day.toUpperCase()}</span>
            ))}
          </div>
        </Card>
        <Card className="admin-spark-card">
          <div className="admin-control-row">
            <p className="admin-stat-label">Avg pass rate</p>
            <Badge tone="blue">Last 7d</Badge>
          </div>
          <p className="admin-kpi-value">
            {avgPassRate == null ? "—" : `${Math.round(avgPassRate * 1000) / 10}%`}
          </p>
          <MiniBar
            data={submissionsSeries.map((d) => d.count)}
            max={submissionsMax}
            accent="var(--admin-blue)"
          />
          <div className="admin-spark-foot">
            {submissionsSeries.map((d) => (
              <span key={d.day}>{d.day.toUpperCase()}</span>
            ))}
          </div>
        </Card>
        <Card className="admin-spark-card">
          <div className="admin-control-row">
            <p className="admin-stat-label">Proctor incidents</p>
            <Badge tone="amber">Last 7d</Badge>
          </div>
          <p className="admin-kpi-value">{incidentsTotal.toLocaleString()}</p>
          <MiniBar data={incidentsSeries.map((d) => d.count)} max={incidentsMax} accent="var(--admin-amber)" />
          <div className="admin-spark-foot">
            {incidentsSeries.map((d) => (
              <span key={d.day}>{d.day.toUpperCase()}</span>
            ))}
          </div>
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
