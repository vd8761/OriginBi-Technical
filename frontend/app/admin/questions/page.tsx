"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminQuestionsManager from "@/components/admin/questions/AdminQuestionsManager";
import AdminGuard from "@/components/admin/AdminGuard";

function MCQAuthoringInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Coding has its own dedicated route since it's backed by a different
  // schema (exam-engine `questions` with plugin_slug='assessment.coding')
  // than the MCQ banks. Anything still linking with ?module=coding gets
  // bounced over rather than rendering the wrong manager.
  useEffect(() => {
    if (searchParams.get("module") === "coding") {
      router.replace("/admin/coding");
    }
  }, [router, searchParams]);

  return <AdminQuestionsManager />;
}

export default function AdminQuestionsPage() {
  return (
    <AdminGuard>
      <MCQAuthoringInner />
    </AdminGuard>
  );
}
