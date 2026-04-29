"use client";

import React from 'react';
import CommunicationEngine from '../../../components/assessment/communication/CommunicationEngine';
import { useRouter } from 'next/navigation';

export default function CommunicationAssessmentPage() {
    const router = useRouter();

    const handleComplete = (answers: Record<string, any>) => {
        console.log("Communication Assessment Completed. Answers:", answers);
        alert("Assessment Completed successfully! Responses are saved.");
        router.push('/'); // Route back to portal
    };

    return (
        <div className="min-h-screen w-full bg-brand-light-primary dark:bg-brand-dark-primary transition-colors duration-500 font-sans flex flex-col relative overflow-hidden">
            {/* Background layer */}
            <div className="absolute inset-0 portal-bg opacity-100 pointer-events-none" />
            
            <main className="flex-1 flex flex-col relative z-10 w-full">
                <CommunicationEngine onComplete={handleComplete} />
            </main>
        </div>
    );
}
