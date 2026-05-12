"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MNCEngine, { type AttemptSubmitResult } from '@/components/assessment/mnc/MNCEngine';
import { Suspense } from 'react';
import { useAssessmentTracker } from '../../../lib/assessmentTracker';

function MNCAssessmentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = (searchParams.get('mode') as 'trial' | 'main') || 'main';
    const { markAssessmentComplete } = useAssessmentTracker();

    const handleComplete = (result: AttemptSubmitResult) => {
        const totalQuestions = result.totalQuestions ?? (result.correctCount + result.wrongCount);
        const answeredCount = result.answeredCount ?? (result.correctCount + result.wrongCount);
        const accuracyBase = totalQuestions > 0 ? totalQuestions : answeredCount;
        const accuracy = accuracyBase > 0 ? Math.round((result.correctCount / accuracyBase) * 100) : 0;
        const overallScore = Math.max(0, Math.round(result.totalScore));
        const timeTakenMinutes = Math.max(1, Math.round(result.timeTakenSeconds / 60));
        const sections = [
            { name: "Overall", score: accuracy, weight: "100%" },
        ];

        const assessmentResult = {
            assessmentId: "mnc" as const,
            completedAt: new Date().toISOString(),
            overallScore,
            accuracy,
            timeTaken: `${timeTakenMinutes} min`,
            sections,
            insights: [
                { type: "strength" as const, text: "Strong problem-solving approach in aptitude sections." },
                { type: "improvement" as const, text: "Practice time management for complex reasoning scenarios." },
                { type: "time" as const, text: "Completed within allocated time with good accuracy." },
            ],
        };

        const existingResults = JSON.parse(localStorage.getItem("originbi:assessment-results") || "{}");
        existingResults.mnc = assessmentResult;
        localStorage.setItem("originbi:assessment-results", JSON.stringify(existingResults));
        window.dispatchEvent(new CustomEvent("originbi:results-changed"));

        const paidAssessments = JSON.parse(localStorage.getItem("originbi:paid-assessments") || "[]");
        if (!paidAssessments.includes("mnc")) {
            paidAssessments.push("mnc");
            localStorage.setItem("originbi:paid-assessments", JSON.stringify(paidAssessments));
            window.dispatchEvent(new CustomEvent("originbi:paid-changed"));
        }

        markAssessmentComplete("mnc", {
            totalScore: overallScore,
            correctCount: result.correctCount,
            wrongCount: result.wrongCount,
            timeTakenSeconds: result.timeTakenSeconds,
        });

        if (mode === 'trial') {
            router.push('/assessment');
        } else {
            router.push('/dashboard?completed=mnc');
        }
    };

    return (
        <div className="min-h-screen w-full">
            <MNCEngine onComplete={handleComplete} mode={mode} />
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
