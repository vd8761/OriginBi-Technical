"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
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
  Plus,
} from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import BulkUploadRegistration from "@/components/admin/BulkUploadRegistration";
import AddRegistrationForm from "@/components/admin/AddRegistrationForm";
import {
  Avatar,
  Badge,
  Card,
  Drawer,
  PillTabs,
  StatCard,
  StatusDot,
} from "@/components/admin/ui";
import {
  listAdminUsers,
  type AdminUserRow,
  type AdminUserCounts,
  type ListAdminUsersParams,
} from "@/lib/api";

type RoleFilter = "all" | "admin" | "proctor" | "student";

const roleTones: Record<AdminUserRow["roleGroup"], "blue" | "purple" | "amber"> = {
  Student: "blue",
  Admin: "purple",
  Proctor: "amber",
};

const statusTones: Record<AdminUserRow["status"], "green" | "red" | "amber"> = {
  active: "green",
  blocked: "red",
  pending: "amber",
};

function formatObId(id: number): string {
  return `OB-${id.toString().padStart(5, "0")}`;
}

function formatRelativeFromIso(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Never";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return "Just now";
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function formatJoined(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function displayName(u: AdminUserRow): string {
  return u.fullName?.trim() || u.email.split("@")[0] || `User #${u.id}`;
}

function UsersInner() {
  const router = useRouter();
  useRegisterAdminPage({
    title: "User Management",
  });

  const [view, setView] = useState<"list" | "bulk" | "add">("list");
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [lookupError, setLookupError] = useState("");

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [counts, setCounts] = useState<AdminUserCounts>({
    total: 0,
    students: 0,
    admins: 0,
    proctors: 0,
    blocked: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const limit = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filter]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params: ListAdminUsersParams = {
      limit,
      offset: (currentPage - 1) * limit,
      tech: true,
    };
    if (debouncedSearch) params.q = debouncedSearch;
    if (filter !== "all") params.role = filter;
    listAdminUsers(params)
      .then((data) => {
        if (cancelled) return;
        setRows(data.users);
        setTotalRows(data.total);
        setCounts(data.counts);
        setLoadError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load users");
        setRows([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, filter, currentPage]);

  const tabs = useMemo(
    () => [
      { value: "all" as const, label: "All", count: counts.total },
      { value: "student" as const, label: "Students", count: counts.students },
      { value: "admin" as const, label: "Admins", count: counts.admins },
      { value: "proctor" as const, label: "Proctors", count: counts.proctors },
    ],
    [counts],
  );

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
      {view === "add" ? (
        <AddRegistrationForm
          onCancel={() => {
            setView("list");
          }}
          onRegister={() => {
            setView("list");
            setSearch(s => s + " "); setTimeout(() => setSearch(s => s.trim()), 0); // Trigger refresh
          }}
        />
      ) : view === "bulk" ? (
        <BulkUploadRegistration onCancel={() => {
          setView("list");
          setSearch(s => s + " "); setTimeout(() => setSearch(s => s.trim()), 0); // Trigger refresh
        }} />
      ) : (
      <>
      <section className="admin-grid-4">
        <StatCard
          label="Total Users"
          value={counts.total.toLocaleString()}
          sub="Across all institutions"
          icon={<UsersIcon size={18} />}
          iconBg="rgba(30,211,106,0.16)"
          iconColor="var(--admin-green)"
        />
        <StatCard
          label="Students"
          value={counts.students.toLocaleString()}
          sub="Candidate accounts"
          icon={<UsersIcon size={18} />}
          iconBg="rgba(74,198,234,0.16)"
          iconColor="var(--admin-blue)"
        />
        <StatCard
          label="Admins & Proctors"
          value={(counts.admins + counts.proctors).toLocaleString()}
          sub="Staff with elevated access"
          icon={<ShieldCheck size={18} />}
          iconBg="rgba(139,109,240,0.18)"
          iconColor="var(--admin-purple)"
        />
        <StatCard
          label="Blocked"
          value={counts.blocked.toLocaleString()}
          sub="Awaiting review"
          icon={<Lock size={18} />}
          iconBg="rgba(237,47,52,0.14)"
          iconColor="var(--admin-red)"
        />
      </section>

      <Card>
        <div className="admin-control-row" style={{ marginBottom: 16 }}>
          <div className="admin-row" style={{ flexWrap: "wrap", gap: 12 }}>
            <PillTabs value={filter} onChange={setFilter} tabs={tabs} />
            <label className="admin-search" style={{ width: 280 }}>
              <Search size={14} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email..."
                style={{ outline: "none", boxShadow: "none" }}
              />
            </label>
          </div>
          <div className="admin-row">
            <button 
              type="button" 
              onClick={() => setView('bulk')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#FFFFFF1F] border border-gray-200 dark:border-[#FFFFFF1F] rounded-lg text-sm font-medium text-brand-text-light-primary dark:text-white hover:bg-gray-50 dark:hover:bg-white/30 transition-all shadow-sm cursor-pointer"
            >
              <span>Bulk Upload</span>
              <Download size={16} />
            </button>
            <button
              type="button"
              onClick={() => setView('add')}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-green border border-transparent rounded-lg text-sm font-medium text-white hover:bg-brand-green/90 transition-all shadow-lg shadow-brand-green/20 cursor-pointer"
            >
              <span>Add New</span>
              <Plus size={16} className="text-white" />
            </button>
          </div>
        </div>

        {loadError && (
          <div className="admin-error" style={{ marginBottom: 12 }}>
            {loadError}
          </div>
        )}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
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
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--admin-fg-3)" }}>
                    Loading users…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--admin-fg-3)" }}>
                    No users match the current filters.
                  </td>
                </tr>
              ) : (
                rows.map((u) => {
                  const name = displayName(u);
                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelected(u)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <div className="admin-row" style={{ gap: 12 }}>
                          <Avatar name={name} email={u.email} />
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--admin-fg)" }}>{name}</div>
                            <div style={{ fontSize: 11, color: "var(--admin-fg-3)" }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="admin-mono" style={{ color: "var(--admin-fg-3)" }}>{formatObId(u.id)}</td>
                      <td>
                        <Badge tone={roleTones[u.roleGroup]}>{u.roleGroup}</Badge>
                      </td>
                      <td>{u.institutionName || "—"}</td>
                      <td>
                        <Badge tone={statusTones[u.status]} dot>{u.status}</Badge>
                      </td>
                      <td className="admin-mono">{u.assessments}</td>
                      <td style={{ color: "var(--admin-fg-3)" }}>{formatRelativeFromIso(u.lastSeenAt)}</td>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalRows > limit && (
          <div className="admin-pagination-row">
            <div className="admin-pagination-info">
              Showing <strong>{Math.min((currentPage - 1) * limit + 1, totalRows)}</strong> to{" "}
              <strong>{Math.min(currentPage * limit, totalRows)}</strong> of{" "}
              <strong>{totalRows.toLocaleString()}</strong> users
            </div>
            <div className="admin-pagination-actions">
              <button
                className="admin-pagination-btn"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <div className="admin-pagination-pages">
                {Array.from({ length: Math.min(5, Math.ceil(totalRows / limit)) }, (_, i) => {
                  const pageNum = i + 1; // Simple logic for now
                  return (
                    <button
                      key={pageNum}
                      className={`admin-pagination-page ${currentPage === pageNum ? "active" : ""}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                className="admin-pagination-btn"
                disabled={currentPage >= Math.ceil(totalRows / limit) || loading}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
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
        title={selected ? displayName(selected) : undefined}
        subtitle={selected?.email}
      >
        {selected && (
          <>
            <div className="admin-row" style={{ gap: 16 }}>
              <Avatar name={displayName(selected)} email={selected.email} size={64} />
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--admin-fg)" }}>
                  {displayName(selected)}
                </h2>
                <p style={{ margin: "2px 0 8px", color: "var(--admin-fg-3)", fontSize: 12.5 }}>
                  {selected.email}
                </p>
                <div className="admin-row">
                  <Badge tone={roleTones[selected.roleGroup]}>{selected.roleGroup}</Badge>
                  <Badge tone={statusTones[selected.status]} dot>{selected.status}</Badge>
                </div>
              </div>
            </div>

            <div className="admin-grid-2">
              <div>
                <p className="admin-stat-label">Origin BI ID</p>
                <p className="admin-mono" style={{ color: "var(--admin-fg)", fontSize: 14, marginTop: 4 }}>
                  {formatObId(selected.id)}
                </p>
              </div>
              <div>
                <p className="admin-stat-label">Institution</p>
                <p style={{ color: "var(--admin-fg)", fontSize: 14, marginTop: 4 }}>
                  {selected.institutionName || "—"}
                </p>
              </div>
              <div>
                <p className="admin-stat-label">Assessments</p>
                <p style={{ color: "var(--admin-fg)", fontSize: 14, marginTop: 4 }}>{selected.assessments}</p>
              </div>
              <div>
                <p className="admin-stat-label">Joined</p>
                <p style={{ color: "var(--admin-fg)", fontSize: 14, marginTop: 4 }}>{formatJoined(selected.createdAt)}</p>
              </div>
            </div>

            <hr className="admin-divider" />

            <div>
              <p className="admin-stat-label" style={{ marginBottom: 12 }}>Last activity</p>
              <div className="admin-row" style={{ padding: "10px 0" }}>
                <StatusDot tone={selected.status === "active" ? "green" : selected.status === "blocked" ? "red" : "amber"} />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 12.5, color: "var(--admin-fg)" }}>
                    Last seen
                  </strong>
                  <p className="admin-card-subtitle" style={{ fontSize: 11 }}>
                    {formatRelativeFromIso(selected.lastSeenAt)}
                  </p>
                </div>
              </div>
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
      </>
      )}
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
