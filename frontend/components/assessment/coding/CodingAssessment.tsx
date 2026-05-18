"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import QuestionPanel from "./QuestionPanel";
import CodeEditor, { LANG_META, readPrefs, writePrefs } from "./CodeEditor";
import SubmitModal, { type QStatus } from "./SubmitModal";
import SubmittingModal, { type SubmitPhase } from "./SubmittingModal";
import CompletionScreen from "./CompletionScreen";
import DevControls from "./DevControls";
import GuidelinesModal from "./GuidelinesModal";
import { QUESTIONS, TOTAL_TIME_SECONDS, type Question } from "./data";
import type { RunResult } from "./runWithJudge0";
import { useTabPanic, useTabSwitchMonitor, useTimer } from "./hooks";
import {
    EMPTY_COUNTERS,
    exitFullscreen,
    requestFullscreen,
    useProctoring,
    useProctoringSettings,
    type ProctoringCounter,
    type ProctoringCounters,
    type ProctoringSettings,
} from "./proctoring";
import {
    runAttemptCode,
    saveAttemptAnswer,
    sendAttemptEvents,
    sendAttemptHeartbeat,
    submitAttempt,
    type AnswerPayload,
    type AttemptEventInput,
    type AttemptSnapshot,
    type CodeRunRequest,
    type CodeRunResponse,
    type SnapshotQuestion,
} from "@/lib/api";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { MountPoint, useCommandStream, usePluginRuntime } from "@/plugins";

const STATUS_KEY = "ob_statuses";
const CURRENT_Q_KEY = "ob_current_q";
const PENDING_SUBMIT_KEY = "ob_pending_submission";
const MAX_SUBMIT_ATTEMPTS = 8;
const LEGACY_TECH_API_URL = (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "" : process.env.NEXT_PUBLIC_TECH_API_URL?.replace(/\/$/, ""));
type AssessmentMode = "trial" | "main";
type LegacyAssessmentConfig = {
    module_type?: string;
    assessment_code?: string;
    trial_attempts_limit?: number | string | null;
    main_attempts_limit?: number | string | null;
};

interface CodingAssessmentProps {
    lang: string;
    snapshot?: AttemptSnapshot | null;
    mode?: AssessmentMode;
}

type SnapshotBody = Omit<Partial<Question>, "options" | "testCases"> & {
    responseType?: string;
    type?: string;
    difficulty?: string;
    title?: string;
    section?: string;
    prompt?: string;
    options?: Array<string | { label?: string; text?: string; value?: string }>;
    testCases?: { input?: string; stdin?: string; expected?: string }[];
};

const difficultyLabel = (value: unknown): Question["difficulty"] => {
    const normalized = String(value ?? "").toLowerCase();
    if (normalized === "easy") return "Easy";
    if (normalized === "hard") return "Hard";
    return "Medium";
};

const mapSnapshotQuestion = (question: SnapshotQuestion): Question => {
    const body = (question.body && typeof question.body === "object"
        ? question.body
        : {}) as SnapshotBody;
    const rawType = String(body.type ?? "").toLowerCase();
    const responseType = String(body.responseType ?? "").toLowerCase();
    const hasImage = !!body.image;
    const hasMedia = !!body.media;
    const type: Question["type"] =
        responseType === "mcq" || rawType === "mcq"
            ? "mcq"
            : hasImage
                ? "image"
                : hasMedia || rawType === "media"
                    ? "media"
                    : "code-pretext";
    const options = Array.isArray(body.options)
        ? body.options.map((option) =>
            typeof option === "string" ? option : option.label ?? option.text ?? option.value ?? "",
        ).filter(Boolean)
        : undefined;

    return {
        id: question.ordinal,
        type,
        difficulty: difficultyLabel(body.difficulty),
        marks: question.score,
        section: body.section ?? "Coding",
        title: body.title ?? `Question ${question.ordinal}`,
        prompt: body.prompt ?? "",
        pretext: body.pretext,
        image: body.image,
        media: body.media,
        options,
        starterCode: body.starterCode,
        starterFiles: body.starterFiles,
        entryFile: body.entryFile,
        testCases: body.testCases?.map((tc) => ({
            input: tc.input ?? tc.stdin ?? "",
            stdin: tc.stdin,
            expected: tc.expected ?? "",
        })),
        limits: body.limits,
        allowedLanguages: Array.isArray(body.allowedLanguages)
            ? body.allowedLanguages.map((v) => String(v))
            : undefined,
    };
};

const formatTime = (secs: number) => {
    const safe = Math.max(0, secs);
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const payloadToRecord = (payload: unknown): Record<string, unknown> => {
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        return payload as Record<string, unknown>;
    }
    return {};
};

const FlagBadge: React.FC = () => (
    <div
        className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
        style={{ background: "#FFB703" }}
        aria-label="Flagged"
    >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
            <path d="M5 4 L5 21" />
            <path d="M5 4 L18 7 L5 11 Z" />
        </svg>
    </div>
);

interface SidebarProps {
    questions: Question[];
    current: number;
    statuses: Record<number, QStatus>;
    onSelect: (idx: number) => void;
    theme: "dark" | "light";
}

const QuestionSidebar: React.FC<SidebarProps> = ({
    questions,
    current,
    statuses,
    onSelect,
    theme,
}) => {
    const isLight = theme === "light";
    const idleBg = isLight ? "rgba(15,23,18,0.04)" : "rgba(255,255,255,0.04)";
    const idleOutline = isLight ? "1px solid rgba(15,23,18,0.08)" : "1px solid rgba(255,255,255,0.07)";
    const idleText = isLight ? "rgba(15,23,18,0.7)" : "rgba(255,255,255,0.6)";
    const dividerColor = isLight ? "rgba(15,23,18,0.08)" : "rgba(255,255,255,0.06)";
    return (
        <div className="coding-sidebar flex w-[68px] flex-shrink-0 flex-col items-center gap-1.5 overflow-y-auto border-r py-3">
            {questions.map((q, i) => {
                const st: QStatus = statuses[q.id] ?? "unattempted";
                const isActive = i === current;
                const isFlagged = st === "flagged";
                const isSolved = st === "solved";

                let bg = idleBg;
                let outline = idleOutline;
                let textColor = idleText;

                if (isFlagged) {
                    bg = "rgba(255,183,3,0.18)";
                    outline = isActive ? "2px solid #FFB703" : "1px solid rgba(255,183,3,0.5)";
                    textColor = "#FFB703";
                } else if (isActive && isSolved) {
                    bg = "#1ED36A";
                    outline = "2px solid #1ED36A";
                    textColor = "#FFFFFF";
                } else if (isActive) {
                    bg = "transparent";
                    outline = "2px solid #1ED36A";
                    textColor = "#1ED36A";
                } else if (isSolved) {
                    bg = "rgba(30,211,106,0.14)";
                    outline = "1px solid rgba(30,211,106,0.4)";
                    textColor = isLight ? "#0FA255" : "rgba(30,211,106,0.9)";
                }

                return (
                    <button
                        key={q.id}
                        type="button"
                        onClick={() => onSelect(i)}
                        title={`Q${q.id}: ${q.title}`}
                        className="relative flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-[10px] border-0 transition-all"
                        style={{ background: bg, outline, outlineOffset: "-1px" }}
                    >
                        <span
                            className="text-[13px] tabular-nums"
                            style={{
                                fontWeight: isActive ? 800 : 600,
                                color: textColor,
                            }}
                        >
                            {String(q.id).padStart(2, "0")}
                        </span>
                        {isFlagged && (
                            <div className="absolute -right-1 -top-1">
                                <FlagBadge />
                            </div>
                        )}
                    </button>
                );
            })}
            <div
                className="mt-auto flex w-full flex-col items-start gap-1 border-t px-2.5 pt-3"
                style={{ borderColor: dividerColor }}
            >
                {[
                    ["#1ED36A", "Solved"],
                    ["#FFB703", "Flagged"],
                    ["#4AC6EA", "Tried"],
                ].map(([c, l]) => (
                    <div key={l} className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                        <span className="coding-sidebar-legend whitespace-nowrap text-[9px]">{l}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const lerpColor = (a: [number, number, number], b: [number, number, number], t: number) => {
    const c = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
    return `rgb(${c(0)}, ${c(1)}, ${c(2)})`;
};

// Smooth red → yellow → green morph keyed by remaining ratio.
const colorForRatio = (ratio: number) => {
    const r = Math.max(0, Math.min(1, ratio));
    const red: [number, number, number] = [237, 47, 52];
    const yellow: [number, number, number] = [255, 183, 3];
    const green: [number, number, number] = [30, 211, 106];
    if (r < 0.5) return lerpColor(red, yellow, r / 0.5);
    return lerpColor(yellow, green, (r - 0.5) / 0.5);
};

const TimerDisplay: React.FC<{ time: number; total: number; theme: "dark" | "light" }> = ({
    time,
    total,
    theme,
}) => {
    const ratio = total > 0 ? Math.max(0, Math.min(1, time / total)) : 0;
    const critical = ratio < 0.08;
    const stroke = colorForRatio(ratio);
    const isLight = theme === "light";
    const trackColor = isLight ? "rgba(15,23,18,0.08)" : "rgba(255,255,255,0.08)";

    // Border-only progress: SVG outline traces the chip's rounded rectangle.
    // The visible "border" is the progress stroke; the static track sits underneath.
    const w = 112;
    const h = 36;
    const r = 18;
    // Path length of a rounded rect: 2(w + h) - 8r + 2πr
    const perim = 2 * (w + h) - 8 * r + 2 * Math.PI * r;

    return (
        <div
            className="relative flex h-9 items-center justify-center"
            style={{ width: w }}
        >
            <svg
                width={w}
                height={h}
                viewBox={`0 0 ${w} ${h}`}
                className="absolute inset-0"
                style={{ pointerEvents: "none" }}
            >
                <rect
                    x="1"
                    y="1"
                    width={w - 2}
                    height={h - 2}
                    rx={r - 1}
                    ry={r - 1}
                    fill={isLight ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.04)"}
                    stroke={trackColor}
                    strokeWidth="1.5"
                />
                <rect
                    x="1"
                    y="1"
                    width={w - 2}
                    height={h - 2}
                    rx={r - 1}
                    ry={r - 1}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={perim}
                    strokeDashoffset={perim * (1 - ratio)}
                    style={{
                        transition: "stroke-dashoffset 1s linear, stroke 0.4s ease",
                        // SVG path starts at top-right; rotate so the trace begins at top-center.
                        transformOrigin: "center",
                    }}
                />
            </svg>
            <span
                className={`relative text-[14px] font-extrabold leading-none tracking-tight tabular-nums ${critical ? "animate-pulse-soft" : ""}`}
                style={{ color: stroke }}
            >
                {formatTime(time)}
            </span>
        </div>
    );
};

const SaveIndicator: React.FC<{ saved: boolean }> = ({ saved }) => (
    <div
        className="flex items-center gap-1.5 text-[11px] transition-colors"
        style={{ color: saved ? "#1ED36A" : "var(--c-text-muted)" }}
    >
        {saved ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
            </svg>
        ) : (
            <div
                className="h-2 w-2 rounded-full border-[1.5px] animate-spin-fast"
                style={{
                    borderColor: "var(--c-border)",
                    borderTopColor: "var(--c-text-soft)",
                }}
            />
        )}
        <span className="font-semibold">{saved ? "Saved" : "Saving…"}</span>
    </div>
);

interface HeaderProps {
    question: Question;
    currentQ: number;
    totalQ: number;
    timer: ReturnType<typeof useTimer>;
    saved: boolean;
    onSubmit: () => void;
    onPrev: () => void;
    onNext: () => void;
    onMarkSolved: () => void;
    onFlag: () => void;
    isSolved: boolean;
    isFlagged: boolean;
    languageLabel: string;
    theme: "dark" | "light";
    onToggleTheme: () => void;
    onShowGuidelines: () => void;
    mode?: 'trial' | 'main';
    attemptsCount?: number | null;
    attemptsLimit?: number | null;
}

const Header: React.FC<HeaderProps> = ({
    question,
    currentQ,
    totalQ,
    timer,
    saved,
    onSubmit,
    onPrev,
    onNext,
    onMarkSolved,
    onFlag,
    isSolved,
    isFlagged,
    languageLabel,
    theme,
    onToggleTheme,
    onShowGuidelines,
    mode = 'main',
    attemptsCount,
    attemptsLimit,
}) => (
    <div className="coding-header relative z-50 flex h-14 flex-shrink-0 items-center gap-3 border-b px-4 backdrop-blur-xl">
        <Image
            src="/Origin-BI-white-logo.png"
            alt="Origin BI"
            width={108}
            height={18}
            className="h-[18px] flex-shrink-0"
            style={{ width: "auto", height: "18px" }}
            priority
        />
        <div className="h-7 w-px flex-shrink-0 bg-white/10" />
        <div className="flex-shrink-0">
            <div className="text-[13px] font-bold leading-none text-white flex items-center gap-1.5 flex-wrap">
                <span>Coding Assessment</span>
                {mode === 'trial' && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        Trial Test
                    </span>
                )}
            </div>
            <div className="mt-0.5 text-[10px] text-white flex items-center gap-1">
                <span>Q{currentQ + 1} / {totalQ} · {question.section} · {languageLabel}</span>
                <span className="text-white">&middot;</span>
                <span className="font-semibold text-white">
                    Attempt {attemptsCount ?? 1} of {attemptsLimit ?? (mode === 'trial' ? 5 : 2)}
                </span>
            </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="h-[3px] flex-1 min-w-[60px] overflow-hidden rounded-sm bg-white/[0.08]">
                <div
                    className="h-full rounded-sm bg-[#1ED36A] transition-[width] duration-[400ms] ease-out"
                    style={{ width: `${(currentQ / totalQ) * 100}%` }}
                />
            </div>
            <SaveIndicator saved={saved} />
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
            <button
                type="button"
                onClick={onMarkSolved}
                title={isSolved ? "Mark as unsolved" : "Mark as Solved"}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[12px] font-bold transition-all coding-chip"
                style={{
                    background: isSolved ? "rgba(30,211,106,0.15)" : undefined,
                    borderColor: isSolved ? "rgba(30,211,106,0.4)" : undefined,
                    color: isSolved ? "#1ED36A" : undefined,
                }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
                {isSolved ? "Solved" : "Mark Solved"}
            </button>
            <button
                type="button"
                onClick={onFlag}
                title={isFlagged ? "Unflag" : "Flag for review"}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[12px] font-bold transition-all coding-chip"
                style={{
                    background: isFlagged ? "rgba(255,183,3,0.12)" : undefined,
                    borderColor: isFlagged ? "rgba(255,183,3,0.35)" : undefined,
                    color: isFlagged ? "#FFB703" : undefined,
                }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill={isFlagged ? "#FFB703" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
                {isFlagged ? "Flagged" : "Flag"}
            </button>
            <button
                type="button"
                onClick={onPrev}
                disabled={currentQ === 0}
                className="coding-chip flex h-9 w-9 items-center justify-center rounded-lg disabled:cursor-not-allowed"
                style={{ cursor: currentQ === 0 ? "not-allowed" : "pointer" }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>
            <button
                type="button"
                onClick={onNext}
                disabled={currentQ === totalQ - 1}
                className="coding-chip flex h-9 w-9 items-center justify-center rounded-lg disabled:cursor-not-allowed"
                style={{ cursor: currentQ === totalQ - 1 ? "not-allowed" : "pointer" }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>

            <button
                type="button"
                onClick={onShowGuidelines}
                title="Assessment guidelines"
                aria-label="Assessment guidelines"
                className="coding-chip flex h-9 w-9 items-center justify-center rounded-lg"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
            </button>

            <button
                type="button"
                onClick={onToggleTheme}
                title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                aria-label="Toggle theme"
                className="coding-chip flex h-9 w-9 items-center justify-center rounded-lg"
            >
                {theme === "dark" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                    </svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                )}
            </button>

            <TimerDisplay time={timer.time} total={TOTAL_TIME_SECONDS} theme={theme} />

            <button
                type="button"
                onClick={onSubmit}
                className="flex h-9 cursor-pointer items-center rounded-full border-0 bg-[#1ED36A] px-5 text-[13px] font-extrabold tracking-tight text-white shadow-[0_2px_12px_rgba(30,211,106,0.3)] transition-all hover:scale-[1.02]"
            >
                Submit
            </button>
        </div>
    </div>
);

interface ProctorToastProps {
    visible: boolean;
    title: string;
    desc: string;
}

const ProctorToast: React.FC<ProctorToastProps> = ({ visible, title, desc }) => (
    <div
        className="pointer-events-none fixed left-1/2 top-20 z-[150] -translate-x-1/2 transform"
        style={{
            opacity: visible ? 1 : 0,
            transform: `translateX(-50%) translateY(${visible ? 0 : -8}px)`,
            transition: "opacity 0.25s, transform 0.25s",
        }}
    >
        <div
            className="flex max-w-[420px] items-start gap-3 rounded-2xl px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl"
            style={{
                background: "color-mix(in srgb, var(--c-card) 95%, transparent)",
                border: "1px solid rgba(255,183,3,0.4)",
            }}
        >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#FFB703]/15 text-[#FFB703]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 9v4M12 17h.01" />
                    <circle cx="12" cy="12" r="10" />
                </svg>
            </div>
            <div className="text-[12.5px] leading-snug">
                <div className="font-bold" style={{ color: "var(--c-warn)" }}>{title}</div>
                <div className="mt-0.5" style={{ color: "var(--c-text-soft)" }}>{desc}</div>
            </div>
        </div>
    </div>
);

const CodingAssessment: React.FC<CodingAssessmentProps> = ({ lang, snapshot, mode = "main" }) => {
    const router = useRouter();
    const languageLabel = LANG_META[lang]?.label ?? lang;
    const questions = useMemo(
        () => snapshot?.questions?.length
            ? snapshot.questions.map(mapSnapshotQuestion)
            : QUESTIONS,
        [snapshot],
    );
    const backendAttemptId = snapshot?.attempt.id;
    const pluginRuntime = usePluginRuntime();
    useCommandStream(backendAttemptId ?? null);
    const examQuestionByLocalId = useMemo(() => {
        const map: Record<number, string> = {};
        snapshot?.questions.forEach((question) => {
            map[question.ordinal] = question.examQuestionId;
        });
        return map;
    }, [snapshot]);
    const [hydrated, setHydrated] = useState(false);
    const [currentQ, setCurrentQ] = useState(0);
    const [statuses, setStatuses] = useState<Record<number, QStatus>>({});
    const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
    const [answerPayloads, setAnswerPayloads] = useState<Record<number, AnswerPayload>>({});
    const [showSubmit, setShowSubmit] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitPhase, setSubmitPhase] = useState<SubmitPhase | null>(null);
    const [submitAttemptNo, setSubmitAttemptNo] = useState(1);
    const [submitNextRetryIn, setSubmitNextRetryIn] = useState(0);
    // Mutable refs so async submit loop sees latest state without re-binding.
    const submitTriggerRef = useRef<(() => void) | null>(null);
    const terminationHandledRef = useRef(false);
    const [saved, setSaved] = useState(true);
    const [splitPct, setSplitPct] = useState(42);
    const [fontSize, setFontSize] = useState(14);

    const [attemptsCount, setAttemptsCount] = useState<number | null>(null);
    const [attemptsLimit, setAttemptsLimit] = useState<number | null>(null);

    useEffect(() => {
        const fetchEngineStats = async () => {
            if (!LEGACY_TECH_API_URL) {
                setAttemptsCount(1);
                setAttemptsLimit(null);
            }
            try {
                let activeEmail: string | undefined = undefined;
                try {
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
                } catch (err) {
                    console.error("Error reading profile email:", err);
                }

                const emailParam = activeEmail ? `?userId=${encodeURIComponent(activeEmail)}` : "";
                const [statsRes, assessmentsRes] = await Promise.all([
                    fetch(`${LEGACY_TECH_API_URL}/api/assessment/attempts-stats${emailParam}`),
                    fetch(`${LEGACY_TECH_API_URL}/api/assessment/admin/assessments`)
                ]);
                if (!statsRes.ok || !assessmentsRes.ok) return;
                const statsJson = await statsRes.json();
                if (statsJson?.data) {
                    const cnt = statsJson.data['coding']?.[mode] ?? 0;
                    setAttemptsCount(cnt > 0 ? cnt : 1);
                }
                const assessmentsJson = await assessmentsRes.json();
                if (assessmentsJson?.data) {
                    const configs = assessmentsJson.data as LegacyAssessmentConfig[];
                    const found = configs.find(
                        (a) => a.module_type === 'coding' || a.assessment_code === 'coding'
                    );
                    if (found) {
                        const lim = mode === 'trial' ? found.trial_attempts_limit : found.main_attempts_limit;
                        setAttemptsLimit(Number(lim));
                    }
                }
            } catch {
                // The Nest assessment admin API is optional for this coding runtime.
            }
        };
        fetchEngineStats();
    }, [mode]);
    // Editor feature toggles, loaded once from coding prefs.
    const [editorFindEnabled, setEditorFindEnabledState] = useState<boolean>(
        () => readPrefs().findEnabled ?? true,
    );
    const [editorSuggestionsEnabled, setEditorSuggestionsEnabledState] = useState<boolean>(
        () => readPrefs().suggestionsEnabled ?? true,
    );
    const [editorLintsEnabled, setEditorLintsEnabledState] = useState<boolean>(
        () => readPrefs().lintsEnabled ?? true,
    );
    const setEditorFindEnabled = useCallback((v: boolean) => {
        setEditorFindEnabledState(v);
        writePrefs({ ...readPrefs(), findEnabled: v });
    }, []);
    const setEditorSuggestionsEnabled = useCallback((v: boolean) => {
        setEditorSuggestionsEnabledState(v);
        writePrefs({ ...readPrefs(), suggestionsEnabled: v });
    }, []);
    const setEditorLintsEnabled = useCallback((v: boolean) => {
        setEditorLintsEnabledState(v);
        writePrefs({ ...readPrefs(), lintsEnabled: v });
    }, []);
    const { theme, toggleTheme } = useTheme();
    const [showGuidelines, setShowGuidelines] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const saveTimerRef = useRef<number | null>(null);

    const initialSeconds = Math.max(
        1,
        Math.floor((snapshot?.attempt.timeRemainingMs ?? TOTAL_TIME_SECONDS * 1000) / 1000),
    );
    const timer = useTimer(initialSeconds, { persist: !snapshot });

    const proctoring = useProctoringSettings();
    const proctoringActive = !submitted;

    const tabMonitor = useTabSwitchMonitor(proctoringActive && proctoring.settings.tabSwitch);

    useTabPanic(proctoringActive, tabMonitor.hidden);

    const [counters, setCounters] = useState<ProctoringCounters>({ ...EMPTY_COUNTERS });
    const [toastVisible, setToastVisible] = useState(false);
    const [lastViolation, setLastViolation] = useState<{ title: string; desc: string }>({
        title: "Tab switch detected",
        desc: "Stay on this tab during the assessment.",
    });
    const lastReportedSwitch = useRef(0);
    const toastHideTimer = useRef<number | null>(null);
    const eventQueueRef = useRef<AttemptEventInput[]>([]);

    const flushTraceEvents = useCallback(
        async (keepalive = false) => {
            if (!backendAttemptId || eventQueueRef.current.length === 0) return;
            const batch = eventQueueRef.current.splice(0, 200);
            try {
                await sendAttemptEvents(backendAttemptId, batch, { keepalive });
            } catch {
                eventQueueRef.current = [...batch, ...eventQueueRef.current].slice(0, 200);
            }
        },
        [backendAttemptId],
    );

    const traceEvent = useCallback(
        (
            kind: string,
            severity = 0,
            payload: Record<string, unknown> = {},
            localQuestionId?: number,
        ) => {
            if (!backendAttemptId) return;
            const event: AttemptEventInput = {
                occurred_at: new Date().toISOString(),
                kind,
                severity,
                payload: {
                    currentQuestion: currentQ + 1,
                    ...payload,
                },
            };
            if (localQuestionId != null) {
                const examQuestionId = examQuestionByLocalId[localQuestionId];
                if (examQuestionId) event.exam_question_id = examQuestionId;
            }
            eventQueueRef.current.push(event);
            if (eventQueueRef.current.length >= 25) {
                void flushTraceEvents();
            }
        },
        [backendAttemptId, currentQ, examQuestionByLocalId, flushTraceEvents],
    );

    const showViolationToast = useCallback((title: string, desc: string) => {
        setLastViolation({ title, desc });
        setToastVisible(true);
        if (toastHideTimer.current != null) {
            window.clearTimeout(toastHideTimer.current);
        }
        toastHideTimer.current = window.setTimeout(() => {
            setToastVisible(false);
        }, 4500);
    }, []);

    const handleProctorViolation = useCallback(
        (type: ProctoringCounter, message: { title: string; desc: string }) => {
            setCounters((prev) => ({ ...prev, [type]: prev[type] + 1 }));
            showViolationToast(message.title, message.desc);
            traceEvent(`proctor.${type}`, 2, {
                title: message.title,
                description: message.desc,
            });
        },
        [showViolationToast, traceEvent],
    );

    useProctoring({
        active: proctoringActive,
        settings: proctoring.settings,
        onViolation: handleProctorViolation,
    });

    useEffect(() => {
        if (!backendAttemptId) return;
        const id = window.setInterval(() => {
            void flushTraceEvents();
        }, 5000);
        return () => window.clearInterval(id);
    }, [backendAttemptId, flushTraceEvents]);

    useEffect(() => {
        if (!backendAttemptId) return;
        const flushOnExit = () => {
            void flushTraceEvents(true);
        };
        window.addEventListener("pagehide", flushOnExit);
        document.addEventListener("visibilitychange", flushOnExit);
        return () => {
            window.removeEventListener("pagehide", flushOnExit);
            document.removeEventListener("visibilitychange", flushOnExit);
        };
    }, [backendAttemptId, flushTraceEvents]);

    // Load persisted state on mount (client only — avoid hydration mismatch)
    useEffect(() => {
        if (snapshot) {
            const nextStatuses: Record<number, QStatus> = {};
            const nextMcq: Record<number, number> = {};
            const nextPayloads: Record<number, AnswerPayload> = {};
            snapshot.answers.forEach((answer) => {
                const ordinal = snapshot.questions.find(
                    (question) => question.examQuestionId === answer.examQuestionId,
                )?.ordinal;
                if (!ordinal) return;
                if (answer.state !== "unattempted") {
                    nextStatuses[ordinal] =
                        answer.state === "viewed" || answer.state === "skipped"
                            ? "attempted"
                            : answer.state;
                }
                nextPayloads[ordinal] = answer.payload ?? {};
                if (typeof answer.payload?.mcqAnswer === "number") {
                    nextMcq[ordinal] = answer.payload.mcqAnswer;
                }
            });
            const id = window.setTimeout(() => {
                setStatuses(nextStatuses);
                setMcqAnswers(nextMcq);
                setAnswerPayloads(nextPayloads);
                const seenGuidelines = window.localStorage.getItem("ob_coding_guidelines_seen");
                if (!seenGuidelines) {
                    setShowGuidelines(true);
                }
                setHydrated(true);
            }, 0);
            return () => window.clearTimeout(id);
        }
        let nextQ: number | null = null;
        let nextStatuses: Record<number, QStatus> | null = null;
        let showInitialGuidelines = false;
        try {
            const cq = window.localStorage.getItem(CURRENT_Q_KEY);
            if (cq) {
                const parsed = parseInt(cq, 10);
                if (!Number.isNaN(parsed)) nextQ = parsed;
            }
            const st = window.localStorage.getItem(STATUS_KEY);
            if (st) {
                const parsed = JSON.parse(st);
                if (parsed && typeof parsed === "object") nextStatuses = parsed;
            }
            const seenGuidelines = window.localStorage.getItem("ob_coding_guidelines_seen");
            if (!seenGuidelines) {
                showInitialGuidelines = true;
            }
        } catch {
            /* ignore */
        }
        const id = window.setTimeout(() => {
            if (nextQ != null) setCurrentQ(nextQ);
            if (nextStatuses) setStatuses(nextStatuses);
            if (showInitialGuidelines) setShowGuidelines(true);
            setHydrated(true);
        }, 0);
        return () => window.clearTimeout(id);
    }, [snapshot]);

    const handleShowGuidelines = useCallback(() => {
        setShowGuidelines(true);
    }, []);

    const handleCloseGuidelines = useCallback(() => {
        setShowGuidelines(false);
        try {
            window.localStorage.setItem("ob_coding_guidelines_seen", "1");
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        if (!hydrated || snapshot) return;
        try {
            window.localStorage.setItem(CURRENT_Q_KEY, String(currentQ));
        } catch {
            /* ignore */
        }
    }, [currentQ, hydrated, snapshot]);

    useEffect(() => {
        if (!hydrated || snapshot) return;
        try {
            window.localStorage.setItem(STATUS_KEY, JSON.stringify(statuses));
        } catch {
            /* ignore */
        }
    }, [statuses, hydrated, snapshot]);

    // Show toast each new tab switch returns (gated by setting)
    useEffect(() => {
        if (tabMonitor.count > lastReportedSwitch.current) {
            const newSwitches = tabMonitor.count - lastReportedSwitch.current;
            lastReportedSwitch.current = tabMonitor.count;
            traceEvent("proctor.tab_switch", 2, {
                newSwitches,
                totalSwitches: tabMonitor.count,
                hidden: tabMonitor.hidden,
            });
            if (proctoring.settings.tabSwitchToast) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                showViolationToast(
                    "Tab switch detected",
                    `Stay on this tab during the assessment. ${tabMonitor.count} switch${tabMonitor.count === 1 ? "" : "es"} recorded so far — this is part of the proctoring report.`,
                );
            }
            void newSwitches;
        }
    }, [
        proctoring.settings.tabSwitchToast,
        showViolationToast,
        tabMonitor.count,
        tabMonitor.hidden,
        traceEvent,
    ]);

    const triggerSave = useCallback(() => {
        setSaved(false);
        if (saveTimerRef.current != null) {
            window.clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = window.setTimeout(() => setSaved(true), 900);
    }, []);

    const handleResizerMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const container = containerRef.current;
        const onMove = (me: MouseEvent) => {
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const pct = ((me.clientX - rect.left) / rect.width) * 100;
            setSplitPct(Math.max(28, Math.min(65, pct)));
        };
        const onUp = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }, []);

    const q = questions[currentQ];
    const qStatus: QStatus = statuses[q?.id] ?? "unattempted";
    const isSolved = qStatus === "solved";
    const isFlagged = qStatus === "flagged";

    useEffect(() => {
        if (questions.length > 0 && currentQ >= questions.length) {
            const id = window.setTimeout(() => setCurrentQ(questions.length - 1), 0);
            return () => window.clearTimeout(id);
        }
    }, [currentQ, questions.length]);

    const buildPayloadForQuestion = useCallback(
        (qId: number): AnswerPayload => ({
            ...(answerPayloads[qId] ?? {}),
            language: lang,
            mcqAnswer: mcqAnswers[qId] ?? null,
        }),
        [answerPayloads, lang, mcqAnswers],
    );

    const persistQuestion = useCallback(
        async (qId: number, stateOverride?: QStatus, payloadOverride?: AnswerPayload) => {
            if (!backendAttemptId) {
                triggerSave();
                return;
            }
            const examQuestionId = examQuestionByLocalId[qId];
            if (!examQuestionId) return;
            setSaved(false);
            const state = stateOverride ?? statuses[qId] ?? "unattempted";
            const payload = payloadOverride ?? buildPayloadForQuestion(qId);
            await saveAttemptAnswer(backendAttemptId, examQuestionId, { state, payload });
            traceEvent("answer.autosaved", 0, {
                state,
                hasFiles: Array.isArray(payload.files),
                fileCount: payload.files?.length ?? 0,
                payloadBytes: JSON.stringify(payload).length,
            }, qId);
            setSaved(true);
        },
        [
            backendAttemptId,
            buildPayloadForQuestion,
            examQuestionByLocalId,
            statuses,
            traceEvent,
            triggerSave,
        ],
    );

    useEffect(() => {
        if (!hydrated || !backendAttemptId || !q?.id) return;
        const id = window.setInterval(() => {
            void persistQuestion(q.id).catch(() => setSaved(false));
        }, 10000);
        return () => window.clearInterval(id);
    }, [backendAttemptId, hydrated, persistQuestion, q?.id]);

    const setQuestionStatus = useCallback((qId: number, next: QStatus) => {
        setStatuses((s) => {
            const updated = { ...s };
            if (next === "unattempted") {
                delete updated[qId];
            } else {
                updated[qId] = next;
            }
            return updated;
        });
    }, []);

    const handleMarkSolved = () => {
        const next: QStatus = qStatus === "solved" ? "unattempted" : "solved";
        setQuestionStatus(q.id, next);
        traceEvent("question.status_changed", 0, { state: next, action: "mark_solved" }, q.id);
        void persistQuestion(q.id, next).catch(() => setSaved(false));
    };

    const handleFlag = () => {
        const next: QStatus = qStatus === "flagged" ? "unattempted" : "flagged";
        setQuestionStatus(q.id, next);
        traceEvent("question.status_changed", 0, { state: next, action: "flag" }, q.id);
        void persistQuestion(q.id, next).catch(() => setSaved(false));
    };

    const handleMcqSelect = (qId: number, idx: number) => {
        const nextPayload: AnswerPayload = {
            ...buildPayloadForQuestion(qId),
            mcqAnswer: idx,
        };
        setAnswerPayloads((payloads) => ({ ...payloads, [qId]: nextPayload }));
        setMcqAnswers((a) => ({ ...a, [qId]: idx }));
        const nextState = statuses[qId] === "solved" ? "solved" : "attempted";
        setStatuses((s) => ({
            ...s,
            [qId]: nextState,
        }));
        traceEvent("question.mcq_selected", 0, { selected: idx, state: nextState }, qId);
        void persistQuestion(qId, nextState, nextPayload).catch(() => setSaved(false));
    };

    const handleWorkspaceChange = useCallback(
        (qId: number, payload: AnswerPayload) => {
            const nextPayload: AnswerPayload = {
                ...payload,
                language: lang,
                mcqAnswer: mcqAnswers[qId] ?? null,
            };
            setAnswerPayloads((payloads) => ({ ...payloads, [qId]: nextPayload }));
            setStatuses((s) => ({
                ...s,
                [qId]: s[qId] === "solved" || s[qId] === "flagged" ? s[qId] : "attempted",
            }));
            traceEvent("workspace.changed", 0, {
                fileCount: payload.files?.length ?? 0,
                entryFile: payload.entryFile,
            }, qId);
            triggerSave();
        },
        [lang, mcqAnswers, traceEvent, triggerSave],
    );

    const runCodeOnServer = useCallback(
        async (qId: number, input: CodeRunRequest): Promise<RunResult | undefined> => {
            if (!backendAttemptId) return undefined;
            const examQuestionId = examQuestionByLocalId[qId];
            if (!examQuestionId) return undefined;
            const response: CodeRunResponse = await runAttemptCode(
                backendAttemptId,
                examQuestionId,
                input,
            );
            traceEvent("code.run_completed", response.type === "success" ? 0 : 1, {
                mode: input.mode,
                language: input.language,
                runId: response.runId,
                type: response.type,
                summary: response.summary,
                testResults: response.testResults?.length ?? 0,
            }, qId);
            const payload: AnswerPayload = {
                language: input.language,
                files: input.files,
                entryFile: input.entryFile,
                mcqAnswer: mcqAnswers[qId] ?? null,
                lastRunId: response.runId,
                lastRunSummary: response.summary,
            };
            setAnswerPayloads((payloads) => ({ ...payloads, [qId]: payload }));
            return {
                type: response.type,
                stdout: response.stdout,
                stderr: response.stderr,
                testResults: response.testResults ?? null,
                time: response.time,
                memory: response.memory,
                summary: response.summary,
            };
        },
        [backendAttemptId, examQuestionByLocalId, mcqAnswers, traceEvent],
    );

    const clearStorage = useCallback(() => {
        try {
            window.localStorage.removeItem("ob_exam_time");
            window.localStorage.removeItem(CURRENT_Q_KEY);
            window.localStorage.removeItem(STATUS_KEY);
            window.localStorage.removeItem("ob_tab_switches");
            window.localStorage.removeItem("ob_tab_switch_grace_start");
            window.localStorage.removeItem(PENDING_SUBMIT_KEY);
        } catch {
            /* ignore */
        }
    }, []);

    // Submit is intentionally a resilient, non-cancellable flow:
    //   1. Snapshot the answer set + attempt id and stash it in localStorage
    //      so a page reload / browser crash can resume.
    //   2. Show a non-closable "Submitting…" modal.
    //   3. Try up to MAX_ATTEMPTS with exponential backoff between failures.
    //   4. On terminal failure, surface a manual Retry button; the timer
    //      stays paused and answers stay buffered until the user retries.
    //   5. Only on a 200 do we mark `submitted` and clear storage.

    const performSubmitWithRetry = useCallback(
        async (
            attemptId: string,
            answers: Array<{
                examQuestionId: string;
                state: string;
                payload: ReturnType<typeof buildPayloadForQuestion>;
            }>,
        ) => {
            setSubmitPhase("submitting");
            setSubmitAttemptNo(1);

            for (let i = 1; i <= MAX_SUBMIT_ATTEMPTS; i++) {
                setSubmitAttemptNo(i);
                setSubmitPhase("submitting");
                try {
                    await submitAttempt(attemptId, answers);
                    setSubmitPhase("succeeded");
                    traceEvent("attempt.submit_succeeded", 0, {
                        answerCount: answers.length,
                        attemptNumber: i,
                    });
                    void flushTraceEvents();
                    try {
                        window.localStorage.removeItem(PENDING_SUBMIT_KEY);
                    } catch { /* ignore */ }
                    // Brief delay so the user sees the success state.
                    await new Promise((r) => setTimeout(r, 700));
                    return true;
                } catch (err) {
                    const message =
                        err instanceof Error ? err.message : "Submit failed.";
                    traceEvent("attempt.submit_attempt_failed", 2, {
                        error: message,
                        attemptNumber: i,
                    });
                    void flushTraceEvents();

                    // If the server explicitly returned 4xx (other than 401 which
                    // the api layer auto-refreshes), it won't get better — bail.
                    const status = (err as { status?: number })?.status;
                    const isRetriable =
                        status === undefined || status >= 500 || status === 401 || status === 408;

                    if (!isRetriable || i === MAX_SUBMIT_ATTEMPTS) {
                        setSubmitError(message);
                        setSubmitPhase("failed_offline");
                        return false;
                    }
                    // Exponential backoff with cap.
                    const delaySeconds = Math.min(30, 2 ** i);
                    setSubmitPhase("retrying");
                    for (let s = delaySeconds; s > 0; s--) {
                        setSubmitNextRetryIn(s);
                        await new Promise((r) => setTimeout(r, 1000));
                    }
                }
            }
            return false;
        },
        [flushTraceEvents, traceEvent],
    );

    const handleConfirmSubmit = useCallback(async () => {
        setShowSubmit(false);
        setSubmitError("");

        // Pause the timer immediately so it doesn't keep ticking while we submit.
        timer.setRunning(false);

        if (!backendAttemptId) {
            // No backend — local-only path (offline demo). Just mark done.
            setSubmitted(true);
            timer.clear();
            clearStorage();
            return;
        }

        traceEvent("attempt.submit_clicked", 0, {
            answeredQuestions: Object.keys(answerPayloads).length,
            statuses,
            timeRemaining: timer.time,
        });
        await flushTraceEvents();

        const answers = questions
            .map((question) => ({
                examQuestionId: examQuestionByLocalId[question.id],
                state: statuses[question.id] ?? "unattempted",
                payload: buildPayloadForQuestion(question.id),
            }))
            .filter((answer) => !!answer.examQuestionId);

        // Persist the pending submission so a reload / crash can resume.
        try {
            window.localStorage.setItem(
                PENDING_SUBMIT_KEY,
                JSON.stringify({
                    attemptId: backendAttemptId,
                    answers,
                    createdAt: Date.now(),
                }),
            );
        } catch { /* ignore quota */ }

        // Bind a manual-retry callback so the modal's button can re-enter the loop.
        const runOnce = async () => {
            const ok = await performSubmitWithRetry(backendAttemptId, answers);
            if (ok) {
                setSubmitted(true);
                setSubmitPhase(null);
                timer.clear();
                clearStorage();
            }
        };
        submitTriggerRef.current = runOnce;
        await runOnce();
    }, [
        answerPayloads,
        backendAttemptId,
        buildPayloadForQuestion,
        clearStorage,
        examQuestionByLocalId,
        flushTraceEvents,
        performSubmitWithRetry,
        questions,
        statuses,
        timer,
        traceEvent,
    ]);

    useEffect(() => {
        terminationHandledRef.current = false;
    }, [backendAttemptId]);

    useEffect(() => {
        if (!pluginRuntime || !backendAttemptId || submitted) return;
        return pluginRuntime.subscribe("attempt.terminate", (payload) => {
            if (terminationHandledRef.current) return;
            terminationHandledRef.current = true;
            const data = payloadToRecord(payload);
            showViolationToast(
                String(data.title ?? "Assessment locked"),
                String(data.message ?? "The tab-switch limit was exceeded. Your attempt is being submitted."),
            );
            traceEvent("attempt.auto_terminate_received", 2, {
                reason: data.reason ?? "tab-switch-limit-exceeded",
                count: data.count,
                threshold: data.threshold,
                decisionId: data.decisionId,
            });
            timer.setRunning(false);
            setShowSubmit(false);
            window.setTimeout(() => {
                void handleConfirmSubmit();
            }, 250);
        });
    }, [
        backendAttemptId,
        handleConfirmSubmit,
        pluginRuntime,
        showViolationToast,
        submitted,
        timer,
        traceEvent,
    ]);

    // Auto-resume an interrupted submission on mount (e.g. user reloaded
    // while the modal was up). Picks up the same buffer that was persisted.
    useEffect(() => {
        if (!backendAttemptId || submitted || submitPhase) return;
        let raw: string | null = null;
        try {
            raw = window.localStorage.getItem(PENDING_SUBMIT_KEY);
        } catch { /* ignore */ }
        if (!raw) return;
        try {
            const pending = JSON.parse(raw) as {
                attemptId: string;
                answers: Array<{
                    examQuestionId: string;
                    state: string;
                    payload: ReturnType<typeof buildPayloadForQuestion>;
                }>;
            };
            if (pending.attemptId !== backendAttemptId) return;
            timer.setRunning(false);
            const resume = async () => {
                const ok = await performSubmitWithRetry(pending.attemptId, pending.answers);
                if (ok) {
                    setSubmitted(true);
                    setSubmitPhase(null);
                    timer.clear();
                    clearStorage();
                }
            };
            submitTriggerRef.current = resume;
            void resume();
        } catch { /* ignore */ }
        // We intentionally only run this once when backendAttemptId resolves.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backendAttemptId]);

    useEffect(() => {
        if (timer.time <= 0 && !submitted) {
            const id = window.setTimeout(() => {
                timer.setRunning(false);
                void handleConfirmSubmit();
            }, 0);
            return () => window.clearTimeout(id);
        }
    }, [handleConfirmSubmit, submitted, timer]);

    const heartbeatStateRef = useRef<Record<string, unknown>>({});

    useEffect(() => {
        heartbeatStateRef.current = {
            currentQuestion: currentQ + 1,
            statuses,
            counters,
            tabSwitches: tabMonitor.count,
            tabHidden: tabMonitor.hidden,
            timeRemaining: timer.time,
            saved,
            language: lang,
        };
    }, [
        counters,
        currentQ,
        lang,
        saved,
        statuses,
        tabMonitor.count,
        tabMonitor.hidden,
        timer.time,
    ]);

    const resetTimer = timer.reset;

    useEffect(() => {
        if (!backendAttemptId || !hydrated || submitted) return;
        const sendHeartbeat = async () => {
            try {
                const response = await sendAttemptHeartbeat(
                    backendAttemptId,
                    heartbeatStateRef.current,
                );
                const serverSeconds = Math.max(
                    0,
                    Math.floor(response.server_time_remaining_ms / 1000),
                );
                const currentTime = Number(heartbeatStateRef.current.timeRemaining ?? serverSeconds);
                if (Math.abs(serverSeconds - currentTime) > 3) {
                    resetTimer(serverSeconds);
                }
                if (response.status === "timed_out") {
                    resetTimer(0);
                }
            } catch {
                traceEvent("heartbeat.failed", 1, {
                    timeRemaining: heartbeatStateRef.current.timeRemaining,
                });
            }
        };
        void sendHeartbeat();
        const id = window.setInterval(sendHeartbeat, 15000);
        return () => window.clearInterval(id);
    }, [backendAttemptId, hydrated, resetTimer, submitted, traceEvent]);

    const handleBackToExplore = () => {
        router.push("/explore/coding");
    };

    const tabSwitchCount = tabMonitor.count;

    const resetCounters = useCallback(() => {
        setCounters({ ...EMPTY_COUNTERS });
    }, []);

    const devProps = useMemo(
        () => ({
            questions,
            currentQ,
            statuses,
            timeRemaining: timer.time,
            timerRunning: timer.running,
            tabSwitches: tabSwitchCount,
            fontSize,
            splitPct,
            saved,
            proctoringSettings: proctoring.settings,
            proctoringCounters: counters,
            onJumpTo: (i: number) => setCurrentQ(i),
            onSetStatus: setQuestionStatus,
            onMarkAllSolved: () => {
                const next: Record<number, QStatus> = {};
                questions.forEach((qq) => {
                    next[qq.id] = "solved";
                });
                setStatuses(next);
                triggerSave();
            },
            onClearStatuses: () => {
                setStatuses({});
                triggerSave();
            },
            onAddTime: (delta: number) => timer.reset(Math.max(0, timer.time + delta)),
            onForceSubmit: () => {
                void handleConfirmSubmit();
            },
            onClearStorage: () => {
                clearStorage();
                tabMonitor.clear();
            },
            onTimerToggle: () => timer.setRunning(!timer.running),
            onClearTabSwitches: () => {
                tabMonitor.clear();
                lastReportedSwitch.current = 0;
                setToastVisible(false);
            },
            onFontSize: setFontSize,
            onSplitPct: setSplitPct,
            onProctorSettingChange: <K extends keyof ProctoringSettings>(
                key: K,
                value: ProctoringSettings[K],
            ) => proctoring.update(key, value),
            onProctorReset: () => {
                proctoring.resetSettings();
                resetCounters();
            },
            onResetCounters: resetCounters,
            onRequestFullscreen: requestFullscreen,
            onExitFullscreen: exitFullscreen,
            editorFindEnabled,
            editorSuggestionsEnabled,
            editorLintsEnabled,
            onEditorFindToggle: setEditorFindEnabled,
            onEditorSuggestionsToggle: setEditorSuggestionsEnabled,
            onEditorLintsToggle: setEditorLintsEnabled,
        }),
        [
            currentQ,
            questions,
            statuses,
            timer,
            tabSwitchCount,
            fontSize,
            splitPct,
            saved,
            proctoring,
            counters,
            setQuestionStatus,
            triggerSave,
            handleConfirmSubmit,
            clearStorage,
            tabMonitor,
            resetCounters,
            editorFindEnabled,
            editorSuggestionsEnabled,
            editorLintsEnabled,
            setEditorFindEnabled,
            setEditorSuggestionsEnabled,
            setEditorLintsEnabled,
        ],
    );

    const handleCurrentWorkspaceChange = useCallback(
        (payload: AnswerPayload) => {
            if (!q) return;
            handleWorkspaceChange(q.id, payload);
        },
        [handleWorkspaceChange, q],
    );

    const runCurrentCodeOnServer = useCallback(
        (input: CodeRunRequest) => {
            if (!q) return Promise.resolve(undefined);
            return runCodeOnServer(q.id, input);
        },
        [q, runCodeOnServer],
    );

    if (submitted) {
        return (
            <CompletionScreen
                statuses={statuses}
                total={questions.length}
                tabSwitches={tabSwitchCount}
                languageLabel={languageLabel}
                onBackToExplore={handleBackToExplore}
            />
        );
    }

    if (!q) {
        return null;
    }

    return (
        <div
            className={`coding-exam-root flex h-screen flex-col overflow-hidden ${theme === "light" ? "coding-theme-light" : "coding-theme-dark"}`}
            style={{ fontFamily: "var(--font-jakarta)" }}
        >
            <MountPoint id="attempt.background" />
            <Header
                question={q}
                currentQ={currentQ}
                totalQ={questions.length}
                timer={timer}
                saved={saved}
                onSubmit={() => setShowSubmit(true)}
                onPrev={() => {
                    void persistQuestion(q.id).catch(() => setSaved(false));
                    traceEvent("question.navigate", 0, {
                        from: q.id,
                        to: Math.max(1, q.id - 1),
                        direction: "previous",
                    }, q.id);
                    setCurrentQ((i) => Math.max(0, i - 1));
                }}
                onNext={() => {
                    void persistQuestion(q.id).catch(() => setSaved(false));
                    traceEvent("question.navigate", 0, {
                        from: q.id,
                        to: Math.min(questions.length, q.id + 1),
                        direction: "next",
                    }, q.id);
                    setCurrentQ((i) => Math.min(questions.length - 1, i + 1));
                }}
                onMarkSolved={handleMarkSolved}
                onFlag={handleFlag}
                isSolved={isSolved}
                isFlagged={isFlagged}
                languageLabel={languageLabel}
                theme={theme}
                onToggleTheme={toggleTheme}
                onShowGuidelines={handleShowGuidelines}
                mode={mode}
                attemptsCount={attemptsCount}
                attemptsLimit={attemptsLimit}
            />
            <MountPoint id="attempt.toolbar" />

            <div
                ref={containerRef}
                className="flex flex-1 min-h-0 overflow-hidden"
            >
                <QuestionSidebar
                    questions={questions}
                    current={currentQ}
                    statuses={statuses}
                    onSelect={(index) => {
                        void persistQuestion(q.id).catch(() => setSaved(false));
                        traceEvent("question.navigate", 0, {
                            from: q.id,
                            to: questions[index]?.id,
                            direction: "sidebar",
                        }, q.id);
                        setCurrentQ(index);
                    }}
                    theme={theme}
                />

                <div
                    className="coding-question-pane flex flex-shrink-0 flex-col overflow-hidden border-r"
                    style={{ width: `${splitPct}%` }}
                >
                    <div className="flex-1 overflow-hidden">
                        <QuestionPanel
                            question={q}
                            mcqAnswer={mcqAnswers[q.id]}
                            onMcqSelect={(idx) => handleMcqSelect(q.id, idx)}
                        />
                    </div>
                </div>

                <div className="resizer" onMouseDown={handleResizerMouseDown} />

                <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
                    <CodeEditor
                        key={`${q.id}-${lang}`}
                        question={q}
                        lang={lang}
                        fontSize={fontSize}
                        theme={theme}
                        onCodeChange={triggerSave}
                        initialFiles={answerPayloads[q.id]?.files}
                        initialEntryFile={answerPayloads[q.id]?.entryFile}
                        onWorkspaceChange={handleCurrentWorkspaceChange}
                        serverRun={runCurrentCodeOnServer}
                        findEnabled={editorFindEnabled}
                        suggestionsEnabled={editorSuggestionsEnabled}
                        lintsEnabled={editorLintsEnabled}
                    />
                </div>
            </div>

            <GuidelinesModal
                open={showGuidelines}
                onClose={handleCloseGuidelines}
                theme={theme}
            />

            {submitError && (
                <div className="fixed bottom-6 left-1/2 z-[160] -translate-x-1/2 rounded-2xl border border-red-500/30 bg-red-500/15 px-5 py-3 text-[13px] font-semibold text-red-100 shadow-2xl backdrop-blur-xl">
                    {submitError}
                </div>
            )}

            {showSubmit && submitPhase === null && (
                <SubmitModal
                    statuses={statuses}
                    total={questions.length}
                    tabSwitches={tabSwitchCount}
                    onConfirm={handleConfirmSubmit}
                    onCancel={() => setShowSubmit(false)}
                />
            )}

            {submitPhase !== null && (
                <SubmittingModal
                    phase={submitPhase}
                    attempt={submitAttemptNo}
                    maxAttempts={MAX_SUBMIT_ATTEMPTS}
                    nextRetryInSeconds={submitNextRetryIn}
                    errorMessage={submitError}
                    onManualRetry={() => {
                        if (submitTriggerRef.current) {
                            setSubmitError("");
                            void submitTriggerRef.current();
                        }
                    }}
                />
            )}

            <ProctorToast
                visible={toastVisible}
                title={lastViolation.title}
                desc={lastViolation.desc}
            />
            <MountPoint id="attempt.warning-toast" />

            {process.env.NODE_ENV === "development" && <DevControls {...devProps} />}
        </div>
    );
};

export default CodingAssessment;
