import React, { useCallback, useEffect, useState } from "react";
import Logo from "../../ui/Logo";
import ThemeToggle from "../../ui/ThemeToggle";
import ConceptualQuestionComponent from "./QuestionTypes/ConceptualQuestion";
import ScenarioQuestionComponent from "./QuestionTypes/ScenarioQuestion";

export type RoleQuestionType = "conceptual" | "scenario";

export interface Option {
    id: string;
    text: string;
}

export interface BaseRoleQuestion {
    id: string;
    type: RoleQuestionType;
    text: string;
    options: Option[];
}

export interface ConceptualQuestion extends BaseRoleQuestion {
    type: "conceptual";
}

export interface ScenarioQuestion extends BaseRoleQuestion {
    type: "scenario";
    scenarioContext: string;
    ticketId?: string;
    priority?: "Low" | "Medium" | "High" | "Critical";
    reportedBy?: string;
}

export type RoleQuestion = ConceptualQuestion | ScenarioQuestion;

const MOCK_ROLE_QUESTIONS: RoleQuestion[] = [
    {
        id: "rq1",
        type: "conceptual",
        text: "Which of the following is NOT a valid HTTP method used in RESTful APIs?",
        options: [
            { id: "o1", text: "PATCH" },
            { id: "o2", text: "FETCH" },
            { id: "o3", text: "OPTIONS" },
            { id: "o4", text: "DELETE" },
        ],
    },
    {
        id: "rq2",
        type: "scenario",
        scenarioContext: "The UI freezes for 3-5 seconds when rendering a table containing 10,000 user records at once.",
        ticketId: "INC-8942",
        priority: "High",
        reportedBy: "QA Team",
        text: "What is the most optimal frontend architecture solution to resolve this performance bottleneck?",
        options: [
            { id: "o1", text: "Increase the memory limit of the user's browser via settings." },
            { id: "o2", text: "Implement virtualization/windowing to only render visible rows." },
            { id: "o3", text: "Move the rendering logic to a Web Worker." },
            { id: "o4", text: "Debounce the API call that fetches the 10,000 records." },
        ],
    },
    {
        id: "rq3",
        type: "conceptual",
        text: "In React, what happens when you call setState() multiple times synchronously in the same event handler?",
        options: [
            { id: "o1", text: "React immediately re-renders after every call." },
            { id: "o2", text: "React throws an infinite loop error." },
            { id: "o3", text: "React batches the updates and performs a single re-render." },
            { id: "o4", text: "Only the first setState() call is executed." },
        ],
    },
    {
        id: "rq4",
        type: "scenario",
        scenarioContext: "A critical e-commerce checkout API is returning a 502 Bad Gateway error intermittently during peak traffic hours.",
        ticketId: "INC-9011",
        priority: "Critical",
        reportedBy: "Automated Alerts",
        text: "As a Backend Engineer investigating the issue, what is the most likely root cause?",
        options: [
            { id: "o1", text: "The database connection string is permanently incorrect." },
            { id: "o2", text: "A reverse proxy, like Nginx, is timing out or failing to communicate with the upstream application servers." },
            { id: "o3", text: "The client-side JavaScript is sending malformed JSON payloads." },
            { id: "o4", text: "A recent CSS deployment broke the checkout button." },
        ],
    },
];

interface RoleEngineProps {
    onComplete: (answers: Record<string, string>) => void;
    roleName?: string;
}

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
};

const RoleEngine: React.FC<RoleEngineProps> = ({ onComplete, roleName = "Full Stack Engineer" }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
    const [timeLeft, setTimeLeft] = useState(30 * 60);

    const currentQuestion = MOCK_ROLE_QUESTIONS[currentIndex];
    const totalQuestions = MOCK_ROLE_QUESTIONS.length;
    const answeredCount = Object.keys(answers).length;
    const markedCount = markedForReview.size;
    const remainingCount = totalQuestions - answeredCount;
    const progressPercent = Math.round((answeredCount / totalQuestions) * 100);
    const safeProgress = Math.min(100, Math.max(0, progressPercent));
    const isLastQuestion = currentIndex === totalQuestions - 1;
    const isQuestionAnswered = !!answers[currentQuestion.id];
    const isQuestionMarked = markedForReview.has(currentQuestion.id);
    const scenarioCount = MOCK_ROLE_QUESTIONS.filter((question) => question.type === "scenario").length;
    const progressRingStyle = {
        background: `conic-gradient(#1ed36a ${safeProgress}%, rgba(148, 163, 184, 0.24) 0)`,
    };

    const completeAssessment = useCallback(() => {
        onComplete(answers);
    }, [answers, onComplete]);

    useEffect(() => {
        if (timeLeft <= 0) {
            completeAssessment();
            return;
        }

        const timer = window.setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => window.clearInterval(timer);
    }, [completeAssessment, timeLeft]);

    const handleOptionSelect = (optionId: string) => {
        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionId }));

        if (markedForReview.has(currentQuestion.id)) {
            const newMarked = new Set(markedForReview);
            newMarked.delete(currentQuestion.id);
            setMarkedForReview(newMarked);
        }
    };

    const handleClear = () => {
        const newAnswers = { ...answers };
        delete newAnswers[currentQuestion.id];
        setAnswers(newAnswers);
    };

    const handleMarkReview = () => {
        const newMarked = new Set(markedForReview);
        if (newMarked.has(currentQuestion.id)) {
            newMarked.delete(currentQuestion.id);
        } else {
            newMarked.add(currentQuestion.id);
        }
        setMarkedForReview(newMarked);
    };

    const handleNext = () => {
        if (!isLastQuestion) {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const handleSubmit = () => {
        if (window.confirm("Submit the role-based assessment now?")) {
            completeAssessment();
        }
    };

    const renderQuestionContent = () => {
        const selectedOption = answers[currentQuestion.id];

        if (currentQuestion.type === "conceptual") {
            return (
                <ConceptualQuestionComponent
                    question={currentQuestion}
                    selectedOptionId={selectedOption}
                    onSelectOption={handleOptionSelect}
                />
            );
        }

        return (
            <ScenarioQuestionComponent
                question={currentQuestion}
                selectedOptionId={selectedOption}
                onSelectOption={handleOptionSelect}
            />
        );
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#f6f8f5] font-sans text-[#17201b] transition-colors duration-500 dark:bg-[#0f1712] dark:text-white">
            <div className="absolute inset-0 assessment-role-bg" aria-hidden="true" />
            <div className="absolute inset-0 assessment-scan opacity-25" aria-hidden="true" />

            <header className="assessment-header sticky top-0 z-50 flex min-h-16 items-center justify-between gap-4 px-4 py-3 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="hidden origin-left scale-75 sm:block">
                        <Logo />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-brand-green">Role-Based Assessment</p>
                        <h1 className="truncate text-base font-extrabold text-[#17201b] dark:text-white">
                            {roleName} decision workspace
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right shadow-sm dark:border-white/10 dark:bg-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Time left
                        </p>
                        <p className={`font-mono text-sm font-extrabold ${timeLeft < 300 ? "text-red-500" : "text-[#17201b] dark:text-white"}`}>
                            {formatTime(timeLeft)}
                        </p>
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
                            <p className="mt-1 text-2xl font-extrabold">{answeredCount}/{totalQuestions}</p>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">answered</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Remaining</p>
                            <p className="mt-1 text-xl font-extrabold">{remainingCount}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Review</p>
                            <p className="mt-1 text-xl font-extrabold text-amber-600">{markedCount}</p>
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Current focus
                        </p>
                        <p className="mt-2 text-lg font-extrabold">Question {currentIndex + 1}</p>
                        <p className="mt-1 text-sm font-semibold capitalize text-slate-500 dark:text-slate-300">
                            {currentQuestion.type}
                        </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Assessment mix
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xl font-extrabold">{scenarioCount}</p>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">scenarios</p>
                            </div>
                            <div>
                                <p className="text-xl font-extrabold">{totalQuestions - scenarioCount}</p>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">concepts</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto rounded-lg bg-[#17201b] p-4 text-white dark:bg-white dark:text-[#17201b]">
                        <p className="text-sm font-extrabold">Decision rule</p>
                        <p className="mt-2 text-xs font-semibold leading-5 opacity-80">
                            Choose the action that reduces risk, clarifies ownership, and restores user impact fastest.
                        </p>
                    </div>
                </aside>

                <section className="flex min-h-[600px] flex-col rounded-lg border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#111a15] lg:min-h-0 lg:overflow-hidden">
                    <div className="border-b border-slate-100 p-4 sm:p-5 dark:border-white/10">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-brand-green/10 px-3 py-1.5 text-xs font-extrabold text-brand-green">
                                Question {currentIndex + 1}
                            </span>
                            <span className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-extrabold capitalize text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                {currentQuestion.type}
                            </span>
                            {isQuestionMarked && (
                                <span className="rounded-md bg-amber-400/15 px-3 py-1.5 text-xs font-extrabold text-amber-700 dark:text-amber-300">
                                    Marked for review
                                </span>
                            )}
                            {isQuestionAnswered && (
                                <span className="rounded-md bg-brand-green/10 px-3 py-1.5 text-xs font-extrabold text-brand-green">
                                    Answer selected
                                </span>
                            )}
                        </div>
                        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                            Make the choice you would defend in a real review conversation.
                        </p>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
                        {renderQuestionContent()}
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={handleMarkReview}
                                    className={`min-h-11 rounded-lg border px-5 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
                                        isQuestionMarked
                                            ? "border-amber-400 bg-amber-400/15 text-amber-700 dark:text-amber-300"
                                            : "border-slate-300 bg-white text-[#17201b] hover:border-brand-green hover:text-brand-green dark:border-white/15 dark:bg-[#0f1712] dark:text-white"
                                    }`}
                                >
                                    {isQuestionMarked ? "Unmark review" : "Mark for review"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    disabled={!isQuestionAnswered}
                                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-[#17201b] transition hover:border-red-400 hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/30 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-[#0f1712] dark:text-white"
                                >
                                    Clear answer
                                </button>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-[#17201b] transition hover:border-brand-green hover:text-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-[#0f1712] dark:text-white"
                                >
                                    Previous
                                </button>
                                {isLastQuestion ? (
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        className="min-h-11 rounded-lg bg-brand-green px-7 text-sm font-extrabold text-[#0f1712] transition hover:bg-[#19be5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                                    >
                                        Submit test
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="min-h-11 rounded-lg bg-brand-green px-7 text-sm font-extrabold text-[#0f1712] transition hover:bg-[#19be5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                                    >
                                        Save and next
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#111a15] lg:min-h-0">
                    <div className="flex h-full flex-col">
                        <h3 className="text-base font-extrabold text-[#17201b] dark:text-white">Decision map</h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Jump between concepts and scenarios.
                        </p>

                        <div className="mt-5 grid grid-cols-5 gap-2 lg:grid-cols-4">
                            {MOCK_ROLE_QUESTIONS.map((question, index) => {
                                const isActive = index === currentIndex;
                                const isAnswered = !!answers[question.id];
                                const isMarked = markedForReview.has(question.id);

                                let stateClass = "border-slate-200 bg-white text-slate-600 hover:border-brand-green hover:text-brand-green dark:border-white/10 dark:bg-white/5 dark:text-slate-300";
                                if (isAnswered) stateClass = "border-brand-green bg-brand-green text-[#0f1712]";
                                if (isMarked) stateClass = "border-amber-400 bg-amber-400 text-[#241604]";
                                if (isActive) stateClass = "border-[#17201b] bg-[#17201b] text-white dark:border-white dark:bg-white dark:text-[#17201b]";

                                return (
                                    <button
                                        key={question.id}
                                        type="button"
                                        onClick={() => setCurrentIndex(index)}
                                        aria-current={isActive ? "step" : undefined}
                                        title={`${question.type} question ${index + 1}`}
                                        className={`flex h-10 items-center justify-center rounded-lg border text-sm font-extrabold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${stateClass}`}
                                    >
                                        {index + 1}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-5 space-y-3">
                            {MOCK_ROLE_QUESTIONS.map((question, index) => (
                                <button
                                    key={`${question.id}-detail`}
                                    type="button"
                                    onClick={() => setCurrentIndex(index)}
                                    className={`w-full rounded-lg border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
                                        index === currentIndex
                                            ? "border-[#17201b] bg-[#17201b] text-white dark:border-white dark:bg-white dark:text-[#17201b]"
                                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-brand-green hover:text-brand-green dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                                    }`}
                                >
                                    <span className="block text-xs font-extrabold uppercase tracking-widest">
                                        Question {index + 1}
                                    </span>
                                    <span className="mt-1 block text-sm font-bold capitalize">{question.type}</span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-auto hidden border-t border-slate-100 pt-4 text-xs font-semibold leading-5 text-slate-500 dark:border-white/10 dark:text-slate-400 lg:block">
                            Mark anything uncertain, then return from this decision map before submitting.
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default RoleEngine;
