"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import EnvWarning from "@/components/admin/EnvWarning";
import { fetchAdminPluginConfig, PluginProvider, type EnabledPluginConfig } from "@/plugins";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminPageMeta } from "@/components/admin/AdminPageContext";
import { BreadcrumbBar } from "@/components/admin/ui";

function BreadcrumbsWrapper() {
  const { meta } = useAdminPageMeta();
  const breadcrumb = meta.breadcrumb;
  if (!breadcrumb || breadcrumb.length === 0) return null;
  return <BreadcrumbBar segments={breadcrumb} className="mb-4" />;
}

/**
 * AdminLoginCard
 *
 * Shell wrapper for all `/admin` routes.
 * - Login route (`/admin/login`): renders a centered, full-viewport container
 *   without sidebar or topbar (user is unauthenticated).
 * - All other routes: renders the standard sidebar + topbar admin shell.
 */
export default function AdminLoginCard({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { theme } = useTheme();
  const isLogin = pathname.startsWith("/admin/login");
  const [enabledPlugins, setEnabledPlugins] = useState<EnabledPluginConfig[] | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    setMounted(true);
    if (isLogin) {
      setIsAuthorized(true);
      return;
    }
    const adminSession = localStorage.getItem("originbi:admin-session");
    const idToken = localStorage.getItem("originbi:admin-id-token");
    const accessToken = localStorage.getItem("originbi:admin-access-token");
    const authorized = adminSession === "true" && (idToken || accessToken);
    setIsAuthorized(!!authorized);
    if (!authorized) {
      const next = pathname && !pathname.startsWith("/admin/login")
        ? `?next=${encodeURIComponent(pathname)}`
        : "";
      router.replace(`/admin/login${next}`);
    }
  }, [isLogin, pathname, router]);

  useEffect(() => {
    if (isLogin || !isAuthorized) return;

    let cancelled = false;
    fetchAdminPluginConfig()
      .then((plugins) => {
        if (!cancelled) setEnabledPlugins(plugins);
      })
      .catch((err) => {
        console.warn("[plugins] admin plugin config fetch failed", err);
      });

    return () => {
      cancelled = true;
    };
  }, [isLogin, isAuthorized]);

  if (isAuthorized !== true) {
    if (isLogin) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-[9999] flex bg-[#f5f7f6] dark:bg-[#0f1411] select-none pointer-events-none">
        {/* Left Sidebar Skeleton */}
        <div className="hidden md:flex flex-col w-64 h-full border-r border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#0b100d] p-6 space-y-8 animate-pulse">
          {/* Logo Brand area */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/5" />
            <div className="w-24 h-4 rounded bg-slate-200 dark:bg-white/5" />
          </div>
          
          {/* Section 1: Workspace */}
          <div className="space-y-4">
            <div className="w-16 h-3 rounded bg-slate-200 dark:bg-white/5" />
            <div className="space-y-3 pl-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-slate-200 dark:bg-white/5" />
                  <div className="w-28 h-3.5 rounded bg-slate-200 dark:bg-white/5" />
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: System */}
          <div className="space-y-4">
            <div className="w-14 h-3 rounded bg-slate-200 dark:bg-white/5" />
            <div className="space-y-3 pl-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-slate-200 dark:bg-white/5" />
                  <div className="w-24 h-3.5 rounded bg-slate-200 dark:bg-white/5" />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom user profile skeleton */}
          <div className="mt-auto pt-6 border-t border-slate-100 dark:border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/5" />
            <div className="space-y-2">
              <div className="w-20 h-3 rounded bg-slate-200 dark:bg-white/5" />
              <div className="w-14 h-2 rounded bg-slate-200 dark:bg-white/5" />
            </div>
          </div>
        </div>

        {/* Right Main Content Skeleton */}
        <div className="flex-1 h-full flex flex-col p-6 md:p-8 space-y-8 animate-pulse overflow-hidden">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/50 dark:border-white/5">
            <div className="space-y-3">
              <div className="w-20 h-3 rounded bg-slate-200 dark:bg-white/5" />
              <div className="w-48 h-6 rounded bg-slate-200 dark:bg-white/5" />
            </div>
            <div className="w-40 h-10 rounded-xl bg-slate-200 dark:bg-white/5" />
          </div>

          {/* Page Body Skeleton - mock dashboard / table */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 rounded-[20px] bg-white dark:bg-[#19211c] border border-slate-200/50 dark:border-white/5 p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="w-16 h-3 rounded bg-slate-200 dark:bg-white/5" />
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/5" />
                </div>
                <div className="w-24 h-6 rounded bg-slate-200 dark:bg-white/5" />
              </div>
            ))}
          </div>

          {/* Large mock main list/card panel */}
          <div className="flex-1 rounded-[24px] bg-white dark:bg-[#19211c] border border-slate-200/50 dark:border-white/5 p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div className="w-32 h-4 rounded bg-slate-200 dark:bg-white/5" />
              <div className="w-44 h-8 rounded bg-slate-200 dark:bg-white/5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Login route: full-viewport centered layout ── */
  if (isLogin) {
    const isDark = mounted ? theme === "dark" : false;
    const logoSrc = isDark ? "/Origin-BI-white-logo.png" : "/Origin-BI-Logo-01.png";

    return (
      <div
        className="admin-login-viewport"
        data-theme={mounted ? (isDark ? "dark" : "light") : "light"}
      >
        {/* Mobile-only logo (hidden on md+) */}
        <div className="admin-login-mobile-logo">
          <Image src={logoSrc} alt="OriginBI" width={140} height={46} priority />
        </div>

        <div className="admin-login-card-wrapper">
          {children}
        </div>
      </div>
    );
  }

  /* ── Authenticated shell: sidebar + topbar ── */
  return (
    <PluginProvider enabled={enabledPlugins}>
      <div 
        className={`admin-panel-root ${isCollapsed ? "is-sidebar-collapsed" : ""}`}
      >
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <Link href="/admin" className="admin-brand">
              <AnimatePresence mode="wait">
                <motion.img
                  key={isCollapsed ? "compact" : "full"}
                  src={isCollapsed ? "/Origin_Fav_Icon.svg" : (mounted && theme === "dark" ? "/Origin-BI-white-logo.png" : "/Origin-BI-Logo-01.png")}
                  alt="Origin BI"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  style={{ height: isCollapsed ? 32 : 24 }}
                />
              </AnimatePresence>
            </Link>
          </div>
          <AdminSidebar isCollapsed={isCollapsed} />
        </aside>
        <button 
          className="admin-sidebar-floating-toggle" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <ChevronLeft size={14} />
          </motion.div>
        </button>
        <section className="admin-main-shell">
          <AdminHeader />
          <EnvWarning />
          <main className="admin-content">
            <BreadcrumbsWrapper />
            {children}
          </main>
        </section>
      </div>
    </PluginProvider>
  );
}
