"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Blocks,
  Code2,
  Database,
  LayoutDashboard,
  Layers,
  LogOut,
  PackageCheck,
  Settings,
  ShieldCheck,
  Users,
  BookOpen,
} from "lucide-react";
import { API_BASE, listAdminQuestions, listExamPackages } from "@/lib/api";
import { Avatar } from "./ui";
import { MountPoint, type SurfaceMount } from "@/plugins";
import { motion, AnimatePresence, type Variants } from "framer-motion";

interface NavItem {
  href: string;
  label: string;
  eyebrow?: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  countKey?: "users" | "questions" | "exam-packages" | "groups";
}

const sections: { label: string; mount: SurfaceMount; items: NavItem[] }[] = [
  {
    label: "Workspace",
    mount: "sidebar.nav.workspace",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/users", label: "Users", icon: Users, countKey: "users" },
      { href: "/admin/groups", label: "Groups", icon: Layers },
      { href: "/admin/questions", label: "Assessments", icon: BookOpen },
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
  groups?: number;
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
      
      // Initialize groups count from localStorage or dynamic count
      const stored = localStorage.getItem("originbi:groups");
      if (stored) {
        try {
          next.groups = JSON.parse(stored).length;
        } catch {
          next.groups = 4;
        }
      } else {
        next.groups = 4;
      }
      
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

export default function AdminSidebar({ isCollapsed }: { isCollapsed?: boolean }) {
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

  // Pick the longest matching nav href so a child route doesn't also light up its parent.
  const activeHref = useMemo(() => {
    const candidates = sections.flatMap((s) => s.items.map((i) => i.href));
    const matches = candidates.filter(
      (h) => pathname === h || (h !== "/admin" && pathname.startsWith(`${h}/`)),
    );
    return matches.sort((a, b) => b.length - a.length)[0];
  }, [pathname]);

  const containerVariants: Variants = {
    expanded: {
      transition: {
        staggerChildren: 0.03,
        delayChildren: 0.05,
      },
    },
    collapsed: {
      transition: {
        staggerChildren: 0.02,
        staggerDirection: -1,
      },
    },
  };

  const itemVariants: Variants = {
    expanded: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 } as any,
    },
    collapsed: {
      opacity: 0,
      x: -10,
      transition: { duration: 0.15 },
    },
  };

  return (
    <motion.nav 
      className="admin-nav"
      initial={isCollapsed ? "collapsed" : "expanded"}
      animate={isCollapsed ? "collapsed" : "expanded"}
      variants={containerVariants}
    >
      {sections.map((section) => (
        <div key={section.label} className="admin-nav-section">
          <ul className="admin-nav-list">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = item.href === activeHref;
              const count = item.countKey ? counts[item.countKey] : undefined;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`admin-nav-item${active ? " is-active" : ""}`}
                    style={{ position: 'relative' }}
                  >
                    <span className="admin-nav-icon relative z-10">
                      <Icon size={16} strokeWidth={2.2} />
                    </span>

                    <AnimatePresence mode="popLayout">
                      {!isCollapsed && (
                        <motion.span
                          key="label"
                          variants={itemVariants}
                          className="admin-nav-text relative z-10"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {item.eyebrow && !isCollapsed && (
                      <motion.span 
                        variants={itemVariants}
                        className={`relative z-10 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest border transition-colors ${
                          item.eyebrow.toLowerCase() === 'legacy' 
                            ? 'bg-amber-400/10 text-amber-500/80 border-amber-400/20' 
                            : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-slate-400 border-black/5 dark:border-white/10'
                        }`}
                      >
                        {item.eyebrow}
                      </motion.span>
                    )}

                    <AnimatePresence>
                      {typeof count === "number" && !isCollapsed && (
                        <motion.span
                          key="count"
                          variants={itemVariants}
                          className="admin-nav-count relative z-10"
                        >
                          {count.toLocaleString()}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </li>
              );
            })}
            <MountPoint id={section.mount} />
          </ul>
        </div>
      ))}
    </motion.nav>
  );
}
