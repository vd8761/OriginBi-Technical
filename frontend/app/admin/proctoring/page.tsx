"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Eye,
  Flag,
  Keyboard,
  Maximize,
  MousePointerClick,
  PauseCircle,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import { Badge, Card, StatCard, StatusDot } from "@/components/admin/ui";
import {
  listActiveProctoringAttempts,
  type AdminProctoringAttempt,
} from "@/lib/api";

const POLL_INTERVAL_MS = 5_000;

// Keep these short and admin-friendly; they're the column headers in the row.
const COUNTER_DEFS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "proctoring.tab.switched", label: "Tab", icon: Eye },
  { key: "proctoring.copy.blocked", label: "Copy", icon: ShieldAlert },
  { key: "proctoring.paste.blocked", label: "Paste", icon: ShieldAlert },
  { key: "proctoring.cut.blocked", label: "Cut", icon: ShieldAlert },
  { key: "proctoring.right_click.blocked", label: "Right", icon: MousePointerClick },
  { key: "proctoring.fullscreen.exit", label: "Fullscreen", icon: Maximize },
  { key: "proctoring.devtools.opened", label: "Devtools", icon: ShieldAlert },
  { key: "proctoring.focus.lost", label: "Focus", icon: MousePointerClick },
  { key: "proctoring.mouse.left", label: "Mouse", icon: MousePointerClick },
  { key: "proctoring.keypress", label: "Keypress", icon: Keyboard },
];

function sumCounts(c: Record<string, number> | undefined) {
  if (!c) return 0;
  return Object.values(c).reduce((a, b) => a + (b || 0), 0);
}

function elapsedSince(iso?: string | null) {
  if (!iso) return "—";
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return "—";
  const ms = Date.now() - start;
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function rowTone(flags: number): "green" | "amber" | "red" {
  if (flags >= 5) return "red";
  if (flags >= 1) return "amber";
  return "green";
}

function ProctoringInner() {
  useRegisterAdminPage({
    eyebrow: "System / Proctoring",
    title: "Proctoring Live Monitor",
    subtitle: "Polled every 5s from /v1/admin/proctoring/active — stateless, no sticky sessions.",
    breadcrumb: [
      { label: "Proctoring" },
    ],
  });

  const [attempts, setAttempts] = useState<AdminProctoringAttempt[]>([]);
  const [polledAt, setPolledAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const inflight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      if (inflight.current) return;
      if (document.hidden) return;
      inflight.current = true;
      try {
        const res = await listActiveProctoringAttempts({ limit: 200 });
        if (cancelled) return;
        setAttempts(res.attempts);
        setPolledAt(res.polled_at);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        inflight.current = false;
        if (!cancelled) setLoading(false);
      }
    };
    pull();
    const id = window.setInterval(pull, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const stats = useMemo(() => {
    const live = attempts.length;
    const flagged = attempts.filter((a) => sumCounts(a.event_counts) > 0).length;
    const high = attempts.filter((a) => sumCounts(a.event_counts) >= 5).length;
    return { live, flagged, high };
  }, [attempts]);

  return (
    <div className="admin-page">
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Live now"
          value={stats.live.toString().padStart(2, "0")}
          sub="In-progress attempts"
          icon={<Activity size={18} />}
          iconBg="var(--admin-green-soft)"
          iconColor="var(--admin-green)"
        />
        <StatCard
          label="With incidents"
          value={stats.flagged}
          sub="At least one event"
          icon={<Flag size={18} />}
          iconBg="var(--admin-amber-soft)"
          iconColor="var(--admin-amber)"
        />
        <StatCard
          label="High alert"
          value={stats.high}
          sub="≥5 events recorded"
          icon={<AlertTriangle size={18} />}
          iconBg="rgba(237,47,52,0.12)"
          iconColor="var(--admin-red)"
        />
        <StatCard
          label="Last poll"
          value={polledAt ? elapsedSince(polledAt) : "—"}
          sub={POLL_INTERVAL_MS / 1000 + "s interval"}
          icon={<PauseCircle size={18} />}
          iconBg="rgba(255,255,255,0.06)"
          iconColor="var(--admin-fg-3)"
        />
      </section>

      <Card>
        <div className="admin-control-row" style={{ marginBottom: 14 }}>
          <div>
            <h3 className="admin-card-title">Active Attempts</h3>
            <p className="admin-card-subtitle">
              {loading
                ? "Loading…"
                : error
                  ? `Error: ${error}`
                  : `Showing ${attempts.length} in-progress attempt${attempts.length === 1 ? "" : "s"}.`}
            </p>
          </div>
          <Badge tone="green" dot>
            <StatusDot tone={error ? "red" : "green"} pulse={!error} />
            <span style={{ marginLeft: 6 }}>{error ? "Unavailable" : "Polling"}</span>
          </Badge>
        </div>

        {attempts.length === 0 && !loading && !error && (
          <p style={{ color: "var(--admin-fg-3)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
            No active attempts right now.
          </p>
        )}

        {attempts.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12.5,
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: "var(--admin-fg-3)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1.2 }}>
                  <th style={{ padding: "8px 10px" }}>Candidate</th>
                  <th style={{ padding: "8px 10px" }}>Exam</th>
                  <th style={{ padding: "8px 10px" }}>Status</th>
                  <th style={{ padding: "8px 10px" }}>Elapsed</th>
                  {COUNTER_DEFS.map((c) => (
                    <th key={c.key} style={{ padding: "8px 10px", textAlign: "center" }}>{c.label}</th>
                  ))}
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Last event</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => {
                  const flagsTotal = sumCounts(a.event_counts);
                  const tone = rowTone(flagsTotal);
                  return (
                    <tr key={a.attempt_id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                      <td style={{ padding: "10px" }}>
                        <div style={{ fontWeight: 700, color: "var(--admin-fg)" }}>#{a.candidate_user_id}</div>
                        <div className="admin-mono" style={{ fontSize: 10.5, color: "var(--admin-fg-4)" }}>{a.attempt_id.slice(0, 8)}</div>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <div className="admin-mono" style={{ fontSize: 11, color: "var(--admin-fg-3)" }}>{a.exam_version_id.slice(0, 8)}</div>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <Badge tone={tone} dot>
                          {a.status}
                        </Badge>
                      </td>
                      <td style={{ padding: "10px", color: "var(--admin-fg-2)" }}>{elapsedSince(a.started_at)}</td>
                      {COUNTER_DEFS.map((c) => {
                        const n = a.event_counts?.[c.key] ?? 0;
                        return (
                          <td key={c.key} style={{ padding: "10px", textAlign: "center", color: n > 0 ? "var(--admin-amber)" : "var(--admin-fg-4)", fontWeight: n > 0 ? 800 : 500 }}>
                            {n}
                          </td>
                        );
                      })}
                      <td style={{ padding: "10px", textAlign: "right", color: "var(--admin-fg-3)" }}>{elapsedSince(a.last_event_at) + " ago"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
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
