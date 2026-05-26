"use client";

import React, { Suspense } from "react";
import AssessmentPortal from "@/components/student/AssessmentPortal";
import { useSession } from "@/lib/contexts/SessionContext";

function ProfilePageContent() {
  const { user } = useSession();
  const userName = user?.name || "Student";
  return <AssessmentPortal userName={userName} initialView="profile" />;
}

export default function StudentProfilePage() {
  return (
    <main className="min-h-screen">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#f5fbf7] dark:bg-[#0f1712]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Loading profile...</p>
            </div>
          </div>
        }
      >
        <ProfilePageContent />
      </Suspense>
    </main>
  );
}
