"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AdaptiveAptitudeEngine from "@/components/assessment/aptitude/AdaptiveAptitudeEngine";
import { AttemptSubmitResult } from "@/components/assessment/aptitude/AdaptiveAptitudeEngine";

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

    const correctCount = result.correctCount ?? 0;
    const wrongCount = result.wrongCount ?? 0;
    const totalQuestions = result.totalQuestions ?? (correctCount + wrongCount);
    const answeredCount = result.answeredCount ?? (correctCount + wrongCount);
    const skippedCount = Math.max(0, totalQuestions - answeredCount);
    const accuracyBase = totalQuestions > 0 ? totalQuestions : answeredCount;
    const accuracy = accuracyBase > 0 ? Math.round((correctCount / accuracyBase) * 100) : 0;
    const overallScore = Math.max(0, Math.round(result.totalScore));
    const timeTakenMinutes = Math.max(1, Math.round(result.timeTakenSeconds / 60));
    const sections = [
      { name: "Overall", score: accuracy, weight: "100%" },
    ];

    const insights: { type: "strength" | "improvement" | "time"; text: string }[] = [];
    const strongSections = sections.filter((s) => s.score >= 75);
    const weakSections = sections.filter((s) => s.score < 50);

    if (strongSections.length > 0) {
      insights.push({
        type: "strength",
        text: `Strong performance in ${strongSections.map((s) => s.name).join(", ")}. Your logical reasoning abilities are well-developed.`
      });
    }
    if (weakSections.length > 0) {
      insights.push({
        type: "improvement",
        text: `Focus on improving ${weakSections.map((s) => s.name).join(", ")} to increase your overall score.`
      });
    }
    insights.push({
      type: "time",
      text: "You completed the assessment within the time limit. Good time management!"
    });

    const assessmentResult = {
      assessmentId: "aptitude" as const,
      completedAt: new Date().toISOString(),
      overallScore,
      accuracy,
      timeTaken: `${timeTakenMinutes} min`,
      timeTakenSeconds: result.timeTakenSeconds,
      totalQuestions,
      answeredCount,
      correctCount,
      wrongCount,
      skippedCount,
      positiveScore: result.positiveScore,
      negativeScore: result.negativeScore,
      netScore: overallScore,
      sections,
      insights,
    };

    localStorage.setItem("adaptiveAptitudeResults", JSON.stringify(result));
    const existingResults = JSON.parse(localStorage.getItem("originbi:assessment-results") || "{}");
    existingResults.aptitude = assessmentResult;
    localStorage.setItem("originbi:assessment-results", JSON.stringify(existingResults));
    window.dispatchEvent(new CustomEvent("originbi:results-changed"));

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
