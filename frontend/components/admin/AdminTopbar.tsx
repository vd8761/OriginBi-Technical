"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AdminNav from "./AdminNav";

const routeTitles: Record<string, { title: string; section: string }> = {
  "/admin": { title: "Dashboard", section: "Overview" },
  "/admin/coding": { title: "Question Banks", section: "Content" },
  "/admin/coding/new": { title: "New Coding Problem", section: "Content" },
  "/admin/coding/bulk-import": { title: "Bulk Import", section: "Content" },
  "/admin/exam-packages": { title: "Assessments", section: "Catalog" },
  "/admin/plugins": { title: "Plugin Registry", section: "System" },
  "/admin/plugins/languages": { title: "Language Plugins", section: "System" },
  "/admin/questions": { title: "MCQ Authoring", section: "Content" },
  "/admin/users": { title: "User Entitlements", section: "Support" },
  "/admin/proctoring": { title: "Proctoring", section: "System" },
  "/admin/settings": { title: "Settings", section: "System" },
};

function resolveRoute(pathname: string) {
  const exact = routeTitles[pathname];
  if (exact) return exact;
  if (pathname.startsWith("/admin/coding/")) {
    return { title: "Coding Problem Editor", section: "Content" };
  }
  if (pathname.startsWith("/admin/exam-packages/")) {
    return { title: "Assessment Builder", section: "Catalog" };
  }
  if (pathname.startsWith("/admin/plugins/")) {
    return { title: "Plugin Details", section: "System" };
  }
  return { title: "Admin Panel", section: "Origin BI" };
}

export default function AdminTopbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const route = useMemo(() => resolveRoute(pathname), [pathname]);

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
          <div>
            <p>{route.section}</p>
            <h1>{route.title}</h1>
          </div>
        </div>

        <div className="admin-topbar-actions">
          <label className="admin-search">
            <Search size={15} />
            <input placeholder="Search users, questions, packages..." />
          </label>
          <button type="button" className="admin-icon-btn" aria-label="Notifications">
            <Bell size={16} />
            <span className="admin-notification-dot" />
          </button>
          <div className="admin-avatar" aria-label="Admin user">
            OB
          </div>
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
