"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminQuestionsManager from "@/components/admin/questions/AdminQuestionsManager";
import AdminGuard from "@/components/admin/AdminGuard";

function MCQAuthoringInner() {
  return <AdminQuestionsManager />;
}

export default function AdminQuestionsPage() {
  return (
    <AdminGuard>
      <MCQAuthoringInner />
    </AdminGuard>
  );
}
