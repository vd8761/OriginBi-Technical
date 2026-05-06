"use client";

import React from "react";
import AssessmentPortal from "@/components/student/AssessmentPortal";

export default function ProfilePage() {
  return (
    <main className="min-h-screen">
      <React.Suspense fallback={null}>
        <AssessmentPortal initialView="profile" />
      </React.Suspense>
    </main>
  );
}
