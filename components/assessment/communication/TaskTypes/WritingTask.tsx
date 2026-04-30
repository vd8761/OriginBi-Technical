import React, { useState } from "react";
import type { WritingTask } from "../CommunicationEngine";

interface WritingTaskProps {
    task: WritingTask;
    value?: { text: string } | null;
    onChange: (value: { text: string }) => void;
}

const getWordCount = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
};

const WritingTaskComponent: React.FC<WritingTaskProps> = ({ task, value, onChange }) => {
    const [text, setText] = useState(value?.text || "");
    const wordCount = getWordCount(text);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setText(newText);
        onChange({ text: newText });
    };

    const getWordCountColor = () => {
        if (!task.minWords && !task.maxWords) return "text-slate-500 dark:text-slate-400";
        if (task.minWords && wordCount < task.minWords) return "text-amber-600";
        if (task.maxWords && wordCount > task.maxWords) return "text-red-500";
        return "text-brand-green";
    };

    return (
        <div className="grid min-h-[520px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Writing prompt
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-300">
                    {task.instructions}
                </p>
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f1712]">
                    <h3 className="text-base font-extrabold leading-7 text-[#17201b] dark:text-white">
                        {task.prompt}
                    </h3>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0f1712]">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Minimum</p>
                        <p className="mt-1 text-lg font-extrabold text-[#17201b] dark:text-white">{task.minWords ?? "-"}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0f1712]">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Maximum</p>
                        <p className="mt-1 text-lg font-extrabold text-[#17201b] dark:text-white">{task.maxWords ?? "-"}</p>
                    </div>
                </div>
            </section>

            <section className="flex min-h-[440px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0f1712]">
                <div className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-sm font-extrabold text-[#17201b] dark:text-white">Response editor</p>
                    <span className={`text-sm font-extrabold ${getWordCountColor()}`}>{wordCount} words</span>
                </div>

                <textarea
                    value={text}
                    onChange={handleChange}
                    placeholder="Write your response here..."
                    className="custom-scrollbar min-h-0 flex-1 resize-none bg-transparent p-4 text-sm font-semibold leading-7 text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
                />

                <div className="flex min-h-11 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                    <span>Professional tone, clear next steps, concise structure.</span>
                    {(task.minWords || task.maxWords) && (
                        <span>
                            {task.minWords ? `Min ${task.minWords}` : ""} {task.minWords && task.maxWords ? "|" : ""} {task.maxWords ? `Max ${task.maxWords}` : ""}
                        </span>
                    )}
                </div>
            </section>
        </div>
    );
};

export default WritingTaskComponent;
