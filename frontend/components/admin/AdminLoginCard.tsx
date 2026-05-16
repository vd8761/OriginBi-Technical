"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import AdminTopbar from "@/components/admin/AdminTopbar";
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
        data-theme={isDark ? "dark" : "light"}
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
      <div className="admin-panel-root">
        <aside className="admin-sidebar">
          <Link href="/admin" className="admin-brand">
            <img src="/Origin-BI-white-logo.png" alt="Origin BI" />
            <span className="admin-brand-badge">Admin</span>
          </Link>
          <AdminNav />
        </aside>
        <section className="admin-main-shell">
          <AdminTopbar />
          <EnvWarning />
          <main className="admin-content">{children}</main>
        </section>
      </div>
    </PluginProvider>
  );
}
