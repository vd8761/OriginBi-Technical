"use client";

import React from 'react';
import RoleEngine, { type AttemptSubmitResult } from '../../../components/assessment/role/RoleEngine';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAssessmentTracker } from '../../../lib/assessmentTracker';

export default function RoleAssessmentPage() {
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
            { type: "strength" as const, text: "Strong conceptual understanding of domain fundamentals." },
            { type: "improvement" as const, text: "Consider exploring scenarios with higher complexity levels." },
            { type: "time" as const, text: "Good decision speed with thoughtful responses." },
        ];

        const assessmentResult = {
            assessmentId: "role" as const,
            completedAt: new Date().toISOString(),
            overallScore,
            accuracy,
            timeTaken: `${timeTakenMinutes} min`,
            sections,
            insights,
        };

        const existingResults = JSON.parse(localStorage.getItem("originbi:assessment-results") || "{}");
        existingResults.role = assessmentResult;
        localStorage.setItem("originbi:assessment-results", JSON.stringify(existingResults));
        window.dispatchEvent(new CustomEvent("originbi:results-changed"));

        const paidAssessments = JSON.parse(localStorage.getItem("originbi:paid-assessments") || "[]");
        if (!paidAssessments.includes("role")) {
            paidAssessments.push("role");
            localStorage.setItem("originbi:paid-assessments", JSON.stringify(paidAssessments));
            window.dispatchEvent(new CustomEvent("originbi:paid-changed"));
        }

        markAssessmentComplete("role", {
            totalScore: overallScore,
            correctCount: result.correctCount,
            wrongCount: result.wrongCount,
            timeTakenSeconds: result.timeTakenSeconds,
        });

        router.push('/student/dashboard?completed=role');
    };

    return (
        <div className="min-h-screen w-full">
            <RoleEngine onComplete={handleComplete} mode={mode} />
        </div>
    );
}
