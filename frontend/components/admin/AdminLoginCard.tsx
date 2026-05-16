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
    const isDark = theme === "dark";
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
        style={{ gridTemplateColumns: isCollapsed ? "80px minmax(0, 1fr)" : "260px minmax(0, 1fr)" }}
      >
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <Link href="/admin" className="admin-brand">
              <img 
                src={isCollapsed ? "/Origin_Fav_Icon.svg" : (theme === "dark" ? "/Origin-BI-white-logo.png" : "/Origin-BI-Logo-01.png")} 
                alt="Origin BI" 
                style={{ height: isCollapsed ? 32 : 24 }} 
              />
            </Link>
            <button 
              className="admin-sidebar-collapse-btn" 
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
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
