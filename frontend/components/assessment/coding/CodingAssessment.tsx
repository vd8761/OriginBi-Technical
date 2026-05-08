"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import QuestionPanel from "./QuestionPanel";
import CodeEditor, { LANG_META } from "./CodeEditor";
import SubmitModal, { type QStatus } from "./SubmitModal";
import CompletionScreen from "./CompletionScreen";
import DevControls from "./DevControls";
import GuidelinesModal from "./GuidelinesModal";
import { QUESTIONS, TOTAL_TIME_SECONDS, type Question } from "./data";
import { useTabPanic, useTabSwitchMonitor, useTimer } from "./hooks";
import {
    DEFAULT_PROCTORING,
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
    codingPaymentKey,
    useCompletedAssessments,
} from "@/lib/payments";
import { useTheme } from "@/lib/contexts/ThemeContext";

const STATUS_KEY = "ob_statuses";
const CURRENT_Q_KEY = "ob_current_q";

interface CodingAssessmentProps {
    lang: string;
    onComplete?: (score: number) => void;
}

const formatTime = (secs: number) => {
    const safe = Math.max(0, secs);
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
            <div className="text-[13px] font-bold leading-none text-white">
                Coding Assessment
            </div>
            <div className="mt-0.5 text-[10px] text-white/35">
                Q{currentQ + 1} / {totalQ} · {question.section} · {languageLabel}
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

const CodingAssessment: React.FC<CodingAssessmentProps> = ({ lang, onComplete }) => {
    const router = useRouter();
    const { markCompleted } = useCompletedAssessments();
    const languageLabel = LANG_META[lang]?.label ?? lang;

    const [hydrated, setHydrated] = useState(false);
    const [currentQ, setCurrentQ] = useState(0);
    const [statuses, setStatuses] = useState<Record<number, QStatus>>({});
    const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
    const [showSubmit, setShowSubmit] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [saved, setSaved] = useState(true);
    const [splitPct, setSplitPct] = useState(42);
    const [fontSize, setFontSize] = useState(14);
    const { theme, toggleTheme } = useTheme();
    const [showGuidelines, setShowGuidelines] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const saveTimerRef = useRef<number | null>(null);

    const timer = useTimer(TOTAL_TIME_SECONDS);

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
        },
        [showViolationToast],
    );

    useProctoring({
        active: proctoringActive,
        settings: proctoring.settings,
        onViolation: handleProctorViolation,
    });

    // Load persisted state on mount (client only — avoid hydration mismatch)
    useEffect(() => {
        try {
            const cq = window.localStorage.getItem(CURRENT_Q_KEY);
            if (cq) {
                const parsed = parseInt(cq, 10);
                if (!Number.isNaN(parsed)) setCurrentQ(parsed);
            }
            const st = window.localStorage.getItem(STATUS_KEY);
            if (st) {
                const parsed = JSON.parse(st);
                if (parsed && typeof parsed === "object") setStatuses(parsed);
            }
            const seenGuidelines = window.localStorage.getItem("ob_coding_guidelines_seen");
            if (!seenGuidelines) {
                setShowGuidelines(true);
            }
        } catch {
            /* ignore */
        }
        setHydrated(true);
    }, []);

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
        if (!hydrated) return;
        try {
            window.localStorage.setItem(CURRENT_Q_KEY, String(currentQ));
        } catch {
            /* ignore */
        }
    }, [currentQ, hydrated]);

    useEffect(() => {
        if (!hydrated) return;
        try {
            window.localStorage.setItem(STATUS_KEY, JSON.stringify(statuses));
        } catch {
            /* ignore */
        }
    }, [statuses, hydrated]);

    // Show toast each new tab switch returns (gated by setting)
    useEffect(() => {
        if (tabMonitor.count > lastReportedSwitch.current) {
            const newSwitches = tabMonitor.count - lastReportedSwitch.current;
            lastReportedSwitch.current = tabMonitor.count;
            if (proctoring.settings.tabSwitchToast) {
                showViolationToast(
                    "Tab switch detected",
                    `Stay on this tab during the assessment. ${tabMonitor.count} switch${tabMonitor.count === 1 ? "" : "es"} recorded so far — this is part of the proctoring report.`,
                );
            }
            void newSwitches;
        }
    }, [tabMonitor.count, proctoring.settings.tabSwitchToast, showViolationToast]);

    // Auto-submit when timer hits zero
    useEffect(() => {
        if (timer.time <= 0 && !submitted) {
            timer.setRunning(false);
            handleConfirmSubmit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timer.time]);

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

    const q = QUESTIONS[currentQ];
    const qStatus: QStatus = statuses[q?.id] ?? "unattempted";
    const isSolved = qStatus === "solved";
    const isFlagged = qStatus === "flagged";

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
        triggerSave();
    };

    const handleFlag = () => {
        const next: QStatus = qStatus === "flagged" ? "unattempted" : "flagged";
        setQuestionStatus(q.id, next);
        triggerSave();
    };

    const handleMcqSelect = (qId: number, idx: number) => {
        setMcqAnswers((a) => ({ ...a, [qId]: idx }));
        setStatuses((s) => ({
            ...s,
            [qId]: s[qId] === "solved" ? "solved" : "attempted",
        }));
        triggerSave();
    };

    const clearStorage = useCallback(() => {
        try {
            window.localStorage.removeItem("ob_exam_time");
            window.localStorage.removeItem(CURRENT_Q_KEY);
            window.localStorage.removeItem(STATUS_KEY);
            window.localStorage.removeItem("ob_tab_switches");
        } catch {
            /* ignore */
        }
    }, []);

    const handleConfirmSubmit = useCallback(() => {
        setShowSubmit(false);
        setSubmitted(true);
        timer.setRunning(false);
        timer.clear();
        markCompleted(codingPaymentKey(lang));
        clearStorage();
        // Call external handler if provided
        const solvedCount = Object.values(statuses).filter(s => s === "solved").length;
        const score = Math.round((solvedCount / QUESTIONS.length) * 100);
        onComplete?.(score);
    }, [timer, markCompleted, lang, clearStorage, statuses, onComplete]);

    const handleBackToExplore = () => {
        router.push("/explore/coding");
    };

    const tabSwitchCount = tabMonitor.count;

    const resetCounters = useCallback(() => {
        setCounters({ ...EMPTY_COUNTERS });
    }, []);

    const devProps = useMemo(
        () => ({
            questions: QUESTIONS,
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
                QUESTIONS.forEach((qq) => {
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
            onForceSubmit: handleConfirmSubmit,
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
        }),
        [
            currentQ,
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
        ],
    );

    if (submitted) {
        return (
            <CompletionScreen
                statuses={statuses}
                total={QUESTIONS.length}
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
            <Header
                question={q}
                currentQ={currentQ}
                totalQ={QUESTIONS.length}
                timer={timer}
                saved={saved}
                onSubmit={() => setShowSubmit(true)}
                onPrev={() => setCurrentQ((i) => Math.max(0, i - 1))}
                onNext={() => setCurrentQ((i) => Math.min(QUESTIONS.length - 1, i + 1))}
                onMarkSolved={handleMarkSolved}
                onFlag={handleFlag}
                isSolved={isSolved}
                isFlagged={isFlagged}
                languageLabel={languageLabel}
                theme={theme}
                onToggleTheme={toggleTheme}
                onShowGuidelines={handleShowGuidelines}
            />

            <div
                ref={containerRef}
                className="flex flex-1 min-h-0 overflow-hidden"
            >
                <QuestionSidebar
                    questions={QUESTIONS}
                    current={currentQ}
                    statuses={statuses}
                    onSelect={setCurrentQ}
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
                    />
                </div>
            </div>

            <GuidelinesModal
                open={showGuidelines}
                onClose={handleCloseGuidelines}
                theme={theme}
            />

            {showSubmit && (
                <SubmitModal
                    statuses={statuses}
                    total={QUESTIONS.length}
                    tabSwitches={tabSwitchCount}
                    onConfirm={handleConfirmSubmit}
                    onCancel={() => setShowSubmit(false)}
                />
            )}

            <ProctorToast
                visible={toastVisible}
                title={lastViolation.title}
                desc={lastViolation.desc}
            />

            {process.env.NODE_ENV === "development" && <DevControls {...devProps} />}
        </div>
    );
};

export default CodingAssessment;
