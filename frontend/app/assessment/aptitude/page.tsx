"use client";

import React from "react";
import AptitudeEngine from "../../../components/assessment/aptitude/AptitudeEngine";
import { useRouter } from "next/navigation";
import { useAssessmentTracker } from "../../../lib/assessmentTracker";

interface AptitudeResult {
    overallScore: number;
    accuracy: number;
    timeTakenSeconds: number;
    sections: { name: string; score: number; weight: string }[];
}

export default function AptitudeAssessmentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = (searchParams.get('mode') as 'trial' | 'main') || 'main';

    const handleComplete = (result: AptitudeResult) => {
        const sections = result.sections || [];
        const overallScore = result.overallScore;
        const accuracy = result.accuracy;
        const timeTakenMinutes = Math.max(1, Math.round(result.timeTakenSeconds / 60));

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
            correctCount: Math.round((result.accuracy / 100) * (sections.length || 1)),
            wrongCount: sections.length - Math.round((result.accuracy / 100) * (sections.length || 1)),
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
