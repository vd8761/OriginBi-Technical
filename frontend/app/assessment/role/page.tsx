"use client";

import React from 'react';
import RoleEngine from '../../../components/assessment/role/RoleEngine';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function RoleAssessmentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = (searchParams.get('mode') as 'trial' | 'main') || 'main';

    const handleComplete = (answers: Record<string, string>) => {
        // Generate scores based on role assessment sections
        const sections = [
            { name: "Conceptual MCQs", score: 70 + Math.floor(Math.random() * 25), weight: "45%" },
            { name: "Scenario Decisions", score: 75 + Math.floor(Math.random() * 20), weight: "35%" },
            { name: "Priority Calls", score: 80 + Math.floor(Math.random() * 15), weight: "10%" },
            { name: "Reflection Prompts", score: 72 + Math.floor(Math.random() * 20), weight: "10%" },
        ];
        
        const overallScore = Math.round(
            sections.reduce((sum, s) => sum + (s.score * parseInt(s.weight) / 100), 0)
        );
        
        // Generate insights for role fit
        const insights = [
            { type: "strength" as const, text: "Strong conceptual understanding of domain fundamentals." },
            { type: "improvement" as const, text: "Consider exploring scenarios with higher complexity levels." },
            { type: "time" as const, text: "Good decision speed with thoughtful responses." },
        ];

        // Save results
        const result = {
            assessmentId: "role" as const,
            completedAt: new Date().toISOString(),
            overallScore,
            accuracy: overallScore,
            timeTaken: "45 min",
            sections,
            insights,
        };

        const existingResults = JSON.parse(localStorage.getItem("originbi:assessment-results") || "{}");
        existingResults.role = result;
        localStorage.setItem("originbi:assessment-results", JSON.stringify(existingResults));
        window.dispatchEvent(new CustomEvent("originbi:results-changed"));

        // Mark as paid
        const paidAssessments = JSON.parse(localStorage.getItem("originbi:paid-assessments") || "[]");
        if (!paidAssessments.includes("role")) {
            paidAssessments.push("role");
            localStorage.setItem("originbi:paid-assessments", JSON.stringify(paidAssessments));
            window.dispatchEvent(new CustomEvent("originbi:paid-changed"));
        }

        router.push('/?completed=role');
    };

    return (
        <div className="min-h-screen w-full">
            <RoleEngine onComplete={handleComplete} mode={mode} />
        </div>
    );
}

export default function RoleAssessmentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-full flex items-center justify-center bg-brand-light-secondary dark:bg-brand-dark-primary">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
                    <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest animate-pulse">Initializing Role Engine...</p>
                </div>
            </div>
        }>
            <RoleAssessmentContent />
        </Suspense>
    );
}
