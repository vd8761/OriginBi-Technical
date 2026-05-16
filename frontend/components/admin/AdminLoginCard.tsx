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
 * Wraps admin children with the sidebar+topbar shell — EXCEPT on the login
 * route, where the user isn't authenticated yet and we don't want nav items
 * (Plugins, Settings, etc.) visible until after auth.
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

  if (isLogin) {
    const isDark = theme === "dark";
    
    // Background style mirroring the main OriginBI portal background
    const gridStyle = isDark 
      ? {
          backgroundColor: "#19211c",
          backgroundImage: `
            linear-gradient(to right, rgba(30, 211, 106, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(30, 211, 106, 0.04) 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, rgba(30, 211, 106, 0.03) 0%, transparent 50%)
          `,
          backgroundSize: "52px 52px, 52px 52px, 100% 100%",
        }
      : {
          backgroundColor: "#f8faf9",
          backgroundImage: `
            linear-gradient(to right, rgba(30, 211, 106, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(30, 211, 106, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: "52px 52px, 52px 52px",
        };

    return (
      <div
        className="admin-panel-root min-h-[100dvh] flex flex-col items-center justify-center p-4 md:p-8 overflow-x-hidden"
        style={{
          gridTemplateColumns: "none",
          ...gridStyle
        }}
      >
        <div className="md:hidden mb-6 flex justify-center w-full">
          <Image 
            src={isDark ? "/Origin-BI-white-logo.png" : "/Origin-BI-Logo-01.png"} 
            alt="OriginBI" 
            width={140} 
            height={46} 
            priority
          />
        </div>
        <div className="w-full flex justify-center">
          {children}
        </div>
      </div>
    );
  }

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
