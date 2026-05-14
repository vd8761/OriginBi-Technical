import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import AdminTopbar from "@/components/admin/AdminTopbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-panel-root">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand">
          <img src="/Origin-BI-white-logo.png" alt="Origin BI" />
        </Link>
        <AdminNav />
      </aside>

      <section className="admin-main-shell">
        <AdminTopbar />
        <main className="admin-content">{children}</main>
      </section>
    </div>
  );
}
