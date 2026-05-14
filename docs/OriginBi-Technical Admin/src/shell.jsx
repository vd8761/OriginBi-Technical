/* Admin shell — sidebar + topbar + main content slot */

const { useState } = React;

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "Dashboard" },
  { key: "users", label: "Users", icon: "Users", count: 1248 },
  { key: "banks", label: "Question Banks", icon: "Bank" },
  { key: "assessments", label: "Assessments", icon: "Layers", count: 5 },
  { key: "proctoring", label: "Proctoring", icon: "Shield" },
  { key: "settings", label: "Exam Settings", icon: "Settings" },
];

function Sidebar({ active, onNav, density }) {
  return (
    <aside style={{
      width: density === "compact" ? 232 : 260,
      borderRight: "1px solid var(--border)",
      background: "rgba(255,255,255,0.015)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      position: "sticky",
      top: 0,
      height: "100vh",
    }}>
      {/* Logo block */}
      <div style={{ padding: "22px 22px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <img src="assets/Origin-BI-white-logo.png" alt="Origin BI" style={{ height: 20 }} />
        <span style={{
          marginLeft: "auto",
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--green)",
          background: "var(--green-soft)",
          padding: "3px 8px",
          borderRadius: 6,
          border: "1px solid rgba(30,211,106,0.25)",
        }}>ADMIN</span>
      </div>

      <div style={{ height: 1, background: "var(--border)", margin: "0 20px 14px" }} />

      <nav style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{
          fontSize: 9, fontWeight: 800, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "var(--fg-4)",
          padding: "8px 10px 6px",
        }}>Workspace</div>
        {NAV_ITEMS.map(item => {
          const isActive = item.key === active;
          const IconComp = I[item.icon];
          return (
            <button
              key={item.key}
              onClick={() => onNav(item.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: isActive ? "var(--green-soft)" : "transparent",
                color: isActive ? "var(--green)" : "var(--fg-2)",
                fontSize: 13,
                fontWeight: 600,
                textAlign: "left",
                position: "relative",
                transition: "all 160ms ease",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <IconComp size={17} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.count != null && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: isActive ? "var(--green)" : "var(--fg-3)",
                  background: isActive ? "rgba(30,211,106,0.15)" : "var(--card)",
                  padding: "2px 7px",
                  borderRadius: 999,
                }}>{item.count.toLocaleString()}</span>
              )}
              {isActive && (
                <span style={{
                  position: "absolute",
                  left: -14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 3, height: 18,
                  background: "var(--green)",
                  borderRadius: "0 3px 3px 0",
                }} />
              )}
            </button>
          );
        })}

        <div style={{
          fontSize: 9, fontWeight: 800, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "var(--fg-4)",
          padding: "20px 10px 6px",
        }}>System</div>
        <button className="btn-ghost" style={{
          display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
          borderRadius: 10, fontSize: 13, fontWeight: 600, color: "var(--fg-2)", textAlign: "left",
        }}>
          <I.Activity size={17} /><span style={{ flex: 1 }}>Audit Log</span>
        </button>
        <button className="btn-ghost" style={{
          display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
          borderRadius: 10, fontSize: 13, fontWeight: 600, color: "var(--fg-2)", textAlign: "left",
        }}>
          <I.Database size={17} /><span style={{ flex: 1 }}>API Keys</span>
        </button>
        <button className="btn-ghost" style={{
          display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
          borderRadius: 10, fontSize: 13, fontWeight: 600, color: "var(--fg-2)", textAlign: "left",
        }}>
          <I.HelpCircle size={17} /><span style={{ flex: 1 }}>Help & Docs</span>
        </button>
      </nav>

      {/* User card bottom */}
      <div style={{ marginTop: "auto", padding: 14 }}>
        <div style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div className="avatar" style={{ background: "linear-gradient(135deg, #1ED36A 0%, #1A8A47 100%)" }}>PK</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fg)" }}>Priya Kumar</div>
            <div style={{ fontSize: 10.5, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Super Admin</div>
          </div>
          <button className="btn-icon" title="Sign out">
            <I.Logout size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ title, subtitle, breadcrumb, actions }) {
  return (
    <header style={{
      height: 68,
      padding: "0 28px",
      borderBottom: "1px solid var(--border)",
      background: "rgba(15,20,17,0.85)",
      backdropFilter: "blur(16px)",
      display: "flex",
      alignItems: "center",
      gap: 20,
      position: "sticky",
      top: 0,
      zIndex: 40,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {breadcrumb && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-3)", marginBottom: 2, fontWeight: 600 }}>
            {breadcrumb.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <I.ChevronRight size={11} />}
                <span style={{ color: i === breadcrumb.length - 1 ? "var(--green)" : "var(--fg-3)" }}>{b}</span>
              </React.Fragment>
            ))}
          </div>
        )}
        <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 2 }}>{subtitle}</div>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {actions}
        <div className="row gap-2" style={{
          padding: "7px 12px",
          borderRadius: 999,
          background: "var(--card)",
          border: "1px solid var(--border-strong)",
        }}>
          <I.Search size={14} color="var(--fg-3)" />
          <input
            placeholder="Search anything..."
            style={{
              border: "none", background: "transparent", outline: "none",
              fontSize: 12.5, color: "var(--fg)", width: 200,
            }}
          />
          <span style={{
            fontSize: 9.5, fontWeight: 700, color: "var(--fg-4)",
            padding: "2px 6px", border: "1px solid var(--border-strong)",
            borderRadius: 4, fontFamily: "JetBrains Mono, monospace",
          }}>⌘K</span>
        </div>
        <button className="btn-icon" style={{ position: "relative" }}>
          <I.Bell size={18} />
          <span style={{
            position: "absolute", top: 6, right: 6,
            width: 7, height: 7, borderRadius: "50%",
            background: "var(--green)", boxShadow: "0 0 6px var(--green-glow)",
          }} />
        </button>
      </div>
    </header>
  );
}

function AdminShell({ children, title, subtitle, breadcrumb, actions, active, onNav, density }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar active={active} onNav={onNav} density={density} />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Topbar title={title} subtitle={subtitle} breadcrumb={breadcrumb} actions={actions} />
        <div style={{
          flex: 1,
          padding: density === "compact" ? "20px 28px" : "28px 32px",
          position: "relative",
        }}>
          <div style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.5,
            zIndex: 0,
          }} className="assessment-grid" />
          <div style={{ position: "relative", zIndex: 1 }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { AdminShell, Sidebar, Topbar });
