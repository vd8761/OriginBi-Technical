"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Search, X, ChevronDown, LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AdminNav from "./AdminNav";
import { useAdminPageMeta } from "./AdminPageContext";
import { BreadcrumbBar, type BreadcrumbSegment } from "./ui";
import { signOut } from "aws-amplify/auth";
import { clearAdminSession } from "@/lib/api";
import { Avatar, BreadcrumbBar, type BreadcrumbSegment } from "./ui";
import { MountPoint } from "@/plugins";

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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const route = useMemo(() => resolveRoute(pathname), [pathname]);
  const { meta } = useAdminPageMeta();
  const [adminUser, setAdminUser] = useState<{ name: string; email: string } | null>(null);
  const [isProfileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setAdminUser({
            name: parsed.name || parsed.fullName || "Admin User",
            email: parsed.email || "admin@originbi.com"
          });
        } catch (e) {
          setAdminUser({ name: "Admin User", email: "admin@originbi.com" });
        }
      } else {
        setAdminUser({ name: "Admin User", email: "admin@originbi.com" });
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Amplify signOut error:", err);
    }
    clearAdminSession();
    router.push("/admin/login");
  };

  useEffect(() => {
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
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
              {title}
            </h1>
            {subtitle ? (
              <p 
                className={`mt-1 text-[13px] font-medium tracking-wide ${
                  subtitle.toLowerCase().includes("legacy") 
                    ? "text-amber-400/90 flex items-center gap-1.5" 
                    : "text-slate-400"
                }`}
              >
                {subtitle.toLowerCase().includes("legacy") && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
                {subtitle}
              </p>
            ) : (
              <p className="mt-1 text-[11px] font-bold text-brand-green tracking-wide">{eyebrow}</p>
            )}
            <h1 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--admin-fg)" }}>
              {title}
            </h1>
            {subtitle ? (
              <p style={{ margin: "2px 0 0", color: "var(--admin-fg-3)", fontSize: 12.5 }}>{subtitle}</p>
            ) : eyebrow !== title ? (
              <p style={{ margin: "2px 0 0", color: "var(--admin-fg-3)", fontSize: 12.5 }}>{eyebrow}</p>
            ) : null}
          </div>
        </div>

        <div className="admin-topbar-actions">
          {!meta.hideSearch && (
            <label className="admin-search">
              <Search size={15} />
              <input placeholder="Search users, questions, packages..." />
              <span className="admin-kbd">⌘K</span>
            </label>
          )}
          {meta.actions}
          <MountPoint id="topbar.actions" />
          <button type="button" className="admin-icon-btn" aria-label="Notifications">
            <Bell size={16} />
            <span className="admin-notification-dot" />
          </button>
          
          <div className="relative ml-2">
            <button
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex items-center gap-3 focus:outline-none text-left cursor-pointer group"
            >
              {!adminUser ? (
                <div className="w-9 h-9 rounded-xl bg-white/5 animate-pulse border border-white/10"></div>
              ) : (
                <div className="relative">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(adminUser.name)}&background=1ed36a&color=000&bold=true`}
                    alt="User Avatar"
                    className="w-9 h-9 rounded-xl border border-white/10 group-hover:border-brand-green/50 transition-colors"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-brand-green border-2 border-[#0f1411] rounded-full"></div>
                </div>
              )}
              <div className="hidden xl:block">
                {!adminUser ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="h-3 w-20 bg-white/5 rounded animate-pulse"></span>
                    <span className="h-2 w-28 bg-white/5 rounded animate-pulse"></span>
                  </div>
                ) : (
                  <>
                    <p className="font-bold text-xs leading-tight text-white group-hover:text-brand-green transition-colors">
                      {adminUser.name}
                    </p>
                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      {adminUser.email}
                    </p>
                  </>
                )}
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-300 ${isProfileOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-3 w-56 bg-[#141a17] rounded-2xl shadow-2xl z-50 border border-white/10 overflow-hidden animate-notice-pop">
                  <div className="p-2">
                    <div className="px-3 py-2 mb-1 border-b border-white/5 pb-3">
                      <p className="text-[10px] font-bold text-brand-green uppercase tracking-widest mb-1">Signed in as</p>
                      <p className="text-xs font-bold text-white truncate">{adminUser?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-3 py-2.5 text-xs font-bold text-red-400 hover:bg-red-400/10 rounded-xl transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-400/10 flex items-center justify-center mr-3 group-hover:bg-red-400/20 transition-colors">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
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
