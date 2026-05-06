"use client";

import React from "react";
import type { QStatus } from "./SubmitModal";
import { useTheme } from "@/lib/contexts/ThemeContext";

interface CompletionScreenProps {
    statuses: Record<number, QStatus>;
    total: number;
    tabSwitches: number;
    languageLabel: string;
    onBackToExplore: () => void;
}

const CompletionScreen: React.FC<CompletionScreenProps> = ({
    statuses,
    total,
    tabSwitches,
    languageLabel,
    onBackToExplore,
}) => {
    const { theme } = useTheme();
    const solved = Object.values(statuses).filter((s) => s === "solved").length;
    const score = total > 0 ? Math.round((solved / total) * 100) : 0;
    const r = 50;
    const circ = 2 * Math.PI * r;
    const trackStroke = theme === "light" ? "rgba(15,23,18,0.08)" : "rgba(255,255,255,0.06)";

    return (
        <div
            className={`coding-exam-root ${theme === "light" ? "coding-theme-light" : "coding-theme-dark"} flex min-h-screen items-center justify-center px-4`}
            style={{ background: "var(--c-bg)" }}
        >
            <div
                className="animate-slide-up w-full max-w-[480px] rounded-[28px] px-10 py-12 text-center shadow-[0_30px_100px_rgba(0,0,0,0.18)]"
                style={{
                    background: "var(--c-card)",
                    border: "1px solid var(--c-border)",
                }}
            >
                <div className="relative mx-auto mb-7 h-[120px] w-[120px]">
                    <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="60" cy="60" r={r} fill="none" stroke={trackStroke} strokeWidth="8" />
                        <circle
                            cx="60"
                            cy="60"
                            r={r}
                            fill="none"
                            stroke="#1ED36A"
                            strokeWidth="8"
                            strokeDasharray={circ}
                            strokeDashoffset={circ * (1 - score / 100)}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[32px] font-extrabold leading-none text-[#1ED36A]">
                            {score}%
                        </span>
                        <span
                            className="text-[11px] font-semibold"
                            style={{ color: "var(--c-text-muted)" }}
                        >
                            Score
                        </span>
                    </div>
                </div>

                <h2
                    className="mb-2 text-[28px] font-extrabold"
                    style={{ color: "var(--c-text)" }}
                >
                    Assessment Complete!
                </h2>
                <p
                    className="mb-8 text-[14px] leading-[1.7]"
                    style={{ color: "var(--c-text-soft)" }}
                >
                    Your responses for the{" "}
                    <span className="font-semibold" style={{ color: "var(--c-text)" }}>
                        {languageLabel}
                    </span>{" "}
                    coding assessment have been recorded. A detailed report will be shared to your registered email within 24 hours.
                </p>

                <div className="mb-8 grid grid-cols-3 gap-3">
                    {[
                        { label: "Solved", val: solved, color: "var(--c-ok)" },
                        { label: "Total", val: total, color: "var(--c-text)" },
                        { label: "Accuracy", val: `${score}%`, color: "var(--c-ok)" },
                    ].map(({ label, val, color }) => (
                        <div
                            key={label}
                            className="rounded-xl px-2.5 py-3.5"
                            style={{
                                background: "var(--c-surface-raised)",
                                border: "1px solid var(--c-border)",
                            }}
                        >
                            <div className="text-[22px] font-extrabold" style={{ color }}>
                                {val}
                            </div>
                            <div
                                className="mt-0.5 text-[11px] font-semibold"
                                style={{ color: "var(--c-text-muted)" }}
                            >
                                {label}
                            </div>
                        </div>
                    ))}
                </div>

                {tabSwitches > 0 && (
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#FFB703]/25 bg-[#FFB703]/[0.08] px-3 py-1.5 text-[11px] font-semibold text-[#FFB703]">
                        ⚠ {tabSwitches} tab switch{tabSwitches === 1 ? "" : "es"} flagged in proctoring report
                    </div>
                )}

                <div className="flex justify-center gap-2.5">
                    <button
                        type="button"
                        onClick={onBackToExplore}
                        className="cursor-pointer rounded-full border-0 bg-[#1ED36A] px-8 py-3.5 text-[14px] font-extrabold text-white shadow-[0_4px_20px_rgba(30,211,106,0.3)]"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompletionScreen;
