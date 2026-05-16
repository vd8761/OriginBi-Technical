"use client";

import React from 'react';
import CommunicationEngine, { type AttemptSubmitResult } from '../../../components/assessment/communication/CommunicationEngine';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useAssessmentTracker } from '../../../lib/assessmentTracker';
import { EXAM_DETAILS } from '../../../lib/exams';
import {
    mapSubmissionToAssessmentResult,
    saveAssessmentResultToStorage,
    unlockAssessmentForDashboard,
} from '../../../lib/assessmentResultMapper';

function CommunicationAssessmentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = (searchParams.get('mode') as 'trial' | 'main') || 'main';
    const assessmentCode = searchParams.get("assessmentCode") || "COMMUNICATION_DEFAULT";
    const { markAssessmentComplete } = useAssessmentTracker();

    const handleComplete = (result: AttemptSubmitResult) => {
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

        if (mode === 'trial') {
            router.push('/assessment');
        } else {
            router.push('/dashboard?completed=communication');
        }
    };

    return (
        <div className="min-h-screen w-full">
            <CommunicationEngine onComplete={handleComplete} mode={mode} assessmentCode={assessmentCode} />
        </div>
    );
}

export default function CommunicationAssessmentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-full flex items-center justify-center bg-brand-light-secondary dark:bg-brand-dark-primary">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
                    <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest animate-pulse">Initializing Communication Engine...</p>
                </div>
            </div>
        }>
            <CommunicationAssessmentContent />
        </Suspense>
    );
}
