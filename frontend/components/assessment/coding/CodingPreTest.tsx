"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import type { CodingLanguage } from "@/lib/exams";

interface CodingPreTestProps {
    language: CodingLanguage;
    onStart: (mode: 'trial' | 'main') => void;
    onClose: () => void;
    mode?: 'trial' | 'main';
    trialAttemptsLimit?: number;
    mainAttemptsLimit?: number;
    attemptsCount?: number;
}

const covers = [
    "Number logic & arrays",
    "Strings & data structures",
    "Algorithms & complexity",
    "Dynamic programming",
];

const checklist = [
    "Stay on this tab — switching is detected and recorded in your proctoring report.",
    "Read each question carefully; some include images, code blocks, or short videos.",
    "Use Mark Solved or Flag for review to track progress as you go.",
    "Run your code freely against the sample test cases before finalising your answer.",
    "Submission is final — confirm only when you are confident.",
    "If the timer runs out, the assessment auto-submits with the answers you have.",
];

const CodingPreTest: React.FC<CodingPreTestProps> = ({ 
    language, 
    onStart, 
    onClose, 
    mode = 'main',
    trialAttemptsLimit = 5,
    mainAttemptsLimit = 2,
    attemptsCount: initialAttemptsCount
}) => {
    const [attemptsCount, setAttemptsCount] = React.useState<number>(initialAttemptsCount ?? 0);

    React.useEffect(() => {
        if (initialAttemptsCount !== undefined) {
            setAttemptsCount(initialAttemptsCount);
            return;
        }
        let active = true;
        const fetchStats = async () => {
            try {
                let activeEmail = "";
                const storedProfile = localStorage.getItem("originbi:user-profile");
                if (storedProfile) {
                    const parsed = JSON.parse(storedProfile);
                    if (parsed && parsed.email) {
                        activeEmail = parsed.email;
                    }
                }
                if (!activeEmail) {
                    const storedUser = localStorage.getItem("user");
                    if (storedUser) {
                        const parsed = JSON.parse(storedUser);
                        if (parsed && parsed.email) {
                            activeEmail = parsed.email;
                        }
                    }
                }
                const API_BASE = process.env.NEXT_PUBLIC_TECH_API_URL || "http://localhost:5000";
                const emailParam = activeEmail ? `?userId=${encodeURIComponent(activeEmail)}` : "";
                const response = await fetch(`${API_BASE}/api/assessment/attempts-stats${emailParam}`);
                const json = await response.json();
                const data = json.data || json;
                if (active && data) {
                    const stats = data['coding'] || { trial: 0, main: 0 };
                    setAttemptsCount(mode === 'trial' ? stats.trial : stats.main);
                }
            } catch (err) {
                console.error("Failed to load attempt stats in pretest:", err);
            }
        };
        fetchStats();
        return () => { active = false; };
    }, [mode, initialAttemptsCount]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const limit = mode === 'trial' ? trialAttemptsLimit : mainAttemptsLimit;
    const currentAttempt = attemptsCount + 1;

    const metrics = [
        { label: "Questions", value: "5" },
        { label: "Duration", value: "90 min" },
        { label: "Sections", value: "5" },
        { label: "Attempts Allowed", value: `${limit}` },
        { label: "Attempts Taken", value: `${attemptsCount}` },
        { label: "Current Attempt", value: `${currentAttempt} of ${limit}` },
    ];

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6 sm:px-6">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                aria-hidden="true"
            />

            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="coding-pretest-title"
                className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-brand-green/10 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-[#111a15]"
            >
                <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ background: language.accent }}
                />

                <header className="flex items-start justify-between gap-4 border-b border-brand-green/5 p-4 sm:px-6 sm:py-5 dark:border-white/10">
                    <div className="flex items-start gap-4">
                        <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: `${language.accent}1a` }}
                        >
                            <Image
                                src={language.icon}
                                alt={`${language.name} logo`}
                                width={32}
                                height={32}
                                className="h-8 w-8 object-contain"
                            />
                        </div>
                        <div className="flex flex-col">
                            <p className="text-sm font-bold" style={{ color: language.accent }}>
                                Ready to begin
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2
                                    id="coding-pretest-title"
                                    className="text-xl font-bold leading-tight text-[#17201b] dark:text-white sm:text-2xl"
                                >
                                    Coding Assessment &middot; {language.name}
                                </h2>
                                {mode === 'trial' && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 whitespace-nowrap">
                                        Trial Assessment
                                    </span>
                                )}
                            </div>
                            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[#17201b] dark:text-white sm:text-sm">
                                Five problems covering core programming, data structures, algorithms, complexity, and dynamic programming — all evaluated in {language.name}.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-green/10 text-[#17201b] transition hover:border-brand-green hover:text-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 dark:border-white/10 dark:text-white"
                        aria-label="Close"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path
                                fillRule="evenodd"
                                d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06Z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                </header>

                <div className="overflow-y-auto p-4 sm:p-5">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
                        <div className="order-2 lg:order-1">
                            <h3 className="text-base font-bold text-[#17201b] dark:text-white">
                                What this test covers
                            </h3>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {covers.map((skill) => (
                                    <div
                                        key={skill}
                                        className="rounded-lg border p-3 text-sm font-medium text-[#17201b] dark:text-white"
                                        style={{
                                            borderColor: `${language.accent}33`,
                                            background: `${language.accent}0d`,
                                        }}
                                    >
                                        {skill}
                                    </div>
                                ))}
                            </div>

                            <h3 className="mt-5 text-base font-bold text-[#17201b] dark:text-white">
                                Before you begin
                            </h3>
                            <div className="mt-3 space-y-2.5">
                                {checklist.map((point) => (
                                    <div key={point} className="flex items-start gap-3">
                                        <span
                                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-sm"
                                            style={{ background: language.accent }}
                                        />
                                        <p className="text-[13px] font-medium leading-5 text-[#17201b] dark:text-white sm:text-sm">
                                            {point}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <aside
                            className="rounded-lg border p-4 dark:bg-white/5 order-1 lg:order-2"
                            style={{
                                borderColor: `${language.accent}33`,
                                background: `${language.accent}0a`,
                            }}
                        >
                            <h3 className="text-sm font-bold text-[#17201b] dark:text-white">
                                Session Stats
                            </h3>
                            <div className="mt-3 divide-y divide-brand-green/10 dark:divide-white/10">
                                {metrics.map((metric) => {
                                    const isCurrentAttempt = metric.label === "Current Attempt";
                                    return (
                                        <div
                                            key={metric.label}
                                            className={`flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0 ${
                                                isCurrentAttempt ? "p-2.5 rounded-lg -mx-2.5 px-3 border-0 mt-1" : ""
                                            }`}
                                            style={isCurrentAttempt ? {
                                                background: `${language.accent}1a`,
                                            } : undefined}
                                        >
                                            <span 
                                                className={`text-sm font-medium ${isCurrentAttempt ? "" : "text-[#17201b] dark:text-white"}`}
                                                style={isCurrentAttempt ? { color: language.accent } : undefined}
                                            >
                                                {metric.label}
                                            </span>
                                            <strong 
                                                className={`text-sm font-bold ${isCurrentAttempt ? "text-base font-extrabold" : "text-[#17201b] dark:text-white"}`}
                                                style={isCurrentAttempt ? { color: language.accent } : undefined}
                                            >
                                                {metric.value}
                                            </strong>
                                        </div>
                                    );
                                })}
                                <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
                                    <span className="text-sm font-medium text-[#17201b] dark:text-white">
                                        Language
                                    </span>
                                    <strong
                                        className="text-sm font-bold"
                                        style={{ color: language.accent }}
                                    >
                                        {language.name}
                                    </strong>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>

                <footer className="flex flex-col gap-3 border-t border-brand-green/5 bg-brand-green/5 p-4 sm:flex-row sm:justify-end sm:px-6 dark:border-white/10 dark:bg-white/5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-brand-green/20 bg-white px-5 text-sm font-bold text-[#17201b] transition hover:border-brand-green hover:text-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 dark:border-white/15 dark:bg-transparent dark:text-white"
                    >
                        Not yet
                    </button>
                    <button
                        type="button"
                        onClick={() => onStart(mode)}
                        className="inline-flex min-h-10 items-center justify-center rounded-lg px-6 text-sm font-bold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                        style={{
                            background: language.accent,
                            boxShadow: `0 8px 18px ${language.accent}40`,
                        }}
                    >
                        Begin assessment
                    </button>
                </footer>
            </section>
        </div>
    );
};

export default CodingPreTest;
