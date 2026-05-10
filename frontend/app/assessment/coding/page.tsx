"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CodingAssessment from "@/components/assessment/coding/CodingAssessment";
import { LANG_META } from "@/components/assessment/coding/CodeEditor";
import { codingPaymentKey, usePaidAssessments } from "@/lib/payments";
import { useAssessmentTracker } from "../../../lib/assessmentTracker";
import { Suspense } from "react";

const VALID_LANGS = Object.keys(LANG_META);

function CodingAssessmentInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const lang = (searchParams.get("lang") || "").toLowerCase();
    const [hydrated, setHydrated] = useState(false);
    const { isPaid } = usePaidAssessments();
    const { markAssessmentComplete } = useAssessmentTracker();

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

    const handleComplete = (score: number) => {
        const result = {
            assessmentId: "coding" as const,
            completedAt: new Date().toISOString(),
            overallScore: score,
            accuracy: score,
            timeTaken: "45 min",
            sections: [{ name: "Coding", score, weight: "100%" }],
            insights: [
                { type: "strength" as const, text: "Strong problem-solving and algorithmic thinking." },
                { type: "improvement" as const, text: "Optimize code for better time/space complexity." },
                { type: "time" as const, text: "Good time management during implementation." },
            ],
        };

        const existingResults = JSON.parse(localStorage.getItem("originbi:assessment-results") || "{}");
        existingResults.coding = result;
        localStorage.setItem("originbi:assessment-results", JSON.stringify(existingResults));
        window.dispatchEvent(new CustomEvent("originbi:results-changed"));

        const paidAssessments = JSON.parse(localStorage.getItem("originbi:paid-assessments") || "[]");
        if (!paidAssessments.includes("coding")) {
            paidAssessments.push("coding");
            localStorage.setItem("originbi:paid-assessments", JSON.stringify(paidAssessments));
            window.dispatchEvent(new CustomEvent("originbi:paid-changed"));
        }

        markAssessmentComplete("coding", {
            totalScore: score,
            correctCount: Math.round(score / 10),
            wrongCount: 10 - Math.round(score / 10),
            timeTakenSeconds: 2700,
        });

        router.push('/student/dashboard?completed=coding');
    };

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

    return <CodingAssessment lang={lang} onComplete={handleComplete} />;
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
