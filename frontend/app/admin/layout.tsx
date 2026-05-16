import { AdminPageProvider } from "@/components/admin/AdminPageContext";
import AdminLoginCard from "@/components/admin/AdminLoginCard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminPageProvider>
      <AdminLoginCard>{children}</AdminLoginCard>
    </AdminPageProvider>
  );
}
