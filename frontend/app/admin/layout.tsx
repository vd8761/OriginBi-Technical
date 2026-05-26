import { AdminPageProvider } from "@/components/admin/AdminPageContext";
import AdminLoginCard from "@/components/admin/AdminLoginCard";
import { ConfirmProvider } from "@/components/admin/ui";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminPageProvider>
      <ConfirmProvider>
        <AdminLoginCard>{children}</AdminLoginCard>
      </ConfirmProvider>
    </AdminPageProvider>
  );
}
