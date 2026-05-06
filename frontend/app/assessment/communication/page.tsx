"use client";

import React from 'react';
import CommunicationEngine, { type CommunicationAnswers } from '../../../components/assessment/communication/CommunicationEngine';
import { useRouter } from 'next/navigation';

export default function CommunicationAssessmentPage() {
    const router = useRouter();

    const handleComplete = (answers: CommunicationAnswers) => {
        // Simulate scoring based on completion
        const sections = [
            { name: "Listening", score: 75 + Math.floor(Math.random() * 20), weight: "25%" },
            { name: "Speaking", score: 70 + Math.floor(Math.random() * 25), weight: "25%" },
            { name: "Reading", score: 80 + Math.floor(Math.random() * 15), weight: "25%" },
            { name: "Writing", score: 72 + Math.floor(Math.random() * 20), weight: "25%" },
        ];
        
        const overallScore = Math.round(sections.reduce((sum, s) => sum + s.score, 0) / sections.length);
        
        // Generate insights
        const insights = [
            { type: "strength" as const, text: "Good comprehension skills demonstrated in reading and listening sections." },
            { type: "improvement" as const, text: "Practice structured responses for better speaking clarity." },
            { type: "time" as const, text: "Well-paced responses throughout the assessment." },
        ];

        // Save results
        const result = {
            assessmentId: "communication" as const,
            completedAt: new Date().toISOString(),
            overallScore,
            accuracy: overallScore,
            timeTaken: "30 min",
            sections,
            insights,
        };

        const existingResults = JSON.parse(localStorage.getItem("originbi:assessment-results") || "{}");
        existingResults.communication = result;
        localStorage.setItem("originbi:assessment-results", JSON.stringify(existingResults));
        window.dispatchEvent(new CustomEvent("originbi:results-changed"));

        // Mark as paid
        const paidAssessments = JSON.parse(localStorage.getItem("originbi:paid-assessments") || "[]");
        if (!paidAssessments.includes("communication")) {
            paidAssessments.push("communication");
            localStorage.setItem("originbi:paid-assessments", JSON.stringify(paidAssessments));
            window.dispatchEvent(new CustomEvent("originbi:paid-changed"));
        }

        router.push('/?completed=communication');
    };

    return (
        <div className="min-h-screen w-full">
            <CommunicationEngine onComplete={handleComplete} />
        </div>
    );
}
