"use client";

import React, { Suspense, useCallback } from "react";
import AptitudeEngine, { type AttemptSubmitResult } from "../../../components/assessment/aptitude/AptitudeEngine";
import { useSearchParams } from "next/navigation";
import { useAssessmentTracker } from "../../../lib/assessmentTracker";
import { EXAM_DETAILS } from "../../../lib/exams";
import {
    mapSubmissionToAssessmentResult,
    saveAssessmentResultToStorage,
    unlockAssessmentForDashboard,
} from "../../../lib/assessmentResultMapper";

function AptitudeAssessmentContent() {
    const searchParams = useSearchParams();
    const mode = (searchParams.get('mode') as 'trial' | 'main') || 'main';
    const assessmentCode = searchParams.get("assessmentCode") || "APTITUDE_DEFAULT";
    const { markAssessmentComplete } = useAssessmentTracker();

    const handleComplete = useCallback((result: AttemptSubmitResult) => {
        const assessmentResult = mapSubmissionToAssessmentResult({
            assessmentId: "aptitude",
            submission: result,
            detail: EXAM_DETAILS.aptitude,
        });
        saveAssessmentResultToStorage(assessmentResult);
        unlockAssessmentForDashboard("aptitude");

        // Mark complete in tracker (generates notifications & suggestions)
        markAssessmentComplete("aptitude", {
            totalScore: assessmentResult.overallScore,
            correctCount: assessmentResult.correctCount ?? 0,
            wrongCount: assessmentResult.wrongCount ?? 0,
            timeTakenSeconds: assessmentResult.timeTakenSeconds ?? 0,
        });

        // Redirect to dashboard using hard redirect to ensure navigation
        console.log("Aptitude: Submission complete, redirecting...");
        if (mode === 'trial') {
            window.location.href = '/assessment';
        } else {
            window.location.href = '/dashboard?completed=aptitude';
        }
    }, [markAssessmentComplete, mode]);

    return (
        <div className="min-h-screen w-full">
            <AptitudeEngine onComplete={handleComplete} mode={mode} assessmentCode={assessmentCode} />
        </div>
    );
}

export default function AptitudeAssessmentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-full flex items-center justify-center bg-brand-light-secondary dark:bg-brand-dark-primary">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
                    <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest animate-pulse">Initializing Assessment Engine...</p>
                </div>
            </div>
        }>
            <AptitudeAssessmentContent />
        </Suspense>
    );
}
