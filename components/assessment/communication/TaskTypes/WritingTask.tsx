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
        if (!task.minWords && !task.maxWords) return "text-[#17201b] dark:text-white";
        if (task.minWords && wordCount < task.minWords) return "text-amber-600";
        if (task.maxWords && wordCount > task.maxWords) return "text-red-500";
        return "text-brand-green";
    };

    return (
        <div className="grid min-h-[520px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#17201b] dark:text-white">
                    Writing prompt
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-[#17201b] dark:text-white">
                    {task.instructions}
                </p>
                <div className="mt-4 rounded-lg border border-brand-green/10 bg-white p-4 dark:border-white/10 dark:bg-[#0f1712]">
                    <h3 className="text-base font-bold leading-7 text-[#17201b] dark:text-white">
                        {task.prompt}
                    </h3>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-brand-green/10 bg-white p-3 dark:border-white/10 dark:bg-[#0f1712]">
                        <p className="text-xs font-medium text-[#17201b] dark:text-white">Minimum</p>
                        <p className="mt-1 text-lg font-bold text-[#17201b] dark:text-white">{task.minWords ?? "-"}</p>
                    </div>
                    <div className="rounded-lg border border-brand-green/10 bg-white p-3 dark:border-white/10 dark:bg-[#0f1712]">
                        <p className="text-xs font-medium text-[#17201b] dark:text-white">Maximum</p>
                        <p className="mt-1 text-lg font-bold text-[#17201b] dark:text-white">{task.maxWords ?? "-"}</p>
                    </div>
                </div>
            </section>

            <section className="flex min-h-[440px] flex-col overflow-hidden rounded-lg border border-brand-green/10 bg-white dark:border-white/10 dark:bg-[#0f1712]">
                <div className="flex min-h-12 items-center justify-between gap-3 border-b border-brand-green/5 bg-brand-green/[0.02] px-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-sm font-bold text-[#17201b] dark:text-white">Response editor</p>
                    <span className={`text-sm font-bold ${getWordCountColor()}`}>{wordCount} words</span>
                </div>

                <textarea
                    value={text}
                    onChange={handleChange}
                    placeholder="Write your response here..."
                    className="custom-scrollbar min-h-0 flex-1 resize-none bg-transparent p-4 text-sm font-medium leading-7 text-[#17201b] outline-none placeholder:text-[#17201b] dark:text-white dark:placeholder:text-white"
                />

                <div className="flex min-h-11 items-center justify-between gap-3 border-t border-brand-green/5 bg-brand-green/[0.02] px-4 text-[10px] font-bold uppercase tracking-wider text-[#17201b] dark:border-white/10 dark:bg-white/5 dark:text-white">
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
