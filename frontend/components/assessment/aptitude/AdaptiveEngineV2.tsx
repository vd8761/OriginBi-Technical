"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Loader2, TrendingUp, TrendingDown, Minus, ArrowRight, ArrowLeft,
  CheckCircle2, AlertCircle, Flag, ZoomIn, RotateCw, X,
  PanelRightClose, PanelRightOpen, BarChart3, Clock, Target,
} from "lucide-react";
import { useTheme } from "@/lib/contexts/ThemeContext";
import Logo from "../../ui/Logo";
import ThemeToggle from "../../ui/ThemeToggle";
import TimerDisplay from "../shared/TimerDisplay";
import { SidebarOpenIcon, SidebarCloseIcon, SidebarMobileIcon } from "../shared/AssessmentIcons";
import QuestionNavigator, { NavigatorQuestion, QuestionState } from "./QuestionNavigator";
import {
  generateBlock, completeBlock, saveBlockAnswers, getBlockQuestions,
  submitAssessment, getAttemptStatus,
  type AdaptiveQuestion, type BlockResponse, type BlockMetrics,
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
  const [blockTransitionMsg, setBlockTransitionMsg] = useState<string | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const viewingBlockState = blocks.get(viewingBlockNum);
  const currentBlockState = blocks.get(currentBlockNum);
  const viewingQuestions = viewingBlockState?.block.questions ?? [];
  const currentQuestion = viewingQuestions[currentIndex];
  const isViewingCurrentBlock = viewingBlockNum === currentBlockNum;
  const isLastQuestion = currentIndex === viewingQuestions.length - 1;
  const isLastBlock = currentBlockState?.block.isLastBlock ?? false;

  // ── Question timing ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentQuestion) return;
    questionStartRef.current[currentQuestion.id] = Date.now();
  }, [currentQuestion?.id]);

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
          block1 = {
            blockId: 0,
            blockNumber: 1,
            totalBlocks: status?.blocks.length ?? 4,
            difficulty: data.difficulty,
            questions: data.questions,
            totalBlockMarks: data.questions.reduce((s, q) => s + q.marks, 0),
            timeLimitSeconds: data.questions.reduce((s, q) => s + q.expectedTimeSecs, 0),
            isLastBlock: data.blockNumber === (status?.blocks.length ?? 4),
            coverageMap: {},
          };
          // Collect block 1 saved answers (will be merged with resume block answers below)
          const restored: Record<string, string | string[]> = {};
          data.questions.forEach(q => {
            if (q.selectedOptionId) restored[q.id] = q.selectedOptionId;
          });

          // Determine current block from status
          const lastCompleted = status?.blocks.filter(b => b.snapshotTaken).length ?? 0;
          const resumeBlock = Math.min(lastCompleted + 1, status?.blocks.length ?? 4);
          const totalBlockCount = status?.blocks.length ?? 4;

          // Pre-load the resume block if it's not block 1 — do this BEFORE any setState
          // so the blocks Map is fully populated before isLoading becomes false.
          let finalBlocksMap: Map<number, BlockState>;
          let finalAnswers: Record<string, string | string[]> = { ...restored };

          if (resumeBlock > 1) {
            try {
              const resumeData = await getBlockQuestions(attemptToken, resumeBlock);
              const resumeBlockResp: BlockResponse = {
                blockId: 0,
                blockNumber: resumeBlock,
                totalBlocks: totalBlockCount,
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
          setTotalBlocks(totalBlockCount);
        } else {
          // Fresh start: generate block 1
          block1 = await generateBlock({
            assessmentId, blockNumber: 1, userId, mode, attemptToken,
          });
          setTotalBlocks(block1.totalBlocks);
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

  const handleClear = () => {
    if (!currentQuestion) return;
    setAnswers(prev => { const n = { ...prev }; delete n[currentQuestion.id]; return n; });
  };

  const handleMarkReview = () => {
    if (!currentQuestion) return;
    setMarkedForReview(prev => {
      const n = new Set(prev);
      n.has(currentQuestion.id) ? n.delete(currentQuestion.id) : n.add(currentQuestion.id);
      return n;
    });
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNav = (dir: "prev" | "next") => {
    if (currentQuestion) recordQuestionTime(currentQuestion.id);
    if (dir === "prev" && currentIndex > 0) setCurrentIndex(i => i - 1);
    if (dir === "next" && !isLastQuestion) setCurrentIndex(i => i + 1);
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
        if (b !== viewingBlockNum) await navigateToBlock(b);
        setCurrentIndex(globalIdx - offset);
        return;
      }
      offset += len;
    }
  };

  // ── Navigate to a different block ─────────────────────────────────────────
  const navigateToBlock = async (blockNum: number) => {
    if (blockNum === viewingBlockNum || blockNum > currentBlockNum) return;

    // Save current block answers first (if post-snapshot)
    const curBs = blocks.get(viewingBlockNum);
    if (curBs?.snapshotTaken) {
      const blockAnswers: Record<string, string | string[]> = {};
      curBs.block.questions.forEach(q => { if (answers[q.id]) blockAnswers[q.id] = answers[q.id]; });
      if (Object.keys(blockAnswers).length) {
        await saveBlockAnswers({ attemptToken, blockNumber: viewingBlockNum, answers: blockAnswers })
          .catch(console.error);
      }
    }

    // Load block if not cached
    if (!blocks.has(blockNum)) {
      setIsLoadingBlock(true);
      try {
        const data = await getBlockQuestions(attemptToken, blockNum);
        const restored: Record<string, string | string[]> = {};
        data.questions.forEach(q => { if (q.selectedOptionId) restored[q.id] = q.selectedOptionId; });
        setAnswers(prev => ({ ...prev, ...restored }));

        const blockResp: BlockResponse = {
          blockId: 0, blockNumber: data.blockNumber,
          totalBlocks, difficulty: data.difficulty,
          questions: data.questions,
          totalBlockMarks: data.questions.reduce((s, q) => s + q.marks, 0),
          timeLimitSeconds: 0, isLastBlock: false, coverageMap: {},
        };
        setBlocks(prev => new Map(prev).set(blockNum, {
          block: blockResp, snapshotTaken: data.snapshotTaken,
          metrics: null, nextDifficulty: data.nextBlockDifficulty,
        }));
      } catch (e) {
        setLoadError((e as Error).message);
      } finally {
        setIsLoadingBlock(false);
      }
    }

    setViewingBlockNum(blockNum);
    setCurrentIndex(0);
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
      setTotalBlocks(nextBlock.totalBlocks);

      // Recalculate total time: sum of all generated block time limits
      setTotalTime(() => {
        const allBlocks = Array.from(blocks.values());
        const knownTime = allBlocks.reduce((s, bs) => s + bs.block.timeLimitSeconds, 0);
        const remainingBlocks = nextBlock.totalBlocks - nextNum;
        const estimated = knownTime + nextBlock.timeLimitSeconds + (remainingBlocks * nextBlock.timeLimitSeconds);
        return estimated;
      });

      const diffMsg = result.nextBlockDifficulty === bs.block.difficulty
        ? `Staying at ${result.nextBlockDifficulty} difficulty`
        : result.nextBlockDifficulty === "hard" || (result.nextBlockDifficulty === "medium" && bs.block.difficulty === "easy")
          ? `Upgrading to ${result.nextBlockDifficulty} — great performance!`
          : `Adjusting to ${result.nextBlockDifficulty} difficulty`;
      setBlockTransitionMsg(diffMsg);
      setTimeout(() => setBlockTransitionMsg(null), 4000);

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
      const report = await submitAssessment({ attemptToken, assessmentId, userId });
      onComplete(report);
    } catch (e) {
      setLoadError((e as Error).message);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [attemptToken, assessmentId, userId, onComplete]);

  // Keep the ref in sync so the timer always calls the latest version
  handleFinalSubmitRef.current = handleFinalSubmit;

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

      {/* Block transition toast */}
      <AnimatePresence>
        {blockTransitionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-white shadow-2xl shadow-brand-green/30"
          >
            <TrendingUp className="h-4 w-4" />
            {blockTransitionMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="assessment-header sticky top-0 z-50 flex min-h-[72px] items-center justify-between gap-4 px-4 py-4 backdrop-blur-md dark:border-b dark:border-white/5 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden sm:block"><Logo className="h-7" /></div>
          <div className="hidden sm:block h-8 w-px bg-slate-300 dark:bg-white/10" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-brand-green uppercase tracking-wider">Adaptive Assessment</p>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-bold text-[#17201b] dark:text-white">
                Block {viewingBlockNum} of {totalBlocks}
                {!isViewingCurrentBlock && (
                  <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">(reviewing)</span>
                )}
              </h1>
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${difficultyColor(viewingBlock.difficulty)}`}>
                {difficultyIcon(viewingBlock.difficulty)}
                {viewingBlock.difficulty}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {viewingBlock.totalBlockMarks} marks
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TimerDisplay time={timeLeft} total={totalTime} theme={theme} />
          <div className="hidden scale-90 lg:block"><ThemeToggle /></div>
          <button onClick={() => setIsSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-green/20 bg-white shadow-sm transition hover:border-brand-green dark:border-white/10 dark:bg-white/5 lg:hidden">
            <SidebarMobileIcon className="text-brand-green" />
          </button>
          <button onClick={() => setIsDesktopSidebarOpen(p => !p)}
            className={`hidden lg:flex h-10 w-10 items-center justify-center rounded-lg border transition shadow-sm ${
              isDesktopSidebarOpen
                ? "border-brand-green/50 bg-brand-green/10 text-brand-green"
                : "border-brand-green/20 bg-white hover:border-brand-green dark:border-white/10 dark:bg-white/5 text-brand-green"
            }`}>
            {isDesktopSidebarOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Block navigation tabs */}
      <div className="sticky top-[72px] z-40 bg-white/95 dark:bg-[#0f1712]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-4 md:px-6">
        <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-none">
          {Array.from({ length: currentBlockNum }, (_, i) => i + 1).map(bn => {
            const bs = blocks.get(bn);
            const isActive = bn === viewingBlockNum;
            const isCurrent = bn === currentBlockNum;
            return (
              <button key={bn} onClick={() => navigateToBlock(bn)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-brand-green text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                }`}>
                <span>Block {bn}</span>
                {bs && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${difficultyColor(bs.block.difficulty)}`}>
                    {bs.block.difficulty[0].toUpperCase()}
                  </span>
                )}
                {bs?.snapshotTaken && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                {isCurrent && !bs?.snapshotTaken && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Question panel */}
        <main className={`flex-1 overflow-y-auto transition-all duration-300 ${isDesktopSidebarOpen ? "lg:mr-[340px]" : ""}`}>
          <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
            {isLoadingBlock ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
              </div>
            ) : currentQuestion ? (
              <AnimatePresence mode="wait">
                <motion.div key={currentQuestion.id}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}>

                  {/* Question meta */}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Q{currentIndex + 1} of {viewingQuestions.length}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${difficultyColor(currentQuestion.difficulty)}`}>
                      {difficultyIcon(currentQuestion.difficulty)}
                      {currentQuestion.difficulty}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                      {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? "s" : ""}
                    </span>
                    {currentQuestion.negativeMarks > 0 && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                        -{currentQuestion.negativeMarks} negative
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-xs bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-500">
                      {currentQuestion.subcategory}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      <Clock className="h-3 w-3" />
                      ~{formatTime(currentQuestion.expectedTimeSecs)}
                    </span>
                  </div>

                  {/* Question text */}
                  <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 shadow-sm mb-4">
                    <p className="text-[15px] leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                      {currentQuestion.text}
                    </p>
                    {currentQuestion.imageUrl && (
                      <div className="mt-4 relative">
                        <img src={currentQuestion.imageUrl} alt="Question" className="max-w-full rounded-lg cursor-zoom-in"
                          onClick={() => setZoomedImage(currentQuestion.imageUrl!)} />
                        <button onClick={() => setZoomedImage(currentQuestion.imageUrl!)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-white hover:bg-black/60">
                          <ZoomIn className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    {currentQuestion.options.map((opt, i) => {
                      const curAns = answers[currentQuestion.id];
                      const isSelected = Array.isArray(curAns)
                        ? curAns.includes(opt.id)
                        : curAns === opt.id;
                      return (
                        <button key={opt.id} onClick={() => handleOptionSelect(opt.id)}
                          className={`w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                            isSelected
                              ? "border-brand-green bg-brand-green/10 dark:bg-brand-green/20"
                              : "border-slate-200 bg-white hover:border-brand-green/50 dark:border-white/10 dark:bg-white/5 dark:hover:border-brand-green/30"
                          }`}>
                          <span className={`flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border ${
                            isSelected
                              ? "border-brand-green bg-brand-green text-white"
                              : "border-slate-300 text-slate-500 dark:border-white/20 dark:text-slate-400"
                          }`}>
                            {labelForIndex(i)}
                          </span>
                          <span className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between mt-6 gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button onClick={handleClear}
                        className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5">
                        Clear
                      </button>
                      <button onClick={handleMarkReview}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                          markedForReview.has(currentQuestion.id)
                            ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400"
                        }`}>
                        <Flag className="h-3.5 w-3.5" />
                        {markedForReview.has(currentQuestion.id) ? "Marked" : "Mark"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleNav("prev")} disabled={currentIndex === 0}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:text-slate-400">
                        <ArrowLeft className="h-4 w-4" /> Prev
                      </button>
                      {isLastQuestion && isViewingCurrentBlock ? (
                        <button
                          onClick={isLastBlock ? () => setShowSubmitModal(true) : handleCompleteBlock}
                          disabled={isGeneratingNext}
                          className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-brand-green text-white hover:bg-brand-green/90 disabled:opacity-60 shadow-sm">
                          {isGeneratingNext ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                          {isLastBlock ? "Submit" : "Next Block"}
                        </button>
                      ) : (
                        <button onClick={() => handleNav("next")} disabled={isLastQuestion}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-brand-green text-white hover:bg-brand-green/90 disabled:opacity-40 shadow-sm">
                          Next <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : null}
          </div>
        </main>

        {/* Desktop sidebar */}
        <AnimatePresence>
          {isDesktopSidebarOpen && (
            <motion.aside
              initial={{ x: 340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 340, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="hidden lg:flex fixed right-0 top-[120px] bottom-0 w-[340px] flex-col border-l border-slate-200 bg-white/95 backdrop-blur-md dark:border-white/5 dark:bg-[#0f1712]/95 overflow-y-auto">
              <div className="p-4 border-b border-slate-100 dark:border-white/5">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Question Map</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <QuestionNavigator
                  questions={navigatorQuestions}
                  currentIndex={globalCurrentIndex}
                  onSelect={handleNavigatorClick}
                />
              </div>
              {/* Block metrics panel */}
              {viewingBlockState.snapshotTaken && viewingBlockState.metrics && (
                <div className="p-4 border-t border-slate-100 dark:border-white/5">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                    Block {viewingBlockNum} Snapshot
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Marks Score", value: `${viewingBlockState.metrics.marksScore.toFixed(1)}%` },
                      { label: "Accuracy", value: `${viewingBlockState.metrics.adaptiveAccuracy.toFixed(1)}%` },
                      { label: "Skip Impact", value: `${viewingBlockState.metrics.skipImpact.toFixed(1)}%` },
                      { label: "Readiness", value: `${viewingBlockState.metrics.blockReadinessScore.toFixed(1)}%` },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg bg-slate-50 dark:bg-white/5 p-2">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                  {viewingBlockState.nextDifficulty && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Target className="h-3.5 w-3.5" />
                      Next block: <span className={`font-semibold ${difficultyColor(viewingBlockState.nextDifficulty)}`}>
                        {viewingBlockState.nextDifficulty}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

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
                  onSelect={async (idx: number) => { await handleNavigatorClick(idx); setIsSidebarOpen(false); }}
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
      <AnimatePresence>
        {showSubmitModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1a2420] p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Submit Assessment?</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                You have answered <strong>{Object.keys(answers).length}</strong> of{" "}
                <strong>{navigatorQuestions.length}</strong> questions.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mb-6">
                Unanswered questions will be counted as skipped. Your final score uses your latest answers.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowSubmitModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300">
                  Review
                </button>
                <button onClick={handleFinalSubmit} disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-brand-green text-white text-sm font-semibold hover:bg-brand-green/90 disabled:opacity-60 flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Submit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdaptiveEngineV2;
