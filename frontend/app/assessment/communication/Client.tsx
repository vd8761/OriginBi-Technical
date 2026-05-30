"use client";

import React from 'react';
import CommunicationEngine, { type AttemptSubmitResult } from '../../../components/assessment/communication/CommunicationEngine';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAssessmentTracker } from '../../../lib/assessmentTracker';
import { EXAM_DETAILS } from '../../../lib/exams';
import {
    mapSubmissionToAssessmentResult,
    saveAssessmentResultToStorage,
    unlockAssessmentForDashboard,
} from '../../../lib/assessmentResultMapper';

export default function CommunicationClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = (searchParams.get('mode') as 'trial' | 'main') || 'main';
    const assessmentCode = searchParams.get("assessmentCode") || "TECH_COMM_001";
    const { markAssessmentComplete } = useAssessmentTracker();

    const handleComplete = (result: AttemptSubmitResult) => {
        // Trial results are not saved or shown in the dashboard
        if (mode === 'trial') {
            router.push('/assessment?view=assessment&completed=trial');
            return;
        }
        const assessmentResult = mapSubmissionToAssessmentResult({
            assessmentId: "communication",
            submission: result,
            detail: EXAM_DETAILS.communication,
        });
        saveAssessmentResultToStorage(assessmentResult);
        unlockAssessmentForDashboard("communication");

        markAssessmentComplete("communication", {
            totalScore: assessmentResult.overallScore,
            correctCount: assessmentResult.correctCount ?? 0,
            wrongCount: assessmentResult.wrongCount ?? 0,
            timeTakenSeconds: assessmentResult.timeTakenSeconds ?? 0,
        });

        router.push('/dashboard?completed=communication');
    };

    return (
        <div className="min-h-screen w-full">
            <CommunicationEngine onComplete={handleComplete} mode={mode} assessmentCode={assessmentCode} />
        </div>
    );
}
