"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Flag,
  MapPin,
  Maximize,
  MessageSquare,
  Mic,
  PauseCircle,
  ShieldCheck,
  Wifi,
  XCircle,
} from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import { Avatar, Badge, Card, StatCard, StatusDot } from "@/components/admin/ui";

interface LiveCandidate {
  id: string;
  name: string;
  obId: string;
  exam: string;
  progress: number;
  flags: number;
  status: "ok" | "warning" | "danger";
  time: string;
  questionsTotal: number;
  questionsDone: number;
}

const liveCandidates: LiveCandidate[] = [
  { id: "lc1", name: "Aanya Sharma", obId: "OB-20345", exam: "Aptitude Round", progress: 67, flags: 0, status: "ok", time: "32m left", questionsTotal: 30, questionsDone: 20 },
  { id: "lc2", name: "Rohan Mehta", obId: "OB-20346", exam: "TCS NQT Prep", progress: 42, flags: 1, status: "warning", time: "1h 12m", questionsTotal: 40, questionsDone: 17 },
  { id: "lc3", name: "Karan Singh", obId: "OB-20289", exam: "SDE Round 2", progress: 88, flags: 3, status: "danger", time: "8m left", questionsTotal: 6, questionsDone: 5 },
  { id: "lc4", name: "Sneha Patel", obId: "OB-20045", exam: "Aptitude Round", progress: 22, flags: 0, status: "ok", time: "44m left", questionsTotal: 30, questionsDone: 7 },
  { id: "lc5", name: "Ankit Verma", obId: "OB-20102", exam: "SDE Round 2", progress: 56, flags: 0, status: "ok", time: "38m left", questionsTotal: 6, questionsDone: 3 },
  { id: "lc6", name: "Tara Reddy", obId: "OB-19921", exam: "TCS NQT Prep", progress: 71, flags: 2, status: "warning", time: "26m left", questionsTotal: 40, questionsDone: 28 },
  { id: "lc7", name: "Vikram Joshi", obId: "OB-19883", exam: "Aptitude Round", progress: 14, flags: 0, status: "ok", time: "52m left", questionsTotal: 30, questionsDone: 4 },
  { id: "lc8", name: "Pooja Iyer", obId: "OB-19744", exam: "SDE Round 2", progress: 92, flags: 4, status: "danger", time: "3m left", questionsTotal: 6, questionsDone: 6 },
];

function ProctoringInner() {
  useRegisterAdminPage({
    eyebrow: "System / Proctoring",
    title: "Proctoring Live Monitor",
    subtitle: "Real-time candidate feed across all active sessions.",
    breadcrumb: [
      { label: "Admin Hub", href: "/admin" },
      { label: "Proctoring" },
    ],
  });

  const [selected, setSelected] = useState<LiveCandidate>(liveCandidates[2]);

  const stats = useMemo(() => {
    const live = liveCandidates.length;
    const flagged = liveCandidates.filter((c) => c.flags > 0).length;
    const high = liveCandidates.filter((c) => c.status === "danger").length;
    return { live, flagged, high };
  }, []);

  return (
    <div className="admin-page">
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Live now"
          value={stats.live.toString().padStart(2, "0")}
          sub="Streaming sessions"
          icon={<Activity size={18} />}
          iconBg="var(--admin-green-soft)"
          iconColor="var(--admin-green)"
        />
        <StatCard
          label="Flagged"
          value={stats.flagged}
          sub="Needs review"
          icon={<Flag size={18} />}
          iconBg="var(--admin-amber-soft)"
          iconColor="var(--admin-amber)"
        />
        <StatCard
          label="Auto-paused"
          value="3"
          sub="Pending operator action"
          icon={<PauseCircle size={18} />}
          iconBg="rgba(237,47,52,0.12)"
          iconColor="var(--admin-red)"
        />
        <StatCard
          label="Completed today"
          value="412"
          sub="Across 12 exams"
          icon={<CheckCircle2 size={18} />}
          iconBg="var(--admin-blue-soft)"
          iconColor="var(--admin-blue)"
        />
        <StatCard
          label="Avg session"
          value="47m"
          sub="−4m vs yesterday"
          icon={<Clock size={18} />}
          iconBg="rgba(255,255,255,0.06)"
          iconColor="var(--admin-fg-3)"
        />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 16, alignItems: "flex-start" }}>
        <Card>
          <div className="admin-control-row" style={{ marginBottom: 14 }}>
            <div>
              <h3 className="admin-card-title">Live Candidates</h3>
              <p className="admin-card-subtitle">Click a tile to inspect real-time signals.</p>
            </div>
            <Badge tone="green" dot>
              <span className="admin-animate-pulse">{stats.live} live</span>
            </Badge>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {liveCandidates.map((c) => {
              const tone = c.status === "ok" ? "green" : c.status === "warning" ? "amber" : "red";
              const isSelected = c.id === selected.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c)}
                  className="admin-module-card"
                  style={{
                    padding: 0,
                    overflow: "hidden",
                    cursor: "pointer",
                    borderColor: isSelected ? "rgba(30,211,106,0.45)" : undefined,
                    background: isSelected ? "rgba(30,211,106,0.06)" : undefined,
                    gap: 0,
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      aspectRatio: "4/3",
                      display: "grid",
                      placeItems: "center",
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
                      borderBottom: "1px solid var(--admin-border)",
                    }}
                  >
                    <Avatar name={c.name} email={c.obId} size={48} />
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                      }}
                    >
                      <Badge tone={tone} dot>
                        {c.status === "ok" ? "Live" : c.status === "warning" ? "Watch" : "High"}
                      </Badge>
                    </span>
                    {c.flags > 0 && (
                      <span style={{ position: "absolute", top: 8, right: 8 }}>
                        <Badge tone="red">
                          <Flag size={10} /> {c.flags}
                        </Badge>
                      </span>
                    )}
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        padding: "6px 10px",
                        background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.5))",
                      }}
                    >
                      <div className="admin-progress" style={{ height: 4 }}>
                        <div
                          className="admin-progress-fill"
                          style={{
                            width: `${c.progress}%`,
                            background:
                              c.status === "danger"
                                ? "var(--admin-red)"
                                : c.status === "warning"
                                  ? "var(--admin-amber)"
                                  : undefined,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 12, textAlign: "left" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--admin-fg)" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--admin-fg-3)" }}>{c.exam}</div>
                    <div style={{ fontSize: 11, color: "var(--admin-fg-4)", marginTop: 4 }}>{c.time}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card pad={false} style={{ position: "sticky", top: 88 }}>
          <div
            style={{
              position: "relative",
              aspectRatio: "16/10",
              borderRadius: "var(--admin-r-lg) var(--admin-r-lg) 0 0",
              background:
                "linear-gradient(135deg, rgba(30,211,106,0.18), rgba(74,198,234,0.18))",
              display: "grid",
              placeItems: "center",
              borderBottom: "1px solid var(--admin-border)",
            }}
          >
            <Avatar name={selected.name} email={selected.obId} size={84} />
            <Badge
              tone={selected.status === "ok" ? "green" : selected.status === "warning" ? "amber" : "red"}
              dot
              style={{ position: "absolute", top: 14, left: 14 }}
            >
              {selected.status === "ok" ? "Healthy" : selected.status === "warning" ? "Watch" : "High risk"}
            </Badge>
          </div>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <h3 className="admin-card-title">{selected.name}</h3>
              <p className="admin-card-subtitle admin-mono">
                {selected.obId} · {selected.exam}
              </p>
            </div>
            <div>
              <div className="admin-control-row">
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-fg-3)" }}>
                  Question {selected.questionsDone} / {selected.questionsTotal}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--admin-fg-2)", fontWeight: 700 }}>
                  {selected.progress}%
                </span>
              </div>
              <div className="admin-progress" style={{ marginTop: 6 }}>
                <div className="admin-progress-fill" style={{ width: `${selected.progress}%` }} />
              </div>
            </div>

            <div>
              <p className="admin-stat-label">Active flags</p>
              {selected.flags === 0 ? (
                <p style={{ color: "var(--admin-fg-3)", fontSize: 12.5, marginTop: 6 }}>
                  No flags raised in this session.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {Array.from({ length: selected.flags }).map((_, i) => (
                    <div
                      key={i}
                      className="admin-row"
                      style={{
                        padding: "8px 10px",
                        background: "var(--admin-amber-soft)",
                        borderRadius: 8,
                        border: "1px solid rgba(255,183,3,0.32)",
                      }}
                    >
                      <AlertTriangle size={14} color="var(--admin-amber)" />
                      <span style={{ flex: 1, fontSize: 12, color: "var(--admin-amber)", fontWeight: 700 }}>
                        Excessive head movement
                      </span>
                      <span style={{ fontSize: 11, color: "var(--admin-fg-4)" }}>{i + 1}m ago</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="admin-stat-label" style={{ marginBottom: 8 }}>Live signals</p>
              <div className="admin-grid-3" style={{ gap: 8 }}>
                {[
                  { icon: <Wifi size={13} />, label: "Network", ok: true },
                  { icon: <Camera size={13} />, label: "Camera", ok: selected.status !== "danger" },
                  { icon: <Mic size={13} />, label: "Mic", ok: true },
                  { icon: <Maximize size={13} />, label: "Fullscreen", ok: selected.status !== "danger" },
                  { icon: <MapPin size={13} />, label: "Location", ok: true },
                  { icon: <ShieldCheck size={13} />, label: "Identity", ok: true },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="admin-row"
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid var(--admin-border)",
                      background: "rgba(255,255,255,0.025)",
                      gap: 6,
                    }}
                  >
                    <span style={{ color: s.ok ? "var(--admin-green)" : "var(--admin-red)" }}>
                      {s.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    </span>
                    {s.icon}
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-fg-2)" }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-row" style={{ gap: 8, marginTop: 4 }}>
              <button type="button" className="admin-btn admin-btn-secondary" style={{ flex: 1 }}>
                <MessageSquare size={13} /> Message
              </button>
              <button type="button" className="admin-btn admin-btn-secondary" style={{ flex: 1 }}>
                <AlertTriangle size={13} /> Warn
              </button>
              <button
                type="button"
                className="admin-btn"
                style={{
                  flex: 1,
                  background: "var(--admin-red-soft)",
                  color: "#ff8a8d",
                  borderColor: "rgba(237,47,52,0.32)",
                }}
              >
                <XCircle size={13} /> Terminate
              </button>
            </div>
            <p style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--admin-fg-4)" }}>
              <StatusDot tone="green" pulse /> Stream healthy · 0 dropped frames last 60s
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}

export default function ProctoringPage() {
  return (
    <AdminGuard>
      <ProctoringInner />
    </AdminGuard>
  );
}
