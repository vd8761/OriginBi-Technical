"use client";

import React from 'react';
import CommunicationEngine, { type CommunicationAnswers } from '../../../components/assessment/communication/CommunicationEngine';
import { useRouter } from 'next/navigation';

export default function CommunicationAssessmentPage() {
    const router = useRouter();

    const handleComplete = (answers: CommunicationAnswers) => {
        console.log("Communication Assessment Completed. Answers:", answers);
        alert("Assessment Completed successfully! Responses are saved.");
        router.push('/'); // Route back to portal
    };

    return (
        <div className="min-h-screen w-full">
            <CommunicationEngine onComplete={handleComplete} />
        </div>
    );
}
