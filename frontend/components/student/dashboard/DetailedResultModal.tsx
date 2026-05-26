"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Exam } from "../ExamCarousel";
import type { ExamDetailData } from "@/lib/exams";
import type { AssessmentResult, SectionResult } from "@/lib/progress";

interface DetailedResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  result: AssessmentResult | null;
  detail: ExamDetailData | null;
}



// ── Icons ──
const CloseIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const AlertIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const ClockIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TargetIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TrendUpIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const BookIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const AwardIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const LightbulbIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const BarChartIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

// ── Helpers ──
const getSkillColor = (score: number) => {
  if (score >= 80) return "#16a34a";
  if (score >= 65) return "#0891b2";
  if (score >= 50) return "#d97706";
  return "#dc2626";
};

const getSkillLabel = (score: number) => {
  if (score >= 80) return "Expert";
  if (score >= 65) return "Proficient";
  if (score >= 50) return "Developing";
  return "Beginner";
};

const getSkillBg = (score: number) => {
  if (score >= 80) return "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30";
  if (score >= 65) return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/30";
  if (score >= 50) return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30";
  return "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30";
};

const analyzePerformance = (sections: SectionResult[]) => {
  const strong = sections.filter(s => s.score >= 75);
  const developing = sections.filter(s => s.score >= 50 && s.score < 75);
  const needsFocus = sections.filter(s => s.score < 50);
  return { strong, developing, needsFocus };
};

const generateExamSpecificAdvice = (examId: string, weakAreas: SectionResult[], strongAreas: SectionResult[]) => {
  const advice: { title: string; content: string; tag: string }[] = [];

  if (examId === "aptitude") {
    advice.push(
      { title: "Quantitative Strategy", content: "Focus on shortcut techniques for arithmetic. Practice 20 timed questions daily.", tag: "Math" },
      { title: "Logical Reasoning", content: "Draw diagrams for seating and direction problems. Pattern recognition improves with practice.", tag: "Logic" }
    );
  } else if (examId === "communication") {
    advice.push(
      { title: "Speaking Fluency", content: "Record 2-minute responses daily. Focus on clarity over complex vocabulary.", tag: "Speech" },
      { title: "Writing Structure", content: "Use the PREP method: Point, Reason, Example, Point. Keep sentences under 20 words.", tag: "Writing" }
    );
  } else if (examId === "coding") {
    advice.push(
      { title: "Problem Decomposition", content: "Break every problem into input, process, output. Write pseudocode before actual code.", tag: "Approach" },
      { title: "Edge Cases", content: "Always test with empty input, single element, maximum values, and negative numbers.", tag: "Testing" }
    );
  } else if (examId === "mnc") {
    advice.push(
      { title: "DSA Patterns", content: "Master 15 core patterns: Two Pointers, Sliding Window, BFS, DFS, DP basics.", tag: "Patterns" },
      { title: "System Design Basics", content: "Understand caching, load balancing, and database indexing at a high level.", tag: "Design" }
    );
  } else {
    advice.push(
      { title: "Role Research", content: "Study job descriptions for your target role. Match your strengths to requirements.", tag: "Research" },
      { title: "Scenario Practice", content: "Practice situational judgement questions using the STAR method.", tag: "Practice" }
    );
  }

  return advice;
};

type TabKey = "summary" | "analysis" | "preview";

const statusBadge = (status?: "correct" | "incorrect" | "unanswered" | "subjective") => {
  if (status === "correct") return "bg-brand-green/10 text-brand-green border-brand-green/30 dark:border-brand-green/40";
  if (status === "incorrect") return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30";
  if (status === "subjective") return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30";
  return "bg-brand-light-secondary/70 text-brand-text-light-secondary border-brand-light-tertiary/60 dark:bg-white/10 dark:text-white/60 dark:border-white/10";
};

const statusLabel = (status?: "correct" | "incorrect" | "unanswered" | "subjective") => {
  if (status === "correct") return "Correct";
  if (status === "incorrect") return "Incorrect";
  if (status === "subjective") return "Subjective";
  return "Unanswered";
};

// ── Component ──
const DetailedResultModal: React.FC<DetailedResultModalProps> = ({ isOpen, onClose, exam, result, detail }) => {
  // ── ALL hooks must be called unconditionally (Rules of Hooks) ──
  const [activeTab, setActiveTab] = useState<TabKey>("summary");

  useEffect(() => {
    if (isOpen) setActiveTab("summary");
  }, [isOpen, exam?.id]);

  const sections = useMemo(() => {
    if (!result) return [];
    return result.sections?.length ? result.sections :
      detail?.sections.map((s, i) => ({ name: s.name, score: 70 + ((i * 13) % 25), weight: s.weight })) || [];
  }, [result, detail]);

  const analysis = useMemo(() => analyzePerformance(sections), [sections]);

  const advice = useMemo(() => {
    if (!exam) return [];
    return generateExamSpecificAdvice(exam.id, analysis.needsFocus, analysis.strong);
  }, [exam, analysis]);

  const reviews = useMemo(() => {
    const items = result?.questionReviews ?? [];
    return [...items].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [result?.questionReviews]);

  const previewReviews = useMemo(() => reviews, [reviews]);

  // Guard after all hooks
  if (!isOpen || !exam || !result) return null;

  // Calculate time per question (rough estimate)
  const timeStr = result.timeTaken || "0 min";
  const timeMinutes = parseInt(timeStr) || 0;
  const correctCount = result.correctCount ?? 0;
  const wrongCount = result.wrongCount ?? 0;
  const answeredCount = result.answeredCount ?? (correctCount + wrongCount);
  const totalQuestions = result.totalQuestions ?? (detail as any)?.questions ?? exam.questions ?? answeredCount;
  const skippedCount = result.skippedCount ?? Math.max(0, totalQuestions - answeredCount);
  const timePerQ = timeMinutes > 0 && totalQuestions > 0 ? (timeMinutes / totalQuestions).toFixed(1) : "-";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — z-[100] to sit above header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />

          {/* Modal — z-[101] to sit above backdrop */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed top-8 bottom-4 left-4 right-4 sm:top-12 sm:bottom-6 sm:left-6 sm:right-6 md:top-14 md:bottom-8 md:left-10 md:right-10 lg:top-16 lg:bottom-10 lg:left-16 lg:right-16 xl:top-20 xl:bottom-12 xl:left-20 xl:right-20 z-[101] flex flex-col"
          >
            <div className="w-full h-full bg-white dark:bg-brand-dark-primary rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-brand-light-tertiary/60 dark:border-white/10">

              {/* ── Header ── */}
              <div className="shrink-0 bg-brand-light-primary/95 dark:bg-brand-dark-primary/95 px-6 sm:px-8 py-5 border-b border-brand-light-tertiary/60 dark:border-white/10">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: `${exam.accentColor}20`, color: exam.accentColor }}
                    >
                      {exam.icon}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-brand-text-light-secondary dark:text-white/50 uppercase tracking-wider">Detailed Result</p>
                      <h2 className="text-lg font-bold text-brand-text-light-primary dark:text-white">{exam.title}</h2>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl bg-brand-light-secondary/70 dark:bg-white/10 hover:bg-brand-light-tertiary/70 dark:hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <CloseIcon c="w-5 h-5 text-brand-text-light-secondary dark:text-white/70" />
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { id: "summary", label: "Summary" },
                    { id: "analysis", label: "Analysis" },
                    { id: "preview", label: "Attempt Preview" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabKey)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        activeTab === tab.id
                          ? "bg-brand-green text-white border-brand-green"
                          : "bg-brand-light-secondary/70 dark:bg-white/[0.04] text-brand-text-light-secondary dark:text-white/60 border-brand-light-tertiary/60 dark:border-white/10 hover:border-brand-green/40"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Scrollable Content ── */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 sm:p-8 max-w-5xl mx-auto">

                  {activeTab === "summary" && (
                    <>

                      {/* ===== TOP ROW: Score Ring + Quick Stats ===== */}
                      <div className="flex flex-col lg:flex-row gap-6 mb-8">
                        {/* Score Ring */}
                        <div className="shrink-0">
                          <div className="relative w-40 h-40 mx-auto lg:mx-0">
                            <svg className="w-full h-full -rotate-90">
                              <circle cx="80" cy="80" r="70" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                              <motion.circle
                                cx="80" cy="80" r="70" fill="none"
                                stroke="#1ed36a"
                                strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={440}
                                initial={{ strokeDashoffset: 440 }}
                                animate={{ strokeDashoffset: 440 - (440 * result.overallScore) / 100 }}
                                transition={{ duration: 1.2, delay: 0.2 }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-3xl font-black text-gray-900 dark:text-white">{result.overallScore}%</span>
                              <span className="text-xs font-semibold text-gray-400 dark:text-gray-300 mt-0.5">{getSkillLabel(result.overallScore)}</span>
                            </div>
                          </div>
                          <p className="text-center lg:text-left text-xs text-gray-400 dark:text-gray-300 mt-2">{result.accuracy}% accuracy</p>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4">
                            <ClockIcon c="w-4 h-4 text-gray-400 dark:text-white/40 mb-2" />
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{result.timeTaken}</p>
                            <p className="text-[10px] text-gray-400 dark:text-white/50 uppercase tracking-wider">Total Time</p>
                            <p className="text-[10px] text-gray-400 dark:text-white/50">Avg: {timePerQ}m/q</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4">
                            <TargetIcon c="w-4 h-4 text-gray-400 dark:text-white/40 mb-2" />
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{answeredCount}</p>
                            <p className="text-[10px] text-gray-400 dark:text-white/50 uppercase tracking-wider">Answered</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4">
                            <BarChartIcon c="w-4 h-4 text-gray-400 dark:text-white/40 mb-2" />
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{correctCount}</p>
                            <p className="text-[10px] text-gray-400 dark:text-white/50 uppercase tracking-wider">Correct</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4">
                            <AwardIcon c="w-4 h-4 text-gray-400 dark:text-white/40 mb-2" />
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{wrongCount}</p>
                            <p className="text-[10px] text-gray-400 dark:text-white/50 uppercase tracking-wider">Wrong</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4">
                            <AlertIcon c="w-4 h-4 text-gray-400 dark:text-white/40 mb-2" />
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{skippedCount}</p>
                            <p className="text-[10px] text-gray-400 dark:text-white/50 uppercase tracking-wider">Skipped</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4">
                            <BookIcon c="w-4 h-4 text-gray-400 dark:text-white/40 mb-2" />
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{totalQuestions}</p>
                            <p className="text-[10px] text-gray-400 dark:text-white/50 uppercase tracking-wider">Total Qs</p>
                          </div>
                        </div>
                      </div>

                      {/* ===== SECTION BREAKDOWN TABLE ===== */}
                      <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                          <BookIcon c="w-4 h-4 text-[#1ed36a]" />
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Section Breakdown</h3>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-white/5">
                                <th className="text-left text-[11px] font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider px-4 py-3">Section</th>
                                <th className="text-left text-[11px] font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider px-4 py-3">Weight</th>
                                <th className="text-left text-[11px] font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider px-4 py-3">Score</th>
                                <th className="text-left text-[11px] font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider px-4 py-3">Level</th>
                                <th className="text-right text-[11px] font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider px-4 py-3">Visual</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                              {sections.map((section, idx) => (
                                <motion.tr
                                  key={section.name}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.1 * idx }}
                                  className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
                                >
                                  <td className="px-4 py-3.5">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{section.name}</span>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className="text-xs text-gray-500 dark:text-white/50">{section.weight}</span>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className="text-sm font-bold" style={{ color: getSkillColor(section.score) }}>{section.score}%</span>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${getSkillBg(section.score)}`}>
                                      {getSkillLabel(section.score)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <div className="flex justify-end">
                                      <div className="w-24 h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${section.score}%` }}
                                          transition={{ delay: 0.3 + idx * 0.1, duration: 0.6 }}
                                          className="h-full rounded-full"
                                          style={{ background: getSkillColor(section.score) }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === "analysis" && (
                    <>

                      {/* ===== PERFORMANCE SUMMARY ===== */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {analysis.strong.length > 0 && (
                      <div className="bg-green-50/60 rounded-2xl p-5 border border-green-100 dark:bg-green-500/10 dark:border-green-500/20">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckIcon c="w-4 h-4 text-green-600 dark:text-green-400" />
                          <h4 className="text-sm font-bold text-green-800 dark:text-green-400">Strong Areas</h4>
                          <span className="ml-auto text-xs font-bold text-green-600 bg-green-100 dark:bg-green-500/20 dark:text-green-400 px-2 py-0.5 rounded-full">{analysis.strong.length}</span>
                        </div>
                        <div className="space-y-2">
                          {analysis.strong.map(s => (
                            <div key={s.name} className="flex items-center justify-between">
                              <span className="text-xs text-green-700 dark:text-white">{s.name}</span>
                              <span className="text-xs font-bold text-green-600 dark:text-green-400">{s.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.developing.length > 0 && (
                      <div className="bg-amber-50/60 rounded-2xl p-5 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendUpIcon c="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Developing</h4>
                          <span className="ml-auto text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-500/20 dark:text-amber-400 px-2 py-0.5 rounded-full">{analysis.developing.length}</span>
                        </div>
                        <div className="space-y-2">
                          {analysis.developing.map(s => (
                            <div key={s.name} className="flex items-center justify-between">
                              <span className="text-xs text-amber-700 dark:text-white">{s.name}</span>
                              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{s.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.needsFocus.length > 0 && (
                      <div className="bg-red-50/60 rounded-2xl p-5 border border-red-100 dark:bg-red-500/10 dark:border-red-500/20">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertIcon c="w-4 h-4 text-red-600 dark:text-red-400" />
                          <h4 className="text-sm font-bold text-red-800 dark:text-red-400">Needs Focus</h4>
                          <span className="ml-auto text-xs font-bold text-red-600 bg-red-100 dark:bg-red-500/20 dark:text-red-400 px-2 py-0.5 rounded-full">{analysis.needsFocus.length}</span>
                        </div>
                        <div className="space-y-2">
                          {analysis.needsFocus.map(s => (
                            <div key={s.name} className="flex items-center justify-between">
                              <span className="text-xs text-red-700 dark:text-white">{s.name}</span>
                              <span className="text-xs font-bold text-red-600 dark:text-red-400">{s.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                      {/* ===== EXAM-SPECIFIC ADVICE ===== */}
                      <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <LightbulbIcon c="w-4 h-4 text-[#1ed36a]" />
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">How to Improve</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {advice.map((tip, idx) => (
                        <motion.div
                          key={tip.title}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 * idx }}
                          className="flex gap-4 p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10"
                        >
                          <div className="shrink-0">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-white/70">
                              {tip.tag}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{tip.title}</h4>
                            <p className="text-xs text-gray-500 dark:text-white/60 leading-relaxed">{tip.content}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                      {/* ===== SKILL GAP ANALYSIS ===== */}
                      {detail && detail.skills.length > 0 && (
                        <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <TargetIcon c="w-4 h-4 text-[#1ed36a]" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Skills Evaluated</h3>
                      </div>
                      <div className="space-y-3">
                        {detail.skills.map((skill, idx) => (
                          <motion.div
                            key={skill.title}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 * idx }}
                            className="flex gap-4 p-4 rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5"
                          >
                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-gray-500 dark:text-white/70">{idx + 1}</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{skill.title}</h4>
                              <p className="text-xs text-gray-500 dark:text-white/60 leading-relaxed">{skill.description}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                      {/* ===== EXAM REQUIREMENTS ===== */}
                      {detail && detail.requirements.length > 0 && (
                        <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <BookIcon c="w-4 h-4 text-[#1ed36a]" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">What You Need</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {detail.requirements.map((req, idx) => (
                          <motion.span
                            key={idx}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.05 * idx }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-700 dark:text-white/70"
                          >
                            <CheckIcon c="w-3 h-3 text-[#1ed36a]" />
                            {req}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                      )}
                    </>
                  )}

                  {activeTab === "preview" && (
                    <div className="space-y-4">
                      {previewReviews.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-brand-light-tertiary/70 dark:border-white/15 p-10 text-center">
                          <p className="text-sm text-brand-text-light-secondary dark:text-white/60">
                            Question preview is not available for this attempt yet.
                          </p>
                          <p className="text-xs text-brand-text-light-secondary/70 dark:text-white/40 mt-2">
                            Complete the assessment to capture full answer review details.
                          </p>
                        </div>
                      ) : (
                        previewReviews.map((review, index) => {
                          const selectedOptionText = review.selectedOptionId
                            ? review.options?.find((opt) => opt.id === review.selectedOptionId)?.text
                            : undefined;
                          const correctOptionText = review.correctOptionId
                            ? review.options?.find((opt) => opt.id === review.correctOptionId)?.text
                            : undefined;
                          const selectedAnswer =
                            review.selectedAnswerText || selectedOptionText || "Not answered";
                          const correctAnswer =
                            review.correctAnswerText ||
                            correctOptionText ||
                            (review.status === "subjective" ? "Evaluated via rubric/AI" : "Not available");

                          return (
                            <div
                              key={`${review.questionId}-${index}`}
                              className="rounded-2xl border border-brand-light-tertiary/60 dark:border-white/10 bg-brand-light-primary/80 dark:bg-white/[0.03] p-5"
                            >
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="px-2.5 py-1 rounded-md bg-brand-light-secondary/70 dark:bg-white/10 text-xs font-semibold text-brand-text-light-secondary dark:text-white/60">
                                  Q{index + 1}
                                </span>
                                {review.category && (
                                  <span className="px-2.5 py-1 rounded-md bg-brand-light-secondary/70 dark:bg-white/10 text-xs font-medium text-brand-text-light-secondary dark:text-white/60">
                                    {review.category}
                                  </span>
                                )}
                                <span className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${statusBadge(review.status)}`}>
                                  {statusLabel(review.status)}
                                </span>
                              </div>

                              <p className="text-sm font-semibold text-brand-text-light-primary dark:text-white leading-relaxed mb-4">
                                {review.questionText || `Question ${index + 1}`}
                              </p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="rounded-xl border border-brand-light-tertiary/50 dark:border-white/10 bg-brand-light-secondary/50 dark:bg-white/[0.04] p-3">
                                  <p className="text-[11px] uppercase tracking-wider text-brand-text-light-secondary dark:text-white/50 mb-1">Your Answer</p>
                                  <p className="text-sm text-brand-text-light-primary dark:text-white whitespace-pre-wrap break-words">
                                    {selectedAnswer}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-brand-light-tertiary/50 dark:border-white/10 bg-brand-light-secondary/50 dark:bg-white/[0.04] p-3">
                                  <p className="text-[11px] uppercase tracking-wider text-brand-text-light-secondary dark:text-white/50 mb-1">Correct Answer</p>
                                  <p className="text-sm text-brand-text-light-primary dark:text-white whitespace-pre-wrap break-words">
                                    {correctAnswer}
                                  </p>
                                </div>
                              </div>

                              {review.options && review.options.length > 0 && (
                                <div className="mt-4 space-y-2">
                                  {review.options
                                    .filter(option => 
                                      (review.selectedOptionId && option.id === review.selectedOptionId) || 
                                      (review.correctOptionId && option.id === review.correctOptionId)
                                    )
                                    .map((option) => {
                                      const isSelected = Boolean(review.selectedOptionId && option.id === review.selectedOptionId);
                                      const isCorrect = Boolean(review.correctOptionId && option.id === review.correctOptionId);
                                      return (
                                        <div
                                          key={`${review.questionId}-${option.id}`}
                                          className={`rounded-lg border px-3 py-2 text-sm ${
                                            isCorrect
                                              ? "border-brand-green/40 bg-brand-green/10 dark:bg-brand-green/20"
                                              : isSelected
                                                ? "border-rose-300 bg-rose-50 dark:bg-rose-500/20 dark:border-rose-500/30"
                                                : "border-brand-light-tertiary/60 bg-white dark:bg-white/[0.02]"
                                          }`}
                                        >
                                          <span className="text-brand-text-light-primary dark:text-white">{option.text}</span>
                                          {isCorrect && (
                                            <span className="ml-2 text-xs font-semibold text-brand-green">Correct</span>
                                          )}
                                          {isSelected && !isCorrect && (
                                            <span className="ml-2 text-xs font-semibold text-rose-600 dark:text-rose-400">Your choice</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};


export default DetailedResultModal;
