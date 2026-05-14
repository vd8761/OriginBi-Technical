"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Download,
  Lock,
  Mail,
  MoreHorizontal,
  Search,
  ShieldCheck,
  UserPlus,
  UserSearch,
  Users as UsersIcon,
  X,
} from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import {
  Avatar,
  Badge,
  Card,
  Drawer,
  PillTabs,
  StatCard,
  StatusDot,
} from "@/components/admin/ui";

// NOTE: backend does not yet expose a bulk-user listing endpoint
// (only /v1/admin/users/:id/entitlements). The roster below is sample
// data shaped per the design while we wire up the real API.
type Role = "Student" | "Admin" | "Proctor";
type Status = "active" | "blocked" | "pending";

interface UserRow {
  id: string;
  obId: string;
  name: string;
  email: string;
  role: Role;
  institution: string;
  status: Status;
  assessments: number;
  lastSeen: string;
  joined: string;
}

const sampleUsers: UserRow[] = [
  { id: "1", obId: "OB-90431", name: "Priya Iyer", email: "priya.iyer@vit.ac.in", role: "Student", institution: "VIT Vellore", status: "active", assessments: 8, lastSeen: "2 min ago", joined: "Jan 2025" },
  { id: "2", obId: "OB-77329", name: "Karthik R.", email: "karthik@nitw.in", role: "Admin", institution: "NIT Warangal", status: "active", assessments: 124, lastSeen: "12 min ago", joined: "Sep 2024" },
  { id: "3", obId: "OB-61204", name: "Mira Shah", email: "mira.shah@bits.ac.in", role: "Proctor", institution: "BITS Pilani", status: "active", assessments: 36, lastSeen: "Just now", joined: "Nov 2024" },
  { id: "4", obId: "OB-58910", name: "Neha Patel", email: "neha.p@iitg.ac.in", role: "Student", institution: "IIT Guwahati", status: "blocked", assessments: 2, lastSeen: "2 days ago", joined: "Feb 2025" },
  { id: "5", obId: "OB-55021", name: "Rohan Desai", email: "rohan@srm.edu.in", role: "Student", institution: "SRM Chennai", status: "pending", assessments: 0, lastSeen: "Yesterday", joined: "Mar 2026" },
  { id: "6", obId: "OB-50338", name: "Anjali Verma", email: "anjali@dtu.ac.in", role: "Student", institution: "DTU Delhi", status: "active", assessments: 14, lastSeen: "8 min ago", joined: "Oct 2024" },
  { id: "7", obId: "OB-49027", name: "Sahil Khan", email: "sahil@iiitb.ac.in", role: "Student", institution: "IIIT Bangalore", status: "active", assessments: 22, lastSeen: "3h ago", joined: "Aug 2024" },
];

const roleTones: Record<Role, "blue" | "purple" | "amber"> = {
  Student: "blue",
  Admin: "purple",
  Proctor: "amber",
};

const statusTones: Record<Status, "green" | "red" | "amber"> = {
  active: "green",
  blocked: "red",
  pending: "amber",
};

function UsersInner() {
  const router = useRouter();
  useRegisterAdminPage({
    eyebrow: "Workspace",
    title: "User Management",
    subtitle: "Students, admins, and proctors across all institutions.",
    breadcrumb: [{ label: "Admin Hub", href: "/admin" }, { label: "Users" }],
  });

  const [filter, setFilter] = useState<"all" | "Student" | "Admin" | "Proctor">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [lookupError, setLookupError] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sampleUsers.filter((u) => {
      if (filter !== "all" && u.role !== filter) return false;
      if (!term) return true;
      return [u.name, u.email, u.obId, u.institution].some((field) => field.toLowerCase().includes(term));
    });
  }, [filter, search]);

  const stats = useMemo(() => {
    const total = sampleUsers.length;
    const students = sampleUsers.filter((u) => u.role === "Student").length;
    const staff = sampleUsers.filter((u) => u.role !== "Student").length;
    const blocked = sampleUsers.filter((u) => u.status === "blocked").length;
    return { total, students, staff, blocked };
  }, []);

  const submitLookup = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = lookupId.trim();
    if (!/^\d+$/.test(trimmed)) {
      setLookupError("User ID must be a positive integer.");
      return;
    }
    router.push(`/admin/users/${trimmed}/entitlements`);
  };

  return (
    <div className="admin-page">
      <section className="admin-grid-4">
        <StatCard
          label="Total Users"
          value={stats.total.toLocaleString()}
          sub="Across all institutions"
          icon={<UsersIcon size={18} />}
          iconBg="rgba(30,211,106,0.16)"
          iconColor="var(--admin-green)"
        />
        <StatCard
          label="Students"
          value={stats.students.toLocaleString()}
          sub="Candidate accounts"
          icon={<UsersIcon size={18} />}
          iconBg="rgba(74,198,234,0.16)"
          iconColor="var(--admin-blue)"
        />
        <StatCard
          label="Admins & Proctors"
          value={stats.staff.toLocaleString()}
          sub="Staff with elevated access"
          icon={<ShieldCheck size={18} />}
          iconBg="rgba(139,109,240,0.18)"
          iconColor="var(--admin-purple)"
        />
        <StatCard
          label="Blocked"
          value={stats.blocked.toLocaleString()}
          sub="Awaiting review"
          icon={<Lock size={18} />}
          iconBg="rgba(237,47,52,0.14)"
          iconColor="var(--admin-red)"
        />
      </section>

      <Card>
        <div className="admin-control-row" style={{ marginBottom: 16 }}>
          <div className="admin-row" style={{ flexWrap: "wrap", gap: 12 }}>
            <PillTabs
              value={filter}
              onChange={setFilter}
              tabs={[
                { value: "all", label: "All", count: sampleUsers.length },
                { value: "Student", label: "Students", count: stats.students },
                { value: "Admin", label: "Admins", count: sampleUsers.filter((u) => u.role === "Admin").length },
                { value: "Proctor", label: "Proctors", count: sampleUsers.filter((u) => u.role === "Proctor").length },
              ]}
            />
            <label className="admin-search" style={{ width: 280 }}>
              <Search size={14} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, OB ID..."
              />
            </label>
          </div>
          <div className="admin-row">
            <button type="button" className="admin-btn admin-btn-secondary">
              <Download size={14} /> Export CSV
            </button>
            <button type="button" className="admin-btn admin-btn-primary">
              <UserPlus size={14} /> Invite User
            </button>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th>User</th>
                <th>OB ID</th>
                <th>Role</th>
                <th>Institution</th>
                <th>Status</th>
                <th>Assessments</th>
                <th>Last seen</th>
                <th style={{ textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelected(u)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <input
                      type="checkbox"
                      style={{ accentColor: "var(--admin-green)" }}
                      onClick={(event) => event.stopPropagation()}
                    />
                  </td>
                  <td>
                    <div className="admin-row" style={{ gap: 12 }}>
                      <Avatar name={u.name} email={u.email} />
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--admin-fg)" }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: "var(--admin-fg-3)" }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="admin-mono" style={{ color: "var(--admin-fg-3)" }}>{u.obId}</td>
                  <td>
                    <Badge tone={roleTones[u.role]}>{u.role}</Badge>
                  </td>
                  <td>{u.institution}</td>
                  <td>
                    <Badge tone={statusTones[u.status]} dot>{u.status}</Badge>
                  </td>
                  <td className="admin-mono">{u.assessments}</td>
                  <td style={{ color: "var(--admin-fg-3)" }}>{u.lastSeen}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="admin-icon-btn"
                      type="button"
                      aria-label="More"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="admin-control-row" style={{ alignItems: "flex-start" }}>
          <div>
            <h3 className="admin-card-title">Entitlement Lookup</h3>
            <p className="admin-card-subtitle">
              Enter the database user ID from a ticket or admin query to view purchase, organisation grant, and free-tier entitlements.
            </p>
          </div>
          <Badge tone="green" dot>Support tool</Badge>
        </div>
        <form
          onSubmit={submitLookup}
          className="admin-row"
          style={{ marginTop: 16, gap: 10, maxWidth: 520 }}
        >
          <input
            value={lookupId}
            onChange={(event) => {
              setLookupId(event.target.value);
              if (lookupError) setLookupError("");
            }}
            placeholder="e.g. 1042"
            inputMode="numeric"
            className="admin-field admin-mono"
            style={{ flex: 1, height: 38, padding: "0 12px" }}
          />
          <button type="submit" className="admin-btn admin-btn-primary">
            <UserSearch size={14} /> Lookup <ArrowRight size={14} />
          </button>
        </form>
        {lookupError && (
          <div className="admin-error" style={{ marginTop: 12, maxWidth: 520 }}>
            {lookupError}
          </div>
        )}
      </Card>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name}
        subtitle={selected?.email}
      >
        {selected && (
          <>
            <div className="admin-row" style={{ gap: 16 }}>
              <Avatar name={selected.name} email={selected.email} size={64} />
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--admin-fg)" }}>
                  {selected.name}
                </h2>
                <p style={{ margin: "2px 0 8px", color: "var(--admin-fg-3)", fontSize: 12.5 }}>
                  {selected.email}
                </p>
                <div className="admin-row">
                  <Badge tone={roleTones[selected.role]}>{selected.role}</Badge>
                  <Badge tone={statusTones[selected.status]} dot>{selected.status}</Badge>
                </div>
              </div>
            </div>

            <div className="admin-grid-2">
              <div>
                <p className="admin-stat-label">Origin BI ID</p>
                <p className="admin-mono" style={{ color: "var(--admin-fg)", fontSize: 14, marginTop: 4 }}>
                  {selected.obId}
                </p>
              </div>
              <div>
                <p className="admin-stat-label">Institution</p>
                <p style={{ color: "var(--admin-fg)", fontSize: 14, marginTop: 4 }}>{selected.institution}</p>
              </div>
              <div>
                <p className="admin-stat-label">Assessments</p>
                <p style={{ color: "var(--admin-fg)", fontSize: 14, marginTop: 4 }}>{selected.assessments}</p>
              </div>
              <div>
                <p className="admin-stat-label">Joined</p>
                <p style={{ color: "var(--admin-fg)", fontSize: 14, marginTop: 4 }}>{selected.joined}</p>
              </div>
            </div>

            <hr className="admin-divider" />

            <div>
              <p className="admin-stat-label" style={{ marginBottom: 12 }}>Last activity</p>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="admin-row"
                  style={{ padding: "10px 0", borderBottom: i < 3 ? "1px solid var(--admin-border)" : "none" }}
                >
                  <StatusDot tone="green" />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 12.5, color: "var(--admin-fg)" }}>
                      Aptitude Round {i}
                    </strong>
                    <p className="admin-card-subtitle" style={{ fontSize: 11 }}>
                      Score 82 · 14 Mar 2026
                    </p>
                  </div>
                  <span className="admin-badge admin-badge-green">Pass</span>
                </div>
              ))}
            </div>

            <hr className="admin-divider" />

            <div className="admin-row" style={{ gap: 8 }}>
              <button type="button" className="admin-btn admin-btn-secondary">
                <Mail size={14} /> Send email
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => router.push(`/admin/users/${selected.id}/entitlements`)}
              >
                Entitlements <ArrowRight size={14} />
              </button>
              <button type="button" className="admin-btn admin-btn-ghost" style={{ marginLeft: "auto", color: "var(--admin-red)" }}>
                <X size={14} /> Block
              </button>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}

export default function UsersPage() {
  return (
    <AdminGuard>
      <UsersInner />
    </AdminGuard>
  );
}
