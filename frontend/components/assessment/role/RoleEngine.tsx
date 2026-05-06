import React, { useCallback, useEffect, useState } from "react";
import Logo from "../../ui/Logo";
import ThemeToggle from "../../ui/ThemeToggle";
import ConceptualQuestionComponent from "./QuestionTypes/ConceptualQuestion";
import ScenarioQuestionComponent from "./QuestionTypes/ScenarioQuestion";
import QuestionNavigator, { NavigatorQuestion, QuestionState } from "../aptitude/QuestionNavigator";
import { AlertCircle, CheckCircle2, Flag, ArrowRight, LayoutGrid, X, PanelRightClose, PanelRightOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "@/lib/contexts/ThemeContext";
import TimerDisplay from "../shared/TimerDisplay";

const ROLE_TOTAL_TIME = 30 * 60;

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
    category?: string;
    subCategory?: string;
}

export interface ScenarioQuestion extends BaseRoleQuestion {
    type: "scenario";
    title: string;
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
        category: "API Design",
        subCategory: "REST Fundamentals",
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
        title: "Frontend Optimization",
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
        category: "Frontend Core",
        subCategory: "React State Management",
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
        title: "API Reliability",
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
    const safe = Math.max(0, seconds);
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const RoleEngine: React.FC<RoleEngineProps> = ({ onComplete, roleName = "Full Stack Engineer" }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
    const [timeLeft, setTimeLeft] = useState(ROLE_TOTAL_TIME);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
    const { theme } = useTheme();


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

    const navigatorQuestions: NavigatorQuestion[] = MOCK_ROLE_QUESTIONS.map((question, index) => {
        const isAnswered = !!answers[question.id];
        const isMarked = markedForReview.has(question.id);

        let state: QuestionState = "unanswered";
        if (isAnswered) state = "answered";
        if (isMarked) state = "marked";

        return {
            id: question.id,
            number: index + 1,
            state,
            category: question.type.toUpperCase(),
            isAnswered,
            isMarked,
        };
    });

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
        setShowSubmitModal(true);
    };

    const confirmSubmit = () => {
        completeAssessment();
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

            <header className="assessment-header sticky top-0 z-50 flex min-h-[72px] items-center justify-between gap-4 px-4 py-4 backdrop-blur-md dark:border-b dark:border-white/5 md:px-6">
                <div className="flex min-w-0 items-center">
                    <div className="hidden sm:block">
                        <Logo className="h-7" />
                    </div>
                    <div className="mx-4 hidden h-8 w-px bg-slate-300 dark:bg-white/10 sm:block" />
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold text-brand-green uppercase tracking-wider">Role-Based Assessment</p>
                        <h1 className="truncate text-sm font-bold text-[#17201b] dark:text-white">
                            {roleName} decision workspace
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <TimerDisplay 
                        time={timeLeft} 
                        total={ROLE_TOTAL_TIME} 
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
                        <LayoutGrid size={20} className="text-brand-green" />
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
                        {isDesktopSidebarOpen ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                                <path d="M15 4V20" stroke="currentColor" strokeWidth="2"/>
                                <path d="M15 4H19C20.1046 4 21 4.89543 21 6V18C21 19.1046 20.1046 20 19 20H15V4Z" fill="currentColor"/>
                                <path d="M8 9L11 12L8 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                                <path d="M15 4V20" stroke="currentColor" strokeWidth="2"/>
                                <path d="M15 4H19C20.1046 4 21 4.89543 21 6V18C21 19.1046 20.1046 20 19 20H15V4Z" fill="currentColor"/>
                                <path d="M11 9L8 12L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        )}
                    </button>
                </div>
            </header>

            <main className="relative z-10 mx-auto flex max-w-[1440px] gap-4 lg:gap-5 px-4 py-4 lg:py-5 lg:h-[calc(100dvh-72px)] lg:overflow-hidden lg:px-6">

                <section className="flex-1 flex min-h-[600px] min-w-0 flex-col rounded-xl border border-brand-green/15 bg-white shadow-sm dark:border-white/10 dark:bg-[#111a15] lg:min-h-0 lg:overflow-hidden transition-all duration-300">
                    <div className="border-b border-brand-green/5 p-3 sm:px-5 sm:py-2.5 dark:border-white/10">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div>
                                    <h2 className="text-sm font-bold text-[#17201b] dark:text-white uppercase tracking-wider">
                                        Question {currentIndex + 1}
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
                        {renderQuestionContent()}
                    </div>

                    <div className="border-t border-brand-green/5 bg-brand-green/[0.02] p-3 dark:border-white/10 dark:bg-white/5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={handlePrev}
                                disabled={currentIndex === 0}
                                className="min-h-10 rounded-lg border border-brand-green/20 bg-white px-5 text-sm font-bold text-[#17201b] transition hover:border-brand-green hover:text-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-[#0f1712] dark:text-white"
                            >
                                Previous
                            </button>
                            {isLastQuestion ? (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    className="min-h-10 rounded-lg bg-brand-green px-7 text-sm font-bold text-white transition hover:bg-[#19be5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                                >
                                    Submit test
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="min-h-10 rounded-lg bg-brand-green px-7 text-sm font-bold text-white transition hover:bg-[#19be5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
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
                            questions={navigatorQuestions}
                            currentIndex={currentIndex}
                            onSelect={(idx) => {
                                setCurrentIndex(idx);
                            }}
                            progressPercent={safeProgress}
                            isCollapsed={!isDesktopSidebarOpen}
                        />
                    </div>
                </motion.aside>
            </main>

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
                            className="absolute inset-y-0 right-0 w-[85%] max-w-sm border-l border-brand-green/10 bg-[#f6f8f5] shadow-2xl dark:bg-[#111a15]"
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

            {showSubmitModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-[#0f1712]/60 backdrop-blur-md transition-opacity" 
                        onClick={() => setShowSubmitModal(false)}
                    />
                    
                    <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl border border-brand-green/20 bg-white p-8 shadow-2xl transition-all dark:border-white/10 dark:bg-[#111a15]">
                        <div className="flex flex-col items-center text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                                <CheckCircle2 size={40} />
                            </div>
                            
                            <h2 className="text-2xl font-black text-[#17201b] dark:text-white">Ready to submit?</h2>
                            <p className="mt-2 text-sm text-[#17201b] dark:text-white">Review your assessment summary before finalizing your submission.</p>
                            
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
                                <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4 text-left">
                                    <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                                    <div>
                                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Unanswered Questions Detected</p>
                                        <p className="mt-0.5 text-[11px] leading-relaxed text-amber-600 dark:text-amber-400">
                                            You have {navigatorQuestions.filter(q => !q.isAnswered).length} questions left. We recommend reviewing them before final submission.
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
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-green py-3.5 text-sm font-bold text-white transition hover:bg-[#19be5e]"
                                >
                                    Yes, Submit Test
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default RoleEngine;

