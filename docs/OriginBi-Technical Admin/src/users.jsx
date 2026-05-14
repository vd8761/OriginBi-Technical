/* Users Page — list with filters, status, role, drawer */

const { useState: useStateU, useMemo: useMemoU } = React;

function StatusBadge({ status }) {
  const map = {
    active:  { label: "Active",  color: "var(--green)", bg: "var(--green-soft)", border: "rgba(30,211,106,0.3)" },
    blocked: { label: "Blocked", color: "#ff5a5f", bg: "var(--red-soft)", border: "rgba(237,47,52,0.3)" },
    pending: { label: "Pending", color: "var(--amber)", bg: "var(--amber-soft)", border: "rgba(255,183,3,0.3)" },
  };
  const s = map[status];
  return (
    <span className="badge" style={{ color: s.color, background: s.bg, borderColor: s.border }}>
      <span className="dot" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

function RoleBadge({ role }) {
  const map = {
    Student: { color: "#06b6d4", bg: "var(--blue-soft)", border: "rgba(74,198,234,0.3)" },
    Admin:   { color: "var(--green)", bg: "var(--green-soft)", border: "rgba(30,211,106,0.3)" },
    Proctor: { color: "#FFB703", bg: "var(--amber-soft)", border: "rgba(255,183,3,0.3)" },
  };
  const s = map[role] || map.Student;
  return (
    <span className="badge" style={{ color: s.color, background: s.bg, borderColor: s.border }}>{role}</span>
  );
}

function UserDrawer({ user, onClose }) {
  if (!user) return null;
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 100,
      background: "rgba(10,15,12,0.6)",
      backdropFilter: "blur(8px)",
      display: "flex",
      justifyContent: "flex-end",
      animation: "fadeIn 200ms ease",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 480,
        background: "var(--bg)",
        borderLeft: "1px solid var(--border-strong)",
        height: "100%",
        overflowY: "auto",
        animation: "slideUp 300ms cubic-bezier(0.18,0.89,0.32,1.28)",
      }}>
        {/* Hero */}
        <div style={{
          padding: "28px 28px 24px",
          background: `linear-gradient(135deg, ${user.avatar}33 0%, transparent 60%)`,
          borderBottom: "1px solid var(--border)",
        }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 20 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "var(--green)" }}>USER DETAIL</span>
            <button className="btn-icon" onClick={onClose}><I.X size={18} /></button>
          </div>
          <div className="row gap-4" style={{ marginBottom: 16 }}>
            <div className="avatar" style={{ width: 64, height: 64, fontSize: 22, background: user.avatar }}>
              {user.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>{user.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 4 }}>{user.email}</div>
              <div className="row gap-2" style={{ marginTop: 10 }}>
                <RoleBadge role={user.role} />
                <StatusBadge status={user.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div style={{ padding: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Origin BI ID</div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>{user.obId}</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Institution</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{user.college}</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Assessments</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{user.assessments} completed</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Joined</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{user.joined}</div>
            </div>
          </div>

          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Access Control</div>
          <div className="card" style={{ padding: 16 }}>
            {[
              { label: "Can take assessments", on: user.role === "Student" },
              { label: "Can manage questions",  on: user.role === "Admin" },
              { label: "Can view candidate reports", on: user.role !== "Student" },
              { label: "Receive email notifications", on: true },
            ].map((opt, i) => (
              <div key={i} className="row" style={{ padding: "9px 0", borderBottom: i < 3 ? "1px solid var(--border)" : "none", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13 }}>{opt.label}</span>
                <span className={`switch${opt.on ? " on" : ""}`} />
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.06em", textTransform: "uppercase", margin: "24px 0 10px" }}>Recent Sessions</div>
          <div className="card" style={{ padding: 0 }}>
            {[
              { test: "Campus Hire 2026 — Aptitude", score: "82%", date: "14 May, 09:32", status: "passed" },
              { test: "TCS NQT Prep Mock", score: "67%", date: "08 May, 14:10", status: "passed" },
              { test: "SDE Coding Challenge", score: "—", date: "02 May, 11:00", status: "flagged" },
            ].map((s, i) => (
              <div key={i} className="row" style={{ padding: "12px 14px", borderBottom: i < 2 ? "1px solid var(--border)" : "none", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.test}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>{s.date}</div>
                </div>
                <div className="row gap-2">
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.status === "flagged" ? "var(--amber)" : "var(--green)" }}>{s.score}</span>
                  {s.status === "flagged" && <span className="badge badge-amber">Flagged</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="row gap-2" style={{ marginTop: 28 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }}><I.Mail size={14} /> Send Email</button>
            <button className="btn btn-secondary" style={{ flex: 1 }}><I.RefreshCw size={14} /> Reset Password</button>
            <button className="btn btn-danger" style={{ padding: "10px 14px" }}><I.Lock size={14} /> {user.status === "blocked" ? "Unblock" : "Block"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersPage() {
  const [search, setSearch] = useStateU("");
  const [roleFilter, setRoleFilter] = useStateU("all");
  const [statusFilter, setStatusFilter] = useStateU("all");
  const [selected, setSelected] = useStateU(null);
  const [bulkSelected, setBulkSelected] = useStateU(new Set());

  const filtered = useMemoU(() => USERS.filter(u => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    if (search && !`${u.name} ${u.email} ${u.obId} ${u.college}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [search, roleFilter, statusFilter]);

  const counts = {
    all: USERS.length,
    students: USERS.filter(u => u.role === "Student").length,
    admins: USERS.filter(u => u.role === "Admin").length,
    proctors: USERS.filter(u => u.role === "Proctor").length,
    blocked: USERS.filter(u => u.status === "blocked").length,
  };

  const toggleBulk = (id) => {
    const next = new Set(bulkSelected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setBulkSelected(next);
  };

  return (
    <div className="col gap-5 animate-fade">
      {/* Stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total Users", v: counts.all.toLocaleString(), icon: "Users", color: "#1ED36A" },
          { label: "Students", v: counts.students, icon: "Award", color: "#06b6d4" },
          { label: "Admins & Proctors", v: counts.admins + counts.proctors, icon: "Shield", color: "#8b6df0" },
          { label: "Blocked", v: counts.blocked, icon: "Lock", color: "#ED2F34" },
        ].map((s, i) => {
          const IconComp = I[s.icon];
          return (
            <div key={i} className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 40, height: 40,
                borderRadius: 10,
                background: s.color + "22",
                color: s.color,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <IconComp size={18} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters + actions */}
      <div className="row gap-3" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div className="row gap-2" style={{ flex: 1 }}>
          <div className="row gap-2" style={{
            background: "var(--card)",
            border: "1px solid var(--border-strong)",
            borderRadius: 10, padding: "8px 12px",
            minWidth: 260,
          }}>
            <I.Search size={14} color="var(--fg-3)" />
            <input
              placeholder="Search by name, email, OB ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13 }}
            />
          </div>
          <div className="row" style={{ background: "var(--card)", border: "1px solid var(--border-strong)", borderRadius: 10, padding: 3 }}>
            {[["all", "All"], ["Student", "Students"], ["Admin", "Admin"], ["Proctor", "Proctor"]].map(([k, label]) => (
              <button key={k} onClick={() => setRoleFilter(k)} style={{
                padding: "7px 14px",
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 700,
                color: roleFilter === k ? "var(--bg)" : "var(--fg-2)",
                background: roleFilter === k ? "var(--green)" : "transparent",
                transition: "all 150ms ease",
              }}>{label}</button>
            ))}
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border-strong)",
              borderRadius: 10, padding: "8px 12px",
              fontSize: 12.5, fontWeight: 600, color: "var(--fg-2)",
              outline: "none",
            }}
          >
            <option value="all">Any status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        <div className="row gap-2">
          {bulkSelected.size > 0 && (
            <div className="row gap-2" style={{
              padding: "7px 12px",
              borderRadius: 10,
              background: "var(--green-soft)",
              border: "1px solid rgba(30,211,106,0.3)",
              fontSize: 12, fontWeight: 700, color: "var(--green)",
            }}>
              {bulkSelected.size} selected
              <button className="btn-icon" style={{ color: "var(--green)" }}><I.Mail size={13} /></button>
              <button className="btn-icon" style={{ color: "var(--red)" }}><I.Lock size={13} /></button>
            </div>
          )}
          <button className="btn btn-secondary"><I.Download size={14} /> Export CSV</button>
          <button className="btn btn-primary"><I.UserPlus size={14} /> Invite User</button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" style={{ accentColor: "var(--green)" }} />
              </th>
              <th>User</th>
              <th>Origin BI ID</th>
              <th>Role</th>
              <th>Institution</th>
              <th>Status</th>
              <th>Assessments</th>
              <th>Last seen</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ cursor: "pointer" }} onClick={() => setSelected(u)}>
                <td onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={bulkSelected.has(u.id)}
                    onChange={() => toggleBulk(u.id)}
                    style={{ accentColor: "var(--green)" }}
                  />
                </td>
                <td>
                  <div className="row gap-3">
                    <div className="avatar" style={{ background: u.avatar }}>{u.name.split(" ").map(n => n[0]).join("")}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--fg-2)" }}>{u.obId}</span>
                </td>
                <td><RoleBadge role={u.role} /></td>
                <td><span style={{ fontSize: 12.5, color: "var(--fg-2)" }}>{u.college}</span></td>
                <td><StatusBadge status={u.status} /></td>
                <td><span style={{ fontSize: 13, fontWeight: 700 }}>{u.assessments}</span></td>
                <td><span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{u.lastSeen}</span></td>
                <td onClick={e => e.stopPropagation()}>
                  <button className="btn-icon"><I.More size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={{ padding: 60, textAlign: "center", color: "var(--fg-3)" }}>
            <I.Users size={32} className="" />
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>No users match those filters.</div>
          </div>
        )}

        <div className="row" style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
            Showing <b style={{ color: "var(--fg)" }}>{filtered.length}</b> of {USERS.length} users
          </div>
          <div className="row gap-1">
            <button className="btn-icon" disabled style={{ opacity: 0.4 }}><I.ChevronLeft size={15} /></button>
            <button style={{ padding: "5px 10px", borderRadius: 6, background: "var(--green-soft)", color: "var(--green)", fontSize: 12, fontWeight: 700 }}>1</button>
            <button style={{ padding: "5px 10px", borderRadius: 6, color: "var(--fg-3)", fontSize: 12, fontWeight: 600 }}>2</button>
            <button style={{ padding: "5px 10px", borderRadius: 6, color: "var(--fg-3)", fontSize: 12, fontWeight: 600 }}>3</button>
            <button className="btn-icon"><I.ChevronRight size={15} /></button>
          </div>
        </div>
      </div>

      <UserDrawer user={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

Object.assign(window, { UsersPage });
