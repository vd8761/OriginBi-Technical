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

export default function AdaptiveAptitudeClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode") as "trial" | "main" || "main";
  const [assessmentCode, setAssessmentCode] = useState("TECH_APT_001");
  const [userId, setUserId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(parseInt(storedUserId));
    }

    const code = searchParams.get("assessmentCode") || searchParams.get("code");
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

    router.push("/dashboard?completed=aptitude");
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
