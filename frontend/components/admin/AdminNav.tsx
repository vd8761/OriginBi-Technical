"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
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

const sections: {
  label: string;
  items: {
    href: string;
    label: string;
    eyebrow?: string;
    icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  }[];
}[] = [
  {
    label: "Workspace",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/coding", label: "Question Banks", eyebrow: "coding", icon: Database },
      { href: "/admin/exam-packages", label: "Assessments", icon: PackageCheck },
      { href: "/admin/questions", label: "MCQ Authoring", eyebrow: "legacy", icon: Banknote },
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

export default function AdminNav() {
  const pathname = usePathname();
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
                    {item.eyebrow && <span className="admin-nav-chip">{item.eyebrow}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="admin-nav-health">
        <Activity size={15} />
        <div>
          <span>Exam engine</span>
          <strong>Online</strong>
        </div>
      </div>
    </nav>
  );
}
