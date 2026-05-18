"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MNCEngine, { type AttemptSubmitResult } from '@/components/assessment/mnc/MNCEngine';
import { Suspense } from 'react';
import { useAssessmentTracker } from '../../../lib/assessmentTracker';
import { EXAM_DETAILS } from '../../../lib/exams';
import {
    mapSubmissionToAssessmentResult,
    saveAssessmentResultToStorage,
    unlockAssessmentForDashboard,
} from '../../../lib/assessmentResultMapper';

function MNCAssessmentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = (searchParams.get('mode') as 'trial' | 'main') || 'main';
    const assessmentCode = searchParams.get("assessmentCode") || "MNC_DEFAULT";
    const { markAssessmentComplete } = useAssessmentTracker();

    const handleComplete = (result: AttemptSubmitResult) => {
        try {
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
        } catch (err) {
            console.error("[MNC] handleComplete error:", err);
        }

        if (mode === 'trial') {
            router.push('/assessment');
        } else {
            router.push('/dashboard?completed=mnc');
        }
    };

    return (
        <div className="min-h-screen w-full">
            <MNCEngine onComplete={handleComplete} mode={mode} assessmentCode={assessmentCode} />
        </div>
    );
}

export default function MNCAssessmentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-full flex items-center justify-center bg-brand-light-secondary dark:bg-brand-dark-primary">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
                    <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest animate-pulse">Initializing MNC Engine...</p>
                </div>
            </div>
        }>
            <MNCAssessmentContent />
        </Suspense>
    );
}
