import React from "react";

export type QuestionState = "unanswered" | "answered" | "marked";

export interface NavigatorQuestion {
    id: string;
    number: number;
    state: QuestionState;
    category: string;
}

interface QuestionNavigatorProps {
    questions: NavigatorQuestion[];
    currentIndex: number;
    onSelect: (index: number) => void;
    progressPercent?: number;
    guidanceText?: string;
}

const stateStyles: Record<QuestionState, string> = {
    answered: "border-brand-green bg-brand-green text-[#0f1712]",
    marked: "border-amber-400 bg-amber-400 text-[#241604]",
    unanswered: "border-brand-green/20 bg-white text-[#17201b] hover:border-brand-green hover:text-brand-green dark:border-white/10 dark:bg-white/5 dark:text-white",
};

const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({ 
    questions, 
    currentIndex, 
    onSelect, 
    progressPercent = 0,
    guidanceText 
}) => {
    const answeredCount = questions.filter((q) => q.state === "answered").length;
    const markedCount = questions.filter((q) => q.state === "marked").length;
    const pendingCount = questions.length - answeredCount - markedCount;

    const safeProgress = Math.min(100, Math.max(0, progressPercent));
    const progressRingStyle = {
        background: `conic-gradient(#1ed36a ${safeProgress}%, rgba(148, 163, 184, 0.24) 0)`,
    };

    return (
        <div className="flex h-full flex-col gap-6">
            {/* Progress Section */}
            <div className="flex items-center gap-4 rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-4 dark:border-white/10 dark:bg-white/5">
                <div className="h-16 w-16 shrink-0 rounded-full p-1" style={progressRingStyle}>
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-[#111a15]">
                        <span className="text-sm font-bold text-[#17201b] dark:text-white">{safeProgress}%</span>
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#17201b]/60 dark:text-white/60">
                        Overall Progress
                    </p>
                    <p className="mt-0.5 text-xl font-bold text-[#17201b] dark:text-white">
                        {answeredCount} <span className="text-sm font-medium text-[#17201b]/40 dark:text-white/40">/ {questions.length}</span>
                    </p>
                </div>
            </div>

            {/* Question Map Section */}
            <div className="flex flex-col">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#17201b] dark:text-white uppercase tracking-wider">Question Map</h3>
                </div>

                <div className="mt-4 grid grid-cols-5 gap-2 lg:grid-cols-4">
                    {questions.map((q, idx) => {
                        const isActive = idx === currentIndex;

                        return (
                            <button
                                key={q.id}
                                type="button"
                                onClick={() => onSelect(idx)}
                                title={`${q.category} - Question ${q.number}`}
                                aria-current={isActive ? "step" : undefined}
                                className={`flex h-10 items-center justify-center rounded-lg border text-sm font-bold transition-all duration-200 focus:outline-none ${
                                    isActive
                                        ? "z-10 border-brand-green ring-2 ring-brand-green/50 ring-offset-2 ring-offset-[#f6f8f5] dark:ring-offset-[#111a15] scale-105"
                                        : ""
                                } ${stateStyles[q.state]}`}
                            >
                                {q.number}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-brand-green/5 bg-white/50 p-2 dark:bg-white/5">
                        <div className="h-2 w-2 rounded-full bg-brand-green" />
                        <span className="text-[10px] font-bold text-[#17201b]/60 dark:text-white/60 uppercase">Done</span>
                        <span className="text-xs font-bold">{answeredCount}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-brand-green/5 bg-white/50 p-2 dark:bg-white/5">
                        <div className="h-2 w-2 rounded-full bg-amber-400" />
                        <span className="text-[10px] font-bold text-[#17201b]/60 dark:text-white/60 uppercase">Review</span>
                        <span className="text-xs font-bold">{markedCount}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-brand-green/5 bg-white/50 p-2 dark:bg-white/5">
                        <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-white/20" />
                        <span className="text-[10px] font-bold text-[#17201b]/60 dark:text-white/60 uppercase">Left</span>
                        <span className="text-xs font-bold">{pendingCount}</span>
                    </div>
                </div>
            </div>

            {/* Guidance Section */}
            {guidanceText && (
                <div className="mt-auto rounded-lg bg-[#17201b] p-4 text-white dark:bg-white dark:text-[#17201b]">
                    <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs font-bold uppercase tracking-wider">Pro Tip</p>
                    </div>
                    <p className="mt-2 text-xs font-medium leading-relaxed opacity-80">
                        {guidanceText}
                    </p>
                </div>
            )}
        </div>
    );
};

export default QuestionNavigator;
