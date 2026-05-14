"use client";

import AdminQuestionsManager from "@/components/admin/questions/AdminQuestionsManager";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";

function MCQAuthoringInner() {
  useRegisterAdminPage({
    eyebrow: "Question Banks",
    title: "MCQ Authoring",
    subtitle: "Legacy MCQ editor — being migrated to the redesigned coding bank workflow.",
    breadcrumb: [
      { label: "Admin Hub", href: "/admin" },
      { label: "Question Banks", href: "/admin/coding" },
      { label: "MCQ Authoring" },
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
