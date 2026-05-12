"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CodingAssessment from "@/components/assessment/coding/CodingAssessment";
import { LANG_META } from "@/components/assessment/coding/CodeEditor";
import { ApiError, startAttempt, type AttemptSnapshot } from "@/lib/api";

const VALID_LANGS = Object.keys(LANG_META);

function LoadingView() {
    return (
        <div className="coding-exam-root coding-theme-dark flex min-h-screen items-center justify-center bg-[#19211C] text-white/60">
            <div className="flex items-center gap-3 text-[13px]">
                <div className="h-4 w-4 rounded-full border-2 border-[#1ED36A]/30 border-t-[#1ED36A] animate-spin-fast" />
                Loading assessment...
            </div>
        </div>
    );
}

function CodingAssessmentInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const lang = (searchParams.get("lang") || "").toLowerCase();
    const [snapshot, setSnapshot] = useState<AttemptSnapshot | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!lang || !VALID_LANGS.includes(lang)) {
            router.replace("/explore/coding");
            return;
        }
        let cancelled = false;
        startAttempt({ assignmentRef: `coding:${lang}` })
            .then((data) => {
                if (!cancelled) setSnapshot(data);
            })
            .catch((err) => {
                if (cancelled) return;
                if (err instanceof ApiError && [401, 403, 404, 409].includes(err.status)) {
                    router.replace("/explore/coding");
                    return;
                }
                setError(
                    err instanceof ApiError
                        ? err.message
                        : "Unable to start the coding assessment.",
                );
            });
        return () => {
            cancelled = true;
        };
    }, [lang, router]);

    if (!lang || !VALID_LANGS.includes(lang) || (!snapshot && !error)) {
        return <LoadingView />;
    }

    if (error) {
        return (
            <div className="coding-exam-root coding-theme-dark flex min-h-screen items-center justify-center bg-[#19211C] text-white/70">
                <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                    <p className="text-sm font-bold text-white">Assessment unavailable</p>
                    <p className="mt-2 text-[13px]">{error}</p>
                    <button
                        type="button"
                        onClick={() => router.replace("/explore/coding")}
                        className="mt-5 rounded-full bg-[#1ED36A] px-5 py-2 text-xs font-bold text-white"
                    >
                        Back to Coding
                    </button>
                </div>
            </div>
        );
    }

    return <CodingAssessment lang={lang} snapshot={snapshot} />;
}

export default function CodingAssessmentPage() {
    return (
        <Suspense fallback={<LoadingView />}>
            <CodingAssessmentInner />
        </Suspense>
    );
}
