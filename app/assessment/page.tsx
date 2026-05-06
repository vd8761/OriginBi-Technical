"use client";

import React from "react";
import AssessmentPortal from "@/components/student/AssessmentPortal";

export default function AssessmentListPage() {
  return (
    <main className="min-h-screen">
      <React.Suspense fallback={null}>
        <AssessmentPortal initialView="assessment" />
      </React.Suspense>
    </main>
  );
}
