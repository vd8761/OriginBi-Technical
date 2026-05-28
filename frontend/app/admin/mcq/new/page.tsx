"use client";

import AdminGuard from "@/components/admin/AdminGuard";
import McqEditor from "@/components/admin/mcq/McqEditor";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";

function NewMcqInner() {
  useRegisterAdminPage({
    eyebrow: "Question Banks",
    title: "New MCQ",
    subtitle: "Author a new multiple-choice question.",
    breadcrumb: [
      { label: "Question Bank", href: "/admin/coding" },
      { label: "New MCQ" },
    ],
  });
  return <McqEditor mode="new" />;
}

export default function NewMcqPage() {
  return (
    <AdminGuard>
      <NewMcqInner />
    </AdminGuard>
  );
}
