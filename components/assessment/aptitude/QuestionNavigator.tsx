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
    unanswered: "border-slate-200 bg-white text-slate-600 hover:border-brand-green hover:text-brand-green dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
};

const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({ questions, currentIndex, onSelect }) => {
    const answeredCount = questions.filter((q) => q.state === "answered").length;
    const markedCount = questions.filter((q) => q.state === "marked").length;
    const pendingCount = questions.length - answeredCount - markedCount;

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-base font-extrabold text-[#17201b] dark:text-white">Question map</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Jump, review, or finish from here.
                    </p>
                </div>
                <span className="rounded-md bg-brand-green/10 px-2.5 py-1 text-xs font-extrabold text-brand-green">
                    {answeredCount}/{questions.length}
                </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-xs sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/5">
                    <p className="font-semibold text-slate-500 dark:text-slate-400">Answered</p>
                    <p className="mt-1 text-lg font-extrabold text-[#17201b] dark:text-white">{answeredCount}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/5">
                    <p className="font-semibold text-slate-500 dark:text-slate-400">Review</p>
                    <p className="mt-1 text-lg font-extrabold text-[#17201b] dark:text-white">{markedCount}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/5">
                    <p className="font-semibold text-slate-500 dark:text-slate-400">Pending</p>
                    <p className="mt-1 text-lg font-extrabold text-[#17201b] dark:text-white">{pendingCount}</p>
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
                            className={`flex h-10 items-center justify-center rounded-lg border text-sm font-extrabold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
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

            <div className="mt-auto hidden border-t border-slate-100 pt-4 text-xs font-semibold leading-5 text-slate-500 dark:border-white/10 dark:text-slate-400 lg:block">
                Green means answered, amber means marked for review, and dark shows your current question.
            </div>
        </div>
    );
};

export default QuestionNavigator;
