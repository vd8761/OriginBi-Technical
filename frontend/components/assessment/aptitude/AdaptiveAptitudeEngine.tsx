import React, { useCallback, useEffect, useRef, useState } from "react";
import Logo from "../../ui/Logo";
import ThemeToggle from "../../ui/ThemeToggle";
import QuestionNavigator, { NavigatorQuestion, QuestionState } from "./QuestionNavigator";
import { AlertCircle, CheckCircle2, Flag, ArrowRight, X, ZoomIn, Search, PanelRightClose, PanelRightOpen, LayoutGrid, RotateCcw, Loader2, RotateCw, Lock, Unlock, TrendingUp, Check } from "lucide-react";
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
  readCandidateEmail,
  resolveProctoringForPackage,
  type ProctoringSettings,
} from "@/lib/proctoring";



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
      kind?: 'mcq' | 'msq' | 'tf';
      [key: string]: any;
  };
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
  status?: string;
  accuracy?: number;
  accuracyPct?: number;
  sections?: Array<Record<string, unknown>>;
  questionReviews?: Array<Record<string, unknown>>;
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

const API_BASE =
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "" : process.env.NEXT_PUBLIC_TECH_API_URL?.replace(/\/$/, "")) ||
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "";

const labelForIndex = (index: number) => String.fromCharCode(65 + index);

const AdaptiveAptitudeEngine: React.FC<AdaptiveAptitudeEngineProps> = ({
  onComplete,
  assessmentCode = "TECH_APT_001",
  userId,
  mode = 'main',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
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
  
  // Multi-block navigation state
  const [allBlocks, setAllBlocks] = useState<Map<number, BlockData>>(new Map());
  const [allAnswers, setAllAnswers] = useState<Record<string, string | string[]>>({});
  const [viewingBlockNumber, setViewingBlockNumber] = useState(1);
  const [isLoadingBlock, setIsLoadingBlock] = useState(false);
  const [proctoringSettings, setProctoringSettings] =
    useState<ProctoringSettings>(DEFAULT_PROCTORING);
  
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
        const blockNumber = Number(data.currentBlockNumber ?? 1);
        setAttemptToken(data.attemptToken);
        setCurrentBlock(data.currentBlock);
        setCurrentBlockNumber(blockNumber);
        setViewingBlockNumber(blockNumber);
        setTotalBlocks(data.totalBlocks ?? data.blockConfig?.blocksPerAssessment ?? 4);
        setQuestionsPerBlock(data.questionsPerBlock ?? data.blockConfig?.questionsPerBlock ?? 5);
        setBlockConfig(data.blockConfig);
        const duration = Number(data.durationSeconds ?? 3600);
        const timeLeftSeconds = Number(data.timeLeftSeconds ?? duration);
        setTimeLeft(timeLeftSeconds);
        setTotalTime(duration);
        
        // Store the current block in allBlocks map
        const blocksMap = new Map<number, BlockData>();
        blocksMap.set(blockNumber, data.currentBlock);
        setAllBlocks(blocksMap);

        if (Array.isArray(data.currentBlock?.questions)) {
          const restored = { ...allAnswers };
          data.currentBlock.questions.forEach((q: any) => {
            if (q.selectedOptionId) {
              restored[String(q.id)] = String(q.selectedOptionId);
            }
          });
          if (Object.keys(restored).length > 0) {
            setAllAnswers(restored);
            setAnswers(restored);
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

    initializeBlockAttempt();
  }, [assessmentCode, userId, mode, isCacheRestored, isRestoredFromCache]);

  // Pull per-package proctoring config off the admin assessment row. The
  // block-based attempt response doesn't carry this metadata today, so we
  // fetch the list and pick the aptitude package. Optional — defaults stand
  // if the fetch fails.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/assessment/admin/assessments`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const found = json?.data?.find(
          (a: { module_type?: string; assessment_code?: string }) =>
            a.module_type === "aptitude" || a.assessment_code === "aptitude",
        );
        if (found) {
          // Prefer the config frozen at the candidate's purchase time over the
          // live admin row, so a later admin edit never changes a scheduled exam.
          const effective = await fetchEffectiveAssessmentSettings(
            API_BASE,
            "aptitude",
            readCandidateEmail(),
          );
          setProctoringSettings(
            resolveProctoringForPackage(effective ? { ...found, ...effective } : found),
          );
        }
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Count answered questions in current viewing block
  const viewingBlock = allBlocks.get(viewingBlockNumber);
  const viewingBlockQuestions = viewingBlock?.questions || [];
  const answeredInViewingBlock = viewingBlockQuestions.filter(q => allAnswers[q.id] !== undefined).length;

  // Count answered questions in the CURRENT (highest unlocked) block — for unlock logic
  const currentBlockData = allBlocks.get(currentBlockNumber);
  const currentBlockQuestions = currentBlockData?.questions || [];
  const answeredInCurrentBlock = currentBlockQuestions.filter(q => allAnswers[q.id] !== undefined).length;
  const currentBlockTotal = currentBlockQuestions.length;

  // Overall answered across all unlocked blocks
  const totalUnlockedQuestions = (() => {
    let count = 0;
    for (let b = 1; b <= currentBlockNumber; b++) {
      const blk = allBlocks.get(b);
      if (blk) count += blk.questions.length;
    }
    return count;
  })();
  const answeredCount = Object.keys(allAnswers).length;

  // Progress % = answered out of the full assessment total (all blocks)
  const safeProgress = (totalBlocks * questionsPerBlock) > 0
    ? Math.round((answeredCount / (totalBlocks * questionsPerBlock)) * 100)
    : 0;

  const isLastQuestion = currentIndex === totalQuestions - 1;
  const currentQuestionId = currentQuestion?.id ?? "";
  const isQuestionAnswered = currentQuestion && allAnswers[currentQuestionId] !== undefined;
  const isQuestionMarked = currentQuestion && markedForReview.has(currentQuestionId);

  // Block is "completable" only when ALL questions in the CURRENT block are answered
  // AND the user is currently viewing the current block
  const isCurrentBlockFullyAnswered = currentBlockTotal > 0 && answeredInCurrentBlock === currentBlockTotal;
  const isViewingCurrentBlock = viewingBlockNumber === currentBlockNumber;

  // Calculate block accuracy — ratio of answered questions in the current block
  // (backend will compute real correctness; this is just for the adaptive engine hint)
  const calculateBlockAccuracy = () => {
    if (currentBlockTotal === 0) return 0;
    return answeredInCurrentBlock / currentBlockTotal;
  };

  // Complete current block and get next block
  // Skipped questions are allowed — the backend handles unanswered questions gracefully.
  const completeBlockAndProceed = async () => {
    if (!attemptToken || !currentBlock || isGeneratingNextBlock) return;

    setIsGeneratingNextBlock(true);
    try {
      const timeTaken = totalTime - timeLeft;

      // Only send answers for the current block
      const currentBlockAnswers: Record<string, string | string[]> = {};
      currentBlockQuestions.forEach(q => {
        if (allAnswers[q.id]) currentBlockAnswers[q.id] = allAnswers[q.id];
      });

      const response = await fetch(
        `${API_BASE}/api/assessment/aptitude/attempts/${attemptToken}/blocks/${currentBlockNumber}/next`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timeTaken,
            answers: currentBlockAnswers,
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => "Unknown error");
        throw new Error(`Failed to complete block: ${response.status} - ${errText}`);
      }

      const result = await response.json();

      if (!result.canProceed) {
        // All blocks done — submit
        await handleSubmitAttempt();
        return;
      }

      // Store next block
      const nextBlockNum = currentBlockNumber + 1;
      const updatedBlocks = new Map(allBlocks);
      updatedBlocks.set(nextBlockNum, result.nextBlock);
      setAllBlocks(updatedBlocks);

      // Mark current block as completed and advance
      setCompletedBlocks(prev => new Set([...prev, currentBlockNumber]));
      setBlockTransitions(prev => ({ ...prev, [currentBlockNumber]: result.nextBlockDifficulty }));

      setCurrentBlock(result.nextBlock);
      setCurrentBlockNumber(nextBlockNum);
      setViewingBlockNumber(nextBlockNum);
      setCurrentIndex(0);
    } catch (error) {
      setLoadError((error as Error).message);
    } finally {
      setIsGeneratingNextBlock(false);
    }
  };

  // Navigate to a specific block (for viewing/editing previous blocks)
  const navigateToBlock = async (blockNum: number): Promise<void> => {
    if (blockNum === viewingBlockNumber) return;
    if (blockNum > currentBlockNumber) return; // Can't view future blocks

    // Save current block answers to backend before switching
    await saveBlockAnswers(viewingBlockNumber);

    // Check if block is already loaded
    if (allBlocks.has(blockNum)) {
      const block = allBlocks.get(blockNum)!;
      setCurrentBlock(block);
      setViewingBlockNumber(blockNum);
      setCurrentIndex(0);
      return;
    }

    // Load block from backend
    setIsLoadingBlock(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/assessment/aptitude/attempts/${attemptToken}/blocks/${blockNum}/questions`
      );
      if (!response.ok) throw new Error('Failed to load block');

      const data = await response.json();
      const blockData: BlockData = {
        blockId: data.blockId || blockNum,
        blockNumber: data.blockNumber,
        questions: data.questions,
        difficulty: data.difficulty,
        timeLimit: data.timeLimit || 0,
        isAdaptive: true,
      };

      // Restore saved answers from backend into allAnswers
      const restoredAnswers = { ...allAnswers };
      data.questions.forEach((q: any) => {
        if (q.selectedOptionId) {
          restoredAnswers[q.id] = String(q.selectedOptionId);
        }
      });
      setAllAnswers(restoredAnswers);
      setAnswers(restoredAnswers);

      const updatedBlocks = new Map(allBlocks);
      updatedBlocks.set(blockNum, blockData);
      setAllBlocks(updatedBlocks);

      setCurrentBlock(blockData);
      setViewingBlockNumber(blockNum);
      setCurrentIndex(0);
    } catch (error) {
      setLoadError((error as Error).message);
    } finally {
      setIsLoadingBlock(false);
    }
  };

  // Save answers for a specific block to backend
  const saveBlockAnswers = async (blockNum: number, answersOverride?: Record<string, string | string[]>) => {
    if (!attemptToken) return;
    
    // Get answers for this block only
    const block = allBlocks.get(blockNum);
    if (!block) return;
    const source = answersOverride ?? allAnswers;
    const blockAnswers: Record<string, string | string[]> = {};
    block.questions.forEach(q => {
      if (source[q.id]) {
        blockAnswers[q.id] = source[q.id];
      }
    });
    
    if (Object.keys(blockAnswers).length === 0) return;
    
    try {
      await fetch(`${API_BASE}/api/assessment/aptitude/attempts/${attemptToken}/blocks/${blockNum}/answers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: blockAnswers }),
      });
    } catch (error) {
      console.error('Failed to save block answers:', error);
    }
  };

  // Handle block submission — allowed when viewing the current block (skipped questions are OK)
  const handleBlockSubmit = () => {
    if (isViewingCurrentBlock) {
      completeBlockAndProceed();
    }
  };

  // Handle final submission
  const handleSubmitAttempt = useCallback(async () => {
    if (!attemptToken || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/assessment/aptitude/attempts/${attemptToken}/submit-block-based`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: allAnswers }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Submit failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      setShowSubmitModal(false);
      onComplete(result);
      await clearSession();
    } catch (error) {
      setShowSubmitModal(false);
      setLoadError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [allAnswers, attemptToken, clearSession, isSubmitting, onComplete]);

  // Navigation handlers
  const handleOptionSelect = (optionId: string) => {
    if (!currentQuestion) return;
    const kind = currentQuestion.kind || currentQuestion.metadata?.kind || 'mcq';

    let newAnswer: string | string[];

    if (kind === 'msq') {
        const currentVal = allAnswers[currentQuestion.id];
        let selectedIds: string[] = Array.isArray(currentVal) ? currentVal : (currentVal ? [currentVal as string] : []);
        
        if (selectedIds.includes(optionId)) {
            selectedIds = selectedIds.filter(id => id !== optionId);
        } else {
            selectedIds = [...selectedIds, optionId];
        }
        newAnswer = selectedIds;
    } else {
        newAnswer = optionId;
    }

    const newAnswers = { ...answers, [currentQuestion.id]: newAnswer };
    setAllAnswers(newAnswers);
    setAnswers(newAnswers);
    cacheSaveAnswer(currentQuestion.id, { optionId: newAnswer as any });
    void saveBlockAnswers(viewingBlockNumber, newAnswers);
  };

  const handleClear = () => {
    if (!currentQuestion) return;
    const newAnswers = { ...allAnswers };
    delete newAnswers[currentQuestion.id];
    setAllAnswers(newAnswers);
    setAnswers(newAnswers);
    cacheSaveAnswer(currentQuestion.id, {});
    void saveBlockAnswers(viewingBlockNumber, newAnswers);
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
    if (isLastQuestion && isViewingCurrentBlock) {
      // On the last question of the current block — trigger block completion or final submit
      handleSubmit();
    } else if (!isLastQuestion) {
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
    if (!isViewingCurrentBlock) {
      // If viewing a previous block, return to current block first
      navigateToBlock(currentBlockNumber);
      return;
    }
    if (currentBlockNumber === totalBlocks) {
      setShowSubmitModal(true);
    } else {
      handleBlockSubmit();
    }
  };

  const confirmSubmit = () => {
    handleSubmitAttempt();
  };

  // Generate navigator questions for ALL unlocked blocks (with blockNumber tag)
  const navigatorQuestions: NavigatorQuestion[] = [];
  let globalIndex = 0;

  // Build a lookup: globalIndex → { blockNum, localIndex }
  const globalIndexMap: Array<{ blockNum: number; localIndex: number }> = [];

  for (let blockNum = 1; blockNum <= currentBlockNumber; blockNum++) {
    const block = allBlocks.get(blockNum);
    if (!block) continue;

    block.questions.forEach((question, localIndex) => {
      const isAnswered = !!allAnswers[question.id];
      const isMarked = markedForReview.has(question.id);

      let state: QuestionState = "unanswered";
      if (isAnswered) state = "answered";
      if (isMarked) state = "marked";

      navigatorQuestions.push({
        id: question.id,
        number: globalIndex + 1,
        state,
        category: question.category,
        isAnswered,
        isMarked,
        isLocked: false,
        blockNumber: blockNum,
      });

      globalIndexMap.push({ blockNum, localIndex });
      globalIndex++;
    });
  }

  // Compute the global index of the currently active question
  // (viewing block offset + local currentIndex)
  const viewingBlockStartGlobal = (() => {
    let offset = 0;
    for (let b = 1; b < viewingBlockNumber; b++) {
      const blk = allBlocks.get(b);
      if (blk) offset += blk.questions.length;
    }
    return offset;
  })();
  const globalCurrentIndex = viewingBlockStartGlobal + currentIndex;

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f6f8f5] dark:bg-[#0f1712] transition-colors duration-500">
        <Logo className="h-12 w-auto mb-8" />
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Initializing adaptive assessment...</p>
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
    <AssessmentPluginHost packageSlug="aptitude" tabSwitchLimit={proctoringSettings.tabSwitchLimit}>
    <div className="relative min-h-screen w-full overflow-hidden bg-[#f6f8f5] font-sans text-[#17201b] transition-colors duration-500 dark:bg-[#0f1712] dark:text-white">
      <div className="absolute inset-0 assessment-aptitude-bg" aria-hidden="true" />
      <div className="absolute inset-0 assessment-grid opacity-35" aria-hidden="true" />

      {/* Hand-rolled proctoring rules (right-click, copy-paste, etc.).
          Tab-switch is now owned by the proctoring.tab-switch plugin via
          AssessmentPluginHost above. */}
      <ProctoringHost
        settings={proctoringSettings}
        active={!isLoading && !isSubmitting && Boolean(currentBlock)}
      />

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

      {/* Block Progress Bar with Navigation */}
      <div className="sticky top-[72px] z-40 bg-white/95 dark:bg-[#0f1712]/95 backdrop-blur-md border-b border-brand-green/10 dark:border-white/10">
        <div className="px-4 py-3 md:px-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Block Progress</span>
            <span className="text-xs font-semibold text-brand-green">{currentBlockNumber}/{totalBlocks}</span>
          </div>
          <div className="flex gap-1 mb-3">
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
          
          {/* Block Navigation Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {Array.from({ length: currentBlockNumber }, (_, i) => i + 1).map((blockNum) => {
              const block = allBlocks.get(blockNum);
              const isActive = viewingBlockNumber === blockNum;
              const isCompleted = completedBlocks.has(blockNum);
              const isCurrent = blockNum === currentBlockNumber;
              
              return (
                <button
                  key={blockNum}
                  onClick={() => navigateToBlock(blockNum)}
                  disabled={isLoadingBlock}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-brand-green text-white shadow-md'
                      : isCompleted
                      ? 'bg-brand-green/20 text-brand-green hover:bg-brand-green/30 dark:bg-brand-green/10 dark:hover:bg-brand-green/20'
                      : isCurrent
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>Block {blockNum}</span>
                    {isCompleted && <CheckCircle2 className="h-3 w-3" />}
                    {isCurrent && !isCompleted && <span className="h-2 w-2 rounded-full bg-current animate-pulse" />}
                    {block && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        block.difficulty === 'easy' ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
                        block.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                        'bg-red-500/20 text-red-700 dark:text-red-300'
                      }`}>
                        {block.difficulty[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Viewing indicator if not on current block */}
          {!isViewingCurrentBlock && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3 w-3" />
              <span>Viewing Block {viewingBlockNumber} — You can edit answers here</span>
              <button
                onClick={() => navigateToBlock(currentBlockNumber)}
                className="ml-auto px-2 py-1 rounded bg-brand-green/20 hover:bg-brand-green/30 text-brand-green font-semibold"
              >
                Return to Block {currentBlockNumber}
              </button>
            </div>
          )}
        </div>
      </div>

      <main className="relative z-10 mx-auto flex max-w-[1440px] gap-4 lg:gap-5 px-4 py-4 lg:py-5 lg:h-[calc(100dvh-72px-60px)] lg:overflow-hidden lg:px-6">
        {/* Question Area */}
        <section className="flex-1 flex min-h-[600px] min-w-0 flex-col rounded-xl border border-brand-green/15 bg-white shadow-sm dark:border-white/10 dark:bg-[#111a15] lg:min-h-0 lg:overflow-hidden transition-all duration-300">
          {/* Top Progress Bar — shows current block progress */}
          <div className="h-1 w-full bg-brand-green/5">
            <div
              className="h-full bg-brand-green transition-all duration-700 ease-out"
              style={{
                width: `${
                  totalQuestions > 0
                    ? Math.round((answeredInViewingBlock / totalQuestions) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          
          <div className="border-b border-brand-green/5 p-3 sm:px-5 sm:py-2.5 dark:border-white/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[#17201b] dark:text-white uppercase tracking-wider">
                    {(currentQuestion?.category || 'Assessment')} Module
                    <span className="ml-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 normal-case">
                      Block {viewingBlockNumber} · Q{currentIndex + 1}/{totalQuestions}
                    </span>
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
                    {/* Block completion status */}
                    {isViewingCurrentBlock && (
                      <span className={`flex items-center gap-1 text-[10px] font-bold uppercase ${
                        isCurrentBlockFullyAnswered
                          ? 'text-brand-green'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        <div className="h-1 w-1 rounded-full bg-current" />
                        {answeredInCurrentBlock}/{currentBlockTotal} answered
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
            {/* Block complete banner — shown when on last question of current block */}
            {isViewingCurrentBlock && isLastQuestion && currentBlockNumber < totalBlocks && (
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-brand-green/30 bg-brand-green/10 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-green" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-brand-green">
                    Last question in Block {currentBlockNumber}
                  </p>
                  <p className="text-xs text-brand-green/70">
                    {answeredInCurrentBlock}/{currentBlockTotal} answered. Click &quot;Complete Block {currentBlockNumber}&quot; to unlock Block {currentBlockNumber + 1}.
                    {answeredInCurrentBlock < currentBlockTotal && (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">
                        ({currentBlockTotal - answeredInCurrentBlock} skipped — you can still proceed)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Viewing previous block notice */}
            {!isViewingCurrentBlock && (
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    Reviewing Block {viewingBlockNumber}
                  </p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
                    You can change answers here. Return to Block {currentBlockNumber} to continue.
                  </p>
                </div>
                <button
                  onClick={() => navigateToBlock(currentBlockNumber)}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition"
                >
                  Go to Block {currentBlockNumber}
                </button>
              </div>
            )}

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
                const kind = currentQuestion.kind || currentQuestion.metadata?.kind || 'mcq';
                const isSelected = kind === 'msq'
                    ? (Array.isArray(answers[currentQuestion.id]) && (answers[currentQuestion.id] as string[]).includes(option.id))
                    : allAnswers[currentQuestion.id] === option.id;

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
                        {kind === 'msq' ? (
                            isSelected ? <Check size={18} strokeWidth={3} /> : labelForIndex(index)
                        ) : labelForIndex(index)}
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
              <button
                type="button"
                onClick={handleNext}
                disabled={(isLastQuestion && isViewingCurrentBlock && (isGeneratingNextBlock || isSubmitting))}
                className="min-h-10 rounded-lg bg-brand-green px-7 text-sm font-bold text-white transition hover:bg-[#19be5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
              >
                {isLastQuestion && isViewingCurrentBlock && (isGeneratingNextBlock || isSubmitting) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isSubmitting ? 'Submitting...' : 'Unlocking next block...'}
                  </>
                ) : isLastQuestion && !isViewingCurrentBlock ? (
                  `Return to Block ${currentBlockNumber}`
                ) : isLastQuestion && currentBlockNumber === totalBlocks ? (
                  'Submit Assessment'
                ) : isLastQuestion && isViewingCurrentBlock ? (
                  'Next Block →'
                ) : (
                  'Save and next'
                )}
              </button>
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
              currentIndex={globalCurrentIndex}
              onSelect={async (globalIdx) => {
                // Map global index back to the correct block + local index
                const mapping = globalIndexMap[globalIdx];
                if (!mapping) return;
                const { blockNum, localIndex } = mapping;
                if (blockNum !== viewingBlockNumber) {
                  // Navigate to that block first, then set local index
                  await navigateToBlock(blockNum);
                  setCurrentIndex(localIndex);
                } else {
                  setCurrentIndex(localIndex);
                }
              }}
              progressPercent={safeProgress}
              isCollapsed={!isDesktopSidebarOpen}
              totalQuestions={totalBlocks * questionsPerBlock}
              questionsPerBlock={questionsPerBlock}
              currentBlockNumber={currentBlockNumber}
              totalBlocks={totalBlocks}
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
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg border border-brand-green/20 text-sm font-semibold text-[#17201b] dark:text-white hover:bg-brand-green/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-brand-green text-sm font-semibold text-white hover:bg-[#19be5e] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </AssessmentPluginHost>
  );
};

export default AdaptiveAptitudeEngine;
