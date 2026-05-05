"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CodingAssessment from "@/components/assessment/coding/CodingAssessment";
import { LANG_META } from "@/components/assessment/coding/CodeEditor";
import { codingPaymentKey, usePaidAssessments } from "@/lib/payments";
import { Suspense } from "react";

const VALID_LANGS = Object.keys(LANG_META);

function CodingAssessmentInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const lang = (searchParams.get("lang") || "").toLowerCase();
    const [hydrated, setHydrated] = useState(false);
    const { isPaid } = usePaidAssessments();

    useEffect(() => {
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        if (!lang || !VALID_LANGS.includes(lang)) {
            router.replace("/explore/coding");
            return;
        }
        if (!isPaid(codingPaymentKey(lang))) {
            router.replace("/explore/coding");
        }
    }, [hydrated, lang, isPaid, router]);

    if (!hydrated || !lang || !VALID_LANGS.includes(lang) || !isPaid(codingPaymentKey(lang))) {
        return (
            <div className="coding-exam-root coding-theme-dark flex min-h-screen items-center justify-center bg-[#19211C] text-white/60">
                <div className="flex items-center gap-3 text-[13px]">
                    <div className="h-4 w-4 rounded-full border-2 border-[#1ED36A]/30 border-t-[#1ED36A] animate-spin-fast" />
                    Loading assessment…
                </div>
            </div>
        );
    }

    return <CodingAssessment lang={lang} />;
}

export default function CodingAssessmentPage() {
    return (
        <Suspense
            fallback={
                <div className="coding-exam-root coding-theme-dark flex min-h-screen items-center justify-center bg-[#19211C] text-white/60">
                    <div className="flex items-center gap-3 text-[13px]">
                        <div className="h-4 w-4 rounded-full border-2 border-[#1ED36A]/30 border-t-[#1ED36A] animate-spin-fast" />
                        Loading assessment…
                    </div>
                </div>
            }
        >
            <CodingAssessmentInner />
        </Suspense>
    );
}
