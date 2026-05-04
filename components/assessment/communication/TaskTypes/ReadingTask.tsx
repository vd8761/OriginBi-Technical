import React from "react";
import type { ReadingTask } from "../CommunicationEngine";

interface ReadingTaskProps {
    task: ReadingTask;
    value?: Record<string, string>;
    onChange: (value: Record<string, string>) => void;
}

const labels = ["A", "B", "C", "D"];

const ReadingTaskComponent: React.FC<ReadingTaskProps> = ({ task, value = {}, onChange }) => {
    const handleOptionSelect = (questionId: string, optionId: string) => {
        onChange({
            ...value,
            [questionId]: optionId,
        });
    };

    const formattedPassage = task.passage.split("\\n").map((line, index) => (
        <React.Fragment key={`${line}-${index}`}>
            {line}
            <br />
        </React.Fragment>
    ));

    return (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Reading passage
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                            Read for intent, deadline, and requested action.
                        </p>
                    </div>
                    <span className="rounded-md bg-brand-green/10 px-2.5 py-1 text-xs font-extrabold text-brand-green">
                        Focus
                    </span>
                </div>
                <div className="custom-scrollbar max-h-[460px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f1712]">
                    <p className="text-sm font-semibold leading-7 text-slate-700 dark:text-slate-300">
                        {formattedPassage}
                    </p>
                </div>
            </section>

            <section className="flex flex-col gap-4">
                {task.questions.map((question, qIndex) => (
                    <div key={question.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f1712]">
                        <h3 className="text-base font-extrabold leading-7 text-[#17201b] dark:text-white">
                            <span className="mr-2 text-slate-400">{qIndex + 1}.</span>
                            {question.text}
                        </h3>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                            {question.options.map((option, optionIndex) => {
                                const isSelected = value[question.id] === option.id;

                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handleOptionSelect(question.id, option.id)}
                                        aria-pressed={isSelected}
                                        className={`group flex min-h-14 items-center gap-3 rounded-lg border p-3 text-left transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
                                            isSelected
                                                ? "border-brand-green bg-brand-green/10"
                                                : "border-slate-200 bg-white hover:border-brand-green/50 dark:border-white/10 dark:bg-[#111a15]"
                                        }`}
                                    >
                                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                                            isSelected
                                                ? "bg-brand-green text-[#0f1712]"
                                                : "bg-slate-100 text-slate-500 group-hover:bg-brand-green/10 group-hover:text-brand-green dark:bg-white/10 dark:text-slate-300"
                                        }`}>
                                            {labels[optionIndex]}
                                        </span>
                                        <span className="text-sm font-bold leading-5 text-slate-700 dark:text-slate-300">
                                            {option.text}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
};

export default ReadingTaskComponent;
