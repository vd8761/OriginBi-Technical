"use client";

import React from 'react';
import CommunicationEngine, { type AttemptSubmitResult } from '../../../components/assessment/communication/CommunicationEngine';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useAssessmentTracker } from '../../../lib/assessmentTracker';

function CommunicationAssessmentContent() {
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

        const insights = [
            { type: "strength" as const, text: "Good comprehension skills demonstrated in reading and listening sections." },
            { type: "improvement" as const, text: "Practice structured responses for better speaking clarity." },
            { type: "time" as const, text: "Well-paced responses throughout the assessment." },
        ];

        const assessmentResult = {
            assessmentId: "communication" as const,
            completedAt: new Date().toISOString(),
            overallScore,
            accuracy,
            timeTaken: `${timeTakenMinutes} min`,
            sections,
            insights,
        };

        const existingResults = JSON.parse(localStorage.getItem("originbi:assessment-results") || "{}");
        existingResults.communication = assessmentResult;
        localStorage.setItem("originbi:assessment-results", JSON.stringify(existingResults));
        window.dispatchEvent(new CustomEvent("originbi:results-changed"));

        const paidAssessments = JSON.parse(localStorage.getItem("originbi:paid-assessments") || "[]");
        if (!paidAssessments.includes("communication")) {
            paidAssessments.push("communication");
            localStorage.setItem("originbi:paid-assessments", JSON.stringify(paidAssessments));
            window.dispatchEvent(new CustomEvent("originbi:paid-changed"));
        }

        markAssessmentComplete("communication", {
            totalScore: overallScore,
            correctCount: result.correctCount,
            wrongCount: result.wrongCount,
            timeTakenSeconds: result.timeTakenSeconds,
        });

        router.push('/dashboard');
    };

    return (
        <div className="min-h-screen w-full">
            <CommunicationEngine onComplete={handleComplete} mode={mode} />
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
