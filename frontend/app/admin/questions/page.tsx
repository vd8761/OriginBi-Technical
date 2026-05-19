"use client";

import AdminQuestionsManager from "@/components/admin/questions/AdminQuestionsManager";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";

function MCQAuthoringInner() {
  useRegisterAdminPage({
    eyebrow: "Workspace",
    title: "Assessments",
    breadcrumb: [
      { label: "Admin Hub", href: "/admin" },
      { label: "Assessments" },
    ],
  });
  return <AdminQuestionsManager />;
}

export default function AdminQuestionsPage() {
  return (
    <AdminGuard>
      <MCQAuthoringInner />
    </AdminGuard>
  );
}
