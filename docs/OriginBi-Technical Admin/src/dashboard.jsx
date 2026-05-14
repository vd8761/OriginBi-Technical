/* Dashboard page — overview stats + recent activity + assessments at a glance */

function StatCard({ label, value, delta, icon, color, sub }) {
  const IconComp = I[icon];
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{
          width: 38, height: 38,
          borderRadius: 10,
          background: `${color}22`,
          color: color,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <IconComp size={18} />
        </div>
        {delta != null && (
          <div className="row gap-1" style={{
            fontSize: 11, fontWeight: 700,
            color: delta >= 0 ? "var(--green)" : "#ff5a5f",
            background: delta >= 0 ? "var(--green-soft)" : "var(--red-soft)",
            padding: "3px 8px", borderRadius: 6,
          }}>
            {delta >= 0 ? <I.TrendUp size={11} /> : <I.TrendDown size={11} />}
            {delta >= 0 ? "+" : ""}{delta}%
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ data, max }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 48 }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1,
          height: `${(v / max) * 100}%`,
          background: i === data.length - 1 ? "var(--green)" : "rgba(30,211,106,0.35)",
          borderRadius: 2,
          minHeight: 2,
        }} />
      ))}
    </div>
  );
}

function ActivityRow({ a }) {
  const dotColor = {
    success: "var(--green)",
    warning: "var(--amber)",
    danger: "var(--red)",
    info: "var(--blue)",
    neutral: "var(--fg-4)",
  }[a.type] || "var(--fg-4)";

  return (
    <div className="row gap-3" style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0, boxShadow: `0 0 8px ${dotColor}66` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: "var(--fg)" }}>
          <span style={{ fontWeight: 700 }}>{a.user}</span>{" "}
          <span style={{ color: "var(--fg-3)" }}>{a.action}</span>{" "}
          <span style={{ color: "var(--fg-2)", fontWeight: 600 }}>{a.target}</span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--fg-4)", fontWeight: 500, whiteSpace: "nowrap" }}>{a.time}</div>
    </div>
  );
}

function DashboardPage({ onNav }) {
  return (
    <div className="col gap-6 animate-fade">
      {/* Top KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Active Candidates" value="1,248" delta={12} icon="Users" color="#1ED36A" sub="208 online now" />
        <StatCard label="Question Bank" value="2,164" delta={4} icon="Bank" color="#8b6df0" sub="across 5 modules" />
        <StatCard label="Live Sessions" value="92" delta={-3} icon="Activity" color="#06b6d4" sub="86 monitored" />
        <StatCard label="Flagged Today" value="14" delta={28} icon="AlertTriangle" color="#FFB703" sub="3 await review" />
      </div>

      {/* Modules quick view */}
      <div className="card" style={{ padding: 24 }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>Question Banks</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>Tap a module to manage its questions</div>
          </div>
          <button className="btn btn-secondary" onClick={() => onNav("banks")}>
            View all <I.ArrowRight size={14} />
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {MODULES.map(m => {
            const IconComp = I[m.icon];
            return (
              <button
                key={m.key}
                onClick={() => onNav("banks", { module: m.key })}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: 16,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 180ms ease",
                  position: "relative",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = m.color + "55"; e.currentTarget.style.background = m.color + "08"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
              >
                {m.isNew && (
                  <span style={{
                    position: "absolute", top: 10, right: 10,
                    fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
                    color: m.color, background: m.color + "22",
                    padding: "2px 6px", borderRadius: 4,
                  }}>NEW</span>
                )}
                <div style={{
                  width: 36, height: 36,
                  borderRadius: 10,
                  background: m.color + "22",
                  color: m.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 12,
                }}>
                  <IconComp size={18} />
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 14, lineHeight: 1.45, minHeight: 30 }}>{m.desc}</div>
                <div className="row gap-3" style={{ fontSize: 11, color: "var(--fg-3)" }}>
                  <span><b style={{ color: "var(--fg-2)", fontWeight: 700 }}>{m.trial + m.main}</b> Qs</span>
                  <span style={{ color: "var(--fg-4)" }}>·</span>
                  <span><b style={{ color: m.color, fontWeight: 700 }}>{m.categories.length}</b> cats</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Active assessments */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="row" style={{ justifyContent: "space-between", padding: "20px 24px 14px" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Live Assessments</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>Currently active or scheduled</div>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 12 }}>
              See all <I.ArrowRight size={13} />
            </button>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Module</th>
                <th>Status</th>
                <th>Progress</th>
                <th style={{ textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {ASSESSMENTS.map(a => {
                const mod = MODULES.find(m => m.key === a.module);
                const pct = a.candidates > 0 ? (a.completed / a.candidates) * 100 : 0;
                const statusBadge = {
                  live: { color: "var(--green)", bg: "var(--green-soft)", border: "rgba(30,211,106,0.3)", label: "Live" },
                  draft: { color: "var(--fg-3)", bg: "var(--card)", border: "var(--border-strong)", label: "Draft" },
                  scheduled: { color: "var(--amber)", bg: "var(--amber-soft)", border: "rgba(255,183,3,0.3)", label: "Scheduled" },
                }[a.status];
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>{a.questions} Qs · {a.duration} min · updated {a.lastUpdated}</div>
                    </td>
                    <td>
                      <div className="row gap-2">
                        <div style={{ width: 18, height: 18, borderRadius: 5, background: mod.color + "22", color: mod.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {React.createElement(I[mod.icon], { size: 11 })}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{mod.label.split(" ")[0]}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ color: statusBadge.color, background: statusBadge.bg, borderColor: statusBadge.border }}>
                        <span className="dot" style={{ background: statusBadge.color }} />
                        {statusBadge.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ minWidth: 120 }}>
                        <div style={{ fontSize: 11.5, color: "var(--fg-2)", marginBottom: 4, fontWeight: 600 }}>
                          {a.completed} / {a.candidates}
                        </div>
                        <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: pct + "%", height: "100%", background: mod.color, borderRadius: 2 }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn-icon"><I.MoreH size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Activity stream */}
        <div className="card" style={{ padding: 24 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Recent Activity</div>
            <button className="btn-icon"><I.RefreshCw size={14} /></button>
          </div>
          <div className="col">
            {RECENT_ACTIVITY.map((a, i) => <ActivityRow key={i} a={a} />)}
          </div>
          <button style={{
            marginTop: 14, width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            background: "transparent",
            border: "1px solid var(--border-strong)",
            color: "var(--fg-2)",
            fontSize: 12, fontWeight: 600,
          }}>View full audit log</button>
        </div>
      </div>

      {/* Submissions chart row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Submissions / day</div>
            <span className="badge badge-green">Last 7d</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 12 }}>1,842</div>
          <MiniBar data={[120, 180, 142, 210, 196, 248, 322]} max={350} />
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Avg Pass Rate</div>
            <span className="badge badge-blue">All modules</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 12 }}>68.4%</div>
          <MiniBar data={[58, 62, 65, 64, 67, 71, 68]} max={80} />
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Proctor Incidents</div>
            <span className="badge badge-amber">+12% wow</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 12 }}>47</div>
          <MiniBar data={[8, 6, 9, 12, 7, 11, 14]} max={20} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DashboardPage });
