"use client";

import React from "react";
import AssessmentPortal from "@/components/student/AssessmentPortal";

export default function ResultsPage() {
  return (
    <main className="min-h-screen">
      <React.Suspense fallback={null}>
        <AssessmentPortal initialView="aptitude-results" />
      </React.Suspense>
    </main>
  );
}
