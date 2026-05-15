"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AdaptiveAptitudeEngine from "@/components/assessment/aptitude/AdaptiveAptitudeEngine";
import { AttemptSubmitResult } from "@/components/assessment/aptitude/AdaptiveAptitudeEngine";
import { EXAM_DETAILS } from "@/lib/exams";
import {
  mapSubmissionToAssessmentResult,
  saveAssessmentResultToStorage,
} from "@/lib/assessmentResultMapper";

import { Suspense } from "react";

function AdaptiveAptitudeContent() {
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
    console.log("Adaptive assessment completed:", result);
    const assessmentResult = mapSubmissionToAssessmentResult({
      assessmentId: "aptitude",
      submission: result,
      detail: EXAM_DETAILS.aptitude,
    });

    localStorage.setItem("adaptiveAptitudeResults", JSON.stringify(result));
    saveAssessmentResultToStorage(assessmentResult);

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen w-full">
      <AdaptiveAptitudeEngine
        onComplete={handleComplete}
        assessmentCode={assessmentCode}
        userId={userId}
        mode={mode}
      />
    </div>
  );
}

export default function AdaptiveAptitudePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-brand-light-secondary dark:bg-brand-dark-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest animate-pulse">Initializing Adaptive Assessment...</p>
        </div>
      </div>
    }>
      <AdaptiveAptitudeContent />
    </Suspense>
  );
}
