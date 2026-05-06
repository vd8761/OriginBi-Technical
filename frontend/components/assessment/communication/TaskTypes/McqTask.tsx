import React from "react";

export interface McqQuestion {
    id: string;
    text: string;
    options: { id: string; text: string }[];
}

interface McqTaskProps {
    task: {
        id: string;
        instructions: string;
        questions: McqQuestion[];
    };
    value?: Record<string, string>;
    onChange: (value: Record<string, string>) => void;
}

const labels = ["A", "B", "C", "D"];

const McqTaskComponent: React.FC<McqTaskProps> = ({ task, value = {}, onChange }) => {
    const handleOptionSelect = (questionId: string, optionId: string) => {
        onChange({
            ...value,
            [questionId]: optionId,
        });
    };

    return (
        <div className="flex flex-col gap-6">
            <section className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#17201b] dark:text-white">
                    General MCQ Task
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-[#17201b] dark:text-white">
                    {task.instructions}
                </p>
            </section>

            <div className="grid gap-6">
                {task.questions.map((question, qIndex) => (
                    <section 
                        key={question.id} 
                        className="rounded-lg border border-brand-green/10 bg-white p-5 transition-all hover:border-brand-green/30 dark:border-white/10 dark:bg-[#0f1712] dark:hover:border-brand-green/20"
                    >
                        <h3 className="text-sm font-medium leading-relaxed text-[#17201b] dark:text-white">
                            <span className="mr-3 font-semibold text-brand-green">{qIndex + 1}.</span>
                            {question.text}
                        </h3>

                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {question.options.map((option, optionIndex) => {
                                const isSelected = value[question.id] === option.id;

                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handleOptionSelect(question.id, option.id)}
                                        aria-pressed={isSelected}
                                        className={`group flex min-h-14 items-center gap-4 rounded-lg border p-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
                                            isSelected
                                                ? "border-brand-green bg-brand-green/10"
                                                : "border-brand-green/20 bg-white hover:border-brand-green/50 dark:border-white/10 dark:bg-[#111a15] dark:hover:border-brand-green/50"
                                        }`}
                                    >
                                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                            isSelected
                                                ? "bg-brand-green text-[#0f1712]"
                                                : "bg-brand-green/10 text-brand-green"
                                        }`}>
                                            {labels[optionIndex]}
                                        </span>
                                        <span className={`text-sm font-medium leading-5 ${isSelected ? "text-[#17201b] dark:text-white" : "text-[#17201b]/80 dark:text-white/80"}`}>
                                            {option.text}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
};

export default McqTaskComponent;
