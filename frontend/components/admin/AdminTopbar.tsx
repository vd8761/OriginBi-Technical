"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AdminNav from "./AdminNav";
import { useAdminPageMeta } from "./AdminPageContext";
import { Avatar, BreadcrumbBar, type BreadcrumbSegment } from "./ui";

const routeTitles: Record<string, { title: string; section: string }> = {
  "/admin": { title: "Welcome back", section: "Dashboard" },
  "/admin/coding": { title: "Coding Question Bank", section: "Question Banks" },
  "/admin/coding/new": { title: "New Coding Problem", section: "Question Banks" },
  "/admin/coding/bulk-import": { title: "Bulk Import", section: "Question Banks" },
  "/admin/exam-packages": { title: "Exam Packages", section: "Assessments" },
  "/admin/plugins": { title: "Plugin Registry", section: "System" },
  "/admin/plugins/languages": { title: "Language Plugins", section: "System" },
  "/admin/questions": { title: "MCQ Authoring", section: "Question Banks" },
  "/admin/users": { title: "User Management", section: "Workspace" },
  "/admin/proctoring": { title: "Proctoring Live Monitor", section: "System" },
  "/admin/settings": { title: "Exam Settings", section: "System" },
};

function resolveRoute(pathname: string) {
  const exact = routeTitles[pathname];
  if (exact) return exact;
  if (pathname.startsWith("/admin/coding/")) return { title: "Coding Problem Editor", section: "Question Banks" };
  if (pathname.startsWith("/admin/exam-packages/")) return { title: "Exam Package Builder", section: "Assessments" };
  if (pathname.startsWith("/admin/plugins/")) return { title: "Plugin Details", section: "System" };
  if (pathname.startsWith("/admin/users/")) return { title: "User Detail", section: "Workspace" };
  return { title: "Admin Panel", section: "Origin BI" };
}

function defaultBreadcrumb(pathname: string, sectionFallback: string): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [{ label: "Admin Hub", href: "/admin" }];
  const part = pathname.split("/").filter(Boolean);
  if (part.length > 1) {
    const top = part[1];
    const labelMap: Record<string, string> = {
      coding: "Question Banks",
      questions: "MCQ Authoring",
      "exam-packages": "Assessments",
      plugins: "Plugins",
      proctoring: "Proctoring",
      settings: "Settings",
      users: "Users",
    };
    segments.push({ label: labelMap[top] ?? sectionFallback, href: `/admin/${top}` });
  }
  return segments;
}

export default function AdminTopbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const route = useMemo(() => resolveRoute(pathname), [pathname]);
  const { meta } = useAdminPageMeta();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const breadcrumb =
    meta.breadcrumb && meta.breadcrumb.length > 0
      ? meta.breadcrumb
      : defaultBreadcrumb(pathname, route.section);
  const eyebrow = meta.eyebrow ?? route.section;
  const title = meta.title ?? route.title;
  const subtitle = meta.subtitle;

  return (
    <>
      <header className="admin-topbar">
        <div className="admin-topbar-title">
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="admin-mobile-menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div style={{ minWidth: 0 }}>
            <BreadcrumbBar segments={breadcrumb} />
            <h1 style={{ margin: "4px 0 0", fontSize: 19, fontWeight: 800, color: "var(--admin-fg)" }}>
              {title}
            </h1>
            {subtitle ? (
              <p style={{ margin: "2px 0 0", color: "var(--admin-fg-3)", fontSize: 12.5 }}>{subtitle}</p>
            ) : (
              <p style={{ margin: "2px 0 0", color: "var(--admin-fg-3)", fontSize: 12.5 }}>{eyebrow}</p>
            )}
          </div>
        </div>

        <div className="admin-topbar-actions">
          <label className="admin-search">
            <Search size={15} />
            <input placeholder="Search users, questions, packages..." />
            <span className="admin-kbd">⌘K</span>
          </label>
          {meta.actions}
          <button type="button" className="admin-icon-btn" aria-label="Notifications">
            <Bell size={16} />
            <span className="admin-notification-dot" />
          </button>
          <Avatar name="Origin BI" tone="green" size={38} />
        </div>
      </header>

      {open && (
        <div className="admin-mobile-drawer">
          <button
            type="button"
            aria-label="Close menu"
            className="admin-mobile-backdrop"
            onClick={() => setOpen(false)}
          />
          <aside className="admin-mobile-panel">
            <Link href="/admin" className="admin-brand compact">
              <img src="/Origin-BI-white-logo.png" alt="Origin BI" />
            </Link>
            <AdminNav />
          </aside>
        </div>
      )}
    </>
  );
}
