"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Login from "@/components/student/Login";
import AssessmentPortal from "@/components/student/AssessmentPortal";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  const router = useRouter();

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(loggedIn);
    if (loggedIn) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLoginSuccess = () => {
    localStorage.setItem("isLoggedIn", "true");
    setIsLoggedIn(true);
    router.push("/dashboard");
  };

  if (isLoggedIn === null) return null;

  return (
    <main className="min-h-screen">
      {!isLoggedIn ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <React.Suspense fallback={null}>
          <AssessmentPortal />
        </React.Suspense>
      )}
    </main>
  );
}
