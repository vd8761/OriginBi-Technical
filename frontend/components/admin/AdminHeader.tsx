"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, X, ChevronDown, LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { useAdminPageMeta } from "./AdminPageContext";
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

import ThemeToggle from "../ui/ThemeToggle";

export default function AdminHeader() {
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
            <h1 className="text-lg sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-1">
              {title}
            </h1>
          </div>
        </div>

        <div className="admin-topbar-actions">
          <div className="hidden sm:block mr-2">
            <ThemeToggle />
          </div>
          {meta.actions}
          <MountPoint id="topbar.actions" />
          
          {/* Notifications */}
           <div className="relative">
             <button
               className="w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all relative cursor-pointer bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.08] text-brand-green hover:bg-brand-green/5 dark:hover:bg-white/[0.08]"
             >
               <Bell className="w-[15px] h-[15px] fill-current" />
               <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-brand-green text-white border-2 border-white dark:border-[#0f1411] text-[10px] font-bold rounded-full px-1 shadow-sm">
                 3
               </span>
             </button>
           </div>

          <div className="w-px h-6 bg-black/[0.05] dark:bg-white/[0.08] hidden lg:block mx-2"></div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex items-center gap-2.5 focus:outline-none cursor-pointer p-1.5 rounded-[12px] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-all"
            >
              {!adminUser ? (
                <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse"></div>
              ) : (
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(adminUser.name)}&background=1ed36a&color=000&bold=true&length=2`}
                  alt="User Avatar"
                  className="w-9 h-9 sm:w-10 h-10 rounded-full border border-black/5 dark:border-white/10"
                />
              )}
              <div className="hidden lg:block text-left mr-1">
                {!adminUser ? (
                  <div className="flex flex-col gap-1">
                    <span className="h-3 w-20 bg-white/5 rounded animate-pulse"></span>
                    <span className="h-2.5 w-12 bg-white/5 rounded animate-pulse"></span>
                  </div>
                ) : (
                  <>
                    <p className="text-[13px] font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
                      {adminUser.name}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-tight font-medium tracking-tight mt-0.5">
                      {adminUser.email}
                    </p>
                  </>
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform hidden sm:block ${isProfileOpen ? "rotate-180" : ""}`} />
            </button>

            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-4 w-64 bg-white dark:bg-[#19211C] rounded-[16px] shadow-2xl z-50 border border-black/[0.05] dark:border-white/[0.08] overflow-hidden animate-slide-down">
                  <div className="px-5 py-4 border-b border-black/[0.05] dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.02]">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate tracking-tight">{adminUser?.name}</p>
                    <p className="text-xs text-gray-500 truncate mt-1 font-medium tracking-tight">{adminUser?.email}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-3 text-sm text-red-500 dark:text-red-400 rounded-[10px] hover:bg-red-500/[0.05] dark:hover:bg-red-900/[0.08] transition-all font-medium cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
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
            <AdminSidebar />
          </aside>
        </div>
      )}
    </>
  );
}
