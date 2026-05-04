import React from "react";
import { motion, AnimatePresence } from "motion/react";
import type { ReadingTask } from "../CommunicationEngine";

interface ReadingTaskProps {
    task: ReadingTask;
    value?: Record<string, string>;
    onChange: (value: Record<string, string>) => void;
}

const labels = ["A", "B", "C", "D"];

const ReadingTaskComponent: React.FC<ReadingTaskProps> = ({ task, value = {}, onChange }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
    const [isMaximized, setIsMaximized] = React.useState(false);
    const [fontSize, setFontSize] = React.useState(14);

    const handleOptionSelect = (questionId: string, optionId: string) => {
        onChange({
            ...value,
            [questionId]: optionId,
        });
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < task.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const prevQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const formattedPassage = task.passage.split("\\n").map((line, index) => (
        <React.Fragment key={`${line}-${index}`}>
            {line}
            <br />
        </React.Fragment>
    ));

    return (
        <div className={`grid grid-cols-1 gap-8 ${isMaximized ? "" : "xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"}`}>
            <motion.section 
                layout
                initial={false}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className={`rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-4 transition-colors duration-500 dark:border-white/10 dark:bg-white/5 sm:p-5 ${isMaximized ? "col-span-full shadow-xl ring-1 ring-brand-green/20" : "lg:h-fit lg:sticky lg:top-0"}`}
            >
                <div className="mb-4 flex flex-col items-start justify-between gap-4 border-b border-brand-green/5 pb-4 dark:border-white/5 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#17201b] dark:text-white">
                            Reading passage
                        </p>
                        <p className="mt-1 line-clamp-1 text-xs font-medium text-[#17201b]/70 dark:text-white/60 sm:text-sm">
                            {task.instructions}
                        </p>
                    </div>
                    
                    <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
                        <div className="flex items-center gap-1 rounded-md bg-white/50 p-1 dark:bg-black/20">
                            <button 
                                onClick={() => setFontSize(Math.max(12, fontSize - 1))}
                                className="flex h-8 w-8 items-center justify-center rounded hover:bg-brand-green/10 text-xs font-bold transition-colors"
                                title="Decrease font size"
                            >
                                A-
                            </button>
                            <button 
                                onClick={() => setFontSize(Math.min(20, fontSize + 1))}
                                className="flex h-8 w-8 items-center justify-center rounded border-l border-brand-green/10 hover:bg-brand-green/10 text-sm font-bold dark:border-white/10 transition-colors"
                                title="Increase font size"
                            >
                                A+
                            </button>
                        </div>
                        <button
                            onClick={() => setIsMaximized(!isMaximized)}
                            className="flex h-9 items-center gap-2 rounded-md bg-brand-green/10 px-3 text-xs font-bold text-brand-green transition-all hover:bg-brand-green/20 active:scale-95"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                            <span className="hidden lg:inline">{isMaximized ? "Exit Focus" : "Focus Mode"}</span>
                            <span className="lg:hidden">{isMaximized ? "Exit" : "Focus"}</span>
                        </button>
                    </div>
                </div>
                <motion.div 
                    layout="position"
                    className={`custom-scrollbar overflow-y-auto rounded-lg border border-brand-green/10 bg-white p-5 transition-all duration-500 dark:border-white/10 dark:bg-[#0f1712] sm:p-8 ${isMaximized ? "max-h-[650px]" : "max-h-[460px]"}`}
                >
                    <p 
                        className="font-medium leading-relaxed text-[#17201b] dark:text-white transition-all duration-300"
                        style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
                    >
                        {formattedPassage}
                    </p>
                </motion.div>
            </motion.section>

            <AnimatePresence>
                {!isMaximized && (
                    <motion.section 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="flex flex-col gap-4"
                    >
                        <div className="flex-1">
                            {task.questions.map((question, qIndex) => (
                                <div 
                                    key={question.id} 
                                    className={`${qIndex === currentQuestionIndex ? "block" : "hidden"} animate-in fade-in slide-in-from-right-4 duration-300`}
                                >
                                    <div className="rounded-lg border border-brand-green/10 bg-white p-4 dark:border-white/10 dark:bg-[#0f1712]">
                                        <div className="mb-4 flex items-center justify-between">
                                            <h3 className="text-sm font-medium leading-relaxed text-[#17201b] dark:text-white">
                                                {question.text}
                                            </h3>
                                        </div>

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
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ReadingTaskComponent;
