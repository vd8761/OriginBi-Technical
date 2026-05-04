import React from "react";
import type { AudioTask } from "../CommunicationEngine";

interface AudioTaskProps {
    task: AudioTask;
    value?: Record<string, string>;
    onChange: (value: Record<string, string>) => void;
}

const labels = ["A", "B", "C", "D"];

const AudioTaskComponent: React.FC<AudioTaskProps> = ({ task, value = {}, onChange }) => {
    const handleOptionSelect = (questionId: string, optionId: string) => {
        onChange({
            ...value,
            [questionId]: optionId,
        });
    };

    return (
        <div className="flex flex-col gap-4">
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Audio task
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-300">
                            {task.instructions}
                        </p>
                    </div>
                    <div className="flex items-end gap-1" aria-hidden="true">
                        {[8, 16, 24, 14, 20].map((height, index) => (
                            <span
                                key={`${height}-${index}`}
                                className="w-1.5 rounded-full bg-brand-green/80"
                                style={{ height: `${height}px` }}
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0f1712]">
                    <audio
                        controls
                        className="h-10 w-full outline-none"
                        controlsList="nodownload"
                        src={task.audioUrl}
                    >
                        Your browser does not support the audio element.
                    </audio>
                </div>
            </section>

            <div className="grid gap-4">
                {task.questions.map((question, qIndex) => (
                    <section key={question.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f1712]">
                        <h3 className="text-base font-extrabold leading-7 text-[#17201b] dark:text-white">
                            <span className="mr-2 text-slate-400">{qIndex + 1}.</span>
                            {question.text}
                        </h3>

                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
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
                    </section>
                ))}
            </div>
        </div>
    );
};

export default AudioTaskComponent;
