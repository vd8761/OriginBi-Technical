"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Blocks,
  CheckCircle2,
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
  listPlugins,
  updatePluginState,
  type AdminProctoringAttempt,
  type Plugin,
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
  { key: "proctoring.camera.blocked", label: "Camera", icon: ShieldAlert },
  { key: "proctoring.shortcut.blocked", label: "Shortcut", icon: Keyboard },
  { key: "connectivity_gap", label: "Offline", icon: AlertTriangle },
];

const INCIDENT_KEYS = new Set(COUNTER_DEFS.map((d) => d.key));

function sumCounts(c: Record<string, number> | undefined) {
  if (!c) return 0;
  return Object.entries(c).reduce((sum, [key, val]) => {
    if (INCIDENT_KEYS.has(key)) {
      return sum + (val || 0);
    }
    return sum;
  }, 0);
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

  // Proctoring plugins configuration state
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState(true);
  const [pluginsError, setPluginsError] = useState<string | null>(null);
  const [savingPlugin, setSavingPlugin] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPlugins({ category: "proctoring" })
      .then((data) => {
        if (cancelled) return;
        setPlugins(data.plugins);
        setPluginsError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setPluginsError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setPluginsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTogglePlugin = async (plugin: Plugin, state: Plugin["platformState"]) => {
    setSavingPlugin(plugin.id);
    try {
      await updatePluginState(plugin.id, { state, config: plugin.platformConfig ?? {} });
      setPlugins((current) =>
        current.map((item) => (item.id === plugin.id ? { ...item, platformState: state } : item)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingPlugin(null);
    }
  };

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

      <Card style={{ marginTop: 24 }}>
        <div className="admin-control-row" style={{ marginBottom: 14 }}>
          <div>
            <h3 className="admin-card-title">Proctoring Controls</h3>
            <p className="admin-card-subtitle">Enable, disable, or restrict proctoring plugins across the platform.</p>
          </div>
          <Badge tone="green" dot>
            {plugins.filter(p => p.platformState === 'enabled').length} enabled
          </Badge>
        </div>

        {pluginsError && (
          <p style={{ color: "var(--admin-red)", fontSize: 13, padding: "12px 0" }}>
            Error loading proctoring plugins: {pluginsError}
          </p>
        )}

        {pluginsLoading && !pluginsError && (
          <div className="admin-grid-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="admin-skeleton" style={{ height: 120 }} />
            ))}
          </div>
        )}

        {!pluginsLoading && !pluginsError && (
          <div className="admin-grid-2" style={{ gap: 14 }}>
            {plugins.map((plugin) => (
              <div
                key={plugin.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: "1px solid var(--admin-border)",
                  background: "var(--admin-card-bg)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 12
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 800, color: "var(--admin-fg)" }}>{plugin.name}</div>
                    <div className="admin-mono" style={{ fontSize: 11, color: "var(--admin-fg-4)", marginTop: 2 }}>
                      {plugin.slug} · v{plugin.version}
                    </div>
                  </div>
                  <Badge tone={plugin.platformState === "enabled" ? "green" : plugin.platformState === "restricted" ? "amber" : "neutral"} dot>
                    {plugin.platformState}
                  </Badge>
                </div>

                <div className="admin-row" style={{ gap: 6, marginTop: 4 }}>
                  {(["enabled", "restricted", "disabled"] as Plugin["platformState"][]).map((state) => {
                    const active = plugin.platformState === state;
                    return (
                      <button
                        key={state}
                        type="button"
                        onClick={() => handleTogglePlugin(plugin, state)}
                        disabled={savingPlugin === plugin.id || active}
                        className={`admin-btn ${active ? "admin-btn-primary" : "admin-btn-secondary"}`}
                        style={{ fontSize: 11.5, padding: "4px 8px" }}
                      >
                        {active && <CheckCircle2 size={11} style={{ marginRight: 4 }} />}
                        {state}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
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
