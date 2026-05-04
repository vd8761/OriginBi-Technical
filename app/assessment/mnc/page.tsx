"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

export default function MNCAssessmentPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen w-full bg-brand-light-secondary dark:bg-brand-dark-primary flex items-center justify-center p-6">
            <div className="max-w-2xl w-full rounded-3xl border border-brand-green/20 bg-white dark:bg-brand-dark-secondary p-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.2)]">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-green/10 mb-6">
                    <svg className="w-10 h-10 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-brand-text-light-primary dark:text-brand-text-primary mb-4">
                    MNC Based Questions
                </h1>
                <p className="text-brand-text-light-secondary dark:text-brand-text-secondary mb-8 leading-relaxed">
                    Practice high-frequency interview patterns from top MNCs. This assessment is coming soon with questions covering arrays, trees, dynamic programming, and system design.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => router.push('/assessment-portal')}
                        className="px-8 py-3 rounded-xl bg-brand-green text-white font-semibold hover:opacity-90 transition-all"
                    >
                        Back to Portal
                    </button>
                    <button
                        onClick={() => router.back()}
                        className="px-8 py-3 rounded-xl border border-brand-green/30 text-brand-green font-semibold hover:bg-brand-green/10 transition-all"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
}
