"use client";

import { use } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import CodingEditor from "@/components/admin/coding/CodingEditor";

export default function CodingEditorPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { questionId } = use(params);
  return (
    <AdminGuard>
      <CodingEditor mode="edit" questionId={questionId} />
    </AdminGuard>
  );
}
