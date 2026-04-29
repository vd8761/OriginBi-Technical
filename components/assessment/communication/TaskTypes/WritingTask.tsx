import React, { useState, useEffect } from 'react';
import { WritingTask } from '../CommunicationEngine';

interface WritingTaskProps {
    task: WritingTask;
    value?: { text: string } | null;
    onChange: (value: { text: string }) => void;
}

const WritingTaskComponent: React.FC<WritingTaskProps> = ({ task, value, onChange }) => {
    const [text, setText] = useState(value?.text || '');
    const [wordCount, setWordCount] = useState(0);

    useEffect(() => {
        // Calculate word count
        const words = text.trim().split(/\s+/);
        setWordCount(text.trim() === '' ? 0 : words.length);
    }, [text]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setText(newText);
        onChange({ text: newText });
    };

    const getWordCountColor = () => {
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
                        {task.prompt}
                    </h3>
                </div>
            </div>

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
                </div>

                {/* Text Area */}
                <textarea
                    value={text}
                    onChange={handleChange}
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
                        </span>
                    )}
                </div>

            </div>
        </div>
    );
};

export default WritingTaskComponent;
