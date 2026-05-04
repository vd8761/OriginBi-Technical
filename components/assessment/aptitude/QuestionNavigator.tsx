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
}

const stateStyles: Record<QuestionState, string> = {
    answered: "border-brand-green bg-brand-green text-[#0f1712]",
    marked: "border-amber-400 bg-amber-400 text-[#241604]",
    unanswered: "border-brand-green/20 bg-white text-[#17201b] hover:border-brand-green hover:text-brand-green dark:border-white/10 dark:bg-white/5 dark:text-white",
};

const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({ questions, currentIndex, onSelect }) => {
    const answeredCount = questions.filter((q) => q.state === "answered").length;
    const markedCount = questions.filter((q) => q.state === "marked").length;
    const pendingCount = questions.length - answeredCount - markedCount;

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-base font-bold text-[#17201b] dark:text-white">Question map</h3>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#17201b] dark:text-white">
                        Jump, review, or finish from here.
                    </p>
                </div>
                <span className="rounded-md bg-brand-green/10 px-2.5 py-1 text-xs font-bold text-brand-green">
                    {answeredCount}/{questions.length}
                </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-xs sm:grid-cols-3">
                <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-2 dark:border-white/10 dark:bg-white/5">
                    <p className="font-medium text-[#17201b] dark:text-white">Answered</p>
                    <p className="mt-1 text-lg font-bold text-[#17201b] dark:text-white">{answeredCount}</p>
                </div>
                <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-2 dark:border-white/10 dark:bg-white/5">
                    <p className="font-medium text-[#17201b] dark:text-white">Review</p>
                    <p className="mt-1 text-lg font-bold text-[#17201b] dark:text-white">{markedCount}</p>
                </div>
                <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-2 dark:border-white/10 dark:bg-white/5">
                    <p className="font-medium text-[#17201b] dark:text-white">Pending</p>
                    <p className="mt-1 text-lg font-bold text-[#17201b] dark:text-white">{pendingCount}</p>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-5 gap-2 lg:grid-cols-4">
                {questions.map((q, idx) => {
                    const isActive = idx === currentIndex;

                    return (
                        <button
                            key={q.id}
                            type="button"
                            onClick={() => onSelect(idx)}
                            title={`${q.category} - Question ${q.number}`}
                            aria-current={isActive ? "step" : undefined}
                            className={`flex h-10 items-center justify-center rounded-lg border text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
                                isActive
                                    ? "border-[#17201b] bg-[#17201b] text-white shadow-lg dark:border-white dark:bg-white dark:text-[#17201b]"
                                    : stateStyles[q.state]
                            }`}
                        >
                            {q.number}
                        </button>
                    );
                })}
            </div>

            <div className="mt-auto hidden border-t border-brand-green/5 pt-4 text-[10px] font-bold leading-5 text-[#17201b] dark:border-white/10 dark:text-white lg:block">
                Green means answered, amber means marked for review, and dark shows your current question.
            </div>
        </div>
    );
};

export default QuestionNavigator;
