"use client";

import React from 'react';
import AptitudeEngine from '../../../components/assessment/aptitude/AptitudeEngine';
import { useRouter } from 'next/navigation';

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
