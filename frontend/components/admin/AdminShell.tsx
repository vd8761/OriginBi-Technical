"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import AdminTopbar from "@/components/admin/AdminTopbar";
import EnvWarning from "@/components/admin/EnvWarning";

/**
 * Wraps admin children with the sidebar+topbar shell — EXCEPT on the login
 * route, where the user isn't authenticated yet and we don't want nav items
 * (Plugins, Settings, etc.) visible until after auth.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isLogin = pathname.startsWith("/admin/login");

  if (isLogin) {
    // .admin-panel-root gives us the dark theme tokens (--admin-green etc.),
    // but its 260px+1fr grid is wrong for a centered card. Override both
    // display and grid-template-columns inline so the login page is a
    // single full-width centered column.
    return (
      <div
        className="admin-panel-root"
        style={{
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: "1fr",
          placeItems: "center",
          padding: "32px 18px",
        }}
      >
        <div style={{ width: "min(100%, 1080px)" }}>{children}</div>
      </div>
    );
  }

  return (
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
  );
}
