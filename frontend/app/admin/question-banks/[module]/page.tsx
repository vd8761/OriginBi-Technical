"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import AdminQuestionsManager from "@/components/admin/questions/AdminQuestionsManager";
import {
  ASSESSMENT_TYPE_LABELS,
  type AssessmentType,
} from "@/components/admin/questions/types";

const MCQ_MODULES: Record<string, AssessmentType> = {
  aptitude: "aptitude",
  mnc: "mnc",
  communication: "communication",
  comm: "communication",
  role: "role",
};

function ManageModuleInner({ slug }: { slug: string }) {
  const moduleType = MCQ_MODULES[slug];
  const label = moduleType ? ASSESSMENT_TYPE_LABELS[moduleType] : slug;
  useRegisterAdminPage({
    eyebrow: "Question Banks",
    title: `${label} — Manage Questions`,
    breadcrumb: [
      { label: "Admin Hub", href: "/admin" },
      { label: "Question Banks", href: "/admin/question-banks" },
      { label },
    ],
  });
  return <AdminQuestionsManager />;
}

export default function ManageModulePage() {
  const params = useParams<{ module: string }>();
  const router = useRouter();
  const slug = (params?.module ?? "").toLowerCase();

  useEffect(() => {
    if (slug === "coding") {
      router.replace("/admin/coding");
    }
  }, [slug, router]);

  if (slug === "coding") return null;

  if (!MCQ_MODULES[slug]) {
    return (
      <AdminGuard>
        <div className="admin-page">
          <p>Unknown module: {slug}</p>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <ManageModuleInner slug={slug} />
    </AdminGuard>
  );
}
