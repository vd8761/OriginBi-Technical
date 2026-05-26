import React, { useCallback, useEffect, useRef, useState } from "react";
import Logo from "../../ui/Logo";
import ThemeToggle from "../../ui/ThemeToggle";
import QuestionNavigator, { NavigatorQuestion, QuestionState } from "./QuestionNavigator";
import { AlertCircle, CheckCircle2, Flag, ArrowRight, X, ZoomIn, Search, PanelRightClose, PanelRightOpen, LayoutGrid, RotateCcw, Loader2, RotateCw, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "@/lib/contexts/ThemeContext";
import TimerDisplay from "../shared/TimerDisplay";
import { SidebarOpenIcon, SidebarCloseIcon, SidebarMobileIcon } from "../shared/AssessmentIcons";
import { useAssessmentCache } from "@/lib/useAssessmentCache";
import ProctoringHost from "@/lib/proctoring/ProctoringHost";
import AssessmentPluginHost from "@/lib/proctoring/AssessmentPluginHost";
import {
    DEFAULT_PROCTORING,
    fetchEffectiveAssessmentSettings,
    resolveProctoringForPackage,
    type ProctoringSettings,
} from "@/lib/proctoring";
import { McqQuestion } from "./question-types/McqQuestion";
import { MsqQuestion } from "./question-types/MsqQuestion";
import { TfQuestion } from "./question-types/TfQuestion";
import { NumericalQuestion } from "./question-types/NumericalQuestion";

const APTITUDE_TOTAL_TIME = 3600;



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
    difficulty?: string;
    marks?: number;
    negativeMarks?: number;
    explanation?: string;
    metadata?: {
        kind?: 'mcq' | 'msq' | 'tf' | 'numerical';
        [key: string]: any;
    };
}

export interface AttemptSubmitResult {
    totalScore: number;
    overallScorePercent?: number;
    maxScore?: number;
    positiveScore?: number;
    negativeScore?: number;
    correctCount: number;
    wrongCount: number;
    answeredCount?: number;
    objectiveAnsweredCount?: number;
    subjectiveAnsweredCount?: number;
    skippedCount?: number;
    totalQuestions?: number;
    timeTakenSeconds: number;
    accuracy?: number;
    accuracyPct?: number;
    sections?: Array<Record<string, unknown>>;
    questionReviews?: Array<Record<string, unknown>>;
    status?: string;
}

interface AptitudeEngineProps {
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

const API_BASE =
    (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "" : process.env.NEXT_PUBLIC_TECH_API_URL?.replace(/\/$/, "")) ||
    process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
    "";

const labelForIndex = (index: number) => String.fromCharCode(65 + index);

const AptitudeEngine: React.FC<AptitudeEngineProps> = ({
    onComplete,
    assessmentCode = "APTITUDE_DEFAULT",
    userId,
    mode = 'main',
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
    const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
    const [timeLeft, setTimeLeft] = useState(APTITUDE_TOTAL_TIME);
    const [totalTime, setTotalTime] = useState(APTITUDE_TOTAL_TIME);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [showBackWarningModal, setShowBackWarningModal] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const { theme } = useTheme();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [attemptToken, setAttemptToken] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submittingRef = useRef(false); // Ref-based guard to prevent double submit across renders
    const [showRestoredBanner, setShowRestoredBanner] = useState(false);
    // Ref to prevent double-fetching when cache restoration already set questions
    const cacheRestoredRef = useRef(false);

    const [attemptsCount, setAttemptsCount] = useState<number | null>(null);
    const [attemptsLimit, setAttemptsLimit] = useState<number | null>(null);
    const [proctoringSettings, setProctoringSettings] =
        useState<ProctoringSettings>(DEFAULT_PROCTORING);

    // ── Intercept browser/mouse back button (popstate) ──
    useEffect(() => {
        if (isLoading || isSubmitting || questions.length === 0) return;

        // Push initial dummy state to enable trapping
        window.history.pushState(null, "", window.location.href);

        const handlePopState = () => {
            // Push dummy state again so user remains on this page
            window.history.pushState(null, "", window.location.href);
            setShowBackWarningModal(true);
        };

        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [isLoading, isSubmitting, questions.length]);



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
                    const cnt = statsJson.data['aptitude']?.[mode] ?? 0;
                    setAttemptsCount(cnt > 0 ? cnt : 1);
                }
                const assessmentsJson = await assessmentsRes.json();
                if (assessmentsJson?.data) {
                    const found = assessmentsJson.data.find(
                        (a: any) => a.module_type === 'aptitude' || a.assessment_code === 'aptitude'
                    );
                    if (found) {
                        // Prefer the config frozen at the candidate's purchase
                        // time over the live admin row, so a later admin edit
                        // never changes an already-scheduled exam.
                        const effective = await fetchEffectiveAssessmentSettings(
                            API_BASE,
                            found.assessment_code ?? 'aptitude',
                            activeEmail,
                        );
                        if (effective) Object.assign(found, effective);
                        const lim = mode === 'trial' ? found.trial_attempts_limit : found.main_attempts_limit;
                        setAttemptsLimit(Number(lim));
                        setProctoringSettings(resolveProctoringForPackage(found));
                    }
                }
            } catch (err) {
                // Optional metadata request; assessment can continue without it.
                setAttemptsCount((prev) => prev ?? 0);
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
        invalidateCache,
    } = useAssessmentCache({
        token:           attemptToken,
        module:          'aptitude',
        assessmentCode:  `${assessmentCode}_${mode}`,
        questions,
        expiresAt:       undefined,
        answers:         Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, { optionId: v }])),
        markedForReview: [...markedForReview],
        currentIndex,
        timeLeftSeconds: timeLeft,
    });

    // Restore session from cache when it is loaded – but validate the token first
    useEffect(() => {
        if (!isCacheRestored || !isRestoredFromCache || !cachedSession || cacheRestoredRef.current) return;
        cacheRestoredRef.current = true;

        const validateAndRestore = async () => {
            // If the cache has a token, validate it against the server
            if (cachedSession.token) {
                try {
                    const res = await fetch(`${API_BASE}/api/assessment/aptitude/attempts/${cachedSession.token}/questions`);
                    if (res.ok) {
                        const data = await res.json();
                        // If the attempt status is submitted/closed, the cache is stale
                        if (data.status && data.status !== 'in_progress') {
                            console.warn('Cached attempt is already submitted/closed, clearing cache and starting fresh');
                            cacheRestoredRef.current = false;
                            await invalidateCache();
                            // invalidateCache resets isRestoredFromCache to false,
                            // which will trigger the fetchAttempt effect to create a new attempt
                            return;
                        }
                    } else {
                        // Token not found or other server error – cache is stale
                        console.warn('Cached attempt token invalid, clearing cache and starting fresh');
                        cacheRestoredRef.current = false;
                        await invalidateCache();
                        return;
                    }
                } catch (err) {
                    console.error('Failed to validate cached attempt, proceeding with cache:', err);
                    // Network error – proceed with cache as a fallback
                }
            }

            // Token is valid, restore the full session from cache
            if (cachedSession.questions?.length) {
                setQuestions(normalizeQuestions(cachedSession.questions as any[]));
            }
            if (cachedSession.answers) {
                const restored: Record<string, string | string[]> = {};
                for (const [qId, val] of Object.entries(cachedSession.answers)) {
                    if (typeof val === 'object' && val !== null && 'optionId' in val && val.optionId) {
                        restored[qId] = val.optionId as string | string[];
                    } else if (typeof val === 'string' || Array.isArray(val)) {
                        restored[qId] = val as any;
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
        };

        validateAndRestore();
    }, [isCacheRestored, isRestoredFromCache, cachedSession, clearSession, invalidateCache]);

    const normalizeQuestions = (items: any[]): Question[] => items.map((q: any) => ({
        id: String(q.id ?? q.questionId ?? q.question_id),
        category: q.category ?? q.subcategory ?? "General",
        text: q.text ?? q.questionText ?? q.question_text ?? "",
        imageUrl: q.imageUrl ?? q.image_url ?? undefined,
        options: Array.isArray(q.options)
            ? q.options.map((opt: any) => ({
                id: String(opt.id ?? opt.optionId ?? opt.option_id),
                text: opt.text ?? opt.optionText ?? opt.option_text ?? "",
            }))
            : [],
        difficulty: q.difficulty ?? undefined,
        marks: q.marks !== undefined ? Number(q.marks) : undefined,
        negativeMarks: q.negativeMarks !== undefined ? Number(q.negativeMarks) : (q.negative_marks !== undefined ? Number(q.negative_marks) : undefined),
        explanation: q.explanation ?? undefined,
        metadata: q.metadata ?? {},
    }));

    const currentQuestion = questions[currentIndex];
    const totalQuestions = questions.length;
    const answeredCount = Object.keys(answers).length;
    const safeProgress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
    const isLastQuestion = currentIndex === totalQuestions - 1;
    const currentQuestionId = currentQuestion?.id ?? "";
    const isQuestionAnswered = currentQuestion ? !!answers[currentQuestionId] : false;
    const isQuestionMarked = currentQuestion ? markedForReview.has(currentQuestionId) : false;

    // ── Block grouping (display only — no locking) ──────────────────────────
    // Questions are grouped in blocks of 5 for the navigator display.
    // Users can freely navigate to any question — skipping is allowed.
    const QUESTIONS_PER_BLOCK = 5;

    // All questions are always unlocked — no restriction on navigation.
    const unlockedUpTo = questions.length - 1;
    const isQuestionLocked = (_index: number) => false;


    useEffect(() => {
        if (!isCacheRestored) return; // Wait until cache resolution finishes

        // If we already restored from cache, skip the fetch
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

                const response = await fetch(`${API_BASE}/api/assessment/aptitude/attempts`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ assessmentCode, userId: activeEmail || userId, mode }),
                });

                if (!response.ok) {
                    const errorText = await response.text().catch(() => "Unknown error");
                    console.error("API Error:", response.status, errorText);
                    throw new Error(`Failed to load questions: ${response.status} - ${errorText}`);
                }

                const data = await response.json();

                // If backend returned block-based adaptive mode, redirect to adaptive engine
                if (data.isBlockBased) {
                    setIsRedirecting(true);
                    const assessmentsRes = await fetch(`${API_BASE}/api/assessment/admin/assessments`);
                    const assessmentsJson = await assessmentsRes.json();
                    const found = assessmentsJson?.data?.find((a: any) => a.module_type === "aptitude");
                    const assessmentId = found?.assessment_id || 1;
                    window.location.href = `/assessment/aptitude/adaptive?v2=true&mode=${mode}&assessmentId=${assessmentId}&attemptToken=${data.attemptToken}`;
                    return;
                }

                const token = data.attemptToken || data.token;
                setAttemptToken(token || null);

                let fetchedQuestions = data.questions;
                let serverAnswers = data.answers;
                if (!Array.isArray(fetchedQuestions) && token) {
                    const questionsRes = await fetch(`${API_BASE}/api/assessment/aptitude/attempts/${token}/questions`);
                    if (!questionsRes.ok) {
                        throw new Error("Failed to fetch questions");
                    }
                    const questionsData = await questionsRes.json();
                    fetchedQuestions = questionsData.questions;
                    serverAnswers = questionsData.answers ?? serverAnswers;
                }

                setQuestions(Array.isArray(fetchedQuestions) ? normalizeQuestions(fetchedQuestions) : []);
                const duration = Number(data.durationSeconds || APTITUDE_TOTAL_TIME);
                const timeLeftSeconds = Number(data.timeLeftSeconds ?? duration);
                setTimeLeft(timeLeftSeconds);
                setTotalTime(duration);

                if (serverAnswers && typeof serverAnswers === "object") {
                    const restored: Record<string, string | string[]> = {};
                    for (const [qId, val] of Object.entries(serverAnswers)) {
                        if (val && typeof val === "object" && "optionId" in val && (val as any).optionId) {
                            const optVal = (val as any).optionId;
                            restored[qId] = Array.isArray(optVal) ? optVal.map(String) : String(optVal);
                        } else if (typeof val === "string" || typeof val === "number") {
                            restored[qId] = String(val);
                        } else if (Array.isArray(val)) {
                            restored[qId] = val.map(String);
                        }
                    }
                    if (Object.keys(restored).length > 0) {
                        setAnswers(restored);
                        Object.entries(restored).forEach(([qId, optId]) => {
                            cacheSaveAnswer(qId, { optionId: optId as any });
                        });
                        setShowRestoredBanner(true);
                        setTimeout(() => setShowRestoredBanner(false), 5000);
                    }
                }
            } catch (error) {
                setLoadError((error as Error).message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAttempt();
    }, [assessmentCode, userId, mode, isCacheRestored, isRestoredFromCache, cacheSaveAnswer]);

    // Keep a ref to the latest answers so handleSubmitAttempt doesn't need
    // `answers` in its dependency array (which would recreate it on every option select).
    const answersRef = useRef(answers);
    answersRef.current = answers;

    const persistAnswer = useCallback((questionId: string, payload: any) => {
        if (!attemptToken) return;
        void fetch(`${API_BASE}/api/assessment/aptitude/attempts/${attemptToken}/answers`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: { [questionId]: payload } }),
        }).catch(() => {});
    }, [attemptToken]);

    const handleSubmitAttempt = useCallback(async () => {
        console.log("Aptitude: handleSubmitAttempt called. attemptToken:", attemptToken, "submittingRef:", submittingRef.current);
        // Use ref-based guard so the check is synchronous and survives re-renders
        if (!attemptToken || submittingRef.current) {
            console.log("Aptitude: Submission aborted (missing token or already submitting).");
            return;
        }
        
        console.log("Aptitude: Proceeding with submission...");
        submittingRef.current = true;
        setIsSubmitting(true);
        
        try {
            const currentAnswers = answersRef.current;
            const response = await fetch(`${API_BASE}/api/assessment/aptitude/attempts/${attemptToken}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers: currentAnswers }),
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => "Unknown error");
                
                // If the attempt is already submitted, it's likely a duplicate request that succeeded first
                if (response.status === 400 && errorText.includes('already submitted')) {
                    console.warn('Attempt already submitted — performing hard redirect');
                    await clearSession();
                    setShowSubmitModal(false);
                    // Use window.location.href for a guaranteed redirect even if router state is stale
                    if (mode === 'trial') {
                        window.location.href = '/assessment';
                    } else {
                        window.location.href = '/dashboard?completed=aptitude';
                    }
                    return;
                }

                console.error("Submit API Error:", response.status, errorText);
                throw new Error(`Submit failed: ${response.status} - ${errorText}`);
            }

            console.log("Aptitude: Submission API success (200), clearing session...");
            const result = await response.json();
            // Clear cache after successful submission
            setShowSubmitModal(false);
            await Promise.resolve(onComplete(result));
            await clearSession();
            // Guarantee post-submit navigation even if parent callback does not route.
            if (mode === 'trial') {
                window.location.href = '/assessment';
            } else {
                window.location.href = '/dashboard?completed=aptitude';
            }
        } catch (error) {
            const message = (error as Error)?.message || "";
            const isNetworkFailure =
                error instanceof TypeError ||
                /failed to fetch|networkerror|err_connection_refused/i.test(message);
            const isSandboxMode = process.env.NEXT_PUBLIC_RAZORPAY === "false";

            if (isSandboxMode && isNetworkFailure) {
                // Frontend-only fallback: complete locally so UI/demo flow can continue.
                const answeredCount = Object.keys(answersRef.current).length;
                const totalQuestions = questions.length || answeredCount;
                const localReviews = questions.map((question, index) => {
                    const selectedOptionId = answersRef.current[question.id] ?? null;
                    const selectedOption = question.options.find((option) => option.id === selectedOptionId);
                    return {
                        questionId: question.id,
                        displayOrder: index + 1,
                        category: question.category,
                        type: "mcq",
                        questionText: question.text,
                        options: question.options.map((option) => ({ id: option.id, text: option.text })),
                        selectedOptionId,
                        selectedAnswerText: selectedOption?.text ?? null,
                        correctOptionId: null,
                        correctAnswerText: null,
                        isCorrect: null,
                        status: selectedOptionId ? "subjective" : "unanswered",
                    };
                });
                const fallbackResult: AttemptSubmitResult = {
                    totalScore: 0,
                    overallScorePercent: 0,
                    positiveScore: 0,
                    negativeScore: 0,
                    correctCount: 0,
                    wrongCount: 0,
                    answeredCount,
                    skippedCount: Math.max(0, totalQuestions - answeredCount),
                    totalQuestions,
                    timeTakenSeconds: Math.max(1, totalTime - timeLeft),
                    sections: [{ name: "Overall", score: 0, weight: "0/0", percentage: 0 }],
                    questionReviews: localReviews,
                    status: "submitted",
                };
                await clearSession();
                setShowSubmitModal(false);
                await Promise.resolve(onComplete(fallbackResult));
                return;
            }

            console.error("Aptitude: Submission caught error:", error);
            // Only allow retry if it wasn't an "already submitted" error
            // (which would have returned early above)
            submittingRef.current = false;
            setShowSubmitModal(false);
            setLoadError((error as Error).message);
        } finally {
            console.log("Aptitude: Submission finally block.");
            setIsSubmitting(false);
        }
    }, [attemptToken, clearSession, mode, onComplete, questions.length, timeLeft, totalTime]);

    useEffect(() => {
        if (isLoading || !attemptToken) return;
        if (timeLeft <= 0) {
            setShowSubmitModal(false);
            handleSubmitAttempt();
            return;
        }

        const timer = window.setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => window.clearInterval(timer);
    }, [attemptToken, handleSubmitAttempt, isLoading, timeLeft]);

    const navigatorQuestions: NavigatorQuestion[] = questions.map((question, index) => {
        const isAnswered = !!answers[question.id];
        const isMarked = markedForReview.has(question.id);
        const locked = isQuestionLocked(index);

        let state: QuestionState = locked ? "locked" : "unanswered";
        if (!locked && isAnswered) state = "answered";
        if (!locked && isMarked) state = "marked";

        return {
            id: question.id,
            number: index + 1,
            state,
            category: question.category,
            isAnswered: !locked && isAnswered,
            isMarked: !locked && isMarked,
            isLocked: locked,
            blockNumber: Math.floor(index / QUESTIONS_PER_BLOCK) + 1,
        };
    });

    const handleOptionSelect = (optionId: string) => {
        const question = currentQuestion;
        const kind = question.kind || question.metadata?.kind || 'mcq';

        let newAnswer: string | string[];

        if (kind === 'msq') {
            const currentVal = answers[question.id];
            let selectedIds: string[] = Array.isArray(currentVal) ? currentVal : (currentVal ? [currentVal as string] : []);
            
            if (selectedIds.includes(optionId)) {
                selectedIds = selectedIds.filter(id => id !== optionId);
            } else {
                selectedIds = [...selectedIds, optionId];
            }
            newAnswer = selectedIds;
        } else {
            // MCQ or TF
            newAnswer = optionId;
        }

        const newAnswers = { ...answers, [currentQuestion.id]: newAnswer };
        setAnswers(newAnswers);
        // Persist to cache immediately
        cacheSaveAnswer(currentQuestion.id, { optionId: newAnswer as any });

        if (kind === 'msq') {
            const selectedIds = newAnswer as string[];
            if (selectedIds.length === 0) {
                persistAnswer(currentQuestion.id, null);
            } else {
                persistAnswer(currentQuestion.id, { optionId: selectedIds });
            }
        } else {
            persistAnswer(currentQuestion.id, { optionId: newAnswer });
        }
    };

    const handleNumericalChange = (value: string) => {
        const newAnswers = { ...answers, [currentQuestion.id]: value };
        setAnswers(newAnswers);
        // Persist to cache immediately
        cacheSaveAnswer(currentQuestion.id, { optionId: value as any });
        persistAnswer(currentQuestion.id, { optionId: value });
    };

    const handleClear = () => {
        const newAnswers = { ...answers };
        delete newAnswers[currentQuestion.id];
        setAnswers(newAnswers);
        // Remove from cache
        cacheSaveAnswer(currentQuestion.id, {});
        persistAnswer(currentQuestion.id, null);
    };

    const handleMarkReview = () => {
        const newMarked = new Set(markedForReview);
        if (newMarked.has(currentQuestion.id)) {
            newMarked.delete(currentQuestion.id);
        } else {
            newMarked.add(currentQuestion.id);
        }
        setMarkedForReview(newMarked);
        // Persist navigation state
        cacheSaveNavigation(currentIndex, [...newMarked], timeLeft);
    };

    const handleNext = () => {
        if (!isLastQuestion) {
            const nextIndex = currentIndex + 1;
            // Don't navigate into a locked question
            if (isQuestionLocked(nextIndex)) return;
            setCurrentIndex(nextIndex);
            cacheSaveNavigation(nextIndex, [...markedForReview], timeLeft);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            setCurrentIndex(prevIndex);
            cacheSaveNavigation(prevIndex, [...markedForReview], timeLeft);
        }
    };

    const handleSubmit = () => {
        setShowSubmitModal(true);
    };

    const confirmSubmit = () => {
        handleSubmitAttempt();
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f6f8f5] dark:bg-[#0f1712] transition-colors duration-500">
                <Logo className="h-12 w-auto mb-8" />
                <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
            </div>
        );
    }

    if (isSubmitting) {
        return (
            <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f6f8f5] dark:bg-[#0f1712] transition-colors duration-500">
                <Logo className="h-12 w-auto mb-8" />
                <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
                <p className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">Submitting your assessment...</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Please do not close this window or refresh the page.</p>
            </div>
        );
    }

    if (isRedirecting) {
        return (
            <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f6f8f5] dark:bg-[#0f1712] transition-colors duration-500">
                <Logo className="h-12 w-auto mb-8" />
                <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
                <p className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">Redirecting to adaptive assessment...</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Please keep this tab open.</p>
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
        <AssessmentPluginHost packageSlug="aptitude" tabSwitchLimit={proctoringSettings.tabSwitchLimit}>
        <div className="relative min-h-screen w-full overflow-hidden bg-[#f6f8f5] font-sans text-[#17201b] transition-colors duration-500 dark:bg-[#0f1712] dark:text-white">
            <div className="absolute inset-0 assessment-aptitude-bg" aria-hidden="true" />
            <div className="absolute inset-0 assessment-grid opacity-35" aria-hidden="true" />

            {/* Hand-rolled rules (right-click, copy-paste, browser-shortcuts,
                fullscreen, mouse-leave). The settings are derived from the
                package's tab_switch_limit / anti_copy_enabled columns.
                Tab-switch itself is owned by the `proctoring.tab-switch`
                plugin mounted through AssessmentPluginHost above; this hook
                no longer duplicates that concern. As more rules graduate to
                plugins, this host shrinks. */}
            <ProctoringHost
                settings={proctoringSettings}
                active={!isLoading && !isSubmitting && questions.length > 0}
            />

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
                        <RotateCw className="h-4 w-4 animate-spin-once" />
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
                            <p className="text-[10px] font-bold text-brand-green uppercase tracking-wider">Aptitude Assessment</p>
                            {mode === 'trial' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    Trial Test
                                </span>
                            )}
                        </div>
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

                {/* Question Area */}
                <section className="flex-1 flex min-h-[600px] min-w-0 flex-col rounded-xl border border-brand-green/15 bg-white shadow-sm dark:border-white/10 dark:bg-[#111a15] lg:min-h-0 lg:overflow-hidden transition-all duration-300">
                    {/* Top Progress Bar */}
                    <div className="h-1 w-full bg-brand-green/5">
                        <div 
                            className="h-full bg-brand-green transition-all duration-700 ease-out" 
                            style={{ width: `${safeProgress}%` }}
                        />
                    </div>
                    <div className="border-b border-brand-green/5 p-3 sm:px-5 sm:py-2.5 dark:border-white/10">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

                        {(currentQuestion.kind === 'numerical' || currentQuestion.metadata?.kind === 'numerical') && (
                            <div className="mt-4 px-1">
                                <p className="text-[10px] font-bold italic text-[#17201b] dark:text-white">
                                    * Note: Only exact numerical matches will be considered correct. Space is not allowed.
                                </p>
                            </div>
                        )}

                        {(() => {
                            const kind = currentQuestion.kind || currentQuestion.metadata?.kind || 'mcq';
                            const currentAnswer = answers[currentQuestion.id];

                            switch (kind) {
                                case 'numerical':
                                    return (
                                        <NumericalQuestion
                                            questionId={currentQuestion.id}
                                            value={currentAnswer as string || ""}
                                            onChange={handleNumericalChange}
                                        />
                                    );
                                case 'msq':
                                    return (
                                        <MsqQuestion
                                            options={currentQuestion.options}
                                            selectedOptionIds={Array.isArray(currentAnswer) ? currentAnswer : (currentAnswer ? [currentAnswer as string] : [])}
                                            onToggle={handleOptionSelect}
                                            labelForIndex={labelForIndex}
                                        />
                                    );
                                case 'tf':
                                    return (
                                        <TfQuestion
                                            options={currentQuestion.options}
                                            selectedOptionId={currentAnswer as string || null}
                                            onSelect={handleOptionSelect}
                                            labelForIndex={labelForIndex}
                                        />
                                    );
                                case 'mcq':
                                default:
                                    return (
                                        <McqQuestion
                                            options={currentQuestion.options}
                                            selectedOptionId={currentAnswer as string || null}
                                            onSelect={handleOptionSelect}
                                            labelForIndex={labelForIndex}
                                        />
                                    );
                            }
                        })()}
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

                {/* Sidebar (Desktop only) */}
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
                                if (!isQuestionLocked(idx)) setCurrentIndex(idx);
                            }}
                            progressPercent={safeProgress}
                            isCollapsed={!isDesktopSidebarOpen}
                            totalQuestions={totalQuestions}
                            questionsPerBlock={QUESTIONS_PER_BLOCK}
                            currentBlockNumber={Math.floor(unlockedUpTo / QUESTIONS_PER_BLOCK) + 1}
                            totalBlocks={Math.ceil(totalQuestions / QUESTIONS_PER_BLOCK)}
                        />
                    </div>
                </motion.aside>
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
                                            if (!isQuestionLocked(idx)) {
                                                setCurrentIndex(idx);
                                                setIsSidebarOpen(false);
                                            }
                                        }}
                                        progressPercent={safeProgress}
                                        totalQuestions={totalQuestions}
                                        questionsPerBlock={QUESTIONS_PER_BLOCK}
                                        currentBlockNumber={Math.floor(unlockedUpTo / QUESTIONS_PER_BLOCK) + 1}
                                        totalBlocks={Math.ceil(totalQuestions / QUESTIONS_PER_BLOCK)}
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
                            <p className="mt-2 text-sm text-[#17201b] dark:text-white">Review your assessment summary before finalizing your submission.</p>

                            <div className="mt-4 flex items-center gap-2 rounded-full border border-brand-green/10 bg-brand-green/[0.03] px-4 py-1.5 dark:border-white/5 dark:bg-white/5">
                                <div className="h-2 w-2 rounded-full bg-brand-green" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-green">
                                    Time Remaining: {formatTime(timeLeft)}
                                </span>
                            </div>
                            
                            {/* Summary Cards */}
                            <div className="mt-8 grid w-full grid-cols-3 gap-4">
                                <div className="flex flex-col items-center rounded-xl bg-brand-green/[0.05] p-4 border border-brand-green/10">
                                    <span className="text-xl font-black text-brand-green">{navigatorQuestions.filter(q => q.isAnswered).length}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-green">Answered</span>
                                </div>
                                <div className="flex flex-col items-center rounded-xl bg-amber-400/[0.05] p-4 border border-amber-400/10">
                                    <span className="text-xl font-black text-amber-500">{navigatorQuestions.filter(q => q.isMarked).length}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Review</span>
                                </div>
                                <div className="flex flex-col items-center rounded-xl bg-slate-100 p-4 border border-slate-200 dark:bg-white/[0.03] dark:border-white/10">
                                    <span className="text-xl font-black text-[#17201b] dark:text-white">{navigatorQuestions.filter(q => !q.isAnswered && !q.isLocked).length}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#17201b] dark:text-white">Left</span>
                                </div>
                            </div>

                            {navigatorQuestions.some(q => !q.isAnswered && !q.isLocked) && (() => {
                                const missed = navigatorQuestions
                                    .filter(q => !q.isAnswered && !q.isLocked)
                                    .map(q => q.number);
                                return (
                                    <div className="mt-6 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4 text-left">
                                        <p className="text-sm font-black text-[#17201b] dark:text-white leading-relaxed">
                                            You have not answered {missed.length === 1 ? 'question' : 'questions'}{' '}
                                            <span className="font-black text-red-600 dark:text-red-400">
                                                {missed.join(', ')}
                                            </span>
                                            . Please complete {missed.length === 1 ? 'it' : 'all of them'} before submitting.
                                        </p>
                                    </div>
                                );
                            })()}

                            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => setShowSubmitModal(false)}
                                    disabled={isSubmitting}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#17201b]/10 bg-white py-3.5 text-sm font-bold text-[#17201b] transition hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Review Answers
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmSubmit}
                                    disabled={isSubmitting}
                                    className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-green py-3.5 text-sm font-bold text-white transition-all hover:bg-[#19be5e] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Submitting...</span>
                                        </>
                                    ) : (
                                        <>
                                            Yes, Submit Test
                                            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Back Navigation Interception Warning Modal */}
            {showBackWarningModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-[#0f1712]/60 backdrop-blur-[2px]" 
                        onClick={() => setShowBackWarningModal(false)}
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        className="relative w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl transition-all dark:border-white/[0.08] dark:bg-[#19211C]"
                    >
                        <div className="relative flex flex-col items-center text-center">
                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500 text-white">
                                <AlertCircle size={28} />
                            </div>
                            
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Leave Assessment?</h2>
                            <p className="mt-2.5 text-xs text-slate-500 dark:text-gray-400 font-medium leading-relaxed">
                                Your progress has been securely saved. You can return and continue your assessment exactly where you left off, as long as the timer does not run out.
                            </p>

                            <div className="mt-6 flex w-full flex-col gap-2.5 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowBackWarningModal(false);
                                        // Use window.location to completely clear SPA state and history hooks cleanly
                                        window.location.href = "/assessment";
                                    }}
                                    className="flex-1 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-700 border border-slate-200 dark:border-white/[0.08] dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all cursor-pointer text-center"
                                >
                                    Yes, Exit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowBackWarningModal(false)}
                                    className="flex-1 px-5 py-3 rounded-xl bg-brand-green text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1bb85c] active:scale-95 transition-all cursor-pointer text-center"
                                >
                                    Resume Test
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
        </AssessmentPluginHost>
    );
};

export default AptitudeEngine;

