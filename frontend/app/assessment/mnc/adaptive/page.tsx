"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { EXAM_DETAILS } from "@/lib/exams";
import {
  mapSubmissionToAssessmentResult,
  saveAssessmentResultToStorage,
} from "@/lib/assessmentResultMapper";

import AdaptiveEngineV2 from "@/components/assessment/aptitude/AdaptiveEngineV2";
import type { AdaptiveFinalReport } from "@/lib/adaptiveApi";

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

function AdaptiveMNCContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [assessmentId, setAssessmentId] = useState<number | null>(null);
  const [userId, setUserId]             = useState<number | null>(null);
  const [attemptToken, setAttemptToken] = useState<string | null>(null);
  const [mode, setMode]                 = useState<"trial" | "main">("main");
  const [initError, setInitError]       = useState<string | null>(null);

  // Run once on mount — never re-runs, so AdaptiveEngineV2 is never unmounted
  // by a parent state change triggered by searchParams reference churn.
  useEffect(() => {
    const aid  = searchParams.get("assessmentId");
    const tok  = searchParams.get("attemptToken");
    const m    = searchParams.get("mode");

    if (!aid || !tok) {
      setInitError("Missing assessmentId or attemptToken in URL.");
      return;
    }

    // SECURITY: Validate mode parameter to prevent manipulation
    const validModes = ['trial', 'main'] as const;
    const sanitizedMode = validModes.includes(m as any) ? (m as "trial" | "main") : 'main';

    // Resolve userId from localStorage
    let resolvedId: number | null = null;
    try {
      const profileRaw = localStorage.getItem("originbi:user-profile");
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        if (p?.id) resolvedId = Number(p.id);
      }
    } catch {}
    if (!resolvedId) {
      try {
        const stored = localStorage.getItem("userId") || localStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          const id = typeof parsed === "object" ? parsed?.id : parseInt(stored);
          if (id) resolvedId = Number(id);
        }
      } catch {
        const stored = localStorage.getItem("userId") || localStorage.getItem("user");
        if (stored) {
          const n = parseInt(stored);
          if (!isNaN(n)) resolvedId = n;
        }
      }
    }

    // Set all state in one synchronous block — React 18 batches these into one render
    setAssessmentId(parseInt(aid));
    setAttemptToken(tok);
    setMode(sanitizedMode);
    setUserId(resolvedId ?? 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty deps — intentionally runs once on mount only

  const handleComplete = (r: AdaptiveFinalReport) => {
    try {
      localStorage.setItem("adaptiveV2Report", JSON.stringify(r));
      localStorage.setItem("adaptiveMNCResults", JSON.stringify({
        totalScore:           r.obtainedMarks,
        overallScorePercent:  r.marksPercentage,
        maxScore:             r.totalMarks,
        correctCount:         r.correctAnswers,
        wrongCount:           r.wrongAnswers,
        skippedCount:         r.skippedQuestions,
        totalQuestions:       r.totalQuestions,
        timeTakenSeconds:     r.timeTakenSeconds,
        finalEvaluationScore: r.finalEvaluationScore,
        performanceLevel:     r.performanceLevel,
        reliabilityScore:     r.reliabilityScore,
        reliabilityLevel:     r.reliabilityLevel,
      }));
      const assessmentResult = mapSubmissionToAssessmentResult({
        assessmentId: "mnc",
        submission: {
          totalScore:      r.obtainedMarks,
          correctCount:    r.correctAnswers,
          wrongCount:      r.wrongAnswers,
          timeTakenSeconds: r.timeTakenSeconds,
        },
        detail: EXAM_DETAILS.mnc,
      });
      saveAssessmentResultToStorage(assessmentResult);
    } catch (err) {
      console.error("[AdaptiveMNC] handleComplete error:", err);
    }
    router.push("/dashboard?completed=mnc");
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

  return (
    // key=attemptToken ensures React never unmounts/remounts the engine
    // even if this parent component re-renders for any reason.
    <AdaptiveEngineV2
      key={attemptToken}
      assessmentId={assessmentId}
      userId={userId}
      attemptToken={attemptToken}
      mode={mode}
      onComplete={handleComplete}
    />
  );
}

export default function AdaptiveMNCPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AdaptiveMNCContent />
    </Suspense>
  );
}
