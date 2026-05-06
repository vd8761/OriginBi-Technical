"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AssessmentPortal from "@/components/student/AssessmentPortal";

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Basic check for logged in state
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!loggedIn) {
      router.push("/");
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  if (isAuthorized === null) {
    return null; // or a loading spinner
  }

  return (
    <main className="min-h-screen">
      <React.Suspense fallback={null}>
        <AssessmentPortal initialView="dashboard" />
      </React.Suspense>
    </main>
  );
}
