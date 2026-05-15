"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Blocks,
  Code2,
  Database,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { API_BASE, listAdminQuestions, listExamPackages } from "@/lib/api";
import { Avatar } from "./ui";
import { MountPoint, type SurfaceMount } from "@/plugins";

interface NavItem {
  href: string;
  label: string;
  eyebrow?: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  countKey?: "users" | "questions" | "exam-packages";
}

const sections: { label: string; mount: SurfaceMount; items: NavItem[] }[] = [
  {
    label: "Workspace",
    mount: "sidebar.nav.workspace",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/users", label: "Users", icon: Users, countKey: "users" },
      { href: "/admin/question-banks", label: "Question Banks", icon: Database, countKey: "questions" },
      { href: "/admin/exam-packages", label: "Assessments", icon: PackageCheck, countKey: "exam-packages" },
      { href: "/admin/questions", label: "MCQ Authoring", icon: Banknote },
    ],
  },
  {
    label: "System",
    mount: "sidebar.nav.system",
    items: [
      { href: "/admin/plugins", label: "Plugins", icon: Blocks },
      { href: "/admin/plugins/languages", label: "Languages", icon: Code2 },
      { href: "/admin/proctoring", label: "Proctoring", icon: ShieldCheck },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

interface NavCounts {
  users?: number;
  questions?: number;
  "exam-packages"?: number;
}

function useNavCounts(): NavCounts {
  const [counts, setCounts] = useState<NavCounts>({});
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("originbi:admin-session") !== "true") return;
    let cancelled = false;
    Promise.allSettled([
      listAdminQuestions({ pluginSlug: "assessment.coding", includeArchived: false }),
      listExamPackages(),
    ]).then(([qs, pkgs]) => {
      if (cancelled) return;
      const next: NavCounts = {};
      if (qs.status === "fulfilled") next.questions = qs.value.questions.length;
      if (pkgs.status === "fulfilled") next["exam-packages"] = pkgs.value.examPackages.length;
      setCounts(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return counts;
}

interface HealthState {
  status: "online" | "offline" | "checking";
  label: string;
}

function useEngineHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ status: "checking", label: "Checking" });
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const ping = async () => {
      if (!API_BASE) {
        if (!cancelled) setState({ status: "offline", label: "Not configured" });
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/healthz`, { method: "GET", credentials: "omit" });
        if (cancelled) return;
        setState({ status: res.ok ? "online" : "offline", label: res.ok ? "Online" : `HTTP ${res.status}` });
      } catch {
        if (!cancelled) setState({ status: "offline", label: "Unreachable" });
      }
    };
    ping();
    const id = setInterval(ping, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);
  return state;
}

interface AdminUserView {
  name: string;
  email: string;
  role: string;
}

function useAdminUser(): AdminUserView {
  const [user, setUser] = useState<AdminUserView>({ name: "Admin", email: "", role: "Admin" });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("user");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setUser({
        name: parsed?.name || "Admin",
        email: parsed?.email || "",
        role: parsed?.role || "Admin",
      });
    } catch {
      // ignore malformed user payload
    }
  }, []);
  return user;
}

function prettyRole(role: string) {
  switch (role.toUpperCase()) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "ADMIN":
      return "Administrator";
    case "STAFF":
      return "Staff";
    case "PROCTOR":
      return "Proctor";
    default:
      return role;
  }
}

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const counts = useNavCounts();
  const health = useEngineHealth();
  const user = useAdminUser();

  const healthColor =
    health.status === "online"
      ? "var(--admin-green)"
      : health.status === "checking"
        ? "var(--admin-fg-3)"
        : "var(--admin-amber)";

  const signOut = () => {
    if (typeof window === "undefined") return;
    [
      "originbi:id-token",
      "originbi:access-token",
      "originbi:refresh-token",
      "originbi:admin-session",
      "originbi_id_token",
      "accessToken",
      "user",
    ].forEach((key) => window.localStorage.removeItem(key));
    window.sessionStorage.removeItem("idToken");
    window.sessionStorage.removeItem("accessToken");
    document.cookie = "obi.accessToken=; path=/; samesite=lax; max-age=0";
    router.replace("/admin/login");
  };

  const displayRole = useMemo(() => prettyRole(user.role), [user.role]);

  return (
    <nav className="admin-nav">
      {sections.map((section) => (
        <div key={section.label} className="admin-nav-section">
          <p className="admin-nav-label">{section.label}</p>
          <ul className="admin-nav-list">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
              const count = item.countKey ? counts[item.countKey] : undefined;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`admin-nav-item${active ? " is-active" : ""}`}
                  >
                    <span className="admin-nav-icon">
                      <Icon size={16} strokeWidth={2.2} />
                    </span>
                    <span className="admin-nav-text">{item.label}</span>
                    {item.eyebrow && (
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest border transition-colors ${
                        item.eyebrow.toLowerCase() === 'legacy' 
                          ? 'bg-amber-400/10 text-amber-500/80 border-amber-400/20' 
                          : 'bg-white/5 text-slate-400 border-white/10'
                      }`}>
                        {item.eyebrow}
                      </span>
                    )}
                    {typeof count === "number" && (
                      <span className="admin-nav-count">{count.toLocaleString()}</span>
                    )}
                  </Link>
                </li>
              );
            })}
            <MountPoint id={section.mount} />
          </ul>
        </div>
      ))}
      <div className="admin-nav-user">
        <Avatar name={user.name} email={user.email} tone="green" size={36} />
        <div className="admin-nav-user-meta">
          <span className="admin-nav-user-name" title={user.email || user.name}>
            {user.name}
          </span>
          <span className="admin-nav-user-role">
            <span
              className="admin-dot"
              style={{ background: healthColor, boxShadow: health.status === "online" ? "0 0 8px var(--admin-green-glow)" : "none" }}
              title={`Exam engine: ${health.label}`}
            />
            {displayRole}
          </span>
        </div>
        <button
          type="button"
          className="admin-icon-btn"
          aria-label="Sign out"
          onClick={signOut}
        >
          <LogOut size={15} />
        </button>
      </div>
    </nav>
  );
}
