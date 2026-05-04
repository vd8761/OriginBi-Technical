"use client";

import React from 'react';
import CommunicationEngine, { type CommunicationAnswers } from '../../../components/assessment/communication/CommunicationEngine';
import { useRouter } from 'next/navigation';

import SubmissionSuccess from '../../../components/ui/SubmissionSuccess';
import { useState } from 'react';

export default function CommunicationAssessmentPage() {
    const router = useRouter();
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleComplete = (answers: CommunicationAnswers) => {
        console.log("Communication Assessment Completed. Answers:", answers);
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
            <CommunicationEngine onComplete={handleComplete} />
        </div>
    );
}
