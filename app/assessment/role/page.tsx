"use client";

import React from 'react';
import RoleEngine from '../../../components/assessment/role/RoleEngine';
import { useRouter } from 'next/navigation';

import SubmissionSuccess from '../../../components/ui/SubmissionSuccess';
import { useState } from 'react';

export default function RoleAssessmentPage() {
    const router = useRouter();
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleComplete = (answers: Record<string, string>) => {
        console.log("Role-Based Assessment Completed. Answers:", answers);
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
            {/*
              We can pass roleName from context, URL param, or user profile.
              Defaulting to "Full Stack Engineer" for demo.
            */}
            <RoleEngine onComplete={handleComplete} roleName="Full Stack Engineer" />
        </div>
    );
}
