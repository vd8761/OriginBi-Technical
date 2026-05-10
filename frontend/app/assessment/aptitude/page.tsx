"use client";

import React from "react";
import AptitudeEngine, { type AttemptSubmitResult } from "../../../components/assessment/aptitude/AptitudeEngine";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAssessmentTracker } from "../../../lib/assessmentTracker";

function AptitudeAssessmentContent() {
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

        // Generate insights
        const insights: { type: "strength" | "improvement" | "time"; text: string }[] = [];
        const strongSections = sections.filter((s) => s.score >= 75);
        const weakSections = sections.filter((s) => s.score < 50);

        if (strongSections.length > 0) {
            insights.push({
                type: "strength",
                text: `Strong performance in ${strongSections.map((s) => s.name).join(", ")}. Your logical reasoning abilities are well-developed.`
            });
        }
        if (weakSections.length > 0) {
            insights.push({
                type: "improvement",
                text: `Focus on improving ${weakSections.map((s) => s.name).join(", ")} to increase your overall score.`
            });
        }
        insights.push({
            type: "time",
            text: "You completed the assessment within the time limit. Good time management!"
        });

        // Save results to localStorage
        const assessmentResult = {
            assessmentId: "aptitude" as const,
            completedAt: new Date().toISOString(),
            overallScore,
            accuracy,
            timeTaken: `${timeTakenMinutes} min`,
            sections,
            insights,
        };

        // Save to localStorage
        const existingResults = JSON.parse(localStorage.getItem("originbi:assessment-results") || "{}");
        existingResults.aptitude = assessmentResult;
        localStorage.setItem("originbi:assessment-results", JSON.stringify(existingResults));
        window.dispatchEvent(new CustomEvent("originbi:results-changed"));

        // Mark as paid/unlock if not already
        const paidAssessments = JSON.parse(localStorage.getItem("originbi:paid-assessments") || "[]");
        if (!paidAssessments.includes("aptitude")) {
            paidAssessments.push("aptitude");
            localStorage.setItem("originbi:paid-assessments", JSON.stringify(paidAssessments));
            window.dispatchEvent(new CustomEvent("originbi:paid-changed"));
        }

        // Mark complete in tracker (generates notifications & suggestions)
        markAssessmentComplete("aptitude", {
            totalScore: overallScore,
            correctCount: result.correctCount,
            wrongCount: result.wrongCount,
            timeTakenSeconds: result.timeTakenSeconds,
        });

        // Redirect to dashboard
        router.push('/student/dashboard?completed=aptitude');
    };

    return (
        <div className="min-h-screen w-full">
            <AptitudeEngine onComplete={handleComplete} mode={mode} />
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
