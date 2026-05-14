"use client";

// New-question flow: just re-uses the editor in "new" mode by mounting an
// empty initial state and POSTing on save.

import CodingEditor from "@/components/admin/coding/CodingEditor";
import AdminGuard from "@/components/admin/AdminGuard";

export default function NewCodingQuestionPage() {
  return (
    <AdminGuard>
      <CodingEditor mode="new" />
    </AdminGuard>
  );
}
