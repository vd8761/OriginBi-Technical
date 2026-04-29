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
        if (!task.minWords && !task.maxWords) return 'text-brand-text-light-secondary dark:text-gray-400';
        
        if (task.minWords && wordCount < task.minWords) return 'text-amber-500';
        if (task.maxWords && wordCount > task.maxWords) return 'text-red-500';
        
        return 'text-brand-green';
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="bg-brand-light-secondary dark:bg-[#24272B] p-5 rounded-[20px] border border-brand-light-tertiary dark:border-white/10 flex flex-col gap-4">
                <p className="text-[13px] font-bold text-brand-text-light-secondary dark:text-gray-400 uppercase tracking-wider">
                    {task.instructions}
                </p>
                <div className="bg-white dark:bg-[#1A1D21] p-5 rounded-xl border border-brand-light-tertiary dark:border-white/5 shadow-inner">
                    <h3 className="text-[clamp(14px,1.2vw,18px)] font-semibold text-brand-text-light-primary dark:text-white leading-relaxed">
                        {task.prompt}
                    </h3>
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-white dark:bg-[#1A1D21] rounded-[20px] shadow-sm border border-brand-light-tertiary dark:border-white/5 overflow-hidden transition-colors min-h-[300px]">
                
                {/* Editor Toolbar (Mock) */}
                <div className="h-12 border-b border-brand-light-tertiary dark:border-white/5 bg-gray-50 dark:bg-[#24272B] flex items-center px-4 gap-2">
                    <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-brand-text-light-secondary dark:text-gray-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                    </button>
                    <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-brand-text-light-secondary dark:text-gray-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                    </button>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-brand-text-light-secondary dark:text-gray-400 transition-colors font-serif font-bold text-xs">B</button>
                    <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-brand-text-light-secondary dark:text-gray-400 transition-colors font-serif italic text-xs">I</button>
                    <button className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-brand-text-light-secondary dark:text-gray-400 transition-colors font-serif underline text-xs">U</button>
                </div>

                {/* Text Area */}
                <textarea
                    value={text}
                    onChange={handleChange}
                    placeholder="Start typing your response here..."
                    className="flex-1 w-full p-6 bg-transparent outline-none resize-none text-[14px] leading-relaxed text-brand-text-light-primary dark:text-gray-200 custom-scrollbar"
                />

                {/* Footer / Word Count */}
                <div className="h-10 border-t border-brand-light-tertiary dark:border-white/5 bg-gray-50 dark:bg-[#1A1D21] flex items-center justify-between px-4">
                    <span className={`text-[11px] font-bold tracking-wider ${getWordCountColor()}`}>
                        {wordCount} Words
                    </span>
                    {(task.minWords || task.maxWords) && (
                        <span className="text-[10px] font-medium text-brand-text-light-secondary dark:text-gray-500">
                            {task.minWords ? `Min: ${task.minWords}` : ''} {task.minWords && task.maxWords ? '|' : ''} {task.maxWords ? `Max: ${task.maxWords}` : ''}
                        </span>
                    )}
                </div>

            </div>
        </div>
    );
};

export default WritingTaskComponent;
