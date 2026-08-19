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
  Users as UsersIcon,
  X,
  Plus,
  GraduationCap,
  School,
  Briefcase,
} from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import { COUNTRY_CODES } from "@/lib/countryCodes";
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
  toggleBlockUser,
  getAdminGroups,
  type AdminUserRow,
  type AdminUserCounts,
  type ListAdminUsersParams,
} from "@/lib/api";

type RoleFilter = "all" | "admin" | "proctor" | "student" | "college" | "school" | "employee" | "taken";

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

function getPaginationRange(currentPage: number, totalPages: number): (number | string)[] {
  const range: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      range.push(i);
    }
    return range;
  }

  if (currentPage <= 3) {
    range.push(1, 2, 3, "...", totalPages - 1, totalPages);
  } else if (currentPage >= totalPages - 2) {
    range.push(1, 2, "...", totalPages - 2, totalPages - 1, totalPages);
  } else {
    range.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
  }
  return range;
}

function UsersInner() {
  const router = useRouter();
  const [view, setView] = useState<"list" | "bulk" | "add">("list");

  useRegisterAdminPage({
    title: view === "bulk" ? "Bulk User Registration" : view === "add" ? "Register New User" : "User Management",
    breadcrumb: view === "bulk"
      ? [
          { label: "User Management", onClick: () => setView("list") },
          { label: "Bulk Upload" },
        ]
      : view === "add"
      ? [
          { label: "User Management", onClick: () => setView("list") },
          { label: "Add New" },
        ]
      : [
          { label: "User Management" },
        ],
  });
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");

  useEffect(() => {
    getAdminGroups()
      .then((data) => {
        setGroups(data || []);
      })
      .catch((err) => {
        console.error("Failed to fetch groups", err);
      });
  }, []);

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [counts, setCounts] = useState<AdminUserCounts>({
    total: 0,
    students: 0,
    college: 0,
    school: 0,
    employee: 0,
    admins: 0,
    proctors: 0,
    blocked: 0,
    taken: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const limit = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filter, selectedGroup]);

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
    if (selectedGroup) params.group = selectedGroup;
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
  }, [debouncedSearch, filter, currentPage, selectedGroup, refreshTrigger]);

  const tabs = useMemo(
    () => [
      { value: "all" as const, label: "All", count: counts.total },
      { value: "college" as const, label: "College", count: counts.college },
      { value: "school" as const, label: "School", count: counts.school },
      { value: "employee" as const, label: "Employee", count: counts.employee },
      { value: "taken" as const, label: "Assessment Taken", count: counts.taken },
    ],
    [counts],
  );



  return (
    <div className="admin-page">
      {view === "add" ? (
        <AddRegistrationForm
          onCancel={() => {
            setView("list");
          }}
          onRegister={() => {
            setView("list");
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      ) : view === "bulk" ? (
        <BulkUploadRegistration onCancel={() => {
          setView("list");
          setRefreshTrigger((prev) => prev + 1);
        }} />
      ) : (
      <>
      <section className="admin-grid-4">
        <StatCard
          label="Total Users"
          value={counts.total.toLocaleString()}
          sub="Registered accounts"
          icon={<UsersIcon size={18} />}
          iconBg="rgba(30,211,106,0.16)"
          iconColor="var(--admin-green)"
        />
        <StatCard
          label="College Students"
          value={counts.college.toLocaleString()}
          sub="Higher education"
          icon={<GraduationCap size={18} />}
          iconBg="rgba(74,198,234,0.16)"
          iconColor="var(--admin-blue)"
        />
        <StatCard
          label="School Students"
          value={counts.school.toLocaleString()}
          sub="K-12 education"
          icon={<School size={18} />}
          iconBg="rgba(139,109,240,0.18)"
          iconColor="var(--admin-purple)"
        />
        <StatCard
          label="Employees"
          value={counts.employee.toLocaleString()}
          sub="Corporate / professional"
          icon={<Briefcase size={18} />}
          iconBg="rgba(255,183,3,0.18)"
          iconColor="var(--admin-amber)"
        />
      </section>

      <Card>
        <div className="admin-control-row" style={{ marginBottom: 16 }}>
          <div className="admin-row" style={{ flexWrap: "wrap", gap: 12 }}>
            <PillTabs value={filter} onChange={setFilter} tabs={tabs} />
            <select
              className="admin-select"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              style={{
                height: 38,
                width: 180,
                padding: "0 10px",
                borderRadius: "8px",
                border: "1px solid var(--admin-border, #e2e8f0)",
                backgroundColor: "var(--admin-card-solid, #ffffff)",
                color: "var(--admin-fg, #000000)",
                fontSize: "13.5px",
                fontWeight: 500,
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="">All Groups</option>
              {groups.map((g) => (
                <option key={g.id || g.code} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
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
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#FFFFFF1F] border border-gray-200 dark:border-[#FFFFFF1F] rounded-lg text-sm font-medium text-brand-text-light-primary dark:text-white hover:bg-gray-50 dark:hover:bg-white/30 transition-all cursor-pointer"
            >
              <span>Bulk Upload</span>
              <Download size={16} />
            </button>
            <button
              type="button"
              onClick={() => setView('add')}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-green border border-transparent rounded-lg text-sm font-medium text-white hover:bg-brand-green/90 transition-all cursor-pointer"
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
                <th>Email ID</th>
                <th>Mobile Number</th>
                <th>Designation</th>
                <th>Status</th>
                <th>Assessments Taken</th>
                <th>Assessments</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--admin-fg)" }}>
                    Loading users…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--admin-fg)" }}>
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
                          <span style={{ fontWeight: 700, color: "var(--admin-fg)" }}>{name}</span>
                        </div>
                      </td>
                      <td style={{ color: "var(--admin-fg)" }}>{u.email}</td>
                      <td>
                        <div className="flex items-center gap-2 admin-mono" style={{ color: "var(--admin-fg)" }}>
                          {u.mobileNumber && u.mobileNumber !== "—" ? (
                            <>
                              <ReactCountryFlag
                                countryCode={COUNTRY_CODES.find(c => c.dial_code === (u.countryCode || "+91"))?.code || "IN"}
                                svg
                                style={{
                                  width: "1.4em",
                                  height: "1.4em",
                                  borderRadius: "2px",
                                }}
                              />
                              <span style={{ color: "var(--admin-muted-fg)" }}>{u.countryCode || "+91"}</span>
                              <span>{u.mobileNumber}</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </div>
                      </td>
                      <td>
                        <Badge tone={roleTones[u.roleGroup] || "blue"}>{u.designation || u.roleGroup || "—"}</Badge>
                      </td>
                      <td>
                        <Badge tone={statusTones[u.status]} dot>{u.status}</Badge>
                      </td>
                      <td>
                        {(() => {
                          const modules = u.assessmentsTaken ? u.assessmentsTaken.split(",") : [];
                          if (modules.length === 0) return "—";
                          return (
                            <div className="flex flex-wrap gap-1.5">
                              {modules.map((mod) => {
                                let tone: "green" | "blue" | "purple" | "amber" = "green";
                                let label = "";
                                if (mod === "aptitude") {
                                  tone = "green";
                                  label = "Aptitude";
                                } else if (mod === "grammar") {
                                  tone = "blue";
                                  label = "Grammar/Communication";
                                } else if (mod === "mnc") {
                                  tone = "purple";
                                  label = "MNC";
                                } else if (mod === "role") {
                                  tone = "amber";
                                  label = "Role";
                                } else if (mod === "coding") {
                                  tone = "blue";
                                  label = "Coding";
                                } else {
                                  return null;
                                }
                                return (
                                  <Badge key={mod} tone={tone}>
                                    {label}
                                  </Badge>
                                );
                              })}
                              {/* Straight through to what they actually scored —
                                  the roster tells you a module was taken but
                                  never how it went. */}
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  router.push(`/admin/results?q=${encodeURIComponent(u.email)}`);
                                }}
                                className="text-[11px] font-bold uppercase tracking-wider text-brand-green underline-offset-2 hover:underline cursor-pointer"
                              >
                                View results
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="admin-mono">{u.assessments}</td>
                      <td style={{ color: "var(--admin-fg)" }}>{formatRelativeFromIso(u.lastSeenAt)}</td>
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
                <ChevronLeft size={16} />
              </button>
              <div className="admin-pagination-pages">
                {getPaginationRange(currentPage, Math.ceil(totalRows / limit)).map((page, idx) => {
                  if (page === "...") {
                    return (
                      <span key={`ell-${idx}`} className="px-1 sm:px-2 text-slate-400 font-bold select-none text-xs">
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={page}
                      className={`admin-pagination-page ${currentPage === page ? "active" : ""}`}
                      onClick={() => setCurrentPage(page as number)}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <button
                className="admin-pagination-btn"
                disabled={currentPage >= Math.ceil(totalRows / limit) || loading}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
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
                <p style={{ margin: "2px 0 8px", color: "var(--admin-fg)", fontSize: 12.5 }}>
                  {selected.email}
                </p>
                <div className="admin-row">
                  <Badge tone={roleTones[selected.roleGroup]}>{selected.designation || selected.roleGroup}</Badge>
                  <Badge tone={statusTones[selected.status]} dot>{selected.status}</Badge>
                </div>
              </div>
            </div>

            <div className="admin-grid-2">
              <div>
                <p className="admin-stat-label">Mobile Number</p>
                <p className="admin-mono" style={{ color: "var(--admin-fg)", fontSize: 14, marginTop: 4 }}>
                  {selected.mobileNumber || "—"}
                </p>
              </div>
              <div>
                <p className="admin-stat-label">Designation</p>
                <p style={{ color: "var(--admin-fg)", fontSize: 14, marginTop: 4 }}>
                  {selected.designation || selected.roleGroup || "—"}
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
              <div>
                <p className="admin-stat-label">Group / Cohort</p>
                <p style={{ color: "var(--admin-fg)", fontSize: 14, marginTop: 4 }}>
                  {selected.groupName || "—"}
                </p>
              </div>
            </div>

            {/* Academic / College Student Information */}
            {(selected.designation === "College Students" || selected.departmentName || selected.currentYear) && (
              <>
                <hr className="admin-divider" />
                <div>
                  <h4 style={{ margin: "0 0 12px", fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--admin-fg)" }}>
                    College Information
                  </h4>
                  <div className="admin-grid-2">
                    <div>
                      <p className="admin-stat-label">Degree</p>
                      <p style={{ color: "var(--admin-fg)", fontSize: 14, marginTop: 4 }}>
                        {selected.degreeName || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="admin-stat-label">Department</p>
                      <p style={{ color: "var(--admin-fg)", fontSize: 14, marginTop: 4 }}>
                        {selected.departmentName || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="admin-stat-label">Current Year</p>
                      <p style={{ color: "var(--admin-fg)", fontSize: 14, marginTop: 4 }}>
                        {selected.currentYear ? `${selected.currentYear} Year` : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* School Student Information */}
            {(selected.designation === "School Students" || selected.schoolLevel || selected.studentBoard) && (
              <>
                <hr className="admin-divider" />
                <div>
                  <h4 style={{ margin: "0 0 12px", fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--admin-fg)" }}>
                    School Information
                  </h4>
                  <div className="admin-grid-2">
                    <div>
                      <p className="admin-stat-label">School Level</p>
                      <p style={{ color: "var(--admin-fg)", fontSize: 14, marginTop: 4 }}>
                        {selected.schoolLevel || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="admin-stat-label">School Stream</p>
                      <p style={{ color: "var(--admin-fg)", fontSize: 14, marginTop: 4 }}>
                        {selected.schoolStream || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="admin-stat-label">Student Board</p>
                      <p style={{ color: "var(--admin-fg)", fontSize: 14, marginTop: 4 }}>
                        {selected.studentBoard || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

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
              <a
                href={`mailto:${selected.email}`}
                className="admin-btn admin-btn-secondary flex items-center justify-center gap-1.5"
                style={{ textDecoration: 'none' }}
              >
                <Mail size={14} /> Send email
              </a>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => router.push(`/admin/users/${selected.id}/entitlements`)}
              >
                Entitlements <ArrowRight size={14} />
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                style={{ marginLeft: "auto", color: selected.status === "blocked" ? "var(--admin-green)" : "var(--admin-red)" }}
                onClick={async () => {
                  const action = selected.status === "blocked" ? "unblock" : "block";
                  if (confirm(`Are you sure you want to ${action} this user?`)) {
                    try {
                      await toggleBlockUser(selected.id, selected.status !== "blocked");
                      alert(`User successfully ${action}ed.`);
                      setRefreshTrigger(prev => prev + 1);
                      setSelected({
                        ...selected,
                        status: selected.status === "blocked" ? "active" : "blocked",
                      });
                    } catch (err) {
                      console.error(err);
                      alert(`Failed to ${action} user.`);
                    }
                  }
                }}
              >
                {selected.status === "blocked" ? (
                  <>
                    <ShieldCheck size={14} /> Unblock
                  </>
                ) : (
                  <>
                    <X size={14} /> Block
                  </>
                )}
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
