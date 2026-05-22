"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Loader2, TrendingUp, TrendingDown, Minus, ArrowRight,
  CheckCircle2, AlertCircle, ZoomIn, X, Check,
} from "lucide-react";
import { useTheme } from "@/lib/contexts/ThemeContext";
import Logo from "../../ui/Logo";
import ThemeToggle from "../../ui/ThemeToggle";
import TimerDisplay from "../shared/TimerDisplay";
import { SidebarOpenIcon, SidebarCloseIcon, SidebarMobileIcon } from "../shared/AssessmentIcons";
import QuestionNavigator, { NavigatorQuestion, QuestionState } from "./QuestionNavigator";
import { NumericalQuestion } from "./question-types/NumericalQuestion";
import {
  generateBlock, completeBlock, saveBlockAnswers, getBlockQuestions,
  submitAssessment, getAttemptStatus,
  type BlockResponse, type BlockMetrics,
  type Difficulty, type AdaptiveFinalReport,
} from "@/lib/adaptiveApi";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BlockState {
  block: BlockResponse;
  snapshotTaken: boolean;
  metrics: BlockMetrics | null;
  nextDifficulty: Difficulty | null;
}

export interface AdaptiveV2Props {
  assessmentId: number;
  userId: number;
  attemptToken: string;
  mode?: "trial" | "main";
  onComplete: (report: AdaptiveFinalReport) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatTime = (s: number) => {
  const safe = Math.max(0, s);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const sec = safe % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const difficultyColor = (d: Difficulty) => ({
  easy:   "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  hard:   "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
}[d]);

const difficultyIcon = (d: Difficulty) => {
  if (d === "easy")   return <TrendingDown className="h-3 w-3" />;
  if (d === "medium") return <Minus className="h-3 w-3" />;
  return <TrendingUp className="h-3 w-3" />;
};

const labelForIndex = (i: number) => String.fromCharCode(65 + i);

// ── Component ─────────────────────────────────────────────────────────────────

const AdaptiveEngineV2: React.FC<AdaptiveV2Props> = ({
  assessmentId, userId, attemptToken, mode = "main", onComplete,
}) => {
  const { theme } = useTheme();

  // ── State ──────────────────────────────────────────────────────────────────
  const [blocks, setBlocks] = useState<Map<number, BlockState>>(new Map());
  const [currentBlockNum, setCurrentBlockNum] = useState(1);
  const [viewingBlockNum, setViewingBlockNum] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalBlocks, setTotalBlocks] = useState(4);
  const [totalQuestionCount, setTotalQuestionCount] = useState(0);
  const [questionsPerBlock, setQuestionsPerBlock] = useState(5);

  // answers: all answers across all blocks { questionId → answer }
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  // per-question timing { questionId → seconds }
  const [questionTiming, setQuestionTiming] = useState<Record<string, number>>({});
  const questionStartRef = useRef<Record<string, number>>({});

  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(7200);
  const [totalTime, setTotalTime] = useState(7200);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const hasInitializedRef = useRef(false); // prevents double-init in React StrictMode
  const handleFinalSubmitRef = useRef<() => Promise<void>>(async () => {});
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);
  const [isLoadingBlock, setIsLoadingBlock] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  // ── Derived ────────────────────────────────────────────────────────────────
  const viewingBlockState = blocks.get(viewingBlockNum);
  const currentBlockState = blocks.get(currentBlockNum);
  const viewingQuestions = viewingBlockState?.block.questions ?? [];
  const currentQuestion = viewingQuestions[currentIndex];
  const currentQuestionId = currentQuestion?.id;
  const isViewingCurrentBlock = viewingBlockNum === currentBlockNum;
  const isLastQuestion = currentIndex === viewingQuestions.length - 1;
  const isLastBlock = currentBlockState?.block.isLastBlock ?? false;

  const applyAssessmentTotals = useCallback((block: Pick<BlockResponse, "totalBlocks" | "totalQuestions" | "questionsPerBlock" | "questions">) => {
    const blockCount = Math.max(1, Number(block.totalBlocks ?? totalBlocks));
    const perBlock = Math.max(1, Number(block.questionsPerBlock ?? block.questions.length ?? questionsPerBlock));
    const total = Math.max(block.questions.length, Number(block.totalQuestions ?? blockCount * perBlock));

    setTotalBlocks(blockCount);
    setQuestionsPerBlock(perBlock);
    setTotalQuestionCount(total);
  }, [questionsPerBlock, totalBlocks]);

  // ── Question timing ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentQuestionId) return;
    questionStartRef.current[currentQuestionId] = Date.now();
  }, [currentQuestionId]);

  const recordQuestionTime = useCallback((qId: string) => {
    const start = questionStartRef.current[qId];
    if (!start) return;
    const elapsed = Math.round((Date.now() - start) / 1000);
    setQuestionTiming(prev => ({
      ...prev,
      [qId]: (prev[qId] ?? 0) + elapsed,
    }));
    delete questionStartRef.current[qId];
  }, []);

  // ── Initialize: load block 1 ───────────────────────────────────────────────
  useEffect(() => {
    // Guard against React StrictMode double-invocation and any accidental re-runs
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const init = async () => {
      try {
        setIsLoading(true);
        // Check if block 1 already exists (resume)
        const status = await getAttemptStatus(attemptToken).catch(() => null);
        const existingBlock1 = status?.blocks.find(b => b.blockNumber === 1);

        let block1: BlockResponse;
        if (existingBlock1 && existingBlock1.status !== "not_started") {
          // Resume: load existing block 1 questions
          const data = await getBlockQuestions(attemptToken, 1);
          const totalBlockCount = data.totalBlocks ?? status?.blocks.length ?? 4;
          block1 = {
            blockId: 0,
            blockNumber: 1,
            totalBlocks: totalBlockCount,
            totalQuestions: data.totalQuestions,
            questionsPerBlock: data.questionsPerBlock,
            difficulty: data.difficulty,
            questions: data.questions,
            totalBlockMarks: data.questions.reduce((s, q) => s + q.marks, 0),
            timeLimitSeconds: data.questions.reduce((s, q) => s + q.expectedTimeSecs, 0),
            isLastBlock: data.blockNumber === totalBlockCount,
            coverageMap: {},
          };
          // Collect block 1 saved answers (will be merged with resume block answers below)
          const restored: Record<string, string | string[]> = {};
          data.questions.forEach(q => {
            if (q.selectedOptionId) restored[q.id] = q.selectedOptionId;
          });

          // Determine current block from status
          const lastCompleted = status?.blocks.filter(b => b.snapshotTaken).length ?? 0;
          const resumeBlock = Math.min(lastCompleted + 1, totalBlockCount);

          // Pre-load the resume block if it's not block 1 — do this BEFORE any setState
          // so the blocks Map is fully populated before isLoading becomes false.
          let finalBlocksMap: Map<number, BlockState>;
          const finalAnswers: Record<string, string | string[]> = { ...restored };

          if (resumeBlock > 1) {
            try {
              const resumeData = await getBlockQuestions(attemptToken, resumeBlock);
              const resumeBlockResp: BlockResponse = {
                blockId: 0,
                blockNumber: resumeBlock,
                totalBlocks: resumeData.totalBlocks ?? totalBlockCount,
                totalQuestions: resumeData.totalQuestions ?? data.totalQuestions,
                questionsPerBlock: resumeData.questionsPerBlock ?? data.questionsPerBlock,
                difficulty: resumeData.difficulty,
                questions: resumeData.questions,
                totalBlockMarks: resumeData.questions.reduce((s, q) => s + q.marks, 0),
                timeLimitSeconds: resumeData.questions.reduce((s, q) => s + q.expectedTimeSecs, 0),
                isLastBlock: resumeBlock === totalBlockCount,
                coverageMap: {},
              };
              resumeData.questions.forEach(q => {
                if (q.selectedOptionId) finalAnswers[q.id] = q.selectedOptionId;
              });
              finalBlocksMap = new Map([
                [1, { block: block1, snapshotTaken: true, metrics: null, nextDifficulty: null }],
                [resumeBlock, { block: resumeBlockResp, snapshotTaken: resumeData.snapshotTaken, metrics: null, nextDifficulty: resumeData.nextBlockDifficulty }],
              ]);
            } catch {
              // Non-fatal — resume block will load on demand; fall back to block 1 view
              finalBlocksMap = new Map([[1, { block: block1, snapshotTaken: true, metrics: null, nextDifficulty: null }]]);
            }
          } else {
            finalBlocksMap = new Map([[1, { block: block1, snapshotTaken: false, metrics: null, nextDifficulty: null }]]);
          }

          // Determine which block to actually view: if resumeBlock isn't in the map
          // (load failed), fall back to block 1 so viewingBlockState is never undefined.
          const safeViewBlock = finalBlocksMap.has(resumeBlock) ? resumeBlock : 1;

          // Commit all state in one batch — blocks Map is ready before isLoading → false
          setAnswers(finalAnswers);
          setBlocks(finalBlocksMap);
          setCurrentBlockNum(resumeBlock);
          setViewingBlockNum(safeViewBlock);
          applyAssessmentTotals(block1);
        } else {
          // Fresh start: generate block 1
          block1 = await generateBlock({
            assessmentId, blockNumber: 1, userId, mode, attemptToken,
          });
          applyAssessmentTotals(block1);
          setBlocks(new Map([[1, { block: block1, snapshotTaken: false, metrics: null, nextDifficulty: null }]]));
        }
        // Use assessment's total_time_minutes if available, otherwise estimate from block 1
        // Store per-block time limits and sum them as blocks are generated
        const estimatedTotalSecs = block1.timeLimitSeconds * block1.totalBlocks;
        setTimeLeft(estimatedTotalSecs);
        setTotalTime(estimatedTotalSecs);
      } catch (e) {
        setLoadError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading || isSubmittingRef.current) return;
    if (timeLeft <= 0) { handleFinalSubmitRef.current(); return; }
    const t = setInterval(() => setTimeLeft(p => {
      if (p <= 1) { clearInterval(t); handleFinalSubmitRef.current(); return 0; }
      return p - 1;
    }), 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // ── Answer selection ───────────────────────────────────────────────────────
  const handleOptionSelect = (optionId: string) => {
    if (!currentQuestion) return;
    const kind = currentQuestion.kind;
    let newAnswer: string | string[];

    if (kind === "msq") {
      const cur = answers[currentQuestion.id];
      let sel: string[] = Array.isArray(cur) ? cur : (cur ? [cur as string] : []);
      sel = sel.includes(optionId) ? sel.filter(x => x !== optionId) : [...sel, optionId];
      newAnswer = sel;
    } else {
      newAnswer = optionId;
    }

    setAnswers(prev => ({ ...prev, [currentQuestion.id]: newAnswer }));

    // Auto-save to backend (fire-and-forget) for post-snapshot blocks
    const bs = blocks.get(viewingBlockNum);
    if (bs?.snapshotTaken) {
      saveBlockAnswers({ attemptToken, blockNumber: viewingBlockNum, answers: { [currentQuestion.id]: newAnswer } })
        .catch(console.error);
    }
  };

  const handleNumericalChange = (value: string) => {
    if (!currentQuestion) return;
    const cleanValue = value.replace(/\s/g, "");
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: cleanValue }));

    // Auto-save to backend (fire-and-forget) for post-snapshot blocks
    const bs = blocks.get(viewingBlockNum);
    if (bs?.snapshotTaken) {
      saveBlockAnswers({ attemptToken, blockNumber: viewingBlockNum, answers: { [currentQuestion.id]: cleanValue } })
        .catch(console.error);
    }
  };

  const handleClear = () => {
    if (!currentQuestion) return;
    setAnswers(prev => { const n = { ...prev }; delete n[currentQuestion.id]; return n; });
  };

  const handleMarkReview = () => {
    if (!currentQuestion) return;
    setMarkedForReview(prev => {
      const n = new Set(prev);
      if (n.has(currentQuestion.id)) {
        n.delete(currentQuestion.id);
      } else {
        n.add(currentQuestion.id);
      }
      return n;
    });
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNav = async (dir: "prev" | "next") => {
    if (currentQuestion) recordQuestionTime(currentQuestion.id);
    if (dir === "prev") {
      if (currentIndex > 0) {
        setCurrentIndex(i => i - 1);
      } else if (viewingBlockNum > 1) {
        const prevBlock = blocks.get(viewingBlockNum - 1);
        await navigateToBlock(viewingBlockNum - 1, Math.max(0, (prevBlock?.block.questions.length ?? questionsPerBlock) - 1));
      }
    }
    if (dir === "next") {
      if (!isLastQuestion) {
        setCurrentIndex(i => i + 1);
      } else if (viewingBlockNum < currentBlockNum) {
        await navigateToBlock(viewingBlockNum + 1, 0);
      } else if (isViewingCurrentBlock && !isLastBlock) {
        await handleCompleteBlock();
      }
    }
  };

  const handleNavigatorClick = async (globalIdx: number) => {
    // Build global index map
    let offset = 0;
    for (let b = 1; b <= currentBlockNum; b++) {
      const blk = blocks.get(b);
      if (!blk) continue;
      const len = blk.block.questions.length;
      if (globalIdx < offset + len) {
        if (currentQuestion) recordQuestionTime(currentQuestion.id);
        if (b !== viewingBlockNum) {
          await navigateToBlock(b, globalIdx - offset);
        } else {
          setCurrentIndex(globalIdx - offset);
        }
        return;
      }
      offset += len;
    }
  };

  // ── Navigate to a different block ─────────────────────────────────────────
  const navigateToBlock = async (blockNum: number, targetIndex = 0) => {
    if (blockNum === viewingBlockNum || blockNum > currentBlockNum) return;
    let targetBlockState = blocks.get(blockNum);

    // Persist the outgoing block's answers in the background. This save does not
    // gate rendering the target block, so it must NOT be awaited — awaiting it
    // made navigation between already-generated blocks wait on a network round-trip.
    const curBs = blocks.get(viewingBlockNum);
    if (curBs?.snapshotTaken) {
      const blockAnswers: Record<string, string | string[]> = {};
      curBs.block.questions.forEach(q => { if (answers[q.id]) blockAnswers[q.id] = answers[q.id]; });
      if (Object.keys(blockAnswers).length) {
        void saveBlockAnswers({ attemptToken, blockNumber: viewingBlockNum, answers: blockAnswers })
          .catch(console.error);
      }
    }

    // Load block if not cached
    if (!targetBlockState) {
      setIsLoadingBlock(true);
      try {
        const data = await getBlockQuestions(attemptToken, blockNum);
        const restored: Record<string, string | string[]> = {};
        data.questions.forEach(q => { if (q.selectedOptionId) restored[q.id] = q.selectedOptionId; });
        setAnswers(prev => ({ ...prev, ...restored }));

        const blockResp: BlockResponse = {
          blockId: 0, blockNumber: data.blockNumber,
          totalBlocks: data.totalBlocks ?? totalBlocks,
          totalQuestions: data.totalQuestions ?? totalQuestionCount,
          questionsPerBlock: data.questionsPerBlock ?? questionsPerBlock,
          difficulty: data.difficulty,
          questions: data.questions,
          totalBlockMarks: data.questions.reduce((s, q) => s + q.marks, 0),
          timeLimitSeconds: data.questions.reduce((s, q) => s + q.expectedTimeSecs, 0),
          isLastBlock: data.blockNumber === (data.totalBlocks ?? totalBlocks),
          coverageMap: {},
        };
        applyAssessmentTotals(blockResp);
        targetBlockState = {
          block: blockResp, snapshotTaken: data.snapshotTaken,
          metrics: null, nextDifficulty: data.nextBlockDifficulty,
        };
        setBlocks(prev => new Map(prev).set(blockNum, targetBlockState!));
      } catch (e) {
        setLoadError((e as Error).message);
        return;
      } finally {
        setIsLoadingBlock(false);
      }
    }

    setViewingBlockNum(blockNum);
    const maxIndex = Math.max(0, (targetBlockState?.block.questions.length ?? 1) - 1);
    setCurrentIndex(Math.min(Math.max(0, targetIndex), maxIndex));
  };

  // ── Complete block (write snapshot) ───────────────────────────────────────
  const handleCompleteBlock = async () => {
    if (!isViewingCurrentBlock || isGeneratingNext) return;
    setIsGeneratingNext(true);
    try {
      const bs = blocks.get(currentBlockNum)!;
      const blockAnswers: Record<string, string | string[]> = {};
      bs.block.questions.forEach(q => { if (answers[q.id]) blockAnswers[q.id] = answers[q.id]; });
      const blockTiming: Record<string, number> = {};
      bs.block.questions.forEach(q => { if (questionTiming[q.id]) blockTiming[q.id] = questionTiming[q.id]; });

      const timeTaken = totalTime - timeLeft;
      const result = await completeBlock({
        attemptToken, blockNumber: currentBlockNum,
        timeTaken, answers: blockAnswers, questionTiming: blockTiming,
      });

      // Mark current block as snapshotted
      setBlocks(prev => {
        const n = new Map(prev);
        const cur = n.get(currentBlockNum)!;
        n.set(currentBlockNum, { ...cur, snapshotTaken: true, metrics: result.blockMetrics, nextDifficulty: result.nextBlockDifficulty });
        return n;
      });

      if (isLastBlock) {
        await handleFinalSubmit();
        return;
      }

      // Generate next block
      const nextNum = currentBlockNum + 1;
      const nextBlock = await generateBlock({
        assessmentId, blockNumber: nextNum, userId, mode, attemptToken,
      });

      setBlocks(prev => new Map(prev).set(nextNum, {
        block: nextBlock, snapshotTaken: false, metrics: null, nextDifficulty: null,
      }));
      applyAssessmentTotals(nextBlock);

      // Recalculate total time: sum of all generated block time limits
      setTotalTime(() => {
        const allBlocks = Array.from(blocks.values());
        const knownTime = allBlocks.reduce((s, bs) => s + bs.block.timeLimitSeconds, 0);
        const remainingBlocks = nextBlock.totalBlocks - nextNum;
        const estimated = knownTime + nextBlock.timeLimitSeconds + (remainingBlocks * nextBlock.timeLimitSeconds);
        return estimated;
      });

      setCurrentBlockNum(nextNum);
      setViewingBlockNum(nextNum);
      setCurrentIndex(0);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setIsGeneratingNext(false);
    }
  };

  // ── Final submit ───────────────────────────────────────────────────────────
  const handleFinalSubmit = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setShowSubmitModal(false);
    try {
      // Snapshot the current (final) block before submitting. Until a block is
      // snapshotted its answers live ONLY in React state — they are never
      // written to the backend. Without this, the last hidden block (and the
      // current block on a timer-expiry submit) would score as all-skipped.
      const cur = blocks.get(currentBlockNum);
      if (cur && !cur.snapshotTaken) {
        const blockAnswers: Record<string, string | string[]> = {};
        cur.block.questions.forEach(q => {
          if (answers[q.id] !== undefined) blockAnswers[q.id] = answers[q.id];
        });
        const blockTiming: Record<string, number> = {};
        cur.block.questions.forEach(q => {
          if (questionTiming[q.id]) blockTiming[q.id] = questionTiming[q.id];
        });
        await completeBlock({
          attemptToken,
          blockNumber: currentBlockNum,
          timeTaken: Math.max(0, totalTime - timeLeft),
          answers: blockAnswers,
          questionTiming: blockTiming,
        }).catch(err => console.error("[Adaptive] final block snapshot failed:", err));
      }

      const report = await submitAssessment({ attemptToken, assessmentId, userId });
      onComplete(report);
    } catch (e) {
      setLoadError((e as Error).message);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [attemptToken, assessmentId, userId, onComplete, blocks, currentBlockNum, answers, questionTiming, totalTime, timeLeft]);

  // Keep the ref in sync so the timer always calls the latest version
  useEffect(() => {
    handleFinalSubmitRef.current = handleFinalSubmit;
  }, [handleFinalSubmit]);

  // ── Navigator questions ────────────────────────────────────────────────────
  const navigatorQuestions: NavigatorQuestion[] = [];
  let globalIdx = 0;
  for (let b = 1; b <= currentBlockNum; b++) {
    const bs = blocks.get(b);
    if (!bs) continue;
    bs.block.questions.forEach(q => {
      const isAnswered = answers[q.id] !== undefined;
      const isMarked = markedForReview.has(q.id);
      let state: QuestionState = "unanswered";
      if (isAnswered) state = "answered";
      if (isMarked) state = "marked";
      navigatorQuestions.push({
        id: q.id, number: globalIdx + 1, state,
        category: q.category, isAnswered, isMarked,
        isLocked: false, blockNumber: b,
      });
      globalIdx++;
    });
  }

  // Global index of current question
  let viewingOffset = 0;
  for (let b = 1; b < viewingBlockNum; b++) {
    viewingOffset += blocks.get(b)?.block.questions.length ?? 0;
  }
  const globalCurrentIndex = viewingOffset + currentIndex;

  // ── Navigator / progress derived ───────────────────────────────────────────
  const knownQuestionCount = navigatorQuestions.length;
  const fallbackTotalQuestions = Math.max(knownQuestionCount, totalBlocks * questionsPerBlock);
  const effectiveTotalQuestions = totalQuestionCount > 0
    ? Math.max(totalQuestionCount, knownQuestionCount)
    : fallbackTotalQuestions;
  const answeredCount = navigatorQuestions.filter(q => q.isAnswered).length;
  const progressPercent = effectiveTotalQuestions
    ? Math.round((answeredCount / effectiveTotalQuestions) * 100)
    : 0;
  const isQuestionAnswered = currentQuestion ? answers[currentQuestion.id] !== undefined : false;
  const isQuestionMarked = currentQuestion ? markedForReview.has(currentQuestion.id) : false;

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f6f8f5] dark:bg-[#0f1712]">
        <Logo className="h-12 w-auto mb-8" />
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Initializing adaptive assessment...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f6f8f5] dark:bg-[#0f1712] px-4">
        <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
        <p className="text-slate-700 dark:text-slate-300 text-center max-w-md">{loadError}</p>
        <button onClick={() => setLoadError(null)} className="mt-4 px-4 py-2 rounded-lg bg-brand-green text-white text-sm">
          Retry
        </button>
      </div>
    );
  }

  if (!viewingBlockState) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f6f8f5] dark:bg-[#0f1712]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Loading block...</p>
      </div>
    );
  }
  const { block: viewingBlock } = viewingBlockState;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#f6f8f5] font-sans text-[#17201b] transition-colors duration-500 dark:bg-[#0f1712] dark:text-white">
      <div className="absolute inset-0 assessment-aptitude-bg" aria-hidden="true" />
      <div className="absolute inset-0 assessment-grid opacity-35" aria-hidden="true" />
      <div className="absolute inset-0 assessment-scan opacity-[0.05]" aria-hidden="true" />

      {/* Header */}
      <header className="assessment-header sticky top-0 z-50 flex min-h-[72px] items-center justify-between gap-4 px-4 py-4 backdrop-blur-md dark:border-b dark:border-white/5 md:px-6">
        <div className="flex min-w-0 items-center">
          <div className="hidden sm:block"><Logo className="h-7" /></div>
          <div className="mx-4 hidden h-8 w-px bg-slate-300 dark:bg-white/10 sm:block" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[10px] font-bold text-brand-green uppercase tracking-wider">Adaptive Assessment</p>
              {mode === "trial" && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Trial Test
                </span>
              )}
            </div>
            <h1 className="truncate text-sm font-bold text-[#17201b] dark:text-white flex items-center gap-1.5">
              <span>Question {globalCurrentIndex + 1} of {effectiveTotalQuestions}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TimerDisplay time={timeLeft} total={totalTime} theme={theme} />
          <div className="hidden scale-90 lg:block"><ThemeToggle /></div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-green/20 bg-white shadow-sm transition hover:border-brand-green dark:border-white/10 dark:bg-white/5 lg:hidden"
            title="Question Map"
          >
            <SidebarMobileIcon className="text-brand-green" />
          </button>
          <button
            onClick={() => setIsDesktopSidebarOpen(p => !p)}
            className={`hidden lg:flex h-10 w-10 items-center justify-center rounded-lg border transition shadow-sm ${
              isDesktopSidebarOpen
                ? "border-brand-green/50 bg-brand-green/10 text-brand-green dark:border-brand-green/30 dark:bg-brand-green/10"
                : "border-brand-green/20 bg-white hover:border-brand-green dark:border-white/10 dark:bg-white/5 text-brand-green"
            }`}
            title="Toggle Question Map"
          >
            {isDesktopSidebarOpen ? <SidebarCloseIcon /> : <SidebarOpenIcon />}
          </button>
        </div>
      </header>

      {/* Main layout — matches the standard (non-adaptive) exam UI */}
      <main className="relative z-10 mx-auto flex max-w-[1440px] gap-4 lg:gap-5 px-4 py-4 lg:py-5 lg:h-[calc(100dvh-72px)] lg:overflow-hidden lg:px-6">
        <section className="flex-1 flex min-h-[600px] min-w-0 flex-col rounded-xl border border-brand-green/15 bg-white shadow-sm dark:border-white/10 dark:bg-[#111a15] lg:min-h-0 lg:overflow-hidden transition-all duration-300">
          {/* Section header strip */}
          <div className="border-b border-brand-green/5 p-3 sm:px-5 sm:py-2.5 dark:border-white/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
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
                  disabled={!currentQuestion}
                  className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3.5 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-[11px] ${
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

          {/* Question + options */}
          <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
            {isLoadingBlock ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
              </div>
            ) : currentQuestion ? (
              <>
                <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-4 dark:border-white/10 dark:bg-white/5 sm:p-5">
                  <h2 className="text-sm font-medium leading-relaxed text-[#17201b] dark:text-white whitespace-pre-wrap sm:text-base">
                    <span className="mr-3 font-semibold">{globalCurrentIndex + 1}.</span>
                    {currentQuestion.text}
                  </h2>
                  {currentQuestion.imageUrl && (
                    <div className="mt-4 relative inline-block">
                      <img
                        src={currentQuestion.imageUrl}
                        alt="Question"
                        className="max-w-full rounded-lg cursor-zoom-in"
                        onClick={() => setZoomedImage(currentQuestion.imageUrl!)}
                      />
                      <button
                        onClick={() => setZoomedImage(currentQuestion.imageUrl!)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-white hover:bg-black/60"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {currentQuestion.kind === "numerical" && (
                  <div className="mt-4 px-1">
                    <p className="text-[10px] font-bold italic text-[#17201b] dark:text-white">
                      * Note: Only exact numerical matches will be considered correct. Space is not allowed.
                    </p>
                  </div>
                )}

                {currentQuestion.kind === "numerical" ? (
                  <NumericalQuestion
                    questionId={currentQuestion.id}
                    value={(answers[currentQuestion.id] as string) || ""}
                    onChange={handleNumericalChange}
                  />
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {currentQuestion.options.map((option, idx) => {
                      const kind = currentQuestion.kind;
                      const curAns = answers[currentQuestion.id];
                      const isSelected = Array.isArray(curAns)
                        ? curAns.includes(option.id)
                        : curAns === option.id;

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
                            {kind === "msq" && isSelected ? <Check size={18} strokeWidth={3} /> : labelForIndex(idx)}
                          </span>
                          <span className="text-sm font-semibold leading-6 text-[#17201b] dark:text-white">
                            {option.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center py-20 text-sm text-slate-500 dark:text-slate-400">
                No question available
              </div>
            )}
          </div>

          {/* Footer navigation */}
          <div className="border-t border-brand-green/5 bg-brand-green/[0.02] p-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => void handleNav("prev")}
                disabled={globalCurrentIndex === 0}
                className="min-h-10 rounded-lg border border-brand-green/20 bg-white px-5 text-sm font-bold text-[#17201b] transition hover:border-brand-green hover:text-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-[#0f1712] dark:text-white"
              >
                Previous
              </button>
              {isLastQuestion && isViewingCurrentBlock && isLastBlock ? (
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
                  onClick={() => void handleNav("next")}
                  disabled={isGeneratingNext}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-green px-7 text-sm font-bold text-white transition hover:bg-[#19be5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeneratingNext && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isGeneratingNext ? "Preparing next question..." : "Save and next"}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Desktop sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: isDesktopSidebarOpen ? 300 : 80 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          className="hidden shrink-0 relative lg:block lg:min-h-0 rounded-xl border border-brand-green/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#111a15] overflow-hidden"
        >
          <div className={`h-full overflow-y-auto custom-scrollbar transition-all duration-300 ${isDesktopSidebarOpen ? "w-[300px] p-5" : "w-full py-5 px-2"}`}>
            <QuestionNavigator
              questions={navigatorQuestions}
              currentIndex={globalCurrentIndex}
              onSelect={handleNavigatorClick}
              progressPercent={progressPercent}
              isCollapsed={!isDesktopSidebarOpen}
              totalQuestions={effectiveTotalQuestions}
              questionsPerBlock={questionsPerBlock}
              currentBlockNumber={currentBlockNum}
              totalBlocks={totalBlocks}
            />
          </div>
        </motion.aside>
      </main>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed right-0 top-0 bottom-0 z-[101] w-80 bg-white dark:bg-[#0f1712] flex flex-col lg:hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5">
                <h3 className="text-sm font-bold">Question Map</h3>
                <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <QuestionNavigator
                  questions={navigatorQuestions}
                  currentIndex={globalCurrentIndex}
                  progressPercent={progressPercent}
                  onSelect={async (idx: number) => { await handleNavigatorClick(idx); setIsSidebarOpen(false); }}
                  totalQuestions={effectiveTotalQuestions}
                  questionsPerBlock={questionsPerBlock}
                  currentBlockNumber={currentBlockNum}
                  totalBlocks={totalBlocks}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Image zoom */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setZoomedImage(null)}>
            <img src={zoomedImage} alt="Zoomed" className="max-w-full max-h-full rounded-xl" />
            <button className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30">
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
              <p className="mt-2 text-sm text-[#17201b] dark:text-white">
                Review your assessment summary before finalizing your submission.
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-full border border-brand-green/10 bg-brand-green/[0.03] px-4 py-1.5 dark:border-white/5 dark:bg-white/5">
                <div className="h-2 w-2 rounded-full bg-brand-green" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-green">
                  Time Remaining: {formatTime(timeLeft)}
                </span>
              </div>

              <div className="mt-8 grid w-full grid-cols-3 gap-4">
                <div className="flex flex-col items-center rounded-xl bg-brand-green/[0.05] p-4 border border-brand-green/10">
                  <span className="text-xl font-black text-brand-green">{answeredCount}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-green">Answered</span>
                </div>
                <div className="flex flex-col items-center rounded-xl bg-amber-400/[0.05] p-4 border border-amber-400/10">
                  <span className="text-xl font-black text-amber-500">
                    {navigatorQuestions.filter(q => q.isMarked).length}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Review</span>
                </div>
                <div className="flex flex-col items-center rounded-xl bg-slate-100 p-4 border border-slate-200 dark:bg-white/[0.03] dark:border-white/10">
                  <span className="text-xl font-black text-[#17201b] dark:text-white">
                    {Math.max(0, navigatorQuestions.length - answeredCount)}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#17201b] dark:text-white">Left</span>
                </div>
              </div>

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
                  onClick={handleFinalSubmit}
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
          </div>
        </div>
      )}
    </div>
  );
};

export default AdaptiveEngineV2;
