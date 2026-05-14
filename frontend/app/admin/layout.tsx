import { AdminPageProvider } from "@/components/admin/AdminPageContext";
import AdminShell from "@/components/admin/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminPageProvider>
      <AdminShell>{children}</AdminShell>
    </AdminPageProvider>
  );
}
