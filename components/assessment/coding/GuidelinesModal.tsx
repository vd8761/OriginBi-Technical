"use client";

import React from "react";

interface GuidelinesModalProps {
    open: boolean;
    onClose: () => void;
    theme: "dark" | "light";
}

const GUIDELINES: { title: string; body: string }[] = [
    {
        title: "Stay in this tab",
        body: "Switching tabs, minimizing the window, or losing focus is recorded by the proctoring system. Repeated switches may flag your submission for review.",
    },
    {
        title: "One question at a time",
        body: "Use the sidebar to jump between questions. Mark questions Solved or Flag them for review — the navigator shows your progress at a glance.",
    },
    {
        title: "Run before you submit",
        body: "Use the Run button to test your code against the sample test cases. Hidden test cases are graded after submission.",
    },
    {
        title: "Mind the limits",
        body: "Each language has compile, runtime, memory, output, and source-size limits. Programs that exceed these are rejected — see the Limits strip above the editor.",
    },
    {
        title: "Auto-save is on",
        body: "Your code, statuses, and timer persist across reloads. The save indicator in the header shows the latest sync state.",
    },
    {
        title: "Auto-submit on timeout",
        body: "When the timer hits zero, your work is submitted automatically. Plan accordingly — partial answers count.",
    },
];

const GuidelinesModal: React.FC<GuidelinesModalProps> = ({ open, onClose, theme }) => {
    if (!open) return null;
    const isLight = theme === "light";
    const panelBg = isLight ? "#FFFFFF" : "#1B1F23";
    const panelBorder = isLight ? "rgba(15,23,18,0.12)" : "rgba(255,255,255,0.08)";
    const titleColor = isLight ? "#0F1712" : "#FFFFFF";
    const bodyColor = isLight ? "rgba(15,23,18,0.65)" : "rgba(255,255,255,0.65)";
    const muted = isLight ? "rgba(15,23,18,0.45)" : "rgba(255,255,255,0.4)";
    const cardBg = isLight ? "rgba(15,23,18,0.03)" : "rgba(255,255,255,0.03)";
    const cardBorder = isLight ? "rgba(15,23,18,0.08)" : "rgba(255,255,255,0.06)";

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fade-in"
            style={{ background: "rgba(8,12,10,0.65)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-[640px] max-h-[88vh] overflow-hidden rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.45)] animate-slide-up"
                style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="flex items-center gap-3 px-6 py-4"
                    style={{ borderBottom: `1px solid ${panelBorder}` }}
                >
                    <div
                        className="flex h-9 w-9 items-center justify-center rounded-full"
                        style={{ background: "rgba(30,211,106,0.15)", color: "#1ED36A" }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <div className="text-[15px] font-bold" style={{ color: titleColor }}>
                            Assessment Guidelines
                        </div>
                        <div className="text-[11.5px]" style={{ color: muted }}>
                            Read carefully before continuing.
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-full px-2 py-1 text-[18px] leading-none"
                        style={{ color: muted, background: "transparent" }}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: "70vh" }}>
                    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                        {GUIDELINES.map((g, i) => (
                            <div
                                key={i}
                                className="rounded-xl px-4 py-3"
                                style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                            >
                                <div
                                    className="mb-1 flex items-center gap-2 text-[12.5px] font-bold"
                                    style={{ color: titleColor }}
                                >
                                    <span
                                        className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold"
                                        style={{ background: "rgba(30,211,106,0.18)", color: "#1ED36A" }}
                                    >
                                        {i + 1}
                                    </span>
                                    {g.title}
                                </div>
                                <div className="text-[12.5px] leading-[1.55]" style={{ color: bodyColor }}>
                                    {g.body}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div
                    className="flex items-center justify-end gap-2 px-6 py-4"
                    style={{ borderTop: `1px solid ${panelBorder}` }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-full bg-[#1ED36A] px-5 py-2 text-[12.5px] font-extrabold tracking-tight text-white shadow-[0_2px_12px_rgba(30,211,106,0.3)] transition-all hover:scale-[1.02]"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuidelinesModal;
