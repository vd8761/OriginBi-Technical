"use client";

import { use } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import McqEditor from "@/components/admin/mcq/McqEditor";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";

function EditorInner({ questionId }: { questionId: string }) {
  useRegisterAdminPage({
    eyebrow: "Question Banks",
    title: "MCQ Editor",
    subtitle: "Prompt, options, correct-answer key, and per-question settings.",
    breadcrumb: [
      { label: "Question Bank", href: "/admin/coding" },
      { label: "MCQ" },
    ],
  });
  return <McqEditor mode="edit" questionId={questionId} />;
}

export default function McqEditorPage({
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
