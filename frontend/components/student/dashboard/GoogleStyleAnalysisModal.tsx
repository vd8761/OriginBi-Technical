"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Exam } from "../ExamCarousel";
import type { ExamDetailData } from "@/lib/exams";
import type { AssessmentResult, SectionResult } from "@/lib/progress";

interface GoogleStyleAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  result: AssessmentResult | null;
  detail: ExamDetailData | null;
}

const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);


const GoogleStyleAnalysisModal: React.FC<GoogleStyleAnalysisModalProps> = ({ 
  isOpen, 
  onClose, 
  exam, 
  result, 
  detail 
}) => {
  const sections = result?.sections?.length ? result.sections :
    detail?.sections?.map((s, i) => ({ name: s.name, score: 70 + ((i * 13) % 25), weight: s.weight })) || [];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#1ed36a";
    if (score >= 65) return "#3b82f6";
    if (score >= 50) return "#f59e0b";
    return "#f43f5e";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 65) return "Good";
    if (score >= 50) return "Fair";
    return "Needs Improvement";
  };

  const analyzePerformance = (sections: SectionResult[]) => {
    const strong = sections.filter(s => s.score >= 75);
    const developing = sections.filter(s => s.score >= 50 && s.score < 75);
    const needsFocus = sections.filter(s => s.score < 50);
    return { strong, developing, needsFocus };
  };

  const analysis = analyzePerformance(sections);
  const sortedByScore = [...sections].sort((a, b) => a.score - b.score);
  const laggingTopics = analysis.needsFocus.length
    ? analysis.needsFocus
    : sortedByScore.slice(0, Math.min(3, sortedByScore.length));
  const strengthTopics = analysis.strong.length
    ? analysis.strong
    : sortedByScore.slice(-3).reverse();
  const developingTopics = analysis.developing;
  const focusTargets = laggingTopics.map((topic) => ({
    ...topic,
    gap: Math.max(0, 70 - topic.score),
  }));
  const completedAtLabel = result?.completedAt
    ? new Date(result.completedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "-";
  const timeMinutes = parseInt(result?.timeTaken || "0", 10);
  const timePerQ = timeMinutes > 0 && exam?.questions > 0
    ? (timeMinutes / exam.questions).toFixed(1)
    : "-";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150]"
          />

          {/* Modal - with top margin so it doesn't hide behind nav bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-20 bottom-4 left-4 right-4 sm:top-24 sm:bottom-6 sm:left-6 sm:right-6 md:top-28 md:bottom-8 md:left-8 md:right-8 z-[151] flex flex-col"
          >
            <div className="w-full h-full bg-white dark:bg-[#19211c] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-white/10">
              
              {/* Header */}
              <div className="shrink-0 bg-white dark:bg-[#19211c] px-6 sm:px-8 py-5 border-b border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: `${exam?.accentColor}15`, color: exam?.accentColor }}
                    >
                      {exam?.icon}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Assessment Results</p>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{exam?.title}</h2>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <CloseIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>

              {/* Content - All sections in one scrollable view, no tabs */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 sm:p-8 space-y-10">

                  {/* Executive Summary */}
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] gap-8 items-center">
                      <div className="flex justify-center lg:justify-start">
                        <div className="relative w-36 h-36">
                          <svg className="w-full h-full -rotate-90">
                            <defs>
                              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#1ed36a" stopOpacity="1" />
                                <stop offset="100%" stopColor="#1ed36a" stopOpacity="0.6" />
                              </linearGradient>
                            </defs>
                            <circle cx="72" cy="72" r="64" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                            <circle
                              cx="72" cy="72" r="64" fill="none"
                              stroke="url(#scoreGradient)"
                              strokeWidth="12" strokeLinecap="round"
                              strokeDasharray={402}
                              strokeDashoffset={402 - (402 * (result?.overallScore || 0)) / 100}
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">{result?.overallScore || 0}%</span>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">{getScoreLabel(result?.overallScore || 0)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Assessment Summary
                          <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                          <span className="normal-case tracking-normal">Completed {completedAtLabel}</span>
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-b border-gray-200 dark:border-white/10 py-4">
                          <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Accuracy</p>
                            <p className="text-xl font-semibold text-gray-900 dark:text-white">{result?.accuracy || 0}%</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Time Taken</p>
                            <p className="text-xl font-semibold text-gray-900 dark:text-white">{result?.timeTaken || "0 min"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Pace / Question</p>
                            <p className="text-xl font-semibold text-gray-900 dark:text-white">{timePerQ}m</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Sections</p>
                            <p className="text-xl font-semibold text-gray-900 dark:text-white">{sections.length}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section Performance */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Section Performance</h3>
                      <div className="space-y-2">
                        {sections.map((section, idx) => (
                          <motion.div
                            key={section.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.08 * idx }}
                            className="grid grid-cols-12 items-center gap-4 py-3 border-b border-gray-200 dark:border-white/10"
                          >
                            <div className="col-span-12 sm:col-span-4">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{section.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Weight {section.weight}</p>
                            </div>
                            <div className="col-span-9 sm:col-span-6">
                              <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${section.score}%` }}
                                  transition={{ delay: 0.2 + idx * 0.08, duration: 0.7 }}
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{ backgroundColor: getScoreColor(section.score) }}
                                />
                              </div>
                            </div>
                            <div className="col-span-3 sm:col-span-2 text-right">
                              <p className="text-sm font-semibold" style={{ color: getScoreColor(section.score) }}>{section.score}%</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">{getScoreLabel(section.score)}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 dark:border-white/10"></div>

                  {/* Performance Insights Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-1 h-6 bg-brand-green rounded-full"></div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Performance Insights</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Strengths, developing areas, and lagging topics based on section scores.</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="border-l-2 border-emerald-500 pl-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Strengths</h4>
                        {strengthTopics.length > 0 ? (
                          <ul className="space-y-2">
                            {strengthTopics.map((s) => (
                              <li key={s.name} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                                <span>{s.name}</span>
                                <span className="text-xs font-semibold" style={{ color: getScoreColor(s.score) }}>{s.score}%</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">No strong areas yet.</p>
                        )}
                      </div>

                      <div className="border-l-2 border-amber-500 pl-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Developing</h4>
                        {developingTopics.length > 0 ? (
                          <ul className="space-y-2">
                            {developingTopics.map((s) => (
                              <li key={s.name} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                                <span>{s.name}</span>
                                <span className="text-xs font-semibold" style={{ color: getScoreColor(s.score) }}>{s.score}%</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">No developing areas to highlight.</p>
                        )}
                      </div>

                      <div className="border-l-2 border-rose-500 pl-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Lagging Topics</h4>
                        {laggingTopics.length > 0 ? (
                          <ul className="space-y-2">
                            {laggingTopics.map((s) => (
                              <li key={s.name} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                                <span>{s.name}</span>
                                <span className="text-xs font-semibold" style={{ color: getScoreColor(s.score) }}>{s.score}%</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">No lagging topics detected.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 dark:border-white/10"></div>

                  {/* Study Focus */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Study Focus</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Prioritize these topics next. This list is based on your lowest-scoring sections.</p>

                    {focusTargets.length > 0 ? (
                      <ol className="space-y-3">
                        {focusTargets.map((topic, idx) => {
                          const gapLabel = topic.gap > 0 ? `Gap ${topic.gap} pts` : "On target";
                          return (
                            <li
                              key={topic.name}
                              className="grid grid-cols-[24px_1fr_auto] gap-4 items-start border-b border-gray-200 dark:border-white/10 pb-3"
                            >
                              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">{idx + 1}.</span>
                              <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{topic.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Current {topic.score}%. Target 70% baseline.</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold" style={{ color: getScoreColor(topic.score) }}>{topic.score}%</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">{gapLabel}</p>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No focus topics identified. Maintain your current performance.</p>
                    )}
                  </div>

                </div>
              </div>

              {/* Action Footer */}
              <div className="px-6 sm:px-8 py-5 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#24272b]">
                <div className="flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl bg-white dark:bg-[#303438] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GoogleStyleAnalysisModal;
