"use client";

import React from 'react';
import RoleEngine from '../../../components/assessment/role/RoleEngine';
import { useRouter } from 'next/navigation';

export default function RoleAssessmentPage() {
    const router = useRouter();

    const handleComplete = (answers: Record<string, any>) => {
        console.log("Role-Based Assessment Completed. Answers:", answers);
        alert("Assessment Completed successfully! Responses are saved.");
        router.push('/'); // Route back to portal
    };

    return (
        <div className="min-h-screen w-full bg-brand-light-primary dark:bg-brand-dark-primary transition-colors duration-500 font-sans flex flex-col relative overflow-hidden">
            {/* Background layer */}
            <div className="absolute inset-0 portal-bg opacity-100 pointer-events-none" />
            
            <main className="flex-1 flex flex-col relative z-10 w-full">
                {/* 
                  We can pass roleName from context, URL param, or user profile. 
                  Defaulting to "Full Stack Engineer" for demo.
                */}
                <RoleEngine onComplete={handleComplete} roleName="Full Stack Engineer" />
            </main>
        </div>
    );
}
