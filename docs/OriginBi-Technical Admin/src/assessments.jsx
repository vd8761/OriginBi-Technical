/* Assessments management + Live proctoring monitor */

const { useState: useStateA } = React;

function AssessmentsPage() {
  const [filter, setFilter] = useStateA("all");
  const filtered = filter === "all" ? ASSESSMENTS : ASSESSMENTS.filter(a => a.status === filter);

  return (
    <div className="col gap-5 animate-fade">
      {/* Filters + add */}
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row" style={{ background: "var(--card)", border: "1px solid var(--border-strong)", borderRadius: 10, padding: 3 }}>
          {[["all", "All"], ["live", "Live"], ["scheduled", "Scheduled"], ["draft", "Drafts"]].map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              color: filter === k ? "var(--bg)" : "var(--fg-2)",
              background: filter === k ? "var(--green)" : "transparent",
            }}>{label} <span style={{
              fontSize: 9, fontWeight: 800, padding: "1px 5px",
              borderRadius: 4, background: filter === k ? "rgba(0,0,0,0.2)" : "var(--card)",
              marginLeft: 4,
            }}>{k === "all" ? ASSESSMENTS.length : ASSESSMENTS.filter(a => a.status === k).length}</span></button>
          ))}
        </div>
        <div className="row gap-2">
          <button className="btn btn-secondary"><I.Copy size={14} /> Duplicate</button>
          <button className="btn btn-primary"><I.Plus size={15} /> New Assessment</button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {filtered.map(a => {
          const mod = MODULES.find(m => m.key === a.module);
          const ModIcon = I[mod.icon];
          const pct = a.candidates > 0 ? (a.completed / a.candidates) * 100 : 0;
          const statusMap = {
            live: { color: "var(--green)", bg: "var(--green-soft)", label: "Live" },
            scheduled: { color: "var(--amber)", bg: "var(--amber-soft)", label: "Scheduled" },
            draft: { color: "var(--fg-3)", bg: "var(--card)", label: "Draft" },
          };
          const sb = statusMap[a.status];

          return (
            <div key={a.id} className="card" style={{ padding: 20 }}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
                <div className="row gap-3">
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: mod.color + "22", color: mod.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ModIcon size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>{a.name}</div>
                    <div className="row gap-2" style={{ marginTop: 4 }}>
                      <span className="badge badge-neutral" style={{ textTransform: "capitalize" }}>{a.mode}</span>
                      <span className="badge" style={{ color: sb.color, background: sb.bg, borderColor: sb.color + "44" }}>
                        <span className="dot" style={{ background: sb.color }} />{sb.label}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="btn-icon"><I.MoreH size={16} /></button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "var(--fg-4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Questions</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{a.questions}</div>
                </div>
                <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "var(--fg-4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Duration</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{a.duration}m</div>
                </div>
                <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "var(--fg-4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Candidates</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{a.candidates.toLocaleString()}</div>
                </div>
                <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "var(--fg-4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Attempts</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{a.attempts === 999 ? "∞" : a.attempts}</div>
                </div>
              </div>

              {a.candidates > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 600 }}>Completion</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: mod.color }}>{a.completed} / {a.candidates} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: pct + "%", height: "100%", background: mod.color, borderRadius: 3 }} />
                  </div>
                </div>
              )}

              <div className="row" style={{ justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Updated {a.lastUpdated}</span>
                <div className="row gap-1">
                  <button className="btn btn-ghost" style={{ fontSize: 11.5 }}>Analytics</button>
                  <button className="btn btn-secondary" style={{ fontSize: 11.5 }}><I.Edit size={12} /> Edit</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ====== Proctoring live monitor ======

const LIVE_CANDIDATES = [
  { id: "lc1", name: "Aanya Sharma", obId: "OB-20345", exam: "Aptitude Round", progress: 67, flags: 0, status: "ok", time: "32m left", avatar: "#5337BC" },
  { id: "lc2", name: "Rohan Mehta", obId: "OB-20346", exam: "TCS NQT Prep", progress: 42, flags: 1, status: "warning", time: "1h 12m left", avatar: "#246CAC" },
  { id: "lc3", name: "Karan Singh", obId: "OB-20289", exam: "SDE Round 2", progress: 88, flags: 3, status: "danger", time: "8m left", avatar: "#D84C74" },
  { id: "lc4", name: "Sneha Patel", obId: "OB-20045", exam: "Aptitude Round", progress: 22, flags: 0, status: "ok", time: "44m left", avatar: "#FFB703" },
  { id: "lc5", name: "Ankit Verma", obId: "OB-20102", exam: "SDE Round 2", progress: 56, flags: 0, status: "ok", time: "38m left", avatar: "#06b6d4" },
  { id: "lc6", name: "Tara Reddy", obId: "OB-19921", exam: "TCS NQT Prep", progress: 71, flags: 2, status: "warning", time: "26m left", avatar: "#84cc16" },
  { id: "lc7", name: "Vikram Joshi", obId: "OB-19883", exam: "Aptitude Round", progress: 14, flags: 0, status: "ok", time: "52m left", avatar: "#8b6df0" },
  { id: "lc8", name: "Hari Krishnan", obId: "OB-20011", exam: "SDE Round 2", progress: 95, flags: 1, status: "warning", time: "3m left", avatar: "#1ED36A" },
];

function ProctoringLivePage() {
  const [selected, setSelected] = useStateA(LIVE_CANDIDATES[0]);

  const statusColor = (s) => ({ ok: "var(--green)", warning: "var(--amber)", danger: "#ff5a5f" }[s]);

  return (
    <div className="col gap-5 animate-fade">
      {/* Top metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {[
          { label: "Live now", v: 92, c: "var(--green)", icon: "Activity" },
          { label: "Flagged", v: 14, c: "var(--amber)", icon: "AlertTriangle" },
          { label: "Auto-paused", v: 3, c: "#ff5a5f", icon: "Pause" },
          { label: "Completed (today)", v: 412, c: "var(--blue)", icon: "CheckCircle" },
          { label: "Avg session", v: "47m", c: "var(--fg-2)", icon: "Clock" },
        ].map((s, i) => {
          const IconComp = I[s.icon];
          return (
            <div key={i} className="card" style={{ padding: 16 }}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <IconComp size={16} color={s.c} />
                {i === 0 && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", animation: "pulse 1.6s infinite", boxShadow: "0 0 6px var(--green-glow)" }} />}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", marginTop: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Live grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 16 }}>
        <div className="card" style={{ padding: 0 }}>
          <div className="row" style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Live Candidates</div>
              <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>Tap a tile to focus the candidate</div>
            </div>
            <div className="row gap-2">
              <button className="btn btn-secondary" style={{ fontSize: 11 }}><I.Filter size={12} /> Filter</button>
              <button className="btn btn-secondary" style={{ fontSize: 11 }}><I.Maximize size={12} /> Fullscreen</button>
            </div>
          </div>
          <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {LIVE_CANDIDATES.map(c => (
              <div key={c.id} onClick={() => setSelected(c)} style={{
                background: selected.id === c.id ? "rgba(30,211,106,0.06)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${selected.id === c.id ? "var(--green)" : "var(--border)"}`,
                borderRadius: 12,
                overflow: "hidden",
                cursor: "pointer",
                transition: "all 150ms ease",
              }}>
                {/* Webcam mock */}
                <div style={{
                  aspectRatio: "4/3",
                  background: `linear-gradient(135deg, ${c.avatar}22 0%, #0a0e0c 80%)`,
                  position: "relative",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div className="avatar" style={{ width: 38, height: 38, fontSize: 13, background: c.avatar }}>
                    {c.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  {/* Status indicator */}
                  <div style={{
                    position: "absolute", top: 6, left: 6,
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "2px 6px",
                    background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
                    borderRadius: 4,
                    fontSize: 8, fontWeight: 800, letterSpacing: "0.06em",
                    color: statusColor(c.status),
                  }}>
                    <span className="dot" style={{ background: statusColor(c.status), width: 5, height: 5 }} />
                    LIVE
                  </div>
                  {c.flags > 0 && (
                    <div style={{
                      position: "absolute", top: 6, right: 6,
                      padding: "2px 6px",
                      background: statusColor(c.status),
                      borderRadius: 4,
                      fontSize: 9, fontWeight: 800, color: "#0a1410",
                    }}>{c.flags} {c.flags === 1 ? "FLAG" : "FLAGS"}</div>
                  )}
                  {/* Progress bar */}
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    height: 3, background: "rgba(0,0,0,0.4)",
                  }}>
                    <div style={{ width: c.progress + "%", height: "100%", background: statusColor(c.status) }} />
                  </div>
                </div>
                <div style={{ padding: "8px 10px" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700 }}>{c.name}</div>
                  <div className="row" style={{ justifyContent: "space-between", fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>
                    <span>{c.exam.split(" ").slice(0, 2).join(" ")}</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{c.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="card" style={{ padding: 0, overflow: "hidden", alignSelf: "flex-start", position: "sticky", top: 88 }}>
          <div style={{
            aspectRatio: "16/10",
            background: `linear-gradient(135deg, ${selected.avatar}33 0%, #0a0e0c 80%)`,
            position: "relative",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div className="avatar" style={{ width: 80, height: 80, fontSize: 28, background: selected.avatar }}>
              {selected.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div style={{
              position: "absolute", top: 12, left: 12,
              padding: "5px 10px",
              background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)",
              borderRadius: 6,
              fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
              color: statusColor(selected.status),
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span className="dot" style={{ background: statusColor(selected.status), boxShadow: `0 0 6px ${statusColor(selected.status)}` }} />
              LIVE FEED
            </div>
            <div style={{
              position: "absolute", bottom: 12, right: 12,
              padding: "4px 8px",
              background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)",
              borderRadius: 5,
              fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "var(--fg-2)",
            }}>1080p · 24fps · 720kb/s</div>
          </div>

          <div style={{ padding: 18 }}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selected.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>
                  <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{selected.obId}</span> · {selected.exam}
                </div>
              </div>
              <span className="badge" style={{
                color: statusColor(selected.status),
                background: statusColor(selected.status) + "22",
                borderColor: statusColor(selected.status) + "44",
              }}>
                <span className="dot" style={{ background: statusColor(selected.status) }} />
                {selected.status === "ok" ? "Healthy" : selected.status === "warning" ? "Watch" : "High risk"}
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-3)" }}>Question {Math.floor(selected.progress * 0.3)} / 30</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: statusColor(selected.status) }}>{selected.progress}%</span>
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 3 }}>
                <div style={{ width: selected.progress + "%", height: "100%", background: statusColor(selected.status), borderRadius: 3 }} />
              </div>
            </div>

            {selected.flags > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--amber)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Active Flags ({selected.flags})</div>
                <div className="col gap-2">
                  {["Multiple faces detected", "Looking away (8s)", "Tab switch ×2"].slice(0, selected.flags).map((f, i) => (
                    <div key={i} className="row gap-2" style={{
                      padding: "8px 10px",
                      background: "var(--amber-soft)",
                      border: "1px solid rgba(255,183,3,0.3)",
                      borderRadius: 8,
                    }}>
                      <I.AlertTriangle size={13} color="var(--amber)" />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{f}</span>
                      <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--fg-3)" }}>{(i + 1) * 4}m ago</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="row gap-2">
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: "center", fontSize: 11.5 }}>
                <I.MessageSquare size={13} /> Message
              </button>
              <button className="btn" style={{ flex: 1, justifyContent: "center", fontSize: 11.5, background: "var(--amber-soft)", color: "var(--amber)", border: "1px solid rgba(255,183,3,0.3)" }}>
                <I.AlertTriangle size={13} /> Warn
              </button>
              <button className="btn btn-danger" style={{ flex: 1, justifyContent: "center", fontSize: 11.5 }}>
                <I.Power size={13} /> Terminate
              </button>
            </div>

            <div style={{ marginTop: 16, padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--fg-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Live signals</div>
              <div className="col gap-2" style={{ fontSize: 11.5 }}>
                <div className="row" style={{ justifyContent: "space-between" }}><span style={{ color: "var(--fg-3)" }}>Network</span><span style={{ fontWeight: 700, color: "var(--green)" }}>Stable · 12ms</span></div>
                <div className="row" style={{ justifyContent: "space-between" }}><span style={{ color: "var(--fg-3)" }}>Camera</span><span style={{ fontWeight: 700, color: "var(--green)" }}>HD active</span></div>
                <div className="row" style={{ justifyContent: "space-between" }}><span style={{ color: "var(--fg-3)" }}>Microphone</span><span style={{ fontWeight: 700, color: "var(--fg-3)" }}>off</span></div>
                <div className="row" style={{ justifyContent: "space-between" }}><span style={{ color: "var(--fg-3)" }}>Fullscreen</span><span style={{ fontWeight: 700, color: "var(--green)" }}>Locked</span></div>
                <div className="row" style={{ justifyContent: "space-between" }}><span style={{ color: "var(--fg-3)" }}>Location</span><span style={{ fontWeight: 700 }}>Chennai, IN</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AssessmentsPage, ProctoringLivePage });
