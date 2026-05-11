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

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TargetIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LightbulbIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const BarChartIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const AwardIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
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

                  {/* Score Overview Section */}
                  <div className="space-y-8">
                    <div className="flex flex-col lg:flex-row items-center gap-8">
                      {/* Score Ring */}
                      <div className="shrink-0">
                        <div className="relative w-36 h-36 mx-auto lg:mx-0">
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

                      {/* Quick Stats */}
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                          <ClockIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 mb-2" />
                          <p className="text-xl font-bold text-gray-900 dark:text-white">{result?.timeTaken || "0 min"}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                          <TargetIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 mb-2" />
                          <p className="text-xl font-bold text-gray-900 dark:text-white">{result?.accuracy || 0}%</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Accuracy</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                          <BarChartIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 mb-2" />
                          <p className="text-xl font-bold text-gray-900 dark:text-white">{sections.length}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sections</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                          <AwardIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 mb-2" />
                          <p className="text-xl font-bold text-gray-900 dark:text-white">{exam?.questions || 0}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Questions</p>
                        </div>
                      </div>
                    </div>

                    {/* Section Breakdown */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Section Performance</h3>
                      <div className="space-y-3">
                        {sections.map((section, idx) => (
                          <motion.div
                            key={section.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * idx }}
                            className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                          >
                            <div className="w-10 h-10 rounded-lg bg-white dark:bg-[#303438] flex items-center justify-center font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white">{section.name}</h4>
                                <span className="text-sm font-bold" style={{ color: getScoreColor(section.score) }}>{section.score}%</span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${section.score}%` }}
                                  transition={{ delay: 0.2 + idx * 0.1, duration: 0.8 }}
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{ backgroundColor: getScoreColor(section.score) }}
                                />
                              </div>
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
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Analysis of your strengths and areas for improvement</p>

                    <div className="grid gap-4">
                      {analysis.strong.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="p-5 rounded-xl bg-brand-green/[0.06] border border-brand-green/20"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-brand-green/20 flex items-center justify-center flex-shrink-0">
                              <CheckCircleIcon className="w-5 h-5 text-brand-green" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 dark:text-white mb-1">Strong Areas</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                You demonstrated excellent performance in these areas:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {analysis.strong.map((s, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 rounded-lg bg-white dark:bg-[#303438] text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10"
                                  >
                                    {s.name} ({s.score}%)
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {analysis.developing.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="p-5 rounded-xl bg-amber-500/[0.06] border border-amber-500/20"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                              <TrendingUpIcon className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 dark:text-white mb-1">Developing Areas</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                These areas show good potential for improvement:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {analysis.developing.map((s, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 rounded-lg bg-white dark:bg-[#303438] text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10"
                                  >
                                    {s.name} ({s.score}%)
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {analysis.needsFocus.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="p-5 rounded-xl bg-rose-500/[0.06] border border-rose-500/20"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                              <LightbulbIcon className="w-5 h-5 text-rose-500" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 dark:text-white mb-1">Areas Requiring Focus</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Focus on these areas to improve your overall performance:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {analysis.needsFocus.map((s, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 rounded-lg bg-white dark:bg-[#303438] text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10"
                                  >
                                    {s.name} ({s.score}%)
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 dark:border-white/10"></div>

                  {/* Recommendations Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Personalized Recommendations</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Actionable steps to improve your performance</p>

                    <div className="grid gap-4">
                      {[
                        {
                          title: "Daily Practice Routine",
                          description: "Spend 30 minutes daily on problem-solving exercises. Focus on weak areas identified in this analysis.",
                          priority: "High",
                          estimatedTime: "2 weeks",
                          icon: <TargetIcon className="w-5 h-5 text-brand-green" />
                        },
                        {
                          title: "Advanced Study Materials",
                          description: "Explore advanced resources and practice problems to deepen your understanding.",
                          priority: "Medium",
                          estimatedTime: "1 month",
                          icon: <LightbulbIcon className="w-5 h-5 text-blue-500" />
                        },
                        {
                          title: "Mock Assessments",
                          description: "Take weekly mock tests to track progress and build exam confidence.",
                          priority: "High",
                          estimatedTime: "Ongoing",
                          icon: <AwardIcon className="w-5 h-5 text-purple-500" />
                        },
                      ].map((rec, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * idx }}
                          className="p-5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-white dark:bg-[#303438] flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-white/10">
                              {rec.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-gray-900 dark:text-white">{rec.title}</h4>
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                  rec.priority === 'High' 
                                    ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' 
                                    : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                                }`}>
                                  {rec.priority} Priority
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{rec.description}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <ClockIcon className="w-4 h-4" />
                                  {rec.estimatedTime}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* Action Footer */}
              <div className="px-6 sm:px-8 py-5 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#24272b]">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl bg-white dark:bg-[#303438] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    className="flex-1 px-6 py-3 rounded-xl bg-brand-green text-white font-bold hover:bg-[#19be5e] transition-colors flex items-center justify-center gap-2"
                  >
                    <TargetIcon className="w-5 h-5" />
                    Practice Again
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
