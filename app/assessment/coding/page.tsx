"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CodingAssessment from "@/components/assessment/coding/CodingAssessment";
import { LANG_META } from "@/components/assessment/coding/CodeEditor";
import { codingPaymentKey, usePaidAssessments } from "@/lib/payments";

const VALID_LANGS = Object.keys(LANG_META);

export default function CodingAssessmentPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const router = useRouter();
    const params = use(searchParams);
    const lang = (params?.lang || "").toLowerCase();
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
