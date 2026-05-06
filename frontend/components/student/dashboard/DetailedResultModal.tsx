"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Exam } from "../ExamCarousel";
import type { ExamDetailData, AssessmentId } from "@/lib/exams";
import type { AssessmentResult, SectionResult } from "@/lib/progress";

interface DetailedResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  result: AssessmentResult | null;
  detail: ExamDetailData | null;
}

// Simple Icons
const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const ArrowDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

const CircleCheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#f43f5e"];

// Simple analysis - just strong and weak areas
const analyzePerformance = (sections: SectionResult[]) => {
  const sorted = [...sections].sort((a, b) => b.score - a.score);
  return {
    strong: sorted.filter(s => s.score >= 75),
    developing: sorted.filter(s => s.score >= 50 && s.score < 75),
    needsFocus: sorted.filter(s => s.score < 50),
  };
};

const DetailedResultModal: React.FC<DetailedResultModalProps> = ({
  isOpen,
  onClose,
  exam,
  result,
  detail,
}) => {
  if (!isOpen || !exam || !result) return null;

  const sections = result.sections.length ? result.sections : 
    detail?.sections.map((s, i) => ({ name: s.name, score: 70 + ((i * 13) % 25), weight: s.weight })) || [];
  
  const analysis = analyzePerformance(sections);
  const avgTimePerQuestion = "60"; // Simplified

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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className="fixed left-4 right-4 top-[80px] bottom-4 sm:left-8 sm:right-8 sm:top-[90px] sm:bottom-8 lg:left-20 lg:right-20 lg:top-[100px] lg:bottom-12 z-50 overflow-hidden"
          >
            <div className="relative w-full h-full rounded-2xl bg-white dark:bg-[#0d1210] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col">
              {/* Clean Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${exam.accentColor}15`, color: exam.accentColor }}>
                    {exam.icon}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-white/50">Assessment Result</p>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{exam.title}</h2>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <CloseIcon className="w-5 h-5 text-gray-500 dark:text-white/60" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Hero Score Section */}
                <div className="px-6 py-6 border-b border-gray-100 dark:border-white/10">
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    {/* Big Score */}
                    <div className="flex items-center gap-4">
                      <div className="relative w-28 h-28">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="56" cy="56" r="50" fill="transparent" stroke="#e5e7eb" strokeWidth="6" className="dark:stroke-white/10" />
                          <circle
                            cx="56" cy="56" r="50" fill="transparent" stroke={result.overallScore >= 75 ? "#10b981" : result.overallScore >= 50 ? "#3b82f6" : "#f59e0b"}
                            strokeWidth="6" strokeLinecap="round"
                            strokeDasharray={314}
                            strokeDashoffset={314 - (314 * result.overallScore) / 100}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold text-gray-900 dark:text-white">{result.overallScore}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-white/50">Overall Score</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {result.overallScore >= 85 ? "Excellent" : result.overallScore >= 70 ? "Good" : result.overallScore >= 50 ? "Fair" : "Needs Work"}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-white/40 mt-1">
                          {result.accuracy}% accuracy • {result.timeTaken}
                        </p>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                        <p className="text-xs text-gray-500 dark:text-white/50">Sections</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{sections.length}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                        <p className="text-xs text-gray-500 dark:text-white/50">Accuracy</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.accuracy}%</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                        <p className="text-xs text-gray-500 dark:text-white/50">Time</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.timeTaken}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Cards */}
                <div className="px-6 py-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Section Performance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sections.map((section, idx) => {
                      const isStrong = section.score >= 75;
                      const isDeveloping = section.score >= 50 && section.score < 75;
                      const statusColor = isStrong ? "#10b981" : isDeveloping ? "#3b82f6" : "#f59e0b";
                      const statusLabel = isStrong ? "Strong" : isDeveloping ? "Developing" : "Needs Focus";
                      
                      return (
                        <div key={section.name} className="p-4 rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/[0.02]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-white/80">{section.name}</span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{ background: `${statusColor}15`, color: statusColor }}>
                              {statusLabel}
                            </span>
                          </div>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-bold" style={{ color: statusColor }}>{section.score}%</span>
                            <span className="text-xs text-gray-400 dark:text-white/40 mb-1">{section.weight} weight</span>
                          </div>
                          <div className="mt-2 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${section.score}%`, background: statusColor }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strong Areas */}
                    {analysis.strong.length > 0 && (
                      <div className="p-4 rounded-xl border border-green-200 dark:border-green-500/20 bg-green-50/50 dark:bg-green-500/5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                            <ArrowUpIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <h4 className="text-sm font-semibold text-green-800 dark:text-green-400">Your Strengths</h4>
                        </div>
                        <div className="space-y-2">
                          {analysis.strong.map(area => (
                            <div key={area.name} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700 dark:text-white/80">{area.name}</span>
                              <span className="font-medium text-green-600 dark:text-green-400">{area.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Focus Areas */}
                    {analysis.needsFocus.length > 0 && (
                      <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                            <AlertIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-400">Focus Areas</h4>
                        </div>
                        <div className="space-y-2">
                          {analysis.needsFocus.map(area => (
                            <div key={area.name} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700 dark:text-white/80">{area.name}</span>
                              <span className="font-medium text-amber-600 dark:text-amber-400">{area.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Simple Recommendations */}
                  <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <CircleCheckIcon className="w-4 h-4 text-brand-green" />
                      Recommendations
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-white/60">
                      {analysis.needsFocus.length > 0 
                        ? `Focus on ${analysis.needsFocus.map(a => a.name).join(" and ")} to improve your overall score. Regular practice in these areas will help you reach the next level.`
                        : analysis.developing.length > 0
                        ? `You're doing well! Continue practicing ${analysis.developing.map(a => a.name).join(" and ")} to strengthen your skills further.`
                        : "Excellent performance across all sections! Keep maintaining your strengths."}
                    </p>
                  </div>
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
