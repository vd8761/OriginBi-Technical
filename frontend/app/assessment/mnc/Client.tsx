"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MNCEngine, { type AttemptSubmitResult } from '@/components/assessment/mnc/MNCEngine';
import { useAssessmentTracker } from '../../../lib/assessmentTracker';
import { EXAM_DETAILS } from '../../../lib/exams';
import {
    mapSubmissionToAssessmentResult,
    saveAssessmentResultToStorage,
    unlockAssessmentForDashboard,
} from '../../../lib/assessmentResultMapper';

export default function MNCClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = (searchParams.get('mode') as 'trial' | 'main') || 'main';
    const assessmentCode = searchParams.get("assessmentCode") || "TECH_MNC_001";
    const { markAssessmentComplete } = useAssessmentTracker();

    const handleComplete = (result: AttemptSubmitResult) => {
        // Trial results are not saved or shown in the dashboard
        if (mode === 'trial') {
            router.push('/assessment?view=assessment&completed=trial');
            return;
        }
        const assessmentResult = mapSubmissionToAssessmentResult({
            assessmentId: "mnc",
            submission: result,
            detail: EXAM_DETAILS.mnc,
        });
        saveAssessmentResultToStorage(assessmentResult);
        unlockAssessmentForDashboard("mnc");

        markAssessmentComplete("mnc", {
            totalScore: assessmentResult.overallScore,
            correctCount: assessmentResult.correctCount ?? 0,
            wrongCount: assessmentResult.wrongCount ?? 0,
            timeTakenSeconds: assessmentResult.timeTakenSeconds ?? 0,
        });

        router.push('/dashboard?completed=mnc');
    };

    return (
        <div className="min-h-screen w-full">
            <MNCEngine onComplete={handleComplete} mode={mode} assessmentCode={assessmentCode} />
        </div>
    );
}
