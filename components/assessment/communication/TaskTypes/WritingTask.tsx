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
<<<<<<< HEAD
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
=======
        if (!task.minWords && !task.maxWords) return 'text-black dark:text-white';
        
        if (task.minWords && wordCount < task.minWords) return 'text-amber-500';
        if (task.maxWords && wordCount > task.maxWords) return 'text-red-500';
        
        return 'text-brand-green';
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="bg-brand-light-secondary dark:bg-white/[0.03] p-5 rounded-[20px] border border-brand-light-tertiary dark:border-white/10 flex flex-col gap-4">
                <p className="text-[13px] font-bold text-black dark:text-white uppercase tracking-wider">
                    {task.instructions}
                </p>
                <div className="bg-white dark:bg-brand-dark-primary p-5 rounded-xl border border-brand-light-tertiary dark:border-white/5">
                    <h3 className="text-[clamp(14px,1.2vw,18px)] font-semibold text-black dark:text-white leading-relaxed">
>>>>>>> origin/vikash
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

<<<<<<< HEAD
            <section className="flex min-h-[440px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0f1712]">
                <div className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-sm font-extrabold text-[#17201b] dark:text-white">Response editor</p>
                    <span className={`text-sm font-extrabold ${getWordCountColor()}`}>{wordCount} words</span>
=======
            <div className="flex-1 flex flex-col bg-white dark:bg-white/[0.03] rounded-[20px] border border-brand-light-tertiary dark:border-white/5 overflow-hidden transition-colors min-h-[300px]">
                
                {/* Editor Toolbar (Mock) */}
                <div className="h-12 border-b border-brand-light-tertiary dark:border-white/5 bg-gray-50 dark:bg-white/[0.05] flex items-center px-4 gap-2">
                    <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-black dark:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                    </button>
                    <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-black dark:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                    </button>
                    <div className="w-px h-4 bg-gray-300 dark:bg-white/20 mx-1"></div>
                    <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-black dark:text-white transition-colors font-serif font-bold text-xs">B</button>
                    <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-black dark:text-white transition-colors font-serif italic text-xs">I</button>
                    <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-black dark:text-white transition-colors font-serif underline text-xs">U</button>
>>>>>>> origin/vikash
                </div>

                <textarea
                    value={text}
                    onChange={handleChange}
<<<<<<< HEAD
                    placeholder="Write your response here..."
                    className="custom-scrollbar min-h-0 flex-1 resize-none bg-transparent p-4 text-sm font-semibold leading-7 text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
                />

                <div className="flex min-h-11 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                    <span>Professional tone, clear next steps, concise structure.</span>
                    {(task.minWords || task.maxWords) && (
                        <span>
                            {task.minWords ? `Min ${task.minWords}` : ""} {task.minWords && task.maxWords ? "|" : ""} {task.maxWords ? `Max ${task.maxWords}` : ""}
=======
                    placeholder="Start typing your response here..."
                    className="flex-1 w-full p-6 bg-transparent outline-none resize-none text-[14px] leading-relaxed text-black dark:text-white custom-scrollbar"
                />

                {/* Footer / Word Count */}
                <div className="h-10 border-t border-brand-light-tertiary dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between px-4">
                    <span className={`text-[11px] font-bold tracking-wider ${getWordCountColor()}`}>
                        {wordCount} Words
                    </span>
                    {(task.minWords || task.maxWords) && (
                        <span className="text-[10px] font-medium text-black dark:text-white">
                            {task.minWords ? `Min: ${task.minWords}` : ''} {task.minWords && task.maxWords ? '|' : ''} {task.maxWords ? `Max: ${task.maxWords}` : ''}
>>>>>>> origin/vikash
                        </span>
                    )}
                </div>
            </section>
        </div>
    );
};

export default WritingTaskComponent;
