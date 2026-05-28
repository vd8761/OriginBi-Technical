"use client";

import AdminGuard from "@/components/admin/AdminGuard";
import FillBlankEditor from "@/components/admin/fillblank/FillBlankEditor";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";

function NewFillBlankInner() {
  useRegisterAdminPage({
    eyebrow: "Question Banks",
    title: "New Fill-in-the-Blank",
    subtitle: "Author a new fill-in-the-blank question.",
    breadcrumb: [
      { label: "Question Bank", href: "/admin/coding" },
      { label: "New Fill-in-the-Blank" },
    ],
  });
  return <FillBlankEditor mode="new" />;
}

export default function NewFillBlankPage() {
  return (
    <AdminGuard>
      <NewFillBlankInner />
    </AdminGuard>
  );
}
