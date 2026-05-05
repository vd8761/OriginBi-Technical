import React, { useEffect, useState } from "react";
import Logo from "../../ui/Logo";
import ThemeToggle from "../../ui/ThemeToggle";
import QuestionNavigator, { NavigatorQuestion, QuestionState } from "./QuestionNavigator";
import { AlertCircle, CheckCircle2, Flag, ArrowRight, LayoutGrid, X, ZoomIn, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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
        imageUrl: "/assessment/q3_chart.png",
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
        imageUrl: "/assessment/q4_figures.png",
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
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    const currentQuestion = MOCK_QUESTIONS[currentIndex];
    const totalQuestions = MOCK_QUESTIONS.length;
    const answeredCount = Object.keys(answers).length;
    const markedCount = markedForReview.size;
    const safeProgress = Math.round((answeredCount / totalQuestions) * 100);
    const isLastQuestion = currentIndex === totalQuestions - 1;
    const isQuestionAnswered = !!answers[currentQuestion.id];
    const isQuestionMarked = markedForReview.has(currentQuestion.id);


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
        const isAnswered = !!answers[question.id];
        const isMarked = markedForReview.has(question.id);

        let state: QuestionState = "unanswered";
        if (isAnswered) state = "answered";
        if (isMarked) state = "marked";

        return {
            id: question.id,
            number: index + 1,
            state,
            category: question.category,
            isAnswered,
            isMarked,
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
        onComplete(answers);
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#f6f8f5] font-sans text-[#17201b] transition-colors duration-500 dark:bg-[#0f1712] dark:text-white">
            <div className="absolute inset-0 assessment-aptitude-bg" aria-hidden="true" />
            <div className="absolute inset-0 assessment-grid opacity-35" aria-hidden="true" />

            <header className="assessment-header sticky top-0 z-50 flex min-h-[72px] items-center justify-between gap-4 px-6 py-4 backdrop-blur-md dark:border-b dark:border-white/5 md:px-8">
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
                    <div className="hidden scale-90 lg:block">
                        <ThemeToggle />
                    </div>
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-green/20 bg-white shadow-sm transition hover:border-brand-green dark:border-white/10 dark:bg-white/5 lg:hidden"
                        title="Question Map"
                    >
                        <LayoutGrid size={20} className="text-brand-green" />
                    </button>
                </div>
            </header>

            <main className="relative z-10 mx-auto grid max-w-[1600px] gap-8 px-6 py-8 lg:h-[calc(100dvh-72px)] lg:grid-cols-[minmax(0,1fr)_340px] lg:overflow-hidden lg:px-8">

                {/* Question Area */}
                <section className="flex min-h-[600px] flex-col rounded-xl border border-brand-green/15 bg-white shadow-sm dark:border-white/10 dark:bg-[#111a15] lg:min-h-0 lg:overflow-hidden">
                    {/* Top Progress Bar */}
                    <div className="h-1 w-full bg-brand-green/5">
                        <div 
                            className="h-full bg-brand-green transition-all duration-700 ease-out" 
                            style={{ width: `${safeProgress}%` }}
                        />
                    </div>
                    <div className="border-b border-brand-green/5 p-4 sm:px-6 sm:py-4 dark:border-white/10">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div>
                                    <h2 className="text-sm font-bold text-[#17201b] dark:text-white uppercase tracking-wider">
                                        {currentQuestion.category} Module
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
                            </div>

                            <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:items-center">
                                <button
                                    onClick={handleMarkReview}
                                    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 text-[11px] font-bold transition sm:text-xs ${
                                        isQuestionMarked
                                            ? "border-amber-400 bg-amber-400 text-[#241604]"
                                            : "border-brand-green/20 bg-white text-[#17201b] hover:border-amber-400 hover:text-amber-600 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:text-amber-400"
                                    }`}
                                >
                                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                    <span className="truncate">{isQuestionMarked ? "Unmark" : "Mark review"}</span>
                                </button>
                                <button
                                    onClick={handleClear}
                                    disabled={!isQuestionAnswered}
                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-brand-green/20 bg-white px-4 text-[11px] font-bold text-[#17201b] transition hover:border-red-500 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:text-red-400 sm:text-xs"
                                >
                                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span className="truncate">Clear</span>
                                </button>
                            </div>

                        </div>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
                        <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-6 dark:border-white/10 dark:bg-white/5">
                            <h2 className="text-sm font-semibold leading-relaxed text-[#17201b] dark:text-white sm:text-base">
                                <span className="mr-3 font-bold">{currentIndex + 1}.</span>
                                {currentQuestion.text}
                            </h2>
                            {currentQuestion.imageUrl && (
                                <div className="mt-4 overflow-hidden rounded-lg border border-brand-green/10 bg-white p-2 dark:border-white/10 dark:bg-[#0f1712]">
                                    <button
                                        type="button"
                                        onClick={() => setZoomedImage(currentQuestion.imageUrl!)}
                                        className="group relative block w-full overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-brand-green/40"
                                        title="Click to enlarge"
                                    >
                                        <div
                                            role="img"
                                            aria-label="Question reference"
                                            className="mx-auto h-56 w-full max-w-2xl bg-contain bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-105"
                                            style={{ backgroundImage: `url(${currentQuestion.imageUrl})` }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                                            <div className="rounded-full bg-white/90 p-2 opacity-0 shadow-lg transition-all group-hover:scale-110 group-hover:opacity-100 dark:bg-black/80">
                                                <Search size={20} className="text-brand-green" />
                                            </div>
                                        </div>
                                    </button>
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

                {/* Sidebar (Desktop only) */}
                <aside className="hidden rounded-xl border border-brand-green/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#111a15] lg:block lg:min-h-0 lg:overflow-y-auto">
                    <QuestionNavigator
                        questions={navigatorQuestions}
                        currentIndex={currentIndex}
                        onSelect={(idx) => {
                            setCurrentIndex(idx);
                            setIsSidebarOpen(false);
                        }}
                        progressPercent={safeProgress}
                    />
                </aside>
            </main>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <div className="fixed inset-0 z-[110] lg:hidden">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="absolute inset-0 bg-[#0f1712]/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="absolute inset-y-0 right-0 w-full max-w-[320px] border-l border-brand-green/10 bg-[#f6f8f5] shadow-2xl dark:bg-[#111a15]"
                        >
                            <div className="flex h-full flex-col">
                                <div className="flex items-center justify-between border-b border-brand-green/5 p-6 dark:border-white/10">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-sm font-bold uppercase tracking-widest text-[#17201b] dark:text-white">Navigator</h2>
                                        <div className="scale-75 origin-left">
                                            <ThemeToggle />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsSidebarOpen(false)}
                                        className="rounded-lg p-2 text-[#17201b] hover:bg-brand-green/10 hover:text-brand-green dark:text-white"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6">
                                    <QuestionNavigator
                                        questions={navigatorQuestions}
                                        currentIndex={currentIndex}
                                        onSelect={(idx) => {
                                            setCurrentIndex(idx);
                                            setIsSidebarOpen(false);
                                        }}
                                        progressPercent={safeProgress}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Image Zoom Modal */}
            <AnimatePresence>
                {zoomedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0f1712]/95 backdrop-blur-md p-4 sm:p-10"
                        onClick={() => setZoomedImage(null)}
                    >
                        {/* Fixed Close Button for reliable visibility on all screens */}
                        <button
                            onClick={() => setZoomedImage(null)}
                            className="absolute right-6 top-6 z-[210] flex items-center gap-2 text-white/70 hover:text-white transition-all active:scale-95"
                        >
                            <span className="hidden text-xs font-bold uppercase tracking-widest sm:block">Close</span>
                            <div className="rounded-full bg-white/10 p-3 backdrop-blur-md transition-colors hover:bg-white/20">
                                <X size={24} />
                            </div>
                        </button>

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative h-full w-full max-w-6xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex h-full w-full items-center justify-center">
                                <img
                                    src={zoomedImage}
                                    alt="Enlarged question reference"
                                    className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Submit Confirmation Modal */}
            {showSubmitModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#0f1712]/60 backdrop-blur-md transition-opacity" 
                        onClick={() => setShowSubmitModal(false)}
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        className="relative w-full max-w-lg transform overflow-hidden rounded-2xl border border-brand-green/20 bg-white p-8 shadow-2xl transition-all dark:border-white/10 dark:bg-[#111a15]"
                    >

                        <div className="relative flex flex-col items-center text-center">
                            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                                <CheckCircle2 size={40} />
                            </div>
                            
                            <h2 className="text-2xl font-black text-[#17201b] dark:text-white">Ready to submit?</h2>
                            <p className="mt-2 text-sm text-[#17201b]/60 dark:text-white/60">Review your assessment summary before finalizing your submission.</p>

                            <div className="mt-4 flex items-center gap-2 rounded-full border border-brand-green/10 bg-brand-green/[0.03] px-4 py-1.5 dark:border-white/5 dark:bg-white/5">
                                <div className="h-2 w-2 animate-pulse rounded-full bg-brand-green" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-green">
                                    Time Remaining: {formatTime(timeLeft)}
                                </span>
                            </div>
                            
                            {/* Summary Cards */}
                            <div className="mt-8 grid w-full grid-cols-3 gap-4">
                                <div className="flex flex-col items-center rounded-xl bg-brand-green/[0.05] p-4 border border-brand-green/10">
                                    <span className="text-xl font-black text-brand-green">{navigatorQuestions.filter(q => q.isAnswered).length}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-green/60">Answered</span>
                                </div>
                                <div className="flex flex-col items-center rounded-xl bg-amber-400/[0.05] p-4 border border-amber-400/10">
                                    <span className="text-xl font-black text-amber-500">{navigatorQuestions.filter(q => q.isMarked).length}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/60">Review</span>
                                </div>
                                <div className="flex flex-col items-center rounded-xl bg-slate-100 p-4 border border-slate-200 dark:bg-white/[0.03] dark:border-white/10">
                                    <span className="text-xl font-black text-slate-500 dark:text-white/60">{navigatorQuestions.filter(q => !q.isAnswered).length}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500/60 dark:text-white/30">Left</span>
                                </div>
                            </div>

                            {navigatorQuestions.some(q => !q.isAnswered) && (
                                <div className="mt-6 flex w-full items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4 text-left">
                                    <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                                    <div>
                                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Unanswered Questions</p>
                                        <p className="mt-0.5 text-[11px] leading-relaxed text-amber-600/70 dark:text-amber-400/70">
                                            We recommend attempting all questions before final submission.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => setShowSubmitModal(false)}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#17201b]/10 bg-white py-3.5 text-sm font-bold text-[#17201b] transition hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
                                >
                                    Review Answers
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmSubmit}
                                    className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-green py-3.5 text-sm font-bold text-white transition-all hover:bg-[#19be5e]"
                                >
                                    Yes, Submit Test
                                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default AptitudeEngine;

