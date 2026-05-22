import React, { Suspense } from 'react';
import AptitudeClient from './Client';

export const dynamic = 'force-dynamic';

export default function AptitudeAssessmentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-full flex items-center justify-center bg-brand-light-secondary dark:bg-brand-dark-primary">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
                    <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest animate-pulse">Initializing Assessment Engine...</p>
                </div>
            </div>
        }>
            <AptitudeClient />
        </Suspense>
    );
}
