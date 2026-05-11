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
            <section className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#17201b] dark:text-white">
                            Audio task
                        </p>
                        <p className="mt-2 text-sm font-medium leading-6 text-[#17201b] dark:text-white">
                            {task.instructions}
                        </p>
                    </div>
                </div>

                <div className="mt-4 rounded-lg border border-brand-green/10 bg-white p-3 dark:border-white/10 dark:bg-[#0f1712]">
                    {task.audioUrl ? (
                        <audio
                            controls
                            className="h-10 w-full outline-none"
                            controlsList="nodownload"
                            src={task.audioUrl}
                        >
                            Your browser does not support the audio element.
                        </audio>
                    ) : (
                        <div className="h-10 w-full flex items-center justify-center rounded border border-dashed border-brand-green/30 bg-brand-green/5 text-sm text-brand-green/60">
                            No audio file available
                        </div>
                    )}
                </div>
            </section>

            <div className="grid gap-4">
                {task.questions.map((question, qIndex) => (
                    <section key={question.id} className="rounded-lg border border-brand-green/10 bg-white p-4 dark:border-white/10 dark:bg-[#0f1712]">
                        <h3 className="text-sm font-medium leading-relaxed text-[#17201b] dark:text-white">
                            <span className="mr-2 text-brand-green">{qIndex + 1}.</span>
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
                                                : "border-brand-green/20 bg-white hover:border-brand-green/50 dark:border-white/10 dark:bg-[#111a15]"
                                        }`}
                                    >
                                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                            isSelected
                                                ? "bg-brand-green text-[#0f1712]"
                                                : "bg-brand-green/10 text-brand-green"
                                        }`}>
                                            {labels[optionIndex]}
                                        </span>
                                        <span className={`text-sm font-medium leading-5 ${isSelected ? "text-[#17201b] dark:text-white" : "text-[#17201b] dark:text-white"}`}>
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
