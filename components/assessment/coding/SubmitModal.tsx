"use client";

import React from "react";

export type QStatus = "solved" | "flagged" | "attempted" | "unattempted";

interface SubmitModalProps {
    statuses: Record<number, QStatus>;
    total: number;
    tabSwitches: number;
    onConfirm: () => void;
    onCancel: () => void;
}

const SubmitModal: React.FC<SubmitModalProps> = ({
    statuses,
    total,
    tabSwitches,
    onConfirm,
    onCancel,
}) => {
    const values = Object.values(statuses);
    const solved = values.filter((s) => s === "solved").length;
    const attempted = values.filter((s) => s === "attempted").length;
    const flagged = values.filter((s) => s === "flagged").length;
    const unattempted = total - solved - attempted - flagged;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={onCancel}
        >
            <div
                className="animate-slide-up w-full max-w-[440px] rounded-[20px] p-9 shadow-[0_24px_80px_rgba(0,0,0,0.4)]"
                style={{
                    background: "var(--c-card)",
                    border: "1px solid var(--c-border)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-7 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#1ED36A]/25 bg-[#1ED36A]/10">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1ED36A" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                        </svg>
                    </div>
                    <h2
                        className="mb-1.5 text-[22px] font-extrabold"
                        style={{ color: "var(--c-text)" }}
                    >
                        Submit Assessment?
                    </h2>
                    <p
                        className="text-[14px] leading-[1.6]"
                        style={{ color: "var(--c-text-soft)" }}
                    >
                        This action is final. Once submitted, you cannot return to this exam.
                    </p>
                </div>

                <div className="mb-7 grid grid-cols-2 gap-2.5">
                    {[
                        { label: "Solved", count: solved, color: "#1ED36A", bg: "rgba(30,211,106,0.08)" },
                        { label: "Attempted", count: attempted, color: "#4AC6EA", bg: "rgba(74,198,234,0.08)" },
                        { label: "Flagged", count: flagged, color: "#FFB703", bg: "rgba(255,183,3,0.08)" },
                        { label: "Unattempted", count: unattempted, color: "#ED2F34", bg: "rgba(237,47,52,0.08)" },
                    ].map(({ label, count, color, bg }) => (
                        <div
                            key={label}
                            className="rounded-xl px-4 py-3.5 text-center"
                            style={{ background: bg, border: `1px solid ${color}33` }}
                        >
                            <div
                                className="text-[28px] font-extrabold leading-none"
                                style={{ color }}
                            >
                                {count}
                            </div>
                            <div
                                className="mt-1 text-[12px] font-semibold"
                                style={{ color: "var(--c-text-muted)" }}
                            >
                                {label}
                            </div>
                        </div>
                    ))}
                </div>

                {tabSwitches > 0 && (
                    <div className="mb-5 flex items-center gap-2 rounded-xl border border-[#FFB703]/25 bg-[#FFB703]/[0.08] px-3 py-2.5 text-[12px]"
                        style={{ color: "var(--c-warn)" }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M12 9v4M12 17h.01" />
                            <circle cx="12" cy="12" r="10" />
                        </svg>
                        <span>
                            <strong>{tabSwitches}</strong> tab switch{tabSwitches === 1 ? "" : "es"} recorded during this attempt.
                        </span>
                    </div>
                )}

                <div className="flex gap-2.5">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 cursor-pointer rounded-full px-3 py-3.5 text-[14px] font-bold transition-colors"
                        style={{
                            background: "var(--c-surface-raised)",
                            border: "1px solid var(--c-border-strong)",
                            color: "var(--c-text-soft)",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="flex-[2] cursor-pointer rounded-full border-0 bg-[#1ED36A] px-3 py-3.5 text-[14px] font-extrabold text-white shadow-[0_4px_20px_rgba(30,211,106,0.35)] transition-transform hover:scale-[1.01]"
                    >
                        Submit Exam
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubmitModal;
