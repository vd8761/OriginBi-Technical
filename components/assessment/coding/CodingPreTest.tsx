"use client";

import React from "react";
import Image from "next/image";
import type { CodingLanguage } from "@/lib/exams";

interface CodingPreTestProps {
    language: CodingLanguage;
    onStart: () => void;
    onClose: () => void;
}

const metrics = [
    { label: "Questions", value: "5" },
    { label: "Duration", value: "90 min" },
    { label: "Sections", value: "5" },
    { label: "Attempts", value: "1 of 1" },
];

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

const CodingPreTest: React.FC<CodingPreTestProps> = ({ language, onStart, onClose }) => {
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6 sm:px-6">
            <button
                type="button"
                aria-label="Close coding pre-test"
                className="absolute inset-0 bg-[#0f1712]/70 backdrop-blur-sm"
                onClick={onClose}
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

                <header className="flex items-start justify-between gap-4 border-b border-brand-green/5 p-5 sm:p-6 dark:border-white/10">
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
                        <div>
                            <p className="text-sm font-bold" style={{ color: language.accent }}>
                                Ready to begin
                            </p>
                            <h2
                                id="coding-pretest-title"
                                className="mt-1 text-2xl font-bold leading-tight text-[#17201b] dark:text-white"
                            >
                                Coding Assessment &middot; {language.name}
                            </h2>
                            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-[#17201b]/60 dark:text-white/60">
                                Five problems covering core programming, data structures, algorithms, complexity, and dynamic programming — all evaluated in {language.name}.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-green/10 text-[#17201b]/40 transition hover:border-brand-green hover:text-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 dark:border-white/10 dark:text-white/40"
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

                <div className="overflow-y-auto p-5 sm:p-6">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
                        <div>
                            <h3 className="text-base font-bold text-[#17201b] dark:text-white">
                                What this test covers
                            </h3>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
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

                            <h3 className="mt-6 text-base font-bold text-[#17201b] dark:text-white">
                                Before you begin
                            </h3>
                            <div className="mt-4 space-y-3">
                                {checklist.map((point) => (
                                    <div key={point} className="flex items-start gap-3">
                                        <span
                                            className="mt-2 h-2 w-2 shrink-0 rounded-sm"
                                            style={{ background: language.accent }}
                                        />
                                        <p className="text-sm font-medium leading-6 text-[#17201b]/80 dark:text-white/80">
                                            {point}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <aside
                            className="rounded-lg border p-4 dark:bg-white/5"
                            style={{
                                borderColor: `${language.accent}33`,
                                background: `${language.accent}0a`,
                            }}
                        >
                            <h3 className="text-sm font-bold text-[#17201b] dark:text-white">
                                Session snapshot
                            </h3>
                            <div className="mt-4 divide-y divide-brand-green/10 dark:divide-white/10">
                                {metrics.map((metric) => (
                                    <div
                                        key={metric.label}
                                        className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                                    >
                                        <span className="text-sm font-medium text-[#17201b]/50 dark:text-white/50">
                                            {metric.label}
                                        </span>
                                        <strong className="text-sm font-bold text-[#17201b] dark:text-white">
                                            {metric.value}
                                        </strong>
                                    </div>
                                ))}
                                <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
                                    <span className="text-sm font-medium text-[#17201b]/50 dark:text-white/50">
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

                <footer className="flex flex-col gap-3 border-t border-brand-green/5 bg-brand-green/5 p-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-white/5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-green/20 bg-white px-5 text-sm font-bold text-[#17201b] transition hover:border-brand-green hover:text-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 dark:border-white/15 dark:bg-transparent dark:text-white"
                    >
                        Not yet
                    </button>
                    <button
                        type="button"
                        onClick={onStart}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg px-6 text-sm font-bold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
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
