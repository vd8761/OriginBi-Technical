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
<<<<<<< HEAD
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
=======
        <div className="flex flex-col gap-6">
            <div className="bg-brand-light-secondary dark:bg-white/[0.03] p-5 rounded-2xl border border-brand-light-tertiary dark:border-white/10 flex flex-col gap-4">
                <p className="text-[13px] font-medium text-black dark:text-white">
                    {task.instructions}
                </p>
                
                {/* Audio Player */}
                <div className="w-full bg-white dark:bg-brand-dark-primary p-3 rounded-xl border border-brand-light-tertiary dark:border-white/5 shadow-sm">
                    <audio 
                        controls 
                        className="w-full h-10 outline-none" 
>>>>>>> origin/vikash
                        controlsList="nodownload"
                        src={task.audioUrl}
                    >
                        Your browser does not support the audio element.
                    </audio>
                </div>
            </section>

<<<<<<< HEAD
            <div className="grid gap-4">
                {task.questions.map((question, qIndex) => (
                    <section key={question.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f1712]">
                        <h3 className="text-base font-extrabold leading-7 text-[#17201b] dark:text-white">
                            <span className="mr-2 text-slate-400">{qIndex + 1}.</span>
                            {question.text}
=======
            {/* Questions */}
            <div className="flex flex-col gap-8">
                {task.questions.map((q, qIndex) => (
                    <div key={q.id} className="bg-white dark:bg-white/[0.03] p-5 md:p-8 rounded-[20px] border border-brand-light-tertiary dark:border-white/5 transition-colors">
                        <h3 className="text-[clamp(14px,1.2vw,18px)] font-semibold text-black dark:text-white leading-relaxed mb-6">
                            <span className="text-black dark:text-white mr-2">{qIndex + 1}.</span>
                            {q.text}
>>>>>>> origin/vikash
                        </h3>

                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {question.options.map((option, optionIndex) => {
                                const isSelected = value[question.id] === option.id;

                                return (
                                    <button
                                        key={option.id}
<<<<<<< HEAD
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
=======
                                        onClick={() => handleOptionSelect(q.id, option.id)}
                                        className={`
                                            flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 group
                                            ${isSelected 
                                                ? 'bg-brand-green/5 border-brand-green' 
                                                : 'bg-white dark:bg-white/[0.03] border-brand-light-tertiary dark:border-white/5 hover:border-brand-green/30'
                                            }
                                        `}
                                    >
                                        <div className={`
                                            w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all
                                            ${isSelected ? 'bg-brand-green text-white' : 'bg-brand-light-primary dark:bg-white/5 text-black dark:text-white group-hover:bg-brand-green/10 group-hover:text-brand-green'}
                                        `}>
                                            {labels[oIndex]}
                                        </div>
                                        <span className={`text-[13px] font-medium ${isSelected ? 'text-brand-green font-bold' : 'text-black dark:text-white'}`}>
>>>>>>> origin/vikash
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
