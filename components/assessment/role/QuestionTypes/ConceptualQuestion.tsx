import React from "react";
import type { ConceptualQuestion } from "../RoleEngine";

interface ConceptualQuestionProps {
    question: ConceptualQuestion;
    selectedOptionId?: string;
    onSelectOption: (optionId: string) => void;
}

const labels = ["A", "B", "C", "D"];

const ConceptualQuestionComponent: React.FC<ConceptualQuestionProps> = ({
    question,
    selectedOptionId,
    onSelectOption,
}) => {
    return (
        <div className="flex flex-col gap-4">
<<<<<<< HEAD
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-brand-green/10 px-3 py-1.5 text-xs font-extrabold text-brand-green">
                        Conceptual knowledge
                    </span>
                    <span className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        Core fundamentals
                    </span>
                </div>
                <h2 className="text-lg font-extrabold leading-8 text-[#17201b] dark:text-white">
=======
            {/* Question Text */}
            <div className="bg-white dark:bg-white/[0.03] border border-brand-light-tertiary dark:border-white/5 p-6 md:p-8 rounded-[20px] transition-colors">
                <div className="flex items-center gap-3 mb-4">
                    <div className="px-2.5 py-1 rounded-md bg-brand-green/10 text-brand-green font-bold text-[10px] uppercase tracking-wider">
                        Conceptual Knowledge
                    </div>
                </div>
                <h2 className="text-[clamp(15px,1.5vw,20px)] font-semibold text-black dark:text-white leading-relaxed">
>>>>>>> origin/vikash
                    {question.text}
                </h2>
            </section>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {question.options.map((option, index) => {
                    const isSelected = selectedOptionId === option.id;

                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => onSelectOption(option.id)}
<<<<<<< HEAD
                            aria-pressed={isSelected}
                            className={`group flex min-h-20 items-center gap-4 rounded-lg border p-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
                                isSelected
                                    ? "border-brand-green bg-brand-green/10 shadow-[0_12px_30px_rgba(30,211,106,0.16)]"
                                    : "border-slate-200 bg-white hover:border-brand-green/50 dark:border-white/10 dark:bg-[#0f1712]"
                            }`}
                        >
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold ${
                                isSelected
                                    ? "bg-brand-green text-[#0f1712]"
                                    : "bg-slate-100 text-slate-500 group-hover:bg-brand-green/10 group-hover:text-brand-green dark:bg-white/10 dark:text-slate-300"
                            }`}>
                                {labels[index]}
                            </span>
                            <span className="text-sm font-bold leading-6 text-slate-700 dark:text-slate-300">
=======
                            className={`
                                flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 group
                                ${isSelected 
                                    ? 'bg-brand-green/5 border-brand-green' 
                                    : 'bg-white dark:bg-white/[0.03] border-brand-light-tertiary dark:border-white/5 hover:border-brand-green/30 hover:bg-brand-green/5'
                                }
                            `}
                        >
                            <div className={`
                                w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all
                                ${isSelected ? 'bg-brand-green text-white' : 'bg-brand-light-primary dark:bg-white/5 text-black dark:text-white group-hover:bg-brand-green/20 group-hover:text-brand-green'}
                            `}>
                                {labels[idx]}
                            </div>
                            <span className={`text-[14px] leading-relaxed font-medium ${isSelected ? 'text-brand-green font-bold' : 'text-black dark:text-white'}`}>
>>>>>>> origin/vikash
                                {option.text}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ConceptualQuestionComponent;
