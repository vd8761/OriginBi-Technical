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
    const [timeLeft, setTimeLeft] = useState(45 * 60);
    const [answers, setAnswers] = useState<CommunicationAnswers>({});
    const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());

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
            handleSubmit();
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
            <div className="absolute inset-0 assessment-communication-bg" aria-hidden="true" />
            <div className="absolute inset-0 assessment-wave opacity-25" aria-hidden="true" />

            <header className="assessment-header sticky top-0 z-50 flex min-h-14 items-center justify-between gap-4 px-4 py-2 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="hidden origin-left scale-[0.7] sm:block">
                        <Logo />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold text-brand-green uppercase tracking-wider">Communication Assessment</p>
                        <h1 className="truncate text-sm font-bold text-[#17201b] dark:text-white">
                            Multi-skill test workspace
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 rounded-lg border border-brand-green/10 bg-white px-3 py-1.5 shadow-sm dark:border-white/10 dark:bg-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#17201b] dark:text-white">
                            Time left
                        </p>
                        <p className={`font-mono text-sm font-bold ${timeLeft < 300 ? "text-red-500" : "text-[#17201b] dark:text-white"}`}>
                            {formatTime(timeLeft)}
                        </p>
                    </div>
                    <div className="scale-90">
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="relative z-10 mx-auto grid max-w-[1500px] gap-4 px-4 py-4 lg:h-[calc(100dvh-64px)] lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:overflow-hidden lg:px-6">
                <aside className="flex flex-col gap-4 rounded-lg border border-brand-green/10 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#111a15] lg:min-h-0">
                    <div className="flex items-center gap-4">
                        <div className="h-20 w-20 rounded-full p-1" style={progressRingStyle}>
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-[#111a15]">
                                <span className="text-xl font-bold text-[#17201b] dark:text-white">{safeProgress}%</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#17201b] dark:text-white">
                                Progress
                            </p>
                            <p className="mt-1 text-2xl font-bold text-[#17201b] dark:text-white">{completedCount}/{totalTasks}</p>
                            <p className="text-xs font-medium text-[#17201b] dark:text-white">tasks complete</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-3 dark:border-white/10 dark:bg-white/5">
                            <p className="text-xs font-medium text-[#17201b] dark:text-white">Remaining</p>
                            <p className="mt-1 text-xl font-bold text-[#17201b] dark:text-white">{remainingTasks}</p>
                        </div>
                        <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-3 dark:border-white/10 dark:bg-white/5">
                            <p className="text-xs font-medium text-[#17201b] dark:text-white">Current</p>
                            <p className="mt-1 text-xl font-bold text-[#17201b] dark:text-white">{currentIndex + 1}</p>
                        </div>
                    </div>

                    <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
                                {renderTaskIcon(currentTask.type, "h-5 w-5")}
                            </span>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#17201b] dark:text-white">
                                    Active task
                                </p>
                                <p className="mt-1 text-base font-bold text-[#17201b] dark:text-white">{taskCopy[currentTask.type].accent}</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sm font-medium leading-6 text-[#17201b] dark:text-white">
                            {taskCopy[currentTask.type].hint}
                        </p>
                    </div>

                    <div className="mt-auto rounded-lg bg-[#17201b] p-4 text-white dark:bg-white dark:text-[#17201b]">
                        <p className="text-sm font-bold text-white dark:text-[#17201b]">Communication scoring</p>
                        <p className="mt-2 text-xs font-medium leading-5">
                            Accuracy, clarity, structure, and response quality are tracked across all task types.
                        </p>
                    </div>
                </aside>

                <section className="flex min-h-[600px] flex-col rounded-lg border border-brand-green/10 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#111a15] lg:min-h-0 lg:overflow-hidden">
                    <div className="border-b border-brand-green/5 p-4 sm:p-5 dark:border-white/10">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-md bg-brand-green/10 px-3 py-1.5 text-xs font-bold text-brand-green">
                                        Task {currentIndex + 1}
                                    </span>
                                    <span className="rounded-md bg-brand-green/5 px-3 py-1.5 text-xs font-bold text-[#17201b] dark:bg-white/10 dark:text-white">
                                        {taskCopy[currentTask.type].label}
                                    </span>
                                    {isQuestionMarked && (
                                        <span className="rounded-md bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                                            Marked for review
                                        </span>
                                    )}
                                </div>
                                <p className="mt-3 text-sm font-medium leading-6 text-[#17201b] dark:text-white">
                                    {taskCopy[currentTask.type].hint}
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-3">
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
                                        {isQuestionMarked ? "Unmark" : "Review"}
                                    </button>
                                    <button
                                        onClick={handleClear}
                                        disabled={!isQuestionAnswered}
                                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-brand-green/20 bg-white px-4 text-xs font-bold text-[#17201b] transition hover:border-red-500 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:text-red-400"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Clear
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {MOCK_TASKS.map((task, index) => {
                                        const isActive = index === currentIndex;
                                        const isComplete = isTaskComplete(task, answers[task.id]);

                                        return (
                                            <button
                                                key={task.id}
                                                type="button"
                                                onClick={() => setCurrentIndex(index)}
                                                aria-current={isActive ? "step" : undefined}
                                                className={`inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-[10px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
                                                    isActive
                                                        ? "border-[#17201b] bg-[#17201b] text-white dark:border-white dark:bg-white dark:text-[#17201b]"
                                                        : isComplete
                                                            ? "border-brand-green bg-brand-green/10 text-brand-green"
                                                            : "border-brand-green/10 bg-white text-[#17201b] hover:border-brand-green hover:text-brand-green dark:border-white/10 dark:bg-white/5 dark:text-white"
                                                }`}
                                            >
                                                {index + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
                        {renderTaskContent()}
                    </div>

                    <div className="border-t border-brand-green/5 bg-brand-green/[0.02] p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={handlePrev}
                                disabled={currentIndex === 0}
                                className="min-h-11 rounded-lg border border-brand-green/20 bg-white px-5 text-sm font-bold text-[#17201b] transition hover:border-brand-green hover:text-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-[#0f1712] dark:text-white"
                            >
                                Previous
                            </button>
                            {isLastTask ? (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    className="min-h-11 rounded-lg bg-brand-green px-7 text-sm font-bold text-white transition hover:bg-[#19be5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                                >
                                    Submit assessment
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="min-h-11 rounded-lg bg-brand-green px-7 text-sm font-bold text-white transition hover:bg-[#19be5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                                >
                                    Save and next
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <aside className="rounded-lg border border-brand-green/10 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#111a15] lg:min-h-0">
                    <div className="flex h-full flex-col">
                        <h3 className="text-base font-bold text-[#17201b] dark:text-white">Task map</h3>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#17201b] dark:text-white">
                            Move between communication sections.
                        </p>

                        <div className="mt-5 flex flex-col gap-3">
                            {MOCK_TASKS.map((task, index) => {
                                const isActive = index === currentIndex;
                                const isComplete = isTaskComplete(task, answers[task.id]);

                                return (
                                    <button
                                        key={task.id}
                                        type="button"
                                        onClick={() => setCurrentIndex(index)}
                                        aria-current={isActive ? "step" : undefined}
                                        className={`flex min-h-16 items-center gap-3 rounded-lg border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
                                            isActive
                                                ? "border-[#17201b] bg-[#17201b] text-white dark:border-white dark:bg-white dark:text-[#17201b]"
                                                : isComplete
                                                    ? "border-brand-green bg-brand-green/10 text-brand-green"
                                                    : "border-brand-green/10 bg-brand-green/[0.03] text-[#17201b] hover:border-brand-green hover:text-brand-green dark:border-white/10 dark:bg-white/5 dark:text-white"
                                        }`}
                                    >
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
                                            {renderTaskIcon(task.type, "h-5 w-5")}
                                        </span>
                                        <span>
                                            <span className="block text-[10px] font-bold uppercase tracking-widest text-[#17201b] dark:text-white">
                                                Task {index + 1}
                                            </span>
                                            <span className="mt-1 block text-sm font-semibold">{taskCopy[task.type].label}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-auto hidden border-t border-brand-green/5 pt-4 text-[10px] font-bold leading-5 text-[#17201b] dark:border-white/10 dark:text-white lg:block">
                            Completed tasks turn green. You can return to earlier tasks before submitting.
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default CommunicationEngine;
