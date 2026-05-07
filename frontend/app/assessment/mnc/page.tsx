"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MNCEngine from '@/components/assessment/mnc/MNCEngine';
import { Suspense } from 'react';

function MNCAssessmentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = (searchParams.get('mode') as 'trial' | 'main') || 'main';
    const [isCompleted, setIsCompleted] = useState(false);

    const handleComplete = (answers: Record<string, string>) => {
        console.log("MNC Assessment Completed:", answers);
        setIsCompleted(true);
        // In a real app, you would save the results here
        setTimeout(() => {
            router.push('/assessment-portal');
        }, 2000);
    };

    if (isCompleted) {
        return (
            <div className="min-h-screen w-full bg-brand-light-secondary dark:bg-brand-dark-primary flex items-center justify-center p-6">
                <div className="max-w-md w-full rounded-3xl border border-brand-green/20 bg-white dark:bg-brand-dark-secondary p-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-green/10 mb-6">
                        <svg className="w-10 h-10 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-brand-text-light-primary dark:text-brand-text-primary mb-2">
                        Assessment Submitted!
                    </h1>
                    <p className="text-brand-text-light-secondary dark:text-brand-text-secondary mb-0 leading-relaxed text-sm">
                        Your responses have been recorded successfully. Redirecting you to the portal...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full">
            <MNCEngine onComplete={handleComplete} mode={mode} />
        </div>
    );
}

export default function MNCAssessmentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-full flex items-center justify-center bg-brand-light-secondary dark:bg-brand-dark-primary">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
                    <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest animate-pulse">Initializing MNC Engine...</p>
                </div>
            </div>
        }>
            <MNCAssessmentContent />
        </Suspense>
    );
}
