"use client";

import React from 'react';
import RoleEngine from '../../../components/assessment/role/RoleEngine';
import { useRouter } from 'next/navigation';

export default function RoleAssessmentPage() {
    const router = useRouter();

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
            <RoleEngine onComplete={handleComplete} roleName="Full Stack Engineer" />
        </div>
    );
}
