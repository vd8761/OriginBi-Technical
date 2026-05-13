"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ExploreView from "@/components/student/ExploreView";
import Header from "@/components/student/Header";
import { EXAMS, EXAM_DETAILS } from "@/lib/exams";

export default function ExplorePage() {
  const router = useRouter();

  const handleNavigateToDetails = (exam: any) => {
    router.push(`/explore/${exam.id}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("originbi:access-token");
    localStorage.removeItem("originbi:id-token");
    localStorage.removeItem("originbi:user-profile");
    router.push("/");
  };

  const handleNavigate = (view: string) => {
    if (view === "explore") {
      // Already on explore
      return;
    }
    // Route directly to standard page
    router.push(`/${view}`);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-brand-dark-primary">
      <Header
        currentView="explore"
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 pt-[88px] sm:pt-[96px]">
        <ExploreView
          assessments={EXAMS as any}
          examDetails={EXAM_DETAILS as any}
          onNavigateToDetails={handleNavigateToDetails}
        />
      </main>
    </div>
  );
}
