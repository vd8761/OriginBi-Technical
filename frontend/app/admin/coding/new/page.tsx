"use client";

import CodingEditor from "@/components/admin/coding/CodingEditor";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";

function NewInner() {
  useRegisterAdminPage({
    eyebrow: "Question Banks",
    title: "New Coding Problem",
    subtitle: "Draft a problem, attach test cases, and configure judge limits.",
    breadcrumb: [
      { label: "Coding", href: "/admin/coding" },
      { label: "New Problem" },
    ],
  });
  return <CodingEditor mode="new" />;
}

export default function NewCodingQuestionPage() {
  return (
    <AdminGuard>
      <NewInner />
    </AdminGuard>
  );
}
