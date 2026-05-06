"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Login from "@/components/student/Login";
import AssessmentPortal from "@/components/student/AssessmentPortal";
import { motion, AnimatePresence } from "framer-motion";

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
    <>
      <AnimatePresence>
        {showCompletionToast && (
          <CompletionToast 
            assessment={showCompletionToast} 
            onClose={() => setShowCompletionToast(null)} 
          />
        )}
      </AnimatePresence>
      
      {!isLoggedIn ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <React.Suspense fallback={null}>
          <AssessmentPortal />
        </React.Suspense>
      )}
    </>
  );
}

// Main export with Suspense wrapper
export default function Home() {
  return (
    <main className="min-h-screen">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <HomeContent />
      </Suspense>
    </main>
  );
}
