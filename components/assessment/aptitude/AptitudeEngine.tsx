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

import ConfirmationModal from '../../ui/ConfirmationModal';

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
    const [showSubmitModal, setShowSubmitModal] = useState(false);

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
        setShowSubmitModal(true);
    };

    const confirmSubmit = () => {
        setShowSubmitModal(false);
        onComplete(answers);
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#f6f8f5] font-sans text-[#17201b] transition-colors duration-500 dark:bg-[#0f1712] dark:text-white">
            <div className="absolute inset-0 assessment-aptitude-bg" aria-hidden="true" />
            <div className="absolute inset-0 assessment-grid opacity-35" aria-hidden="true" />

            <header className="assessment-header sticky top-0 z-50 flex min-h-16 items-center justify-between gap-4 px-4 py-3 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="hidden origin-left scale-75 sm:block">
                        <Logo />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-brand-green">Aptitude Assessment</p>
                        <h1 className="truncate text-base font-extrabold text-[#17201b] dark:text-white">
                            Test workspace
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
                <aside className="test-panel flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#111a15] lg:min-h-0">
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

<<<<<<< HEAD
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Remaining</p>
                            <p className="mt-1 text-xl font-extrabold">{remainingCount}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Review</p>
                            <p className="mt-1 text-xl font-extrabold text-amber-600">{markedCount}</p>
                        </div>
=======
                    {/* Question Text */}
                    <div className="bg-white dark:bg-white/[0.03] border border-brand-light-tertiary dark:border-white/5 p-5 md:p-8 rounded-[20px] mb-6 transition-colors">
                        <h2 className="text-[clamp(14px,1.2vw,18px)] font-semibold text-black dark:text-white leading-relaxed">
                            {currentQuestion.text}
                        </h2>
                        
                        {currentQuestion.imageUrl && (
                            <div className="mt-6 rounded-xl overflow-hidden border border-brand-light-tertiary dark:border-white/10 bg-gray-50 dark:bg-black/20 p-3 flex justify-center">
                                <img src={currentQuestion.imageUrl} alt="Question Reference" className="max-w-full h-auto object-contain max-h-[200px]" />
                            </div>
                        )}
>>>>>>> origin/vikash
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Current focus
                        </p>
                        <p className="mt-2 text-lg font-extrabold">Question {currentIndex + 1}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                            {currentQuestion.category} module
                        </p>
                    </div>

                    <div className="mt-auto rounded-lg bg-[#17201b] p-4 text-white dark:bg-white dark:text-[#17201b]">
                        <p className="text-sm font-extrabold">Answering flow</p>
                        <p className="mt-2 text-xs font-semibold leading-5 opacity-80">
                            Select the best option, mark tricky items for review, and use the map to jump without losing context.
                        </p>
                    </div>
                </aside>

                <section className="flex min-h-[560px] flex-col rounded-lg border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#111a15] lg:min-h-0 lg:overflow-hidden">
                    <div className="border-b border-slate-100 p-4 sm:p-5 dark:border-white/10">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-brand-green/10 px-3 py-1.5 text-xs font-extrabold text-brand-green">
                                Question {currentIndex + 1}
                            </span>
                            <span className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                {currentQuestion.category}
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
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Problem
                            </p>
                            <h2 className="mt-3 text-lg font-extrabold leading-8 text-[#17201b] dark:text-white">
                                {currentQuestion.text}
                            </h2>
                            {currentQuestion.imageUrl && (
                                <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-[#0f1712]">
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
                                                ? "border-brand-green bg-brand-green/10 shadow-[0_12px_30px_rgba(30,211,106,0.16)]"
                                                : "border-slate-200 bg-white hover:border-brand-green/50 dark:border-white/10 dark:bg-[#0f1712] dark:hover:border-brand-green/50"
                                        }`}
                                    >
                                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold ${
                                            isSelected
                                                ? "bg-brand-green text-[#0f1712]"
                                                : "bg-slate-100 text-slate-500 group-hover:bg-brand-green/10 group-hover:text-brand-green dark:bg-white/10 dark:text-slate-300"
                                        }`}>
                                            {labels[index]}
                                        </span>
                                        <span className={`text-sm font-bold leading-6 ${
                                            isSelected ? "text-[#17201b] dark:text-white" : "text-slate-700 dark:text-slate-300"
                                        }`}>
                                            {option.text}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <button
<<<<<<< HEAD
                                    type="button"
                                    onClick={handleMarkReview}
                                    className={`min-h-11 rounded-lg border px-5 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
                                        isQuestionMarked
                                            ? "border-amber-400 bg-amber-400/15 text-amber-700 dark:text-amber-300"
                                            : "border-slate-300 bg-white text-[#17201b] hover:border-brand-green hover:text-brand-green dark:border-white/15 dark:bg-[#0f1712] dark:text-white"
                                    }`}
                                >
                                    {isQuestionMarked ? "Unmark review" : "Mark for review"}
=======
                                    key={option.id}
                                    onClick={() => handleOptionSelect(option.id)}
                                    className={`
                                        flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 group
                                        ${isSelected 
                                            ? 'bg-brand-green/5 border-brand-green' 
                                            : 'bg-white dark:bg-white/[0.03] border-brand-light-tertiary dark:border-white/5 hover:border-brand-green/30'
                                        }
                                    `}
                                >
                                    <div className={`
                                        w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all
                                        ${isSelected ? 'bg-brand-green text-white' : 'bg-brand-light-primary dark:bg-white/5 text-black dark:text-white group-hover:bg-brand-green/10 group-hover:text-brand-green'}
                                    `}>
                                        {labels[idx]}
                                    </div>
                                    <span className={`text-[13px] font-medium ${isSelected ? 'text-brand-green font-bold' : 'text-black dark:text-white'}`}>
                                        {option.text}
                                    </span>
>>>>>>> origin/vikash
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
                    <QuestionNavigator
                        questions={navigatorQuestions}
                        currentIndex={currentIndex}
                        onSelect={setCurrentIndex}
                    />
                </aside>
            </main>
<<<<<<< HEAD
=======

            {/* Bottom Action Bar */}
            <footer className="h-16 md:h-20 border-t border-brand-light-tertiary dark:border-white/5 bg-white dark:bg-brand-dark-primary p-4 flex flex-wrap gap-3 items-center justify-between sticky bottom-0 z-50">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button 
                        onClick={handleMarkReview}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-full border font-bold text-[12px] transition-all ${markedForReview.has(currentQuestion.id) ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-500' : 'bg-white dark:bg-[#24272B] border-brand-light-tertiary dark:border-white/20 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                        {markedForReview.has(currentQuestion.id) ? 'Unmark Review' : 'Mark for Review'}
                    </button>
                    <button 
                        onClick={handleClear}
                        disabled={!answers[currentQuestion.id]}
                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-full bg-white dark:bg-[#24272B] border border-brand-light-tertiary dark:border-white/20 text-black dark:text-white font-bold text-[12px] hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Clear Response
                    </button>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
                    <button 
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="px-6 py-2.5 rounded-full border border-brand-light-tertiary dark:border-white/20 text-black dark:text-white font-bold text-[12px] hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    
                    {currentIndex === MOCK_QUESTIONS.length - 1 ? (
                        <button 
                            onClick={handleSubmit}
                            className="px-8 py-2.5 rounded-full bg-brand-green hover:bg-[#1bb85c] text-white font-bold text-[12px] transition-all active:scale-95"
                        >
                            Submit Test
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
                title="Submit Assessment?"
                message="Are you sure you want to submit your assessment? You won't be able to change your answers after submission."
                confirmText="Submit Test"
                cancelText="Review Again"
                type="warning"
            />
>>>>>>> origin/vikash
        </div>
    );
};

export default AptitudeEngine;
