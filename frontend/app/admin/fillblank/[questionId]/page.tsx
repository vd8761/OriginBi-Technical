"use client";

import { use } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import FillBlankEditor from "@/components/admin/fillblank/FillBlankEditor";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";

function EditorInner({ questionId }: { questionId: string }) {
  useRegisterAdminPage({
    eyebrow: "Question Banks",
    title: "Fill-in-the-Blank Editor",
    subtitle: "Prompt with {{n}} placeholders, accepted answers per blank, and matching rules.",
    breadcrumb: [
      { label: "Question Bank", href: "/admin/coding" },
      { label: "Fill-in-the-Blank" },
    ],
  });
  return <FillBlankEditor mode="edit" questionId={questionId} />;
}

export default function FillBlankEditorPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { questionId } = use(params);
  return (
    <AdminGuard>
      <EditorInner questionId={questionId} />
    </AdminGuard>
  );
}
