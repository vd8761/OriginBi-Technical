import React, { useCallback, useEffect, useMemo, useState } from "react";
import Logo from "../../ui/Logo";
import ThemeToggle from "../../ui/ThemeToggle";
import AudioTaskComponent from "./TaskTypes/AudioTask";
import SpeakingTaskComponent from "./TaskTypes/SpeakingTask";
import ReadingTaskComponent from "./TaskTypes/ReadingTask";
import WritingTaskComponent from "./TaskTypes/WritingTask";
import QuestionNavigator, { NavigatorQuestion, QuestionState } from "../aptitude/QuestionNavigator";
import { AlertCircle, CheckCircle2, Flag, ArrowRight, LayoutGrid, X, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export type TaskType = "audio" | "speaking" | "reading" | "writing";

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

export type AssessmentTask = AudioTask | SpeakingTask | ReadingTask | WritingTask;
export type CommunicationAnswer = Record<string, string> | { audioBlobUrl: string } | { text: string };
export type CommunicationAnswers = Partial<Record<string, CommunicationAnswer>>;

const MOCK_TASKS: AssessmentTask[] = [
    {
        id: "task_1",
        type: "audio",
        instructions: "Listen to the audio clip and answer the questions below.",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        questions: [
            {
                id: "q1",
                text: "What is the primary topic of the announcement?",
                options: [
                    { id: "opt_1", text: "Quarterly financial results" },
                    { id: "opt_2", text: "New office policies" },
                    { id: "opt_3", text: "Upcoming company retreat" },
                    { id: "opt_4", text: "Software update schedule" },
                ],
            },
            {
                id: "q2",
                text: "What action are employees asked to take by Friday?",
                options: [
                    { id: "opt_1", text: "Submit expense reports" },
                    { id: "opt_2", text: "Update their passwords" },
                    { id: "opt_3", text: "RSVP to the event" },
                    { id: "opt_4", text: "Complete the survey" },
                ],
            },
        ],
    },
    {
        id: "task_2",
        type: "reading",
        instructions: "Read the following business email and answer the questions.",
        passage: "Subject: Urgent Update on Project Alpha Delivery\\n\\nTeam,\\n\\nI am writing to inform you that the delivery date for Project Alpha has been moved up by two weeks. The client has requested an expedited timeline due to an upcoming product launch on their end. This means our new target for Phase 1 completion is now October 15th, rather than November 1st.\\n\\nPlease review your current workload and let me know by EOD tomorrow if this compressed schedule poses any critical risks to your deliverables. We will hold a brief stand-up meeting on Thursday morning at 9:00 AM to discuss mitigation strategies.\\n\\nBest regards,\\nSarah Jensen\\nProject Manager",
        questions: [
            {
                id: "q3",
                text: "What is the main reason for the schedule change?",
                options: [
                    { id: "opt_1", text: "The team was working too slowly." },
                    { id: "opt_2", text: "The client has an upcoming product launch." },
                    { id: "opt_3", text: "Sarah Jensen is going on leave." },
                    { id: "opt_4", text: "There was an error in the original contract." },
                ],
            },
            {
                id: "q4",
                text: "When is the new deadline for Phase 1?",
                options: [
                    { id: "opt_1", text: "November 1st" },
                    { id: "opt_2", text: "EOD tomorrow" },
                    { id: "opt_3", text: "October 15th" },
                    { id: "opt_4", text: "Thursday morning" },
                ],
            },
        ],
    },
    {
        id: "task_3",
        type: "speaking",
        instructions: "Read the prompt below. You will have 30 seconds to prepare and 90 seconds to record your response.",
        prompt: "Imagine you are explaining a complex technical problem to a non-technical stakeholder. How would you approach the conversation to ensure they understand the core issue without getting lost in technical jargon?",
        prepTimeSeconds: 30,
        recordTimeSeconds: 90,
    },
    {
        id: "task_4",
        type: "writing",
        instructions: "Draft an email response based on the scenario provided below.",
        prompt: "Scenario: A key client has emailed you expressing frustration that a recent software update broke a critical feature they rely on. Draft a professional, empathetic email acknowledging the issue, explaining that the engineering team is actively working on a fix, and outlining the next steps for communication.",
        minWords: 50,
        maxWords: 200,
    },
];

interface CommunicationEngineProps {
    onComplete: (data: CommunicationAnswers) => void;
}

const taskCopy: Record<TaskType, { label: string; hint: string; accent: string }> = {
    audio: { label: "Audio Comprehension", hint: "Listen carefully and select the best answers.", accent: "Listening" },
    reading: { label: "Reading Clarity", hint: "Analyze the passage and respond precisely.", accent: "Reading" },
    speaking: { label: "Speaking Response", hint: "Record a clear, structured response.", accent: "Speaking" },
    writing: { label: "Writing Craft", hint: "Compose a concise, professional reply.", accent: "Writing" },
};

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
};

const isTaskComplete = (task: AssessmentTask, answer: CommunicationAnswer | undefined) => {
    if (!answer) return false;
    if (task.type === "audio" || task.type === "reading") {
        return task.questions.every((question) => Boolean((answer as Record<string, string>)[question.id]));
    }
    if (task.type === "speaking") {
        return "audioBlobUrl" in answer && Boolean(answer.audioBlobUrl);
    }
    return "text" in answer && answer.text.trim().length > 0;
};

const CommunicationEngine: React.FC<CommunicationEngineProps> = ({ onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(45 * 60);
    const [answers, setAnswers] = useState<CommunicationAnswers>({});
    const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const currentTask = MOCK_TASKS[currentIndex];
    const totalTasks = MOCK_TASKS.length;
    
    const completedCount = useMemo(
        () => MOCK_TASKS.filter((task) => isTaskComplete(task, answers[task.id])).length,
        [answers],
    );
    const progressPercent = Math.round((completedCount / totalTasks) * 100);
    const safeProgress = Math.min(100, Math.max(0, progressPercent));
    const isLastTask = currentIndex === totalTasks - 1;

    const navigatorTasks: NavigatorQuestion[] = MOCK_TASKS.map((task, index) => {
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

    const confirmSubmit = useCallback(() => {
        onComplete(answers);
    }, [answers, onComplete]);

    const handleConfirmSubmit = () => {
        setShowSubmitModal(true);
    };

    useEffect(() => {
        if (timeLeft <= 0) {
            confirmSubmit();
            return;
        }
        const timer = window.setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);
        return () => window.clearInterval(timer);
    }, [confirmSubmit, timeLeft]);

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
        const newMarked = new Set(markedForReview);
        if (newMarked.has(currentTask.id)) {
            newMarked.delete(currentTask.id);
        } else {
            newMarked.add(currentTask.id);
        }
        setMarkedForReview(newMarked);
    };

    const handleClear = () => {
        const newAnswers = { ...answers };
        delete newAnswers[currentTask.id];
        setAnswers(newAnswers);
        const newMarked = new Set(markedForReview);
        newMarked.delete(currentTask.id);
        setMarkedForReview(newMarked);
    };

    const isQuestionMarked = markedForReview.has(currentTask.id);
    const isQuestionAnswered = isTaskComplete(currentTask, answers[currentTask.id]);

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
            default:
                return null;
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#f6f8f5] font-sans text-[#17201b] transition-colors duration-500 dark:bg-[#0f1712] dark:text-white">
            <header className="assessment-header sticky top-0 z-50 flex min-h-14 items-center justify-between gap-4 px-4 py-2 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="hidden origin-left scale-[0.7] sm:block">
                        <Logo />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold text-brand-green uppercase tracking-wider">Communication Assessment</p>
                        <h1 className="truncate text-sm font-bold text-[#17201b] dark:text-white">Multi-skill test workspace</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 rounded-lg border border-brand-green/10 bg-white px-3 py-1.5 shadow-sm dark:border-white/10 dark:bg-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#17201b] dark:text-white">Time left</p>
                        <p className={`font-mono text-sm font-bold ${timeLeft < 300 ? "text-red-500" : "text-[#17201b] dark:text-white"}`}>
                            {formatTime(timeLeft)}
                        </p>
                    </div>
                    <div className="hidden scale-90 lg:block">
                        <ThemeToggle />
                    </div>
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-green/20 bg-white shadow-sm transition hover:border-brand-green dark:border-white/10 dark:bg-white/5 lg:hidden"
                    >
                        <LayoutGrid size={20} className="text-brand-green" />
                    </button>
                </div>
            </header>

            <main className="relative z-10 mx-auto grid max-w-[1600px] gap-8 px-6 py-8 lg:h-[calc(100dvh-72px)] lg:grid-cols-[minmax(0,1fr)_340px] lg:overflow-hidden lg:px-8">
                <section className="flex min-h-[600px] flex-col rounded-lg border border-brand-green/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#111a15] lg:min-h-0 lg:overflow-hidden">
                    <div className="border-b border-brand-green/5 p-4 sm:px-6 sm:py-4 dark:border-white/10">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleMarkReview}
                                        className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 text-xs font-bold transition ${
                                            isQuestionMarked
                                                ? "border-amber-400 bg-amber-400 text-[#241604]"
                                                : "border-brand-green/20 bg-white text-[#17201b] hover:border-amber-400 hover:text-amber-600 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:text-amber-400"
                                        }`}
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z" />
                                        </svg>
                                        {isQuestionMarked ? "Unmark review" : "Mark for review"}
                                    </button>
                                    <button
                                        onClick={handleClear}
                                        disabled={!isQuestionAnswered}
                                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-brand-green/20 bg-white px-4 text-xs font-bold text-[#17201b] transition hover:border-red-500 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:text-red-400"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Clear response
                                    </button>
                                </div>
                        </div>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
                        <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-6 dark:border-white/10 dark:bg-white/5">
                            <h2 className="text-sm font-semibold leading-relaxed text-[#17201b] dark:text-white sm:text-base">
                                <span className="mr-3 font-bold">{currentIndex + 1}.</span>
                                {currentTask.instructions}
                            </h2>
                            <div className="mt-6">
                                {renderTaskContent()}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-brand-green/5 bg-brand-green/[0.02] p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={handlePrev}
                                disabled={currentIndex === 0}
                                className="min-h-11 rounded-lg border border-brand-green/20 bg-white px-5 text-sm font-bold text-[#17201b] transition hover:border-brand-green hover:text-brand-green disabled:opacity-40 dark:border-white/15 dark:bg-[#0f1712] dark:text-white"
                            >
                                Previous
                            </button>
                            {isLastTask ? (
                                <button
                                    type="button"
                                    onClick={handleConfirmSubmit}
                                    className="min-h-11 rounded-lg bg-brand-green px-7 text-sm font-bold text-white transition hover:bg-[#19be5e] shadow-sm"
                                >
                                    Submit assessment
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="min-h-11 rounded-lg bg-brand-green px-7 text-sm font-bold text-white transition hover:bg-[#19be5e]"
                                >
                                    Save and next
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <aside className="hidden rounded-xl border border-brand-green/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#111a15] lg:block lg:min-h-0 lg:overflow-y-auto">
                    <QuestionNavigator
                        questions={navigatorTasks}
                        currentIndex={currentIndex}
                        onSelect={(idx) => setCurrentIndex(idx)}
                        progressPercent={safeProgress}
                    />
                </aside>
            </main>

            <AnimatePresence>
                {isSidebarOpen && (
                    <div className="fixed inset-0 z-[110] lg:hidden">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="absolute inset-0 bg-[#0f1712]/60 backdrop-blur-sm" />
                        <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="absolute inset-y-0 right-0 w-full max-w-[320px] bg-[#f6f8f5] dark:bg-[#111a15]">
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
