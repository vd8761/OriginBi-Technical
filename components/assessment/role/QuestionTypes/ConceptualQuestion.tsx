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
            <section className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-4 dark:border-white/10 dark:bg-white/5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-brand-green/10 px-3 py-1.5 text-xs font-bold text-brand-green">
                        Conceptual knowledge
                    </span>
                    <span className="rounded-md bg-brand-green/5 px-3 py-1.5 text-xs font-bold text-[#17201b] dark:bg-white/10 dark:text-white">
                        Core fundamentals
                    </span>
                </div>
                <h2 className="text-base font-semibold leading-relaxed text-[#17201b] dark:text-white">
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
                            aria-pressed={isSelected}
                            className={`group flex min-h-20 items-center gap-4 rounded-lg border p-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
                                isSelected
                                    ? "border-brand-green bg-brand-green/10"
                                    : "border-brand-green/20 bg-white hover:border-brand-green/50 dark:border-white/10 dark:bg-[#0f1712]"
                            }`}
                        >
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                                isSelected
                                    ? "bg-brand-green text-[#0f1712]"
                                    : "bg-brand-green/10 text-brand-green"
                            }`}>
                                {labels[index]}
                            </span>
                            <span className={`text-sm font-semibold leading-6 ${isSelected ? "text-[#17201b] dark:text-white" : "text-[#17201b] dark:text-white"}`}>

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

