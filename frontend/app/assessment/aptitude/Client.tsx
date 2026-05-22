"use client";

import React, { useCallback } from "react";
import AptitudeEngine, { type AttemptSubmitResult } from "../../../components/assessment/aptitude/AptitudeEngine";
import { useSearchParams } from "next/navigation";
import { useAssessmentTracker } from "../../../lib/assessmentTracker";
import { EXAM_DETAILS } from "../../../lib/exams";
import {
    mapSubmissionToAssessmentResult,
    saveAssessmentResultToStorage,
    unlockAssessmentForDashboard,
} from "../../../lib/assessmentResultMapper";

export default function AptitudeClient() {
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

        markAssessmentComplete("aptitude", {
            totalScore: assessmentResult.overallScore,
            correctCount: assessmentResult.correctCount ?? 0,
            wrongCount: assessmentResult.wrongCount ?? 0,
            timeTakenSeconds: assessmentResult.timeTakenSeconds ?? 0,
        });

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
