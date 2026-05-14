import React from "react";
import { Lock } from "lucide-react";

export type QuestionState = "unanswered" | "answered" | "marked" | "locked";

export interface NavigatorQuestion {
    id: string;
    number: number;
    state: QuestionState;
    category: string;
    isAnswered: boolean;
    isMarked: boolean;
    isLocked?: boolean;
    blockNumber?: number;
}

interface QuestionNavigatorProps {
    questions: NavigatorQuestion[];
    currentIndex: number;
    onSelect: (index: number) => void;
    progressPercent?: number;
    isCollapsed?: boolean;
    /** Total questions including locked future blocks */
    totalQuestions?: number;
    /** How many questions per block */
    questionsPerBlock?: number;
    /** The highest block number that has been unlocked */
    currentBlockNumber?: number;
    /** Total number of blocks in the assessment */
    totalBlocks?: number;
}

const stateStyles: Record<QuestionState, string> = {
    answered: "border-brand-green bg-brand-green text-[#0f1712]",
    marked:   "border-amber-400 bg-amber-400 text-[#241604]",
    unanswered:
        "border-brand-green/20 bg-white text-[#17201b] hover:border-brand-green hover:text-brand-green dark:border-white/10 dark:bg-white/5 dark:text-white",
    locked:
        "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed dark:border-white/5 dark:bg-white/[0.03] dark:text-white/20",
};

const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
    questions,
    currentIndex,
    onSelect,
    progressPercent = 0,
    isCollapsed    = false,
    totalQuestions,
    questionsPerBlock = 5,
    currentBlockNumber = 1,
    totalBlocks = 1,
}) => {
    const unlockedQs  = questions.filter((q) => !q.isLocked);
    const answeredCount = unlockedQs.filter((q) => q.isAnswered).length;
    const markedCount   = unlockedQs.filter((q) => q.isMarked).length;
    const leftCount     = unlockedQs.filter((q) => !q.isAnswered).length;
    const displayTotal  = totalQuestions ?? questions.length;

    const safeProgress = Math.min(100, Math.max(0, progressPercent));
    const progressRingStyle = {
        background: `conic-gradient(#1ed36a ${safeProgress}%, rgba(148,163,184,0.24) 0)`,
    };

    // ── Build a flat list: unlocked questions + locked placeholders ──────────
    // Locked future blocks are appended as placeholder tiles so the grid is
    // completely continuous — no visual gaps or separators between blocks.
    const lockedFutureCount =
        Math.max(0, totalBlocks - currentBlockNumber) * questionsPerBlock;

    return (
        <div className="flex h-full flex-col gap-4">

            {/* ── Progress ring ─────────────────────────────────────────── */}
            <div
                className={`flex items-center ${
                    isCollapsed
                        ? "justify-center py-2"
                        : "gap-4 p-4 rounded-md border border-brand-green/15 bg-white dark:border-white/10 dark:bg-white/5"
                }`}
            >
                <div
                    className={`shrink-0 rounded-full p-1.5 ${
                        isCollapsed ? "h-12 w-12" : "h-16 w-16"
                    }`}
                    style={progressRingStyle}
                >
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-[#111a15]">
                        <span
                            className={`${
                                isCollapsed ? "text-[10px]" : "text-sm"
                            } font-black text-[#17201b] dark:text-white`}
                        >
                            {safeProgress}%
                        </span>
                    </div>
                </div>
                {!isCollapsed && (
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#17201b]/60 dark:text-white/60">
                            Overall Progress
                        </p>
                        <p className="mt-0.5 text-2xl font-black text-[#17201b] dark:text-white">
                            {answeredCount}{" "}
                            <span className="text-base font-bold text-[#17201b]/40 dark:text-white/40">
                                / {displayTotal}
                            </span>
                        </p>
                    </div>
                )}
            </div>

            {/* ── Status summary ────────────────────────────────────────── */}
            {!isCollapsed && (
                <div className="rounded-lg border border-brand-green/15 bg-white p-4 dark:border-white/5 dark:bg-white/[0.03]">
                    <div className="grid grid-cols-3 gap-1.5">
                        <div className="flex flex-col items-center justify-center rounded-md border border-brand-green/20 bg-brand-green/[0.08] p-2 dark:bg-brand-green/10">
                            <span className="text-lg font-black text-brand-green leading-none">
                                {answeredCount}
                            </span>
                            <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-brand-green">
                                Answered
                            </span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-md border border-amber-400/20 bg-amber-400/[0.08] p-2 dark:bg-amber-400/10">
                            <span className="text-lg font-black text-amber-500 leading-none">
                                {markedCount}
                            </span>
                            <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-amber-500">
                                Review
                            </span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-md border border-slate-300/20 bg-slate-100 p-2 dark:border-white/10 dark:bg-white/[0.05]">
                            <span className="text-lg font-black text-slate-700 dark:text-white leading-none">
                                {leftCount}
                            </span>
                            <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-700 dark:text-white">
                                Left
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div
                className={`mx-auto h-px bg-brand-green/10 dark:bg-white/10 ${
                    isCollapsed ? "w-1/2" : "w-5/6"
                }`}
            />

            {/* ── Question map — single continuous grid ─────────────────── */}
            <div className="flex flex-col gap-2">
                {!isCollapsed && (
                    <h3 className="text-sm font-bold text-[#17201b] dark:text-white uppercase tracking-wider">
                        Question Map
                    </h3>
                )}

                <div
                    className={`grid gap-2 ${
                        isCollapsed
                            ? "grid-cols-1 place-items-center"
                            : "grid-cols-5 lg:grid-cols-4 px-2"
                    }`}
                >
                    {/* Unlocked questions */}
                    {questions.map((q, idx) => {
                        const isActive = idx === currentIndex;
                        return (
                            <button
                                key={q.id}
                                type="button"
                                onClick={() => !q.isLocked && onSelect(idx)}
                                disabled={!!q.isLocked}
                                title={
                                    q.isLocked
                                        ? "Answer all previous questions to unlock"
                                        : `Question ${q.number}`
                                }
                                aria-current={isActive ? "step" : undefined}
                                className={`relative flex items-center justify-center rounded-md border text-sm font-bold transition-all duration-200 focus:outline-none ${
                                    isActive && !q.isLocked
                                        ? "z-10 border-brand-green ring-2 ring-brand-green ring-offset-2 ring-offset-[#f6f8f5] dark:ring-offset-[#111a15]"
                                        : ""
                                } ${stateStyles[q.state]} ${
                                    isCollapsed ? "h-10 w-10" : "h-10 w-full"
                                }`}
                            >
                                {q.isLocked ? (
                                    <Lock className="h-3.5 w-3.5" />
                                ) : (
                                    q.number
                                )}
                                {!q.isLocked && q.isAnswered && q.isMarked && (
                                    <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-brand-green border border-white dark:border-[#111a15]">
                                        <div className="h-1 w-1 rounded-full bg-white" />
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    {/* Locked future-block placeholders — continuous with unlocked */}
                    {Array.from({ length: lockedFutureCount }, (_, i) => (
                        <div
                            key={`future-locked-${i}`}
                            title="Answer all previous questions to unlock"
                            className={`flex items-center justify-center rounded-md border text-sm font-bold ${stateStyles.locked} ${
                                isCollapsed ? "h-10 w-10" : "h-10 w-full"
                            }`}
                        >
                            <Lock className="h-3.5 w-3.5" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default QuestionNavigator;
