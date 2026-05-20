"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { EXAM_DETAILS } from "@/lib/exams";
import {
  mapSubmissionToAssessmentResult,
  saveAssessmentResultToStorage,
} from "@/lib/assessmentResultMapper";

// ── v1 engine (legacy block-based) ───────────────────────────────────────────
import AdaptiveAptitudeEngine, {
  type AttemptSubmitResult,
} from "@/components/assessment/aptitude/AdaptiveAptitudeEngine";

// ── v2 engine (Snapshot-Based Marks Blueprint) ────────────────────────────────
import AdaptiveEngineV2 from "@/components/assessment/aptitude/AdaptiveEngineV2";
import AdaptiveReportV2 from "@/components/assessment/aptitude/AdaptiveReportV2";
import type { AdaptiveFinalReport } from "@/lib/adaptiveApi";

// ── Loading spinner ───────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-brand-light-secondary dark:bg-brand-dark-primary">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
      <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest animate-pulse">
        Initializing Adaptive Assessment...
      </p>
    </div>
  </div>
);

// ── V2 content ────────────────────────────────────────────────────────────────
function AdaptiveV2Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = (searchParams.get("mode") as "trial" | "main") || "main";

  const [assessmentId, setAssessmentId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [attemptToken, setAttemptToken] = useState<string | null>(null);
  const [report, setReport] = useState<AdaptiveFinalReport | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // Read params from URL
    const aid = searchParams.get("assessmentId");
    const tok = searchParams.get("attemptToken");

    if (aid) setAssessmentId(parseInt(aid));
    if (tok) setAttemptToken(tok);

    // Read userId from localStorage
    const stored = localStorage.getItem("userId") || localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const id = typeof parsed === "object" ? parsed?.id : parseInt(stored);
        if (id) setUserId(Number(id));
      } catch {
        const n = parseInt(stored);
        if (!isNaN(n)) setUserId(n);
      }
    }

    if (!aid || !tok) {
      setInitError("Missing assessmentId or attemptToken in URL. Use ?assessmentId=X&attemptToken=Y");
    }
  }, [searchParams]);

  const handleComplete = (r: AdaptiveFinalReport) => {
    // Save report to localStorage for dashboard
    try {
      localStorage.setItem("adaptiveV2Report", JSON.stringify(r));
      localStorage.setItem("adaptiveAptitudeResults", JSON.stringify({
        totalScore: r.obtainedMarks,
        overallScorePercent: r.marksPercentage,
        maxScore: r.totalMarks,
        correctCount: r.correctAnswers,
        wrongCount: r.wrongAnswers,
        skippedCount: r.skippedQuestions,
        totalQuestions: r.totalQuestions,
        timeTakenSeconds: r.timeTakenSeconds,
        finalEvaluationScore: r.finalEvaluationScore,
        performanceLevel: r.performanceLevel,
        reliabilityScore: r.reliabilityScore,
        reliabilityLevel: r.reliabilityLevel,
      }));

      const assessmentResult = mapSubmissionToAssessmentResult({
        assessmentId: "aptitude",
        submission: {
          totalScore: r.obtainedMarks,
          correctCount: r.correctAnswers,
          wrongCount: r.wrongAnswers,
          timeTakenSeconds: r.timeTakenSeconds,
        },
        detail: EXAM_DETAILS.aptitude,
      });
      saveAssessmentResultToStorage(assessmentResult);
    } catch (err) {
      console.error("[AdaptiveV2] handleComplete error:", err);
    }

    setReport(r);
  };

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f8f5] dark:bg-[#0f1712] px-4">
        <div className="max-w-md text-center">
          <p className="text-red-500 font-semibold mb-2">Setup Error</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{initError}</p>
          <button onClick={() => router.back()}
            className="mt-4 px-4 py-2 rounded-lg bg-brand-green text-white text-sm">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!assessmentId || !userId || !attemptToken) return <Spinner />;

  // Show report after completion
  if (report) {
    return (
      <AdaptiveReportV2
        report={report}
        onClose={() => {
          if (mode === "trial") router.push("/assessment");
          else router.push("/dashboard?completed=aptitude");
        }}
      />
    );
  }

  return (
    <AdaptiveEngineV2
      assessmentId={assessmentId}
      userId={userId}
      attemptToken={attemptToken}
      mode={mode}
      onComplete={handleComplete}
    />
  );
}

// ── V1 content (legacy) ───────────────────────────────────────────────────────
function AdaptiveV1Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = (searchParams.get("mode") as "trial" | "main") || "main";
  const [assessmentCode, setAssessmentCode] = useState("TECH_APT_001");
  const [userId, setUserId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const stored = localStorage.getItem("userId");
    if (stored) setUserId(parseInt(stored));
    const code = searchParams.get("assessmentCode") || searchParams.get("code");
    if (code) setAssessmentCode(code);
  }, [searchParams]);

  const handleComplete = (result: AttemptSubmitResult) => {
    try {
      const assessmentResult = mapSubmissionToAssessmentResult({
        assessmentId: "aptitude",
        submission: result,
        detail: EXAM_DETAILS.aptitude,
      });
      localStorage.setItem("adaptiveAptitudeResults", JSON.stringify(result));
      saveAssessmentResultToStorage(assessmentResult);
    } catch (err) {
      console.error("[AdaptiveAptitude] handleComplete error:", err);
    }
    router.push("/dashboard?completed=aptitude");
  };

  return (
    <AdaptiveAptitudeEngine
      onComplete={handleComplete}
      assessmentCode={assessmentCode}
      userId={userId}
      mode={mode}
    />
  );
}

// ── Page entry ────────────────────────────────────────────────────────────────
function AdaptivePageContent() {
  const searchParams = useSearchParams();
  // ?v2=true  → use the new Snapshot-Based Marks Blueprint engine
  // default   → use the legacy v1 block engine
  const useV2 = searchParams.get("v2") === "true";

  return useV2 ? <AdaptiveV2Content /> : <AdaptiveV1Content />;
}

export default function AdaptiveAptitudePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AdaptivePageContent />
    </Suspense>
  );
}
