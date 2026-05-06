"use client";

import React from 'react';
import AptitudeEngine from '../../../components/assessment/aptitude/AptitudeEngine';
import { useRouter } from 'next/navigation';

// Correct answers for scoring
const CORRECT_ANSWERS: Record<string, string> = {
    q1: "o2", // 5% decrease
    q2: "o2", // (1/8)
    q3: "o2", // $50,000
    q4: "o3", // Figure C
};

// Section mapping for detailed results
const QUESTION_SECTIONS: Record<string, string> = {
    q1: "Quantitative Aptitude",
    q2: "Logical Reasoning",
    q3: "Data Interpretation",
    q4: "Abstract Reasoning",
};

export default function AptitudeAssessmentPage() {
    const router = useRouter();

    const handleComplete = (answers: Record<string, string>) => {
        // Calculate score
        let correct = 0;
        const sectionScores: Record<string, { correct: number; total: number }> = {
            "Quantitative Aptitude": { correct: 0, total: 0 },
            "Logical Reasoning": { correct: 0, total: 0 },
            "Data Interpretation": { correct: 0, total: 0 },
            "Abstract Reasoning": { correct: 0, total: 0 },
        };

        Object.entries(answers).forEach(([questionId, answerId]) => {
            const section = QUESTION_SECTIONS[questionId];
            if (section) {
                sectionScores[section].total++;
                if (CORRECT_ANSWERS[questionId] === answerId) {
                    correct++;
                    sectionScores[section].correct++;
                }
            }
        });

        const totalQuestions = Object.keys(CORRECT_ANSWERS).length;
        const overallScore = Math.round((correct / totalQuestions) * 100);
        const accuracy = Math.round((correct / Math.max(1, Object.keys(answers).length)) * 100);

        // Calculate section scores
        const sections = Object.entries(sectionScores).map(([name, scores]) => ({
            name,
            score: scores.total > 0 ? Math.round((scores.correct / scores.total) * 100) : 0,
            weight: "25%",
        }));

        // Generate insights
        const insights: { type: "strength" | "improvement" | "time"; text: string }[] = [];
        const strongSections = sections.filter(s => s.score >= 75);
        const weakSections = sections.filter(s => s.score < 50);

        if (strongSections.length > 0) {
            insights.push({
                type: "strength",
                text: `Strong performance in ${strongSections.map(s => s.name).join(", ")}. Your logical reasoning abilities are well-developed.`
            });
        }
        if (weakSections.length > 0) {
            insights.push({
                type: "improvement",
                text: `Focus on improving ${weakSections.map(s => s.name).join(", ")} to increase your overall score.`
            });
        }
        insights.push({
            type: "time",
            text: "You completed the assessment within the time limit. Good time management!"
        });

        // Save results to localStorage
        const result = {
            assessmentId: "aptitude" as const,
            completedAt: new Date().toISOString(),
            overallScore,
            accuracy,
            timeTaken: "60 min",
            sections,
            insights,
        };

        // Save to localStorage
        const existingResults = JSON.parse(localStorage.getItem("originbi:assessment-results") || "{}");
        existingResults.aptitude = result;
        localStorage.setItem("originbi:assessment-results", JSON.stringify(existingResults));
        window.dispatchEvent(new CustomEvent("originbi:results-changed"));

        // Mark as paid/unlock if not already
        const paidAssessments = JSON.parse(localStorage.getItem("originbi:paid-assessments") || "[]");
        if (!paidAssessments.includes("aptitude")) {
            paidAssessments.push("aptitude");
            localStorage.setItem("originbi:paid-assessments", JSON.stringify(paidAssessments));
            window.dispatchEvent(new CustomEvent("originbi:paid-changed"));
        }

        // Redirect to dashboard
        router.push('/?completed=aptitude');
    };

    return (
        <div className="min-h-screen w-full">
            <AptitudeEngine onComplete={handleComplete} />
        </div>
    );
}
