"use client";

import React from 'react';
import AptitudeEngine from '../../../components/assessment/aptitude/AptitudeEngine';
import { useRouter } from 'next/navigation';

import SubmissionSuccess from '../../../components/ui/SubmissionSuccess';
import { useState } from 'react';

export default function AptitudeAssessmentPage() {
    const router = useRouter();
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleComplete = (answers: Record<string, string>) => {
        console.log("Assessment Completed. Answers:", answers);
        // Here you would typically send data to backend
        setIsSubmitted(true);
    };

    if (isSubmitted) {
        return (
            <SubmissionSuccess 
                onAction={() => router.push('/')}
                message="Assessment submitted! Check your dashboard to view your detailed performance score."
            />
        );
    }

    return (
        <div className="min-h-screen w-full">
            <AptitudeEngine onComplete={handleComplete} />
        </div>
    );
}
