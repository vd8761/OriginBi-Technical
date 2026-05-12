import React, { useCallback, useEffect, useRef, useState } from "react";
import Logo from "../../ui/Logo";
import ThemeToggle from "../../ui/ThemeToggle";
import QuestionNavigator, { NavigatorQuestion, QuestionState } from "../aptitude/QuestionNavigator";
import { AlertCircle, CheckCircle2, Flag, ArrowRight, LayoutGrid, X, RotateCcw, PanelRightClose, PanelRightOpen, Loader2, RotateCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "@/lib/contexts/ThemeContext";
import TimerDisplay from "../shared/TimerDisplay";
import { SidebarOpenIcon, SidebarCloseIcon, SidebarMobileIcon } from "../shared/AssessmentIcons";
import { useAssessmentCache } from "@/lib/useAssessmentCache";

const MNC_TOTAL_TIME = 30 * 60;

export interface Option {
    id: string;
    text: string;
}

export interface MncQuestion {
    id: string;
    topic: string;
    text: string;
    options: Option[];
    difficulty?: string;
    marks?: number;
    negativeMarks?: number;
}

export interface AttemptSubmitResult {
    totalScore: number;
    positiveScore?: number;
    negativeScore?: number;
    correctCount: number;
    wrongCount: number;
    answeredCount?: number;
    totalQuestions?: number;
    timeTakenSeconds: number;
    status?: string;
}

interface MNCEngineProps {
    onComplete: (result: AttemptSubmitResult) => void;
    assessmentCode?: string;
    userId?: number;
    mode?: 'trial' | 'main';
}

const formatTime = (seconds: number) => {
    const safe = Math.max(0, seconds);
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const labels = ["A", "B", "C", "D"];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const MNCEngine: React.FC<MNCEngineProps> = ({ 
    onComplete,
    assessmentCode = "MNC_DEFAULT",
    userId,
    mode = 'main'
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
    const [timeLeft, setTimeLeft] = useState(MNC_TOTAL_TIME);
    const [totalTime, setTotalTime] = useState(MNC_TOTAL_TIME);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
    const { theme } = useTheme();
    const [questions, setQuestions] = useState<MncQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [attemptToken, setAttemptToken] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showRestoredBanner, setShowRestoredBanner] = useState(false);
    const cacheRestoredRef = useRef(false);

    const [attemptsCount, setAttemptsCount] = useState<number | null>(null);
    const [attemptsLimit, setAttemptsLimit] = useState<number | null>(null);

    useEffect(() => {
        const fetchEngineStats = async () => {
            try {
                let activeEmail: string | undefined = undefined;
                try {
                    const storedProfile = localStorage.getItem("originbi:user-profile");
                    if (storedProfile) {
                        const parsed = JSON.parse(storedProfile);
                        if (parsed && parsed.email) {
                            activeEmail = parsed.email;
                        }
                    }
                    if (!activeEmail) {
                        const storedUser = localStorage.getItem("user");
                        if (storedUser) {
                            const parsed = JSON.parse(storedUser);
                            if (parsed && parsed.email) {
                                activeEmail = parsed.email;
                            }
                        }
                    }
                } catch (err) {
                    console.error("Error reading profile email:", err);
                }

                const emailParam = activeEmail ? `?userId=${encodeURIComponent(activeEmail)}` : "";
                const [statsRes, assessmentsRes] = await Promise.all([
                    fetch(`${API_BASE}/api/assessment/attempts-stats${emailParam}`),
                    fetch(`${API_BASE}/api/assessment/admin/assessments`)
                ]);
                const statsJson = await statsRes.json();
                if (statsJson?.data) {
                    const cnt = statsJson.data['mnc']?.[mode] ?? 0;
                    setAttemptsCount(cnt > 0 ? cnt : 1);
                }
                const assessmentsJson = await assessmentsRes.json();
                if (assessmentsJson?.data) {
                    const found = assessmentsJson.data.find(
                        (a: any) => a.module_type === 'mnc' || a.assessment_code === 'mnc'
                    );
                    if (found) {
                        const lim = mode === 'trial' ? found.trial_attempts_limit : found.main_attempts_limit;
                        setAttemptsLimit(Number(lim));
                    }
                }
            } catch (err) {
                console.error("Failed to load engine attempts stats:", err);
            }
        };
        fetchEngineStats();
    }, [mode]);

    // ── Cache hook ──────────────────────────────────────────────
    const {
        cachedSession,
        isCacheRestored,
        isRestoredFromCache,
        saveAnswer: cacheSaveAnswer,
        saveNavigation: cacheSaveNavigation,
        clearSession,
    } = useAssessmentCache({
        token:           attemptToken,
        module:          'mnc',
        assessmentCode:  `${assessmentCode}_${mode}`,
        questions,
        expiresAt:       undefined,
        answers:         Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, { optionId: v }])),
        markedForReview: [...markedForReview],
        currentIndex,
        timeLeftSeconds: timeLeft,
    });

    // ── Restore session from cache on mount ──────────────────────
    useEffect(() => {
        if (!isCacheRestored || !isRestoredFromCache || !cachedSession || cacheRestoredRef.current) return;
        cacheRestoredRef.current = true;
        if (cachedSession.questions?.length) {
            setQuestions(normalizeQuestions(cachedSession.questions as any[]));
        }
        if (cachedSession.answers) {
            const restored: Record<string, string> = {};
            for (const [qId, val] of Object.entries(cachedSession.answers)) {
                if (typeof val === 'object' && val !== null && 'optionId' in val && val.optionId) {
                    restored[qId] = val.optionId as string;
                } else if (typeof val === 'string') {
                    restored[qId] = val;
                }
            }
            setAnswers(restored);
        }
        if (cachedSession.markedForReview?.length) {
            setMarkedForReview(new Set(cachedSession.markedForReview));
        }
        if (cachedSession.currentIndex !== undefined) {
            setCurrentIndex(cachedSession.currentIndex);
        }
        if (cachedSession.timeLeftSeconds) {
            setTimeLeft(cachedSession.timeLeftSeconds);
        }
        if (cachedSession.token) {
            setAttemptToken(cachedSession.token);
        }
        setShowRestoredBanner(true);
        setTimeout(() => setShowRestoredBanner(false), 5000);
    }, [isCacheRestored, isRestoredFromCache, cachedSession]);

    const normalizeQuestions = (items: any[]): MncQuestion[] => items.map((q: any) => ({
        id: String(q.id ?? q.questionId ?? q.question_id),
        topic: q.topic ?? q.category ?? q.topic_group ?? "General",
        text: q.text ?? q.questionText ?? q.question_text ?? "",
        options: Array.isArray(q.options)
            ? q.options.map((opt: any) => ({
                id: String(opt.id ?? opt.optionId ?? opt.option_id),
                text: opt.text ?? opt.optionText ?? opt.option_text ?? "",
            }))
            : [],
        difficulty: q.difficulty ?? undefined,
        marks: q.marks !== undefined ? Number(q.marks) : undefined,
        negativeMarks: q.negativeMarks !== undefined ? Number(q.negativeMarks) : (q.negative_marks !== undefined ? Number(q.negative_marks) : undefined),
    }));

    useEffect(() => {
        if (!isCacheRestored) return;

        if (isRestoredFromCache || cacheRestoredRef.current) {
            setIsLoading(false);
            return;
        }

        const fetchAttempt = async () => {
            try {
                setIsLoading(true);
                setLoadError(null);

                let activeEmail: string | undefined = undefined;
                try {
                    const storedProfile = localStorage.getItem("originbi:user-profile");
                    if (storedProfile) {
                        const parsed = JSON.parse(storedProfile);
                        if (parsed && parsed.email) {
                            activeEmail = parsed.email;
                        }
                    }
                    if (!activeEmail) {
                        const storedUser = localStorage.getItem("user");
                        if (storedUser) {
                            const parsed = JSON.parse(storedUser);
                            if (parsed && parsed.email) {
                                activeEmail = parsed.email;
                            }
                        }
                    }
                } catch (err) {
                    console.error("Error reading profile email:", err);
                }

                const response = await fetch(`${API_BASE}/api/assessment/mnc/attempts`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ assessmentCode, userId: activeEmail || userId, mode }),
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.message || "Failed to load MNC questions.");
                }

                const data = await response.json();
                const token = data.attemptToken || data.token;
                setAttemptToken(token || null);
                setQuestions(Array.isArray(data.questions) ? normalizeQuestions(data.questions) : []);
                const duration = Number(data.durationSeconds || MNC_TOTAL_TIME);
                setTimeLeft(duration);
                setTotalTime(duration);
            } catch (error) {
                setLoadError((error as Error).message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAttempt();
    }, [assessmentCode, userId, mode, isCacheRestored, isRestoredFromCache]);

    const currentQuestion = questions[currentIndex];
    const totalQuestions = questions.length;
    const answeredCount = Object.keys(answers).length;
    const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
    const isLastQuestion = currentIndex === totalQuestions - 1;

    const navigatorQuestions: NavigatorQuestion[] = questions.map((question, index) => {
        const isAnswered = !!answers[question.id];
        const isMarked = markedForReview.has(question.id);
        let state: QuestionState = isMarked ? "marked" : (isAnswered ? "answered" : "unanswered");

        return {
            id: question.id,
            number: index + 1,
            state,
            category: "MNC",
            isAnswered,
            isMarked,
        };
    });

    const isQuestionAnswered = currentQuestion ? !!answers[currentQuestion.id] : false;
    const isQuestionMarked = currentQuestion ? markedForReview.has(currentQuestion.id) : false;

    const handleClear = () => {
        if (!currentQuestion) return;
        const newAnswers = { ...answers };
        delete newAnswers[currentQuestion.id];
        setAnswers(newAnswers);
        cacheSaveAnswer(currentQuestion.id, {});
    };

    const handleMarkReview = () => {
        if (!currentQuestion) return;
        const newMarked = new Set(markedForReview);
        if (newMarked.has(currentQuestion.id)) {
            newMarked.delete(currentQuestion.id);
        } else {
            newMarked.add(currentQuestion.id);
        }
        setMarkedForReview(newMarked);
        cacheSaveNavigation(currentIndex, [...newMarked], timeLeft);
    };

    const completeAssessment = useCallback(async () => {
        if (!attemptToken || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/api/assessment/mnc/attempts/${attemptToken}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers }),
            });

            if (!response.ok) {
                throw new Error("Failed to submit assessment.");
            }

            const result = await response.json();
            await clearSession();
            onComplete(result);
        } catch (error) {
            setLoadError((error as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    }, [answers, attemptToken, clearSession, isSubmitting, onComplete]);

    useEffect(() => {
        if (isLoading || !attemptToken) return;
        if (timeLeft <= 0) {
            completeAssessment();
            return;
        }
        const timer = window.setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        return () => window.clearInterval(timer);
    }, [completeAssessment, timeLeft, isLoading, attemptToken]);

    const handleOptionSelect = (optionId: string) => {
        if (!currentQuestion) return;
        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionId }));
        cacheSaveAnswer(currentQuestion.id, { optionId });
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f6f8f5] dark:bg-[#0f1712] transition-colors duration-500">
                <Logo className="h-12 w-auto mb-8" />
                <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
            </div>
        );
    }

    if (loadError || questions.length === 0) {
        return (
            <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f6f8f5] px-4 dark:bg-[#0f1712] transition-colors duration-500">
                <p className="text-lg text-slate-500 dark:text-slate-400">
                    No Questions Found
                </p>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#f6f8f5] font-sans text-[#17201b] transition-colors duration-500 dark:bg-[#0f1712] dark:text-white">
            <div className="absolute inset-0 assessment-role-bg" aria-hidden="true" />
            <div className="absolute inset-0 assessment-grid opacity-35" aria-hidden="true" />
            <div className="absolute inset-0 assessment-scan opacity-[0.05]" aria-hidden="true" />

            {/* ── Cache Restored Banner ──────────────────────────────── */}
            <AnimatePresence>
                {showRestoredBanner && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        transition={{ type: 'spring', damping: 20 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-2xl shadow-emerald-500/30"
                    >
                        <RotateCw className="h-4 w-4" />
                        Progress restored — you can continue from where you left off
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="assessment-header sticky top-0 z-50 flex min-h-[72px] items-center justify-between gap-4 px-4 py-4 backdrop-blur-md dark:border-b dark:border-white/5 md:px-6">
                <div className="flex min-w-0 items-center">
                    <div className="hidden sm:block">
                        <Logo className="h-7" />
                    </div>
                    <div className="mx-4 hidden h-8 w-px bg-slate-300 dark:bg-white/10 sm:block" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[10px] font-bold text-brand-green uppercase tracking-wider">MNC Career Assessment</p>
                            {mode === 'trial' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    Trial Test
                                </span>
                            )}
                        </div>
                        <h1 className="truncate text-sm font-bold text-[#17201b] dark:text-white flex items-center gap-1.5">
                            <span>Technical MCQ Hub</span>
                            <span className="text-slate-900 dark:text-white font-normal">&middot;</span>
                            <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                Attempt {attemptsCount ?? 1} of {attemptsLimit ?? (mode === 'trial' ? 5 : 2)}
                            </span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <TimerDisplay 
                        time={timeLeft} 
                        total={totalTime} 
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
                <section className="flex-1 flex min-h-[600px] min-w-0 flex-col rounded-xl border border-brand-green/15 bg-white shadow-sm dark:border-white/10 dark:bg-[#111a15] lg:min-h-0 lg:overflow-hidden transition-all duration-300">
                    <div className="border-b border-brand-green/5 p-3 sm:px-5 sm:py-2.5 dark:border-white/10">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-[#17201b] dark:text-white uppercase tracking-wider">
                                    {currentQuestion.topic}
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
                        <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-4 dark:border-white/10 dark:bg-white/5 sm:p-5">
                            <h2 className="text-sm font-medium leading-relaxed text-[#17201b] dark:text-white sm:text-base">
                                <span className="mr-3 font-semibold">{currentIndex + 1}.</span>
                                {currentQuestion.text}
                            </h2>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {currentQuestion.options.map((option, idx) => {
                                const isSelected = answers[currentQuestion.id] === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => handleOptionSelect(option.id)}
                                        className={`group flex min-h-20 items-center gap-4 rounded-lg border p-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
                                            isSelected 
                                                ? "border-brand-green bg-brand-green/10" 
                                                : "border-brand-green/20 bg-white hover:border-brand-green/50 dark:border-white/10 dark:bg-[#0f1712] dark:hover:border-brand-green/50"
                                        }`}
                                    >
                                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${isSelected ? "bg-brand-green text-[#0f1712]" : "bg-brand-green/10 text-brand-green"}`}>
                                            {labels[idx]}
                                        </span>
                                        <span className={`text-sm font-semibold leading-6 ${isSelected ? "text-[#17201b] dark:text-white" : "text-[#17201b] dark:text-white"}`}>
                                            {option.text}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="border-t border-brand-green/5 bg-brand-green/[0.02] p-3 dark:border-white/10 dark:bg-white/5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => { const i = currentIndex - 1; setCurrentIndex(i); cacheSaveNavigation(i, [...markedForReview], timeLeft); }}
                                disabled={currentIndex === 0}
                                className="min-h-10 rounded-lg border border-brand-green/20 bg-white px-5 text-sm font-bold text-[#17201b] transition hover:border-brand-green hover:text-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-[#0f1712] dark:text-white"
                            >
                                Previous
                            </button>
                            {isLastQuestion ? (
                                <button 
                                    type="button"
                                    onClick={() => setShowSubmitModal(true)} 
                                    className="min-h-10 rounded-lg bg-brand-green px-7 text-sm font-bold text-white transition hover:bg-[#19be5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                                >
                                    Submit test
                                </button>
                            ) : (
                                <button 
                                    type="button"
                                    onClick={() => { const i = currentIndex + 1; setCurrentIndex(i); cacheSaveNavigation(i, [...markedForReview], timeLeft); }} 
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
                            onSelect={setCurrentIndex}
                            progressPercent={progressPercent}
                            isCollapsed={!isDesktopSidebarOpen}
                        />
                    </div>
                </motion.aside>
            </main>

            {showSubmitModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center dark:bg-[#111a15]">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                            <CheckCircle2 size={40} />
                        </div>
                        <h2 className="text-2xl font-bold">Submit Assessment?</h2>
                        <p className="mt-2 text-sm opacity-60">You have answered {answeredCount} out of {totalQuestions} questions.</p>
                        <div className="mt-8 flex gap-4">
                            <button onClick={() => setShowSubmitModal(false)} className="flex-1 rounded-xl border border-brand-green/20 py-3 text-sm font-bold">Review</button>
                            <button onClick={completeAssessment} className="flex-1 rounded-xl bg-brand-green py-3 text-sm font-bold text-white">Yes, Submit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MNCEngine;
