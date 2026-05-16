"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import EnvWarning from "@/components/admin/EnvWarning";
import { fetchAdminPluginConfig, PluginProvider, type EnabledPluginConfig } from "@/plugins";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

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
  const { theme } = useTheme();
  const isLogin = pathname.startsWith("/admin/login");
  const [enabledPlugins, setEnabledPlugins] = useState<EnabledPluginConfig[] | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLogin) return;

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
  }, [isLogin]);

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
            <button 
              className="admin-sidebar-collapse-btn" 
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <motion.div
                key={isCollapsed ? "collapsed" : "expanded"}
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </motion.div>
            </button>
          </div>
          <AdminSidebar isCollapsed={isCollapsed} />
        </aside>
        <section className="admin-main-shell">
          <AdminHeader />
          <EnvWarning />
          <main className="admin-content">{children}</main>
        </section>
      </div>
    </PluginProvider>
  );
}
