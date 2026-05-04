import React, { useEffect, useState } from "react";
import Logo from "../../ui/Logo";
import ThemeToggle from "../../ui/ThemeToggle";
import QuestionNavigator, { NavigatorQuestion, QuestionState } from "./QuestionNavigator";

interface Option {
    id: string;
    text: string;
}

interface Question {
    id: string;
    category: string;
    text: string;
    imageUrl?: string;
    options: Option[];
}

const MOCK_QUESTIONS: Question[] = [
    {
        id: "q1",
        category: "QA",
        text: "If the price of a book is first decreased by 25% and then increased by 20%, then the net change in the price will be:",
        options: [
            { id: "o1", text: "10% decrease" },
            { id: "o2", text: "5% decrease" },
            { id: "o3", text: "No change" },
            { id: "o4", text: "5% increase" },
        ],
    },
    {
        id: "q2",
        category: "LR",
        text: "Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?",
        options: [
            { id: "o1", text: "(1/3)" },
            { id: "o2", text: "(1/8)" },
            { id: "o3", text: "(2/8)" },
            { id: "o4", text: "(1/16)" },
        ],
    },
    {
        id: "q3",
        category: "DI",
        text: "Based on the chart below, what was the total revenue in Q3?",
        imageUrl: "https://via.placeholder.com/600x300.png?text=Sample+Bar+Chart",
        options: [
            { id: "o1", text: "$45,000" },
            { id: "o2", text: "$50,000" },
            { id: "o3", text: "$55,000" },
            { id: "o4", text: "$60,000" },
        ],
    },
    {
        id: "q4",
        category: "AR",
        text: "Which of the following figures is the odd one out?",
        imageUrl: "https://via.placeholder.com/600x200.png?text=Abstract+Figures",
        options: [
            { id: "o1", text: "Figure A" },
            { id: "o2", text: "Figure B" },
            { id: "o3", text: "Figure C" },
            { id: "o4", text: "Figure D" },
        ],
    },
];

interface AptitudeEngineProps {
    onComplete: (answers: Record<string, string>) => void;
}

const labels = ["A", "B", "C", "D"];

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
};

const AptitudeEngine: React.FC<AptitudeEngineProps> = ({ onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
    const [timeLeft, setTimeLeft] = useState(3600);

    const currentQuestion = MOCK_QUESTIONS[currentIndex];
    const totalQuestions = MOCK_QUESTIONS.length;
    const answeredCount = Object.keys(answers).length;
    const markedCount = markedForReview.size;
    const remainingCount = totalQuestions - answeredCount;
    const progressPercent = Math.round((answeredCount / totalQuestions) * 100);
    const safeProgress = Math.min(100, Math.max(0, progressPercent));
    const isLastQuestion = currentIndex === totalQuestions - 1;
    const isQuestionAnswered = !!answers[currentQuestion.id];
    const isQuestionMarked = markedForReview.has(currentQuestion.id);
    const progressRingStyle = {
        background: `conic-gradient(#1ed36a ${safeProgress}%, rgba(148, 163, 184, 0.24) 0)`,
    };

    useEffect(() => {
        if (timeLeft <= 0) {
            onComplete(answers);
            return;
        }

        const timer = window.setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => window.clearInterval(timer);
    }, [answers, onComplete, timeLeft]);

    const navigatorQuestions: NavigatorQuestion[] = MOCK_QUESTIONS.map((question, index) => {
        let state: QuestionState = "unanswered";
        if (answers[question.id]) state = "answered";
        if (markedForReview.has(question.id)) state = "marked";

        return {
            id: question.id,
            number: index + 1,
            state,
            category: question.category,
        };
    });

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
        if (window.confirm("Submit the aptitude assessment now?")) {
            onComplete(answers);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#f6f8f5] font-sans text-[#17201b] transition-colors duration-500 dark:bg-[#0f1712] dark:text-white">
            <div className="absolute inset-0 assessment-aptitude-bg" aria-hidden="true" />
            <div className="absolute inset-0 assessment-grid opacity-35" aria-hidden="true" />

            <header className="assessment-header sticky top-0 z-50 flex min-h-14 items-center justify-between gap-4 px-4 py-2 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="hidden origin-left scale-[0.7] sm:block">
                        <Logo />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold text-brand-green uppercase tracking-wider">Aptitude Assessment</p>
                        <h1 className="truncate text-sm font-bold text-[#17201b] dark:text-white">
                            Test workspace
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
                <aside className="test-panel flex flex-col gap-4 rounded-lg border border-brand-green/10 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#111a15] lg:min-h-0">
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
                            <p className="mt-1 text-2xl font-bold text-[#17201b] dark:text-white">{answeredCount}/{totalQuestions}</p>
                            <p className="text-xs font-medium text-[#17201b] dark:text-white">answered</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-3 dark:border-white/10 dark:bg-white/5">
                            <p className="text-xs font-medium text-[#17201b] dark:text-white">Remaining</p>
                            <p className="mt-1 text-xl font-bold text-[#17201b] dark:text-white">{remainingCount}</p>
                        </div>
                        <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-3 dark:border-white/10 dark:bg-white/5">
                            <p className="text-xs font-medium text-[#17201b] dark:text-white">Review</p>
                            <p className="mt-1 text-xl font-bold text-amber-600">{markedCount}</p>
                        </div>
                    </div>

                    <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-4 dark:border-white/10 dark:bg-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#17201b] dark:text-white">
                            Current focus
                        </p>
                        <p className="mt-2 text-lg font-bold text-[#17201b] dark:text-white">Question {currentIndex + 1}</p>
                        <p className="mt-1 text-sm font-medium capitalize text-[#17201b] dark:text-white">
                            {currentQuestion.category} module
                        </p>
                    </div>

                    <div className="mt-auto rounded-lg bg-[#17201b] p-4 text-white dark:bg-white dark:text-[#17201b]">
                        <p className="text-sm font-bold">Aptitude guidance</p>
                        <p className="mt-2 text-xs font-medium leading-5">
                            Work through logical patterns methodically. If stuck, mark for review and move to the next item.
                        </p>
                    </div>
                </aside>

                <section className="flex min-h-[600px] flex-col rounded-lg border border-brand-green/10 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#111a15] lg:min-h-0 lg:overflow-hidden">
                    <div className="border-b border-brand-green/5 p-4 sm:p-5 dark:border-white/10">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-md bg-brand-green/10 px-3 py-1.5 text-xs font-bold text-brand-green">
                                        Question {currentIndex + 1}
                                    </span>
                                    <span className="rounded-md bg-brand-green/5 px-3 py-1.5 text-xs font-bold capitalize text-[#17201b] dark:bg-white/10 dark:text-white">
                                        {currentQuestion.category}
                                    </span>
                                    {isQuestionMarked && (
                                        <span className="rounded-md bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                                            Marked for review
                                        </span>
                                    )}
                                    {isQuestionAnswered && (
                                        <span className="rounded-md bg-brand-green/10 px-3 py-1.5 text-xs font-bold text-brand-green">
                                            Answer selected
                                        </span>
                                    )}
                                </div>
                                <p className="mt-3 text-sm font-medium leading-6 text-[#17201b] dark:text-white">
                                    Select the most logical answer based on the sequence or problem statement provided.
                                </p>
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

                    <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
                        <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-4 dark:border-white/10 dark:bg-white/5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#17201b] dark:text-white">
                                Problem
                            </p>
                            <h2 className="mt-3 text-lg font-bold leading-8 text-[#17201b] dark:text-white">
                                {currentQuestion.text}
                            </h2>
                            {currentQuestion.imageUrl && (
                                <div className="mt-4 overflow-hidden rounded-lg border border-brand-green/10 bg-white p-2 dark:border-white/10 dark:bg-[#0f1712]">
                                    <div
                                        role="img"
                                        aria-label="Question reference"
                                        className="mx-auto h-56 w-full max-w-2xl rounded-md bg-contain bg-center bg-no-repeat"
                                        style={{ backgroundImage: `url(${currentQuestion.imageUrl})` }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {currentQuestion.options.map((option, index) => {
                                const isSelected = answers[currentQuestion.id] === option.id;

                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handleOptionSelect(option.id)}
                                        aria-pressed={isSelected}
                                        className={`group flex min-h-20 items-center gap-4 rounded-lg border p-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
                                            isSelected
                                                ? "border-brand-green bg-brand-green/10"
                                                : "border-brand-green/20 bg-white hover:border-brand-green/50 dark:border-white/10 dark:bg-[#0f1712] dark:hover:border-brand-green/50"
                                        }`}
                                    >
                                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                                            isSelected
                                                ? "bg-brand-green text-[#0f1712]"
                                                : "bg-brand-green/10 text-brand-green"
                                        }`}>
                                            {labels[index]}
                                        </span>
                                        <span className={`text-sm font-semibold leading-6 ${
                                            isSelected ? "text-[#17201b] dark:text-white" : "text-[#17201b] dark:text-white"
                                        }`}>
                                            {option.text}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
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
                            {isLastQuestion ? (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    className="min-h-11 rounded-lg bg-brand-green px-7 text-sm font-bold text-white transition hover:bg-[#19be5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                                >
                                    Submit test
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
                        <h3 className="text-base font-bold text-[#17201b] dark:text-white">Question map</h3>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#17201b] dark:text-white">
                            Jump, review, or finish from here.
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-3 dark:border-white/10 dark:bg-white/5">
                                <p className="text-xs font-medium text-[#17201b] dark:text-white">Answered</p>
                                <p className="mt-1 text-xl font-bold text-[#17201b] dark:text-white">{answeredCount}</p>
                            </div>
                            <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-3 dark:border-white/10 dark:bg-white/5">
                                <p className="text-xs font-medium text-[#17201b] dark:text-white">Review</p>
                                <p className="mt-1 text-xl font-bold text-amber-600">{markedCount}</p>
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-4 gap-2">
                            {MOCK_QUESTIONS.map((question, index) => {
                                const isActive = index === currentIndex;
                                const isAnswered = !!answers[question.id];
                                const isMarked = markedForReview.has(question.id);

                                let stateClass = "border-brand-green/10 bg-white text-[#17201b] hover:border-brand-green hover:text-brand-green dark:border-white/10 dark:bg-white/5 dark:text-white";
                                if (isAnswered) stateClass = "border-brand-green bg-brand-green text-white";
                                if (isMarked) stateClass = "border-amber-400 bg-amber-400 text-white";
                                if (isActive) stateClass = "border-[#17201b] bg-[#17201b] text-white dark:border-white dark:bg-white dark:text-[#17201b]";

                                return (
                                    <button
                                        key={question.id}
                                        type="button"
                                        onClick={() => setCurrentIndex(index)}
                                        aria-current={isActive ? "step" : undefined}
                                        title={`${question.category} question ${index + 1}`}
                                        className={`flex h-10 items-center justify-center rounded-lg border text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${stateClass}`}
                                    >
                                        {index + 1}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-auto hidden border-t border-brand-green/5 pt-4 text-[10px] font-bold leading-5 text-[#17201b] dark:border-white/10 dark:text-white lg:block">
                            Green means answered, amber means marked for review, and dark shows your current question.
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default AptitudeEngine;
