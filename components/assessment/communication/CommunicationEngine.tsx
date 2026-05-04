import React, { useCallback, useEffect, useMemo, useState } from "react";
import Logo from "../../ui/Logo";
import ThemeToggle from "../../ui/ThemeToggle";
import AudioTaskComponent from "./TaskTypes/AudioTask";
import SpeakingTaskComponent from "./TaskTypes/SpeakingTask";
import ReadingTaskComponent from "./TaskTypes/ReadingTask";
import WritingTaskComponent from "./TaskTypes/WritingTask";

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

import ConfirmationModal from '../../ui/ConfirmationModal';

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

const renderTaskIcon = (type: TaskType, className = "h-4 w-4") => {
    switch (type) {
        case "audio":
            return (
                <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm12-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
                </svg>
            );
        case "reading":
            return (
                <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-6 8h6a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
                </svg>
            );
        case "speaking":
            return (
                <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 0 1-7 7m0 0a7 7 0 0 1-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 0 1-3-3V5a3 3 0 1 1 6 0v6a3 3 0 0 1-3 3Z" />
                </svg>
            );
        case "writing":
        default:
            return (
                <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                </svg>
            );
    }
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
    const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 mins
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    
    const currentTask = MOCK_TASKS[currentIndex];
    const totalTasks = MOCK_TASKS.length;
    const completedCount = useMemo(
        () => MOCK_TASKS.filter((task) => isTaskComplete(task, answers[task.id])).length,
        [answers],
    );
    const remainingTasks = totalTasks - completedCount;
    const progressPercent = Math.round((completedCount / totalTasks) * 100);
    const safeProgress = Math.min(100, Math.max(0, progressPercent));
    const isLastTask = currentIndex === totalTasks - 1;
    const progressRingStyle = {
        background: `conic-gradient(#1ed36a ${safeProgress}%, rgba(148, 163, 184, 0.24) 0)`,
    };

    const handleSubmit = useCallback(() => {
        onComplete(answers);
    }, [answers, onComplete]);

    useEffect(() => {
        if (timeLeft <= 0) {
            confirmSubmit();
            return;
        }

        const timer = window.setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => window.clearInterval(timer);
    }, [handleSubmit, timeLeft]);

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

    const handleSubmit = () => {
        setShowSubmitModal(true);
    };

    const confirmSubmit = () => {
        setShowSubmitModal(false);
        onComplete(answers);
    };

    const updateAnswer = (taskId: string, answerData: CommunicationAnswer) => {
        setAnswers((prev) => ({
            ...prev,
            [taskId]: answerData,
        }));
    };

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
        <div className="h-screen w-full bg-brand-light-primary dark:bg-brand-dark-primary flex flex-col font-sans transition-colors duration-500 overflow-hidden">
            {/* Top Bar */}
            <header className="h-14 border-b border-brand-light-tertiary dark:border-white/5 bg-white dark:bg-brand-dark-primary flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="scale-75 origin-left">
                        <Logo />
                    </div>
                    <div className="h-4 w-px bg-brand-light-tertiary dark:bg-white/10 hidden md:block"></div>
                    <span className="text-[11px] font-bold text-black dark:text-white hidden md:block uppercase tracking-wider">
                        Communication Assessment
                    </span>
                </div>

                <div className="flex items-center gap-6">
                    {/* Timer */}
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${timeLeft < 300 ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 animate-pulse' : 'bg-black/5 dark:bg-white/5 border-transparent text-black dark:text-white'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-bold font-mono text-[13px] tracking-wider">{formatTime(timeLeft)}</span>
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            <main className="relative z-10 mx-auto grid max-w-[1500px] gap-4 px-4 py-4 lg:h-[calc(100dvh-64px)] lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:overflow-hidden lg:px-6">
                <aside className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#111a15] lg:min-h-0">
                    <div className="flex items-center gap-4">
                        <div className="h-20 w-20 rounded-full p-1" style={progressRingStyle}>
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-[#111a15]">
                                <span className="text-xl font-extrabold">{safeProgress}%</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Progress
                            </p>
                            <p className="mt-1 text-2xl font-extrabold">{completedCount}/{totalTasks}</p>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">tasks complete</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Remaining</p>
                            <p className="mt-1 text-xl font-extrabold">{remainingTasks}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current</p>
                            <p className="mt-1 text-xl font-extrabold">{currentIndex + 1}</p>
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
                                {renderTaskIcon(currentTask.type, "h-5 w-5")}
                            </span>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                    Active task
                                </p>
                                <p className="mt-1 text-base font-extrabold">{taskCopy[currentTask.type].accent}</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                            {taskCopy[currentTask.type].hint}
                        </p>
                    </div>

                {/* Right Area: Sidebar Navigator */}
                <div className="w-full lg:w-[280px] border-t lg:border-t-0 lg:border-l border-brand-light-tertiary dark:border-white/5 bg-brand-light-primary dark:bg-brand-dark-primary flex flex-col p-4 shrink-0 z-10 lg:z-0">
                    <div className="flex-1 overflow-hidden flex flex-col h-full bg-white dark:bg-brand-dark-primary border border-brand-light-tertiary dark:border-white/5 rounded-[20px] transition-colors">
                        <div className="p-4 border-b border-brand-light-tertiary dark:border-white/5">
                            <h3 className="text-sm font-bold text-black dark:text-white">Task Navigator</h3>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[10px] font-bold uppercase tracking-wider text-black dark:text-white">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-brand-green"></div> Completed
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full border border-gray-300 dark:border-gray-600"></div> Pending
                                </div>
                                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                                    {taskCopy[currentTask.type].hint}
                                </p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="grid grid-cols-4 gap-2">
                                {MOCK_TASKS.map((task, idx) => {
                                    const isActive = idx === currentIndex;
                                    const isCompleted = !!answers[task.id];
                                    
                                    let bgColorClass = 'bg-white dark:bg-white/[0.05] border-brand-light-tertiary dark:border-white/10 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/10';
                                    if (isActive) {
                                        bgColorClass = 'bg-black dark:bg-white text-white dark:text-black border-transparent scale-110 z-10 relative';
                                    } else if (isCompleted) {
                                        bgColorClass = 'bg-brand-green text-white border-brand-green';
                                    }

                                    return (
                                        <button
                                            key={task.id}
                                            type="button"
                                            onClick={() => setCurrentIndex(index)}
                                            aria-current={isActive ? "step" : undefined}
                                            className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-extrabold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
                                                isActive
                                                    ? "border-[#17201b] bg-[#17201b] text-white dark:border-white dark:bg-white dark:text-[#17201b]"
                                                    : isComplete
                                                        ? "border-brand-green bg-brand-green/10 text-brand-green"
                                                        : "border-slate-200 bg-white text-slate-600 hover:border-brand-green hover:text-brand-green dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                                            }`}
                                        >
                                            {renderTaskIcon(task.type)}
                                            {index + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
                        {renderTaskContent()}
                    </div>

            </main>

            {/* Bottom Action Bar */}
            <footer className="h-16 md:h-20 border-t border-brand-light-tertiary dark:border-white/5 bg-white dark:bg-brand-dark-primary p-4 flex flex-wrap gap-3 items-center justify-end sticky bottom-0 z-50">
                <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
                    <button 
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="px-6 py-2.5 rounded-full border border-brand-light-tertiary dark:border-white/20 text-black dark:text-white font-bold text-[12px] hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    
                    {currentIndex === MOCK_TASKS.length - 1 ? (
                        <button 
                            onClick={handleSubmit}
                            className="px-8 py-2.5 rounded-full bg-brand-green hover:bg-[#1bb85c] text-white font-bold text-[12px] transition-all active:scale-95"
                        >
                            Submit Assessment
                        </button>
                    ) : (
                        <button 
                            onClick={handleNext}
                            className="px-8 py-2.5 rounded-full bg-brand-green hover:bg-[#1bb85c] text-white font-bold text-[12px] transition-all active:scale-95"
                        >
                            Save & Next
                        </button>
                    )}
                </div>
            </footer>

            <ConfirmationModal
                isOpen={showSubmitModal}
                onClose={() => setShowSubmitModal(false)}
                onConfirm={confirmSubmit}
                title="Finish Communication Test?"
                message="Are you sure you want to submit your communication assessment? Your audio recordings and writing samples will be sent for evaluation."
                confirmText="Submit Test"
                cancelText="Review Again"
                type="warning"
            />
        </div>
    );
};

export default CommunicationEngine;
