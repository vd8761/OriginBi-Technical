import React, { Suspense } from 'react';
import CodingClient, { LoadingView } from './Client';

export const dynamic = 'force-dynamic';

export default function CodingAssessmentPage() {
    return (
        <Suspense fallback={<LoadingView />}>
            <CodingClient />
        </Suspense>
    );
}
