"use client";

import React from 'react';
import RoleEngine from '../../../components/assessment/role/RoleEngine';
import { useRouter } from 'next/navigation';

export default function RoleAssessmentPage() {
    const router = useRouter();

    const handleComplete = (answers: Record<string, string>) => {
        console.log("Role-Based Assessment Completed. Answers:", answers);
        alert("Assessment Completed successfully! Responses are saved.");
        router.push('/dashboard'); // Route back to portal dashboard
    };

    return (
        <div className="min-h-screen w-full">
            {/*
              We can pass roleName from context, URL param, or user profile.
              Defaulting to "Full Stack Engineer" for demo.
            */}
            <RoleEngine onComplete={handleComplete} roleName="Full Stack Engineer" />
        </div>
    );
}
