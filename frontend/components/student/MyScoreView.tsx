"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "./Header";
import { AwardIcon } from "@/components/icons";
import { Loader2 } from "lucide-react";
import {
    getMyResults,
    getMyCertificates,
    logoutUser,
    type AssessmentResult,
    type Certificate,
} from "@/lib/api";

const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const MyScoreView: React.FC = () => {
    const router = useRouter();
    const [results, setResults] = useState<AssessmentResult[]>([]);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [passPercent, setPassPercent] = useState(90);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const [r, c] = await Promise.all([getMyResults(), getMyCertificates()]);
        setResults(r.results);
        setPassPercent(r.passPercent);
        setCertificates(c.certificates);
        setLoading(false);
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const certBySerial = (serial?: string) =>
        serial ? certificates.find((c) => c.serial === serial) : undefined;

    return (
        <div className="min-h-screen bg-[#f5fbf7] dark:bg-[#0f1712] flex flex-col">
            <Header
                currentView="my-score"
                onNavigate={(view) => router.push(`/${view}`)}
                onLogout={() => void logoutUser().finally(() => router.push("/"))}
            />

            <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 pb-24 pt-24 sm:px-6">
                <div className="mb-8 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <AwardIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-[26px] font-extrabold tracking-tight text-black dark:text-white">
                            My Performance
                        </h1>
                        <p className="text-[13px] text-slate-500 dark:text-gray-400">
                            Graded results from your completed assessments. Pass mark is {passPercent}%.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-3 py-24 text-slate-500 dark:text-gray-400">
                        <Loader2 className="h-5 w-5 animate-spin" /> Loading your results…
                    </div>
                ) : results.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center dark:border-white/10 dark:bg-[#212824]">
                        <p className="text-[15px] font-bold text-black dark:text-white">No results yet</p>
                        <p className="mx-auto mt-2 max-w-md text-[13px] text-slate-500 dark:text-gray-400">
                            Once you complete a coding assessment and it finishes grading, your score and
                            per-test breakdown will appear here.
                        </p>
                        <button
                            type="button"
                            onClick={() => router.push("/explore/coding")}
                            className="mt-6 rounded-full bg-[#1ED36A] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wider text-white"
                        >
                            Explore Coding
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        {results.map((res) => {
                            const cert = certBySerial(res.certificateSerial);
                            const pct = Math.round(res.percentage);
                            const processing =
                                res.status === "submitted" || res.status === "under_review";
                            return (
                                <section
                                    key={res.attemptId}
                                    className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xs dark:border-white/[0.06] dark:bg-[#212824]"
                                >
                                    <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl text-white"
                                                style={{
                                                    background: res.passed
                                                        ? "linear-gradient(135deg,#1ED36A,#13a653)"
                                                        : "linear-gradient(135deg,#f59e0b,#d97706)",
                                                }}
                                            >
                                                <span className="text-[18px] font-extrabold leading-none">
                                                    {processing ? "—" : `${pct}%`}
                                                </span>
                                            </div>
                                            <div>
                                                <h2 className="text-[17px] font-bold text-black dark:text-white">
                                                    {titleCase(res.language)} Coding
                                                </h2>
                                                <p className="text-[12.5px] text-slate-500 dark:text-gray-400">
                                                    {processing
                                                        ? "Grading in progress…"
                                                        : `Scored ${res.score} / ${res.maxScore} points`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {processing ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:bg-white/[0.06] dark:text-gray-300">
                                                    Processing
                                                </span>
                                            ) : res.passed ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                                    Passed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                                                    Not passed
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.push(
                                                        `/assessment/coding?lang=${res.language}&mode=main`,
                                                    )
                                                }
                                                className="rounded-full border border-[#1ED36A]/40 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1ED36A] transition hover:bg-[#1ED36A]/10"
                                            >
                                                Retake
                                            </button>
                                        </div>
                                    </div>

                                    {res.questions.length > 0 && (
                                        <div className="border-t border-gray-100 dark:border-white/[0.06]">
                                            {res.questions.map((q) => (
                                                <div
                                                    key={q.ordinal}
                                                    className="flex items-center justify-between gap-4 px-6 py-3 text-[13px] [&:not(:last-child)]:border-b [&:not(:last-child)]:border-gray-50 dark:[&:not(:last-child)]:border-white/[0.04]"
                                                >
                                                    <span className="min-w-0 flex-1 truncate text-black dark:text-white">
                                                        {q.ordinal}. {q.title || "Coding question"}
                                                    </span>
                                                    <span className="shrink-0 text-slate-500 dark:text-gray-400">
                                                        {q.testsPassed}/{q.testsTotal} tests
                                                    </span>
                                                    <span className="w-16 shrink-0 text-right font-semibold text-black dark:text-white">
                                                        {q.score}/{q.maxScore}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {cert && (
                                        <div className="flex flex-col gap-3 border-t border-emerald-100 bg-emerald-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-500/15 dark:bg-emerald-500/[0.06]">
                                            <div className="flex items-center gap-3">
                                                <AwardIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                                <div>
                                                    <p className="text-[13px] font-bold text-emerald-800 dark:text-emerald-200">
                                                        Certificate earned
                                                    </p>
                                                    <p className="font-mono text-[11.5px] text-emerald-700/80 dark:text-emerald-300/80">
                                                        {cert.serial}
                                                    </p>
                                                </div>
                                            </div>
                                            <a
                                                href={`/verify/${cert.serial}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="self-start rounded-full bg-emerald-600 px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-emerald-500 sm:self-auto"
                                            >
                                                View & Verify
                                            </a>
                                        </div>
                                    )}
                                </section>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default MyScoreView;
