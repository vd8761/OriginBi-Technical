import React, { useCallback, useEffect, useRef, useState } from "react";
import Logo from "../../ui/Logo";
import ThemeToggle from "../../ui/ThemeToggle";
import QuestionNavigator, { NavigatorQuestion, QuestionState } from "./QuestionNavigator";
import { AlertCircle, CheckCircle2, Flag, ArrowRight, X, ZoomIn, Search, PanelRightClose, PanelRightOpen, LayoutGrid, RotateCcw, Loader2, RotateCw, Lock, Unlock, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "@/lib/contexts/ThemeContext";
import TimerDisplay from "../shared/TimerDisplay";
import { SidebarOpenIcon, SidebarCloseIcon, SidebarMobileIcon } from "../shared/AssessmentIcons";
import { useAssessmentCache } from "@/lib/useAssessmentCache";

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
}

interface BlockConfig {
  enabled: boolean;
  blocksPerAssessment: number;
  questionsPerBlock: number;
}

interface BlockData {
  blockId: number;
  blockNumber: number;
  questions: Question[];
  difficulty: string;
  timeLimit: number;
  isAdaptive: boolean;
  nextBlockDifficulty?: string;
}

interface BlockAttemptResult {
  totalScore: number;
  positiveScore?: number;
  negativeScore?: number;
  correctCount: number;
  wrongCount: number;
  answeredCount?: number;
  totalQuestions?: number;
  timeTakenSeconds: number;
  status?: string;
  accuracy: number;
}

export type { BlockAttemptResult as AttemptSubmitResult };

interface AdaptiveAptitudeEngineProps {
  onComplete: (result: BlockAttemptResult) => void;
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const labelForIndex = (index: number) => String.fromCharCode(65 + index);

const AdaptiveAptitudeEngine: React.FC<AdaptiveAptitudeEngineProps> = ({
  onComplete,
  assessmentCode = "TECH_APT_001",
  userId,
  mode = 'main',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(3600);
  const [totalTime, setTotalTime] = useState(3600);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const { theme } = useTheme();
  
  // Block-based state
  const [currentBlock, setCurrentBlock] = useState<BlockData | null>(null);
  const [currentBlockNumber, setCurrentBlockNumber] = useState(1);
  const [totalBlocks, setTotalBlocks] = useState(4);
  const [questionsPerBlock, setQuestionsPerBlock] = useState(5);
  const [blockConfig, setBlockConfig] = useState<BlockConfig | null>(null);
  const [attemptToken, setAttemptToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRestoredBanner, setShowRestoredBanner] = useState(false);
  const [blockTransitions, setBlockTransitions] = useState<Record<number, string>>({});
  const [completedBlocks, setCompletedBlocks] = useState<Set<number>>(new Set());
  const [isGeneratingNextBlock, setIsGeneratingNextBlock] = useState(false);
  
  // Cache ref to prevent double-fetching
  const cacheRestoredRef = useRef(false);

  // Cache hook for block-based assessments
  const {
    cachedSession,
    isCacheRestored,
    isRestoredFromCache,
    saveAnswer: cacheSaveAnswer,
    saveNavigation: cacheSaveNavigation,
    clearSession,
  } = useAssessmentCache({
    token: attemptToken || '',
    module: 'aptitude',
    assessmentCode,
    questions: currentBlock?.questions || [],
    expiresAt: undefined,
    answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, { optionId: v }])),
    markedForReview: [...markedForReview],
    currentIndex,
    timeLeftSeconds: timeLeft,
  });

  // Restore session from cache
  useEffect(() => {
    if (!isCacheRestored || !isRestoredFromCache || !cachedSession || cacheRestoredRef.current) return;
    cacheRestoredRef.current = true;
    
    if (cachedSession.currentBlock) {
      setCurrentBlock(cachedSession.currentBlock);
    }
    if (cachedSession.currentBlockNumber) {
      setCurrentBlockNumber(cachedSession.currentBlockNumber);
    }
    if (cachedSession.blockConfig) {
      setBlockConfig(cachedSession.blockConfig);
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
    if (cachedSession.attemptToken) {
      setAttemptToken(cachedSession.attemptToken);
    }
    if (cachedSession.completedBlocks) {
      setCompletedBlocks(new Set(cachedSession.completedBlocks));
    }
    setShowRestoredBanner(true);
    setTimeout(() => setShowRestoredBanner(false), 5000);
  }, [isCacheRestored, isRestoredFromCache, cachedSession]);

  // Initialize block-based attempt
  useEffect(() => {
    if (!isCacheRestored) return;
    if (isRestoredFromCache || cacheRestoredRef.current) {
      setIsLoading(false);
      return;
    }

    const initializeBlockAttempt = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await fetch(`${API_BASE}/api/assessment/aptitude/attempts/block-based`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assessmentCode, userId, mode }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          throw new Error(`Failed to start block-based attempt: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        setAttemptToken(data.attemptToken);
        setCurrentBlock(data.currentBlock);
        setCurrentBlockNumber(1);
        setTotalBlocks(data.totalBlocks);
        setQuestionsPerBlock(data.questionsPerBlock);
        setBlockConfig(data.blockConfig);
        setTimeLeft(data.durationSeconds);
        setTotalTime(data.durationSeconds);
      } catch (error) {
        setLoadError((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeBlockAttempt();
  }, [assessmentCode, userId, mode, isCacheRestored, isRestoredFromCache]);

  // Timer management
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
  }, [attemptToken, isLoading, timeLeft]);

  const currentQuestion = currentBlock?.questions[currentIndex];
  const totalQuestions = currentBlock?.questions.length || 0;
  const answeredCount = Object.keys(answers).length;
  const safeProgress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const currentQuestionId = currentQuestion?.id ?? "";
  const isQuestionAnswered = currentQuestion && answers[currentQuestionId] !== undefined;
  const isQuestionMarked = currentQuestion && markedForReview.has(currentQuestionId);
  const isBlockCompleted = answeredCount === totalQuestions && totalQuestions > 0;

  // Calculate block accuracy
  const calculateBlockAccuracy = () => {
    if (totalQuestions === 0) return 0;
    // This would need real correct answers from backend
    return answeredCount / totalQuestions;
  };

  // Complete current block and get next block
  const completeBlockAndProceed = async () => {
    if (!attemptToken || !currentBlock || isGeneratingNextBlock) return;

    setIsGeneratingNextBlock(true);
    try {
      const accuracy = calculateBlockAccuracy();
      const timeTaken = (totalTime - timeLeft);

      const response = await fetch(`${API_BASE}/api/assessment/aptitude/attempts/${attemptToken}/blocks/${currentBlockNumber}/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accuracy,
          timeTaken,
          answers
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete block');
      }

      const result = await response.json();

      if (!result.canProceed) {
        // Assessment completed
        await handleSubmitAttempt();
        return;
      }

      // Load next block
      setCurrentBlock(result.nextBlock);
      setCurrentBlockNumber(currentBlockNumber + 1);
      setCurrentIndex(0);
      setAnswers({});
      setMarkedForReview(new Set());
      setCompletedBlocks(prev => new Set([...prev, currentBlockNumber]));
      setBlockTransitions(prev => ({
        ...prev,
        [currentBlockNumber]: result.nextBlockDifficulty
      }));
    } catch (error) {
      setLoadError((error as Error).message);
    } finally {
      setIsGeneratingNextBlock(false);
    }
  };

  // Handle block submission
  const handleBlockSubmit = () => {
    if (isBlockCompleted) {
      completeBlockAndProceed();
    }
  };

  // Handle final submission
  const handleSubmitAttempt = useCallback(async () => {
    console.log("🚀 Starting final submission...");
    if (!attemptToken || isSubmitting) return;
    setIsSubmitting(true);
    try {
      console.log("📤 Submitting to backend...");
      const response = await fetch(`${API_BASE}/api/assessment/aptitude/attempts/${attemptToken}/submit-block-based`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      console.log("📥 Response received:", response.status);
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Submit failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ Submission result:", result);
      
      console.log("🧹 Clearing session...");
      await clearSession();
      
      console.log("📞 Calling onComplete callback...");
      onComplete(result);
      console.log("✅ onComplete callback called successfully");
    } catch (error) {
      console.error("❌ Submission failed:", error);
      setLoadError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, attemptToken, clearSession, isSubmitting, onComplete]);

  // Navigation handlers
  const handleOptionSelect = (optionId: string) => {
    if (!currentQuestion) return;
    const newAnswers = { ...answers, [currentQuestion.id]: optionId };
    setAnswers(newAnswers);
    cacheSaveAnswer(currentQuestion.id, { optionId });
  };

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

  const handleNext = () => {
    if (!isLastQuestion) {
      const nextIndex = currentIndex + 1;
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
    if (currentBlockNumber === totalBlocks && isBlockCompleted) {
      setShowSubmitModal(true);
    } else if (isBlockCompleted) {
      handleBlockSubmit();
    }
  };

  const confirmSubmit = () => {
    setShowSubmitModal(false);
    handleSubmitAttempt();
  };

  // Direct test function to bypass everything and just redirect
  const testDirectRedirect = () => {
    console.log("🧪 Testing direct redirect...");
    const mockResult = {
      totalScore: 100,
      correctCount: 5,
      wrongCount: 0,
      accuracy: 1.0,
      timeTakenSeconds: 300
    };
    onComplete(mockResult);
  };

  // Generate navigator questions for current block
  const navigatorQuestions: NavigatorQuestion[] = (currentBlock?.questions || []).map((question, index) => {
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f6f8f5] dark:bg-[#0f1712] transition-colors duration-500">
        <Logo className="h-12 w-auto mb-8" />
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Initializing adaptive assessment...</p>
      </div>
    );
  }

  if (loadError || !currentBlock) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f6f8f5] px-4 dark:bg-[#0f1712] transition-colors duration-500">
        <p className="text-lg text-slate-500 dark:text-slate-400">
          Error loading assessment: {loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#f6f8f5] font-sans text-[#17201b] transition-colors duration-500 dark:bg-[#0f1712] dark:text-white">
      <div className="absolute inset-0 assessment-aptitude-bg" aria-hidden="true" />
      <div className="absolute inset-0 assessment-grid opacity-35" aria-hidden="true" />

      {/* Cache Restored Banner */}
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

      {/* Header with Block Progress */}
      <header className="assessment-header sticky top-0 z-50 flex min-h-[72px] items-center justify-between gap-4 px-4 py-4 backdrop-blur-md dark:border-b dark:border-white/5 md:px-6">
        <div className="flex min-w-0 items-center">
          <div className="hidden sm:block">
            <Logo className="h-7" />
          </div>
          <div className="mx-4 hidden h-8 w-px bg-slate-300 dark:bg-white/10 sm:block" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-brand-green uppercase tracking-wider">Adaptive Aptitude Assessment</p>
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-bold text-[#17201b] dark:text-white">
                Block {currentBlockNumber} of {totalBlocks}
              </h1>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                currentBlock.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                currentBlock.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {currentBlock.difficulty}
              </span>
              {currentBlock.isAdaptive && (
                <TrendingUp className="h-4 w-4 text-brand-green" />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TimerDisplay time={timeLeft} total={totalTime} theme={theme} />
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

      {/* Block Progress Bar */}
      <div className="sticky top-[72px] z-40 bg-white/95 dark:bg-[#0f1712]/95 backdrop-blur-md border-b border-brand-green/10 dark:border-white/10">
        <div className="px-4 py-3 md:px-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Block Progress</span>
            <span className="text-xs font-semibold text-brand-green">{currentBlockNumber}/{totalBlocks}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalBlocks }, (_, i) => i + 1).map((blockNum) => (
              <div
                key={blockNum}
                className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                  blockNum < currentBlockNumber
                    ? 'bg-brand-green'
                    : blockNum === currentBlockNumber
                    ? 'bg-brand-green'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <main className="relative z-10 mx-auto flex max-w-[1440px] gap-4 lg:gap-5 px-4 py-4 lg:py-5 lg:h-[calc(100dvh-72px-60px)] lg:overflow-hidden lg:px-6">
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
                    {currentQuestion?.category || 'Assessment'} Module
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
                {currentQuestion?.text || 'Loading question...'}
              </h2>
              {currentQuestion?.imageUrl && (
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
              {currentQuestion?.options?.map((option, index) => {
                const isSelected = currentQuestion ? answers[currentQuestion.id] === option.id : false;

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
                      {labelForIndex(index)}
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
                  disabled={!isBlockCompleted || isGeneratingNextBlock}
                  className="min-h-10 rounded-lg bg-brand-green px-7 text-sm font-bold text-white transition hover:bg-[#19be5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGeneratingNextBlock ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating Next Block...
                    </>
                  ) : currentBlockNumber === totalBlocks ? (
                    'Submit Assessment'
                  ) : (
                    'Complete Block'
                  )}
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
                setCurrentIndex(idx);
              }}
              progressPercent={safeProgress}
              isCollapsed={!isDesktopSidebarOpen}
            />
          </div>
        </motion.aside>
      </main>

      {/* Submit Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111a15] rounded-2xl p-6 max-w-md w-full mx-4 border border-brand-green/20"
            >
              <h3 className="text-lg font-bold text-[#17201b] dark:text-white mb-4">
                Submit Assessment
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Are you sure you want to submit your assessment? You cannot change your answers after submission.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-lg border border-brand-green/20 text-sm font-semibold text-[#17201b] dark:text-white hover:bg-brand-green/10"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-brand-green text-sm font-semibold text-white hover:bg-[#19be5e] disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdaptiveAptitudeEngine;
