"use client";

import React from 'react';
import RoleEngine, { type AttemptSubmitResult } from '../../../components/assessment/role/RoleEngine';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAssessmentTracker } from '../../../lib/assessmentTracker';
import { EXAM_DETAILS } from '../../../lib/exams';
import {
    mapSubmissionToAssessmentResult,
    saveAssessmentResultToStorage,
    unlockAssessmentForDashboard,
} from '../../../lib/assessmentResultMapper';

export default function RoleClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = (searchParams.get('mode') as 'trial' | 'main') || 'main';
    const assessmentCode = searchParams.get("assessmentCode") || "ROLE_DEFAULT";
    const { markAssessmentComplete } = useAssessmentTracker();

    const handleComplete = (result: AttemptSubmitResult) => {
        const assessmentResult = mapSubmissionToAssessmentResult({
            assessmentId: "role",
            submission: result,
            detail: EXAM_DETAILS.role,
        });
        saveAssessmentResultToStorage(assessmentResult);
        unlockAssessmentForDashboard("role");

        markAssessmentComplete("role", {
            totalScore: assessmentResult.overallScore,
            correctCount: assessmentResult.correctCount ?? 0,
            wrongCount: assessmentResult.wrongCount ?? 0,
            timeTakenSeconds: assessmentResult.timeTakenSeconds ?? 0,
        });

        if (mode === 'trial') {
            router.push('/assessment');
        } else {
            router.push('/dashboard?completed=role');
        }
    };

    return (
        <div className="min-h-screen w-full">
            <RoleEngine onComplete={handleComplete} mode={mode} assessmentCode={assessmentCode} />
        </div>
    );
}
