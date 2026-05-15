"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import {
  Activity,
  Banknote,
  Blocks,
  Code2,
  Database,
  LayoutDashboard,
  PackageCheck,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { listAdminQuestions, listExamPackages, API_BASE } from "@/lib/api";

interface NavItem {
  href: string;
  label: string;
  eyebrow?: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  countKey?: "users" | "questions" | "exam-packages";
}

const sections: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/users", label: "Users", icon: Users, countKey: "users" },
      { href: "/admin/coding", label: "Question Banks", eyebrow: "Coding", icon: Database, countKey: "questions" },
      { href: "/admin/exam-packages", label: "Assessments", icon: PackageCheck, countKey: "exam-packages" },
      { href: "/admin/questions", label: "MCQ Authoring", eyebrow: "Legacy", icon: Banknote },
    ],
  },
  {
    label: "System",
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

export default function AdminNav() {
  const pathname = usePathname();
  const counts = useNavCounts();
  const health = useEngineHealth();

  const healthColor =
    health.status === "online"
      ? "var(--admin-green)"
      : health.status === "checking"
        ? "var(--admin-fg-3)"
        : "var(--admin-amber)";

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
          </ul>
        </div>
      ))}
      <div className="admin-nav-health" style={{ color: healthColor }}>
        <Activity size={15} />
        <div>
          <span>Exam engine</span>
          <strong style={{ color: healthColor }}>{health.label}</strong>
        </div>
      </div>
    </nav>
  );
}
