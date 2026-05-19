"use client";

import { useParams } from "next/navigation";
import AdminGuard from "@/components/admin/AdminGuard";
import AssessmentSettingsPage from "@/components/admin/questions/AssessmentSettingsPage";
import type { AssessmentType } from "@/components/admin/questions/types";

const MODULE_SLUGS: Record<string, AssessmentType> = {
  aptitude: "aptitude",
  mnc: "mnc",
  communication: "communication",
  comm: "communication",
  role: "role",
  coding: "coding",
};

export default function ModuleSettingsPage() {
  const params = useParams<{ module: string }>();
  const slug = (params?.module ?? "").toLowerCase();
  const moduleType = MODULE_SLUGS[slug];

  if (!moduleType) {
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
      <AssessmentSettingsPage moduleOverride={moduleType} />
    </AdminGuard>
  );
}
