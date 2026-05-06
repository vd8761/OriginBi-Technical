"use client";

import React, { useState } from "react";
import { highlight } from "./highlight";
import type { Difficulty, Question } from "./data";

interface QuestionPanelProps {
    question: Question;
    mcqAnswer: number | undefined;
    onMcqSelect: (idx: number) => void;
}

const DIFF_COLORS: Record<Difficulty, { bg: string; border: string; color: string }> = {
    Easy: { bg: "rgba(30,211,106,0.12)", border: "rgba(30,211,106,0.3)", color: "#1ED36A" },
    Medium: { bg: "rgba(255,183,3,0.12)", border: "rgba(255,183,3,0.3)", color: "#FFB703" },
    Hard: { bg: "rgba(237,47,52,0.12)", border: "rgba(237,47,52,0.3)", color: "#ED2F34" },
};

const DifficultyBadge: React.FC<{ level: Difficulty }> = ({ level }) => {
    const c = DIFF_COLORS[level];
    return (
        <span
            className="px-2.5 py-[3px] rounded-full text-[11px] font-bold tracking-wider"
            style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}
        >
            {level}
        </span>
    );
};

const CodeBlock: React.FC<{ code: string; lang: string }> = ({ code, lang }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard?.writeText(code).catch(() => { /* noop */ });
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };
    return (
        <div className="my-4 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0F1712]">
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.04] px-3.5 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1ED36A]">
                    {lang}
                </span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className={`bg-transparent border-0 cursor-pointer text-[11px] font-semibold transition-colors px-1.5 py-0.5 ${copied ? "text-[#1ED36A]" : "text-white/40 hover:text-white/70"
                        }`}
                >
                    {copied ? "✓ Copied" : "Copy"}
                </button>
            </div>
            <pre
                className="m-0 px-4 py-3.5 overflow-x-auto text-[13px] leading-[1.6] text-white/85 font-mono"
                dangerouslySetInnerHTML={{ __html: highlight(code, lang) }}
            />
        </div>
    );
};

const ImagePlaceholder: React.FC<{ caption: string; alt: string }> = ({ caption, alt }) => (
    <div className="my-4">
        <div className="flex flex-col items-center justify-center gap-3 min-h-[180px] rounded-xl border border-dashed border-white/15 bg-white/[0.04] p-8 text-center">
            <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
                {[0, 1, 2, 3].map((i) => (
                    <g key={i}>
                        <rect
                            x="20"
                            y={20 + i * 18}
                            width="80"
                            height="15"
                            rx="3"
                            fill={i === 0 ? "rgba(30,211,106,0.2)" : "rgba(255,255,255,0.06)"}
                            stroke={i === 0 ? "#1ED36A" : "rgba(255,255,255,0.15)"}
                            strokeWidth="1"
                        />
                        <text
                            x="60"
                            y={31 + i * 18}
                            textAnchor="middle"
                            fontSize="8"
                            fill={i === 0 ? "#1ED36A" : "rgba(255,255,255,0.5)"}
                            fontFamily="monospace"
                        >
                            {["TOP → 4", "3", "2", "1"][i]}
                        </text>
                    </g>
                ))}
                <text x="5" y="95" fontSize="9" fill="rgba(255,255,255,0.3)" fontFamily="monospace">
                    push/pop ↕
                </text>
            </svg>
            <span className="text-[12px] italic text-white/35">{alt}</span>
        </div>
        {caption && (
            <p className="mt-1.5 text-center text-[11px] italic text-white/35">{caption}</p>
        )}
    </div>
);

const VideoPlaceholder: React.FC<{ caption: string }> = ({ caption }) => {
    const [playing, setPlaying] = useState(false);
    return (
        <div className="my-4">
            <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0f0b] cursor-pointer aspect-[16/7]"
            >
                <svg width="100%" height="100%" viewBox="0 0 400 160" className="absolute inset-0">
                    {[64, 34, 25, 12, 22, 11, 90].map((h, i) => (
                        <rect
                            key={i}
                            x={40 + i * 45}
                            y={140 - h}
                            width={32}
                            height={h}
                            rx="4"
                            fill={
                                playing
                                    ? i < 3
                                        ? "#1ED36A"
                                        : "rgba(30,211,106,0.3)"
                                    : "rgba(30,211,106,0.25)"
                            }
                            stroke="rgba(30,211,106,0.4)"
                            strokeWidth="1"
                            style={{ transition: "fill 0.3s" }}
                        />
                    ))}
                    {[64, 34, 25, 12, 22, 11, 90].map((h, i) => (
                        <text
                            key={i}
                            x={56 + i * 45}
                            y={145}
                            textAnchor="middle"
                            fontSize="10"
                            fill="rgba(255,255,255,0.4)"
                            fontFamily="monospace"
                        >
                            {h}
                        </text>
                    ))}
                </svg>
                {!playing && (
                    <div className="relative z-[2] flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#1ED36A]/40 bg-[#1ED36A]/15 backdrop-blur-md">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#1ED36A">
                            <polygon points="5,3 19,12 5,21" />
                        </svg>
                    </div>
                )}
                {playing && (
                    <div className="absolute right-3 top-3 z-[2] rounded-full border border-[#1ED36A]/40 bg-[#1ED36A]/20 px-2.5 py-1 text-[11px] font-bold text-[#1ED36A]">
                        ● Playing
                    </div>
                )}
            </button>
            {caption && (
                <p className="mt-1.5 text-center text-[11px] italic text-white/35">{caption}</p>
            )}
        </div>
    );
};

interface MCQProps {
    options: string[];
    selected: number | undefined;
    onSelect: (idx: number) => void;
    revealed: boolean;
    correct: number;
}

const MCQOptions: React.FC<MCQProps> = ({ options, selected, onSelect, revealed, correct }) => (
    <div className="mt-5 flex flex-col gap-2.5">
        {options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect = revealed && i === correct;
            const isWrong = revealed && isSelected && i !== correct;
            let borderColor = isSelected ? "#1ED36A" : "var(--c-border)";
            let bgColor = isSelected ? "rgba(30,211,106,0.1)" : "var(--c-surface-raised)";
            if (isCorrect) {
                borderColor = "#1ED36A";
                bgColor = "rgba(30,211,106,0.15)";
            }
            if (isWrong) {
                borderColor = "#ED2F34";
                bgColor = "rgba(237,47,52,0.1)";
            }
            return (
                <button
                    key={i}
                    type="button"
                    onClick={() => !revealed && onSelect(i)}
                    className="flex items-center gap-3 rounded-[10px] px-4.5 py-3 text-left transition-all"
                    style={{
                        border: `1px solid ${borderColor}`,
                        background: bgColor,
                        cursor: revealed ? "default" : "pointer",
                    }}
                >
                    <div
                        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full"
                        style={{
                            border: `2px solid ${isSelected || isCorrect
                                ? "#1ED36A"
                                : isWrong
                                    ? "#ED2F34"
                                    : "var(--c-border-strong)"
                                }`,
                            background:
                                isSelected || isCorrect
                                    ? "#1ED36A"
                                    : isWrong
                                        ? "#ED2F34"
                                        : "transparent",
                        }}
                    >
                        {(isSelected || isCorrect) && (
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                        {isWrong && (
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        )}
                    </div>
                    <span
                        className="mr-1 min-w-4 text-[11px] font-bold"
                        style={{ color: "var(--c-text-faint)" }}
                    >
                        {String.fromCharCode(65 + i)}.
                    </span>
                    <span
                        className="text-[14px]"
                        style={{
                            color: isSelected || isCorrect
                                ? "var(--c-text-strong)"
                                : "var(--c-text-soft)",
                            fontWeight: isSelected ? 600 : 400,
                        }}
                    >
                        {opt}
                    </span>
                </button>
            );
        })}
    </div>
);

const QuestionPanel: React.FC<QuestionPanelProps> = ({ question, mcqAnswer, onMcqSelect }) => {
    const [revealMcq, setRevealMcq] = useState(false);

    return (
        <div
            key={question.id}
            className="coding-question-panel h-full overflow-y-auto px-7 py-6 animate-fade-in"
        >
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#1ED36A]">
                            {question.section}
                        </span>
                        <span className="text-[11px] text-white/15">·</span>
                        <DifficultyBadge level={question.difficulty} />
                        <span className="text-[11px] text-white/15">·</span>
                        <span className="text-[11px] font-semibold text-white/40">
                            {question.marks} pts
                        </span>
                        {question.type === "mcq" && (
                            <>
                                <span className="text-[11px] text-white/15">·</span>
                                <span className="rounded border border-[#FFB703]/25 bg-[#FFB703]/[0.12] px-2 py-0.5 text-[11px] font-bold text-[#FFB703]">
                                    MCQ
                                </span>
                            </>
                        )}
                    </div>
                    <h2 className="text-[18px] font-bold leading-[1.3] text-white">
                        {question.id}. {question.title}
                    </h2>
                </div>
            </div>

            <div className="my-4 h-px bg-white/[0.07]" />

            <div
                className="mb-1 text-[14px] leading-[1.7] text-white/75"
                dangerouslySetInnerHTML={{ __html: question.prompt }}
            />

            {question.pretext && (
                <CodeBlock code={question.pretext.code} lang={question.pretext.language} />
            )}

            {question.image && (
                <ImagePlaceholder caption={question.image.caption} alt={question.image.alt} />
            )}

            {question.media && <VideoPlaceholder caption={question.media.caption} />}

            {question.type === "mcq" && question.options && question.correct !== undefined && (
                <>
                    <MCQOptions
                        options={question.options}
                        selected={mcqAnswer}
                        onSelect={onMcqSelect}
                        revealed={revealMcq}
                        correct={question.correct}
                    />
                    {mcqAnswer !== undefined && !revealMcq && (
                        <button
                            type="button"
                            onClick={() => setRevealMcq(true)}
                            className="mt-3.5 cursor-pointer rounded-full border border-[#1ED36A]/30 bg-[#1ED36A]/10 px-5 py-2.5 text-[13px] font-semibold text-[#1ED36A] transition-all hover:bg-[#1ED36A]/15"
                        >
                            Check Answer
                        </button>
                    )}
                    {revealMcq && question.explanation && (
                        <div className="mt-3.5 rounded-[10px] border border-[#1ED36A]/20 bg-[#1ED36A]/[0.07] px-4 py-3">
                            <div className="mb-1 text-[12px] font-bold text-[#1ED36A]">Explanation</div>
                            <div className="text-[13px] leading-[1.6] text-white/65">
                                {question.explanation}
                            </div>
                        </div>
                    )}
                </>
            )}

            {question.testCases && (
                <div className="mt-6">
                    <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.06em] text-white/60">
                        Sample Test Cases
                    </div>
                    <div className="flex flex-col gap-2.5">
                        {question.testCases.map((tc, i) => (
                            <div
                                key={i}
                                className="rounded-[10px] border border-white/[0.07] bg-[#0F1712] px-3.5 py-3"
                            >
                                <div className="mb-1.5 flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#1ED36A]">
                                        Case {i + 1}
                                    </span>
                                </div>
                                <div className="mb-1 font-mono text-[12px] text-white/70">
                                    <span className="text-white/35">Input: </span>
                                    {tc.input}
                                </div>
                                <div className="font-mono text-[12px] text-white/70">
                                    <span className="text-white/35">Output: </span>
                                    <span className="text-[#1ED36A]">{tc.expected}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionPanel;
