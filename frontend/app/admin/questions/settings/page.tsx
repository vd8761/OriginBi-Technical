"use client";

import AssessmentSettingsPage from "@/components/admin/questions/AssessmentSettingsPage";
import AdminGuard from "@/components/admin/AdminGuard";

export default function AdminSettingsRoute() {
  return (
    <AdminGuard>
      <AssessmentSettingsPage />
    </AdminGuard>
  );
}
