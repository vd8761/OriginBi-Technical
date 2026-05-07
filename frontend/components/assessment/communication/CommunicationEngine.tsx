import React, { useCallback, useEffect, useMemo, useState } from "react";
import Logo from "../../ui/Logo";
import ThemeToggle from "../../ui/ThemeToggle";
import AudioTaskComponent from "./TaskTypes/AudioTask";
import SpeakingTaskComponent from "./TaskTypes/SpeakingTask";
import ReadingTaskComponent from "./TaskTypes/ReadingTask";
import WritingTaskComponent from "./TaskTypes/WritingTask";
import McqTaskComponent from "./TaskTypes/McqTask";
import QuestionNavigator, { NavigatorQuestion, QuestionState } from "../aptitude/QuestionNavigator";
import { AlertCircle, CheckCircle2, Flag, ArrowRight, LayoutGrid, X, RotateCcw, PanelRightClose, PanelRightOpen, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "@/lib/contexts/ThemeContext";
import TimerDisplay from "../shared/TimerDisplay";
import { SidebarOpenIcon, SidebarCloseIcon, SidebarMobileIcon } from "../shared/AssessmentIcons";

const COMMUNICATION_TOTAL_TIME = 45 * 60;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type TaskType = "audio" | "speaking" | "reading" | "writing" | "mcq";

export interface BaseTask {
    id: string;
    type: TaskType;
    instructions: string;
}

export interface AudioTask extends BaseTask {
    type: "audio";
    audioUrl: string;
    questions: { id: string; text: string; options: { id: string; text: string }[] }[];
}

export interface SpeakingTask extends BaseTask {
    type: "speaking";
    prompt: string;
    prepTimeSeconds: number;
    recordTimeSeconds: number;
}

export interface ReadingTask extends BaseTask {
    type: "reading";
    passage: string;
    questions: { id: string; text: string; options: { id: string; text: string }[] }[];
}

export interface WritingTask extends BaseTask {
    type: "writing";
    prompt: string;
    minWords?: number;
    maxWords?: number;
}

export interface McqTask extends BaseTask {
    type: "mcq";
    questions: { id: string; text: string; options: { id: string; text: string }[] }[];
}

export type AssessmentTask = AudioTask | SpeakingTask | ReadingTask | WritingTask | McqTask;
export type CommunicationAnswer = Record<string, string> | { audioBlobUrl: string } | { text: string };
export type CommunicationAnswers = Partial<Record<string, CommunicationAnswer>>;

const taskCopy: Record<TaskType, { label: string; hint: string; accent: string }> = {
    audio: { label: "Audio Comprehension", hint: "Listen carefully and select the best answers.", accent: "Listening" },
    reading: { label: "Reading Clarity", hint: "Analyze the passage and respond precisely.", accent: "Reading" },
    speaking: { label: "Speaking Response", hint: "Record a clear, structured response.", accent: "Speaking" },
    writing: { label: "Writing Craft", hint: "Compose a concise, professional reply.", accent: "Writing" },
    mcq: { label: "Linguistic Accuracy", hint: "Select the most appropriate professional response.", accent: "Grammar" },
};

const formatTime = (seconds: number) => {
    const safe = Math.max(0, seconds);
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const isTaskComplete = (task: AssessmentTask, answer: CommunicationAnswer | undefined) => {
    if (!answer) return false;
    if (task.type === "audio" || task.type === "reading" || task.type === "mcq") {
        return (task as any).questions?.every((question: any) => Boolean((answer as Record<string, string>)[question.id]));
    }
    if (task.type === "speaking") {
        return "audioBlobUrl" in answer && Boolean(answer.audioBlobUrl);
    }
    return "text" in answer && (answer as { text: string }).text.trim().length > 0;
};

interface CommunicationEngineProps {
    onComplete: (data: CommunicationAnswers) => void;
    assessmentCode?: string;
    userId?: number;
    mode?: 'trial' | 'main';
}

const CommunicationEngine: React.FC<CommunicationEngineProps> = ({ 
    onComplete,
    assessmentCode = "TECH_COMM_001",
    userId,
    mode = 'main'
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(COMMUNICATION_TOTAL_TIME);
    const [answers, setAnswers] = useState<CommunicationAnswers>({});
    const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
    const { theme } = useTheme();
    const [tasks, setTasks] = useState<AssessmentTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [attemptToken, setAttemptToken] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchAttempt = async () => {
            try {
                setIsLoading(true);
                setLoadError(null);
                const response = await fetch(`${API_BASE}/api/assessment/grammar/attempts`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ assessmentCode, userId, mode }),
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.message || "Failed to load Communication questions.");
                }

                const data = await response.json();
                setAttemptToken(data.attemptToken);
                setTasks(data.questions || []);
                setTimeLeft(Number(data.durationSeconds || 2700));
            } catch (error) {
                setLoadError((error as Error).message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAttempt();
    }, [assessmentCode, userId, mode]);

    const currentTask = tasks[currentIndex];
    const totalTasks = tasks.length;
    
    const completedCount = useMemo(
        () => tasks.filter((task) => isTaskComplete(task, answers[task.id])).length,
        [answers, tasks],
    );
    const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
    const safeProgress = Math.min(100, Math.max(0, progressPercent));
    const isLastTask = currentIndex === totalTasks - 1;

    const navigatorTasks: NavigatorQuestion[] = tasks.map((task, index) => {
        const isAnswered = isTaskComplete(task, answers[task.id]);
        const isMarked = markedForReview.has(task.id);

        let state: QuestionState = "unanswered";
        if (isAnswered) state = "answered";
        if (isMarked) state = "marked";

        return {
            id: task.id,
            number: index + 1,
            state,
            category: task.type.toUpperCase(),
            isAnswered,
            isMarked,
        };
    });

    const confirmSubmit = useCallback(async () => {
        if (!attemptToken || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/api/assessment/grammar/attempts/${attemptToken}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers }),
            });

            if (!response.ok) {
                throw new Error("Failed to submit assessment.");
            }

            onComplete(answers);
        } catch (error) {
            setLoadError((error as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    }, [answers, attemptToken, isSubmitting, onComplete]);

    const handleConfirmSubmit = () => {
        setShowSubmitModal(true);
    };

    useEffect(() => {
        if (isLoading || !attemptToken) return;
        if (timeLeft <= 0) {
            confirmSubmit();
            return;
        }
        const timer = window.setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);
        return () => window.clearInterval(timer);
    }, [confirmSubmit, timeLeft, isLoading, attemptToken]);

    const handleNext = () => {
        if (!isLastTask) {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const updateAnswer = (taskId: string, answerData: CommunicationAnswer) => {
        setAnswers((prev) => ({
            ...prev,
            [taskId]: answerData,
        }));
    };

    const handleMarkReview = () => {
        if (!currentTask) return;
        const newMarked = new Set(markedForReview);
        if (newMarked.has(currentTask.id)) {
            newMarked.delete(currentTask.id);
        } else {
            newMarked.add(currentTask.id);
        }
        setMarkedForReview(newMarked);
    };

    const handleClear = () => {
        if (!currentTask) return;
        const newAnswers = { ...answers };
        delete newAnswers[currentTask.id];
        setAnswers(newAnswers);
    };

    const isQuestionMarked = currentTask ? markedForReview.has(currentTask.id) : false;
    const isQuestionAnswered = currentTask ? isTaskComplete(currentTask, answers[currentTask.id]) : false;

    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f6f8f5] dark:bg-[#0f1712] transition-colors duration-500">
                <Logo className="h-12 w-auto mb-8" />
                <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
            </div>
        );
    }

    if (loadError || tasks.length === 0) {
        return (
            <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f6f8f5] px-4 dark:bg-[#0f1712] transition-colors duration-500">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 dark:bg-red-500/5">
                    <AlertCircle size={32} />
                </div>
                <h2 className="mb-2 text-xl font-black text-[#17201b] dark:text-white">
                    {tasks.length === 0 ? "Task Bank Empty" : "Initialization Failed"}
                </h2>
                <p className="mb-8 max-w-md text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                    {loadError || `No active ${mode} tasks were found for this communication assessment. Please check your admin settings.`}
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => window.location.reload()}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-brand-green/20 bg-white px-6 text-sm font-bold text-[#17201b] transition hover:border-brand-green dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                        <RotateCcw size={16} />
                        Retry Sync
                    </button>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-green px-6 text-sm font-bold text-white shadow-lg shadow-brand-green/20 transition hover:bg-[#19be5e]"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    const renderTaskContent = () => {
        switch (currentTask.type) {
            case "audio":
                return (
                    <AudioTaskComponent
                        task={currentTask}
                        value={answers[currentTask.id] as Record<string, string> | undefined}
                        onChange={(value) => updateAnswer(currentTask.id, value)}
                    />
                );
            case "reading":
                return (
                    <ReadingTaskComponent
                        task={currentTask}
                        value={answers[currentTask.id] as Record<string, string> | undefined}
                        onChange={(value) => updateAnswer(currentTask.id, value)}
                    />
                );
            case "speaking":
                return (
                    <SpeakingTaskComponent
                        task={currentTask}
                        value={answers[currentTask.id] as { audioBlobUrl: string } | undefined}
                        onChange={(value) => updateAnswer(currentTask.id, value)}
                    />
                );
            case "writing":
                return (
                    <WritingTaskComponent
                        task={currentTask}
                        value={answers[currentTask.id] as { text: string } | undefined}
                        onChange={(value) => updateAnswer(currentTask.id, value)}
                    />
                );
            case "mcq":
                return (
                    <McqTaskComponent
                        task={currentTask}
                        value={answers[currentTask.id] as Record<string, string> | undefined}
                        onChange={(value: Record<string, string>) => updateAnswer(currentTask.id, value)}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#f6f8f5] font-sans text-[#17201b] transition-colors duration-500 dark:bg-[#0f1712] dark:text-white">
            <header className="assessment-header sticky top-0 z-50 flex min-h-[72px] items-center justify-between gap-4 px-4 py-4 backdrop-blur-md dark:border-b dark:border-white/5 md:px-6">
                <div className="flex min-w-0 items-center">
                    <div className="hidden sm:block">
                        <Logo className="h-7" />
                    </div>
                    <div className="mx-4 hidden h-8 w-px bg-slate-300 dark:bg-white/10 sm:block" />
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold text-brand-green uppercase tracking-wider">Communication Assessment</p>
                        <h1 className="truncate text-sm font-bold text-[#17201b] dark:text-white">Multi-skill test workspace</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <TimerDisplay 
                        time={timeLeft} 
                        total={COMMUNICATION_TOTAL_TIME} 
                        theme={theme} 
                    />
                    <div className="hidden scale-90 lg:block">
                        <ThemeToggle />
                    </div>
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-green/20 bg-white shadow-sm transition hover:border-brand-green dark:border-white/10 dark:bg-white/5 lg:hidden"
                        title="Question Map"
                    >
                        <SidebarMobileIcon className="text-brand-green" />
                    </button>
                    <button 
                        onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
                        className={`hidden lg:flex h-10 w-10 items-center justify-center rounded-lg border transition shadow-sm ${
                            isDesktopSidebarOpen 
                            ? 'border-brand-green/50 bg-brand-green/10 text-brand-green dark:border-brand-green/30 dark:bg-brand-green/10' 
                            : 'border-brand-green/20 bg-white hover:border-brand-green dark:border-white/10 dark:bg-white/5 text-brand-green'
                        }`}
                        title="Toggle Question Map"
                    >
                        {isDesktopSidebarOpen ? <SidebarCloseIcon /> : <SidebarOpenIcon />}
                    </button>
                </div>
            </header>

            <main className="relative z-10 mx-auto flex max-w-[1440px] gap-4 lg:gap-5 px-4 py-4 lg:py-5 lg:h-[calc(100dvh-72px)] lg:overflow-hidden lg:px-6">
                <section className="flex-1 flex min-h-[600px] min-w-0 flex-col rounded-lg border border-brand-green/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#111a15] lg:min-h-0 lg:overflow-hidden transition-all duration-300">
                    <div className="border-b border-brand-green/5 p-3 sm:px-5 sm:py-2.5 dark:border-white/10">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-[#17201b] dark:text-white uppercase tracking-wider">
                                    {taskCopy[currentTask.type].label}
                                </h2>
                                <div className="mt-0.5 flex items-center gap-2">
                                    {isQuestionMarked && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                                            <div className="h-1 w-1 rounded-full bg-current" />
                                            Marked for review
                                        </span>
                                    )}
                                    {isQuestionAnswered && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-brand-green uppercase">
                                            <div className="h-1 w-1 rounded-full bg-current" />
                                            Saved
                                        </span>
                                    )}
                                </div>
                            </div>

                                <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:items-center">
                                    <button
                                        onClick={handleMarkReview}
                                        className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3.5 text-[10px] font-bold transition sm:px-4 sm:text-[11px] ${
                                            isQuestionMarked
                                                ? "border-amber-400 bg-amber-400 text-[#241604]"
                                                : "border-brand-green/20 bg-white text-[#17201b] hover:border-amber-400 hover:text-amber-600 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:text-amber-400"
                                        }`}
                                    >
                                        <svg className={`h-3.5 w-3.5 shrink-0 ${isQuestionMarked ? "fill-current" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z" />
                                        </svg>
                                        <span className="truncate">{isQuestionMarked ? "Unmark review" : "Mark for review"}</span>
                                    </button>
                                    <button
                                        onClick={handleClear}
                                        disabled={!isQuestionAnswered}
                                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-brand-green/20 bg-white px-3.5 text-[10px] font-bold text-[#17201b] transition hover:border-red-500 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:text-red-400 sm:px-4 sm:text-[11px]"
                                    >
                                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span className="truncate">Clear response</span>
                                    </button>
                                </div>
                        </div>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
                        {renderTaskContent()}
                    </div>

                    <div className="border-t border-brand-green/5 bg-brand-green/[0.02] p-3 dark:border-white/10 dark:bg-white/5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={handlePrev}
                                disabled={currentIndex === 0}
                                className="min-h-10 rounded-lg border border-brand-green/20 bg-white px-5 text-sm font-bold text-[#17201b] transition hover:border-brand-green hover:text-brand-green disabled:opacity-40 dark:border-white/15 dark:bg-[#0f1712] dark:text-white"
                            >
                                Previous
                            </button>
                            {isLastTask ? (
                                <button
                                    type="button"
                                    onClick={handleConfirmSubmit}
                                    className="min-h-10 rounded-lg bg-brand-green px-7 text-sm font-bold text-white transition hover:bg-[#19be5e] shadow-sm"
                                >
                                    Submit assessment
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="min-h-10 rounded-lg bg-brand-green px-7 text-sm font-bold text-white transition hover:bg-[#19be5e]"
                                >
                                    Save and next
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <motion.aside 
                    initial={false}
                    animate={{ width: isDesktopSidebarOpen ? 300 : 80 }}
                    transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                    className="hidden shrink-0 relative lg:block lg:min-h-0 rounded-xl border border-brand-green/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#111a15] overflow-hidden"
                >
                    <div className={`h-full overflow-y-auto custom-scrollbar transition-all duration-300 ${isDesktopSidebarOpen ? 'w-[300px] p-5' : 'w-full py-5 px-2'}`}>
                        <QuestionNavigator
                            questions={navigatorTasks}
                            currentIndex={currentIndex}
                            onSelect={(idx) => setCurrentIndex(idx)}
                            progressPercent={safeProgress}
                            isCollapsed={!isDesktopSidebarOpen}
                        />
                    </div>
                </motion.aside>
            </main>

            <AnimatePresence>
                {isSidebarOpen && (
                    <div className="fixed inset-0 z-[110] lg:hidden">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="absolute inset-0 bg-[#0f1712]/60 backdrop-blur-sm" />
                        <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="absolute inset-y-0 right-0 w-[85%] max-w-sm bg-[#f6f8f5] dark:bg-[#111a15]">
                            <div className="flex h-full flex-col">
                                <div className="flex items-center justify-between border-b p-6 dark:border-white/10">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-sm font-bold uppercase text-[#17201b] dark:text-white">Navigator</h2>
                                        <ThemeToggle />
                                    </div>
                                    <button onClick={() => setIsSidebarOpen(false)}><X size={20} /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6">
                                    <QuestionNavigator questions={navigatorTasks} currentIndex={currentIndex} onSelect={(idx) => { setCurrentIndex(idx); setIsSidebarOpen(false); }} progressPercent={safeProgress} />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showSubmitModal && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#0f1712]/60 backdrop-blur-md" onClick={() => setShowSubmitModal(false)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white p-8 shadow-2xl dark:bg-[#111a15]">
                            <div className="flex flex-col items-center text-center">
                                <CheckCircle2 size={40} className="text-brand-green mb-4" />
                                <h2 className="text-2xl font-black text-[#17201b] dark:text-white">Ready to submit?</h2>
                                <p className="mt-2 text-sm text-[#17201b] dark:text-white">Review your communication assessment summary before finalizing.</p>
                                <div className="mt-8 grid w-full grid-cols-3 gap-4">
                                    <div className="flex flex-col items-center rounded-xl bg-brand-green/[0.05] p-4 border border-brand-green/10">
                                        <span className="text-xl font-black text-brand-green">{navigatorTasks.filter(q => q.isAnswered).length}</span>
                                        <span className="text-[10px] font-bold uppercase text-brand-green">Answered</span>
                                    </div>
                                    <div className="flex flex-col items-center rounded-xl bg-amber-400/[0.05] p-4 border border-amber-400/10">
                                        <span className="text-xl font-black text-amber-500">{navigatorTasks.filter(q => q.isMarked).length}</span>
                                        <span className="text-[10px] font-bold uppercase text-amber-500">Review</span>
                                    </div>
                                    <div className="flex flex-col items-center rounded-xl bg-slate-100 p-4 dark:bg-white/5">
                                        <span className="text-xl font-black text-slate-700 dark:text-white">{navigatorTasks.filter(q => !q.isAnswered).length}</span>
                                        <span className="text-[10px] font-bold uppercase text-slate-700 dark:text-white">Left</span>
                                    </div>
                                </div>
                                <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
                                    <button onClick={() => setShowSubmitModal(false)} className="flex-1 rounded-xl border py-3.5 text-sm font-bold dark:text-white">Review Tasks</button>
                                    <button onClick={confirmSubmit} className="flex-1 rounded-xl bg-brand-green py-3.5 text-sm font-bold text-white">Yes, Submit Test</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CommunicationEngine;
