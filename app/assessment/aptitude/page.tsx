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
        console.log("Assessment Completed. Answers:", answers);
        alert("Assessment Completed successfully! Results are saved.");
        router.push('/dashboard'); // Route back to portal dashboard
    };

    return (
        <div className="min-h-screen w-full">
            <AptitudeEngine onComplete={handleComplete} />
        </div>
    );
}
