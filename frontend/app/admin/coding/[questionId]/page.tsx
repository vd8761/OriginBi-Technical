"use client";

import { use } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import CodingEditor from "@/components/admin/coding/CodingEditor";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";

function EditorInner({ questionId }: { questionId: string }) {
  useRegisterAdminPage({
    eyebrow: "Question Banks",
    title: "Coding Problem Editor",
    subtitle: "Problem statement, test cases, languages, judge limits, candidate settings.",
    breadcrumb: [
      { label: "Coding", href: "/admin/coding" },
      { label: "Editor" },
    ],
  });
  return <CodingEditor mode="edit" questionId={questionId} />;
}

export default function CodingEditorPage({
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
