"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AdaptiveAptitudeEngine from "@/components/assessment/aptitude/AdaptiveAptitudeEngine";
import { AttemptSubmitResult } from "@/components/assessment/aptitude/AdaptiveAptitudeEngine";

export default function AdaptiveAptitudePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode") as "trial" | "main" || "main";
  const [assessmentCode, setAssessmentCode] = useState("TECH_APT_001");
  const [userId, setUserId] = useState<number | undefined>(undefined);

  useEffect(() => {
    // Get user ID from local storage or context
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(parseInt(storedUserId));
    }

    // Get assessment code from URL params or use default
    const code = searchParams.get("code");
    if (code) {
      setAssessmentCode(code);
    }
  }, [searchParams]);

  const handleComplete = (result: AttemptSubmitResult) => {
    alert("🎯 ASSESSMENT COMPLETED! Redirecting to dashboard...");
    console.log("Adaptive assessment completed:", result);
    
    // Store results for later use
    localStorage.setItem("adaptiveAptitudeResults", JSON.stringify(result));
    
    console.log("🔄 Redirecting to dashboard in 2 seconds...");
    
    // Force redirect with timeout to ensure it happens
    setTimeout(() => {
      console.log("⚡ Executing redirect now...");
      window.location.href = "/dashboard";
    }, 2000);
    
    // Also try immediate redirect
    window.location.href = "/dashboard";
    
    // Final fallback
    setTimeout(() => {
      if (window.location.pathname !== "/dashboard") {
        console.log("🚨 Redirect failed, trying replace method...");
        window.location.replace("/dashboard");
      }
    }, 3000);
  };

  // Test redirect function (for debugging)
  const testRedirect = () => {
    console.log("🧪 Testing redirect to dashboard...");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen w-full">
      {/* Debug test buttons - remove in production */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <button
          onClick={testRedirect}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 block"
        >
          Test Router Redirect
        </button>
        <button
          onClick={() => {
            const mockResult = {
              totalScore: 100,
              correctCount: 5,
              wrongCount: 0,
              accuracy: 1.0,
              timeTakenSeconds: 300
            };
            handleComplete(mockResult);
          }}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 block"
        >
          Test Complete Flow
        </button>
        <button
          onClick={() => window.location.href = "/dashboard"}
          className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 block"
        >
          Direct Dashboard
        </button>
      </div>
      
      <AdaptiveAptitudeEngine
        onComplete={handleComplete}
        assessmentCode={assessmentCode}
        userId={userId}
        mode={mode}
      />
    </div>
  );
}
