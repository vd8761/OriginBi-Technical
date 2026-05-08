"use client";

import AdminQuestionsManager from "@/components/admin/questions/AdminQuestionsManager";
import AdminGuard from "@/components/admin/AdminGuard";

export default function AdminQuestionsPage() {
  return (
    <AdminGuard>
      <AdminQuestionsManager />
    </AdminGuard>
  );
}
