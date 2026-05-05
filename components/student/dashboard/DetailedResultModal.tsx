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

// Icons
const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TargetIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TrendUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

const BrainIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const LightningIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#f43f5e", "#06b6d4"];

// Generate detailed analysis based on section scores
const generateDetailedAnalysis = (sections: SectionResult[], examId: AssessmentId) => {
  const sortedByScore = [...sections].sort((a, b) => b.score - a.score);
  const strongAreas = sortedByScore.filter(s => s.score >= 75).slice(0, 2);
  const weakAreas = sortedByScore.filter(s => s.score < 60).slice(0, 2);
  const avgScore = sections.reduce((sum, s) => sum + s.score, 0) / sections.length;
  
  // Topic mapping based on exam type
  const topicMapping: Record<AssessmentId, Record<string, string[]>> = {
    aptitude: {
      "Quantitative Aptitude": ["Percentages", "Profit & Loss", "Time & Work", "Averages", "Simple & Compound Interest"],
      "Logical Reasoning": ["Series Patterns", "Seating Arrangements", "Blood Relations", "Syllogisms", "Direction Sense"],
      "Data Interpretation": ["Bar Charts", "Line Graphs", "Pie Charts", "Tables", "Caselets"],
      "Abstract Reasoning": ["Matrix Figures", "Visual Series", "Odd One Out", "Spatial Patterns"],
    },
    communication: {
      "Listening": ["Comprehension", "Inference", "Tone Analysis", "Detail Extraction"],
      "Speaking": ["Pronunciation", "Fluency", "Structure", "Confidence"],
      "Reading": ["Passage Understanding", "Inference", "Summaries", "Vocabulary"],
      "Writing": ["Grammar", "Organization", "Tone", "Conciseness"],
    },
    coding: {
      "Number Logic": ["Parity", "Digit Operations", "Mathematical Sequences", "Range Logic"],
      "Strings": ["Pattern Search", "Transformation", "Validation", "Text Counting"],
      "Arrays": ["Traversal", "Frequency Maps", "Pair Logic", "Window Techniques"],
      "Simulation": ["State Updates", "Rule Implementation", "Flow Control"],
    },
    mnc: {
      "Arrays and Hashing": ["Frequency Maps", "Two Pointers", "Subarrays", "Sorting"],
      "Trees and Graphs": ["Traversals", "Shortest Paths", "Connected Components"],
      "Dynamic Programming": ["State Definition", "Recurrence", "Memoization"],
      "Mixed Interview Set": ["Company Patterns", "Complexity Analysis"],
    },
    role: {
      "Conceptual MCQs": ["Domain Fundamentals", "Tools & Workflows", "Principles"],
      "Scenario Decisions": ["Conflict Resolution", "Priority Management", "Stakeholder Handling"],
      "Priority Calls": ["Constraint Management", "Decision Quality"],
      "Reflection Prompts": ["Communication Style", "Reasoning Clarity"],
    },
  };

  const topics = topicMapping[examId] || {};
  
  return {
    strongAreas,
    weakAreas,
    avgScore,
    topics,
    recommendations: weakAreas.map(w => ({
      area: w.name,
      action: `Focus on ${topics[w.name]?.slice(0, 2).join(" and ") || "core fundamentals"} with targeted practice`,
    })),
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
  
  const analysis = generateDetailedAnalysis(sections, exam.id as AssessmentId);
  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (circumference * result.overallScore) / 100;

  // Calculate timing analysis
  const totalMinutes = parseInt(result.timeTaken) || 60;
  const avgTimePerQuestion = (totalMinutes * 60 / 60).toFixed(1); // Assuming 60 questions default

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal - Fixed positioning below header */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="fixed left-4 right-4 top-[90px] bottom-4 sm:left-8 sm:right-8 sm:top-[100px] sm:bottom-8 lg:left-12 lg:right-12 lg:top-[100px] lg:bottom-12 z-50 overflow-hidden"
          >
            <div className="relative w-full h-full rounded-3xl bg-white dark:bg-[#0a0f0a] border border-gray-200 dark:border-white/10 shadow-2xl shadow-black/20 overflow-hidden flex flex-col">
              {/* Professional Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100 dark:border-white/10 bg-gradient-to-r from-gray-50/80 via-white to-gray-50/50 dark:from-white/[0.03] dark:via-[#0a0f0a] dark:to-white/[0.02] shrink-0">
                <div className="flex items-center gap-4">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 shadow-lg"
                    style={{ 
                      background: `linear-gradient(135deg, ${exam.accentColor}15, ${exam.accentColor}08)`, 
                      borderColor: `${exam.accentColor}40`, 
                      color: exam.accentColor,
                      boxShadow: `0 4px 20px ${exam.accentColor}25`
                    }}
                  >
                    {exam.icon}
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-green">Assessment Result</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-white/30" />
                      <span className="text-[10px] text-gray-400 dark:text-white/40">{new Date(result.completedAt).toLocaleDateString()}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{exam.title}</h2>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05, rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center transition-all border border-gray-200 dark:border-white/10"
                >
                  <CloseIcon className="w-5 h-5 text-gray-500 dark:text-white/60" />
                </motion.button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Professional Hero Score Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Main Score Card - Takes 5 columns */}
                  <div className="lg:col-span-5 rounded-3xl border border-gray-200 dark:border-white/10 bg-gradient-to-br from-white to-gray-50/80 dark:from-white/[0.05] dark:to-white/[0.02] p-8 flex flex-col items-center justify-center relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-green/10 to-transparent rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full blur-2xl" />
                    
                    <div className="relative w-40 h-40">
                      {/* Outer glow ring */}
                      <div className="absolute inset-0 rounded-full border-2 border-brand-green/20 animate-pulse" style={{ animationDuration: '4s' }} />
                      
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="80" cy="80" r="72" fill="transparent" stroke="currentColor" strokeWidth="6" className="text-gray-100 dark:text-white/5" />
                        <motion.circle
                          cx="80" cy="80" r="72" fill="transparent" stroke="url(#modalScoreGrad)" strokeWidth="8"
                          strokeDasharray={452} initial={{ strokeDashoffset: 452 }} animate={{ strokeDashoffset: 452 - (452 * result.overallScore) / 100 }}
                          transition={{ duration: 1.5, ease: [0.32, 0.72, 0, 1] }} strokeLinecap="round"
                          className="drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                        />
                        <defs>
                          <linearGradient id="modalScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={exam.accentColor} />
                            <stop offset="50%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#34d399" />
                          </linearGradient>
                        </defs>
                      </svg>
                      
                      {/* Center badge */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{result.overallScore}%</span>
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-white/40 mt-1">Overall</span>
                      </div>
                    </div>
                    
                    {/* Performance badge */}
                    <div className="mt-6 px-5 py-2 rounded-full border border-brand-green/30 bg-brand-green/10">
                      <p className="text-sm font-bold text-brand-green">
                        {result.overallScore >= 85 ? "🌟 Exceptional" : result.overallScore >= 70 ? "✨ Proficient" : result.overallScore >= 50 ? "📈 Developing" : "🌱 Starting Out"}
                      </p>
                    </div>
                  </div>

                  {/* Stats & Analysis - Takes 7 columns */}
                  <div className="lg:col-span-7 flex flex-col gap-4">
                    {/* Top Stats Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { icon: TargetIcon, label: "Accuracy", value: `${result.accuracy}%`, subtext: "Questions correct", color: exam.accentColor },
                        { icon: ClockIcon, label: "Duration", value: result.timeTaken, subtext: `of ${exam.duration}`, color: "#3b82f6" },
                        { icon: LightningIcon, label: "Speed", value: `${avgTimePerQuestion}s`, subtext: "per question", color: "#f59e0b" },
                        { icon: BrainIcon, label: "Sections", value: `${sections.length}`, subtext: "Areas tested", color: "#8b5cf6" },
                      ].map((stat, i) => (
                        <motion.div
                          key={stat.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * i }}
                          className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 hover:shadow-lg hover:shadow-brand-green/5 transition-all group"
                        >
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                            style={{ background: `linear-gradient(135deg, ${stat.color}15, ${stat.color}08)` }}
                          >
                            <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-white/40">{stat.label}</p>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                          <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">{stat.subtext}</p>
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* Quick Assessment Summary */}
                    <div className="flex-1 rounded-2xl border border-gray-100 dark:border-white/10 bg-gradient-to-r from-gray-50/50 to-white dark:from-white/[0.02] dark:to-transparent p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center">
                          <TrendUpIcon className="w-4 h-4 text-brand-green" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Performance Summary</h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-white/60 leading-relaxed">
                        {result.overallScore >= 80 
                          ? `Outstanding work! You demonstrated exceptional proficiency across all ${sections.length} sections. Your strong analytical skills and time management set you apart.` 
                          : result.overallScore >= 60 
                          ? `Good progress! You've shown solid understanding in key areas. Focus on the sections marked below to reach excellence.`
                          : `You're building your foundation. The detailed breakdown below shows exactly where to focus your efforts for maximum improvement.`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section Performance */}
                <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <TrendUpIcon className="w-4 h-4 text-green-500" />
                    Section-wise Performance
                  </h3>
                  <div className="space-y-5">
                    {sections.map((section, idx) => {
                      const isStrong = section.score >= 75;
                      const isWeak = section.score < 60;
                      return (
                        <div key={section.name}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ background: COLORS[idx % COLORS.length] }}
                              />
                              <span className="text-sm font-semibold text-gray-700 dark:text-white/80">{section.name}</span>
                              {isStrong && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-medium">Strong</span>}
                              {isWeak && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium">Needs Focus</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400 dark:text-white/40">Weight: {section.weight}</span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">{section.score}%</span>
                            </div>
                          </div>
                          <div className="h-2.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${section.score}%` }}
                              transition={{ duration: 1, delay: 0.2 + idx * 0.1 }}
                              className="h-full rounded-full"
                              style={{ background: COLORS[idx % COLORS.length] }}
                            />
                          </div>
                          {/* Topic breakdown for this section */}
                          {analysis.topics[section.name] && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {analysis.topics[section.name].map((topic, tidx) => (
                                <span 
                                  key={topic}
                                  className={`text-[10px] px-2 py-0.5 rounded-md ${
                                    isWeak 
                                      ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400" 
                                      : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-white/50"
                                  }`}
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Strengths & Areas to Improve */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strong Areas */}
                  <div className="rounded-2xl border border-green-200 dark:border-green-500/20 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-500/5 dark:to-transparent p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                        <TrendUpIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-sm font-bold text-green-800 dark:text-green-400">Your Strengths</h3>
                    </div>
                    {analysis.strongAreas.length > 0 ? (
                      <div className="space-y-3">
                        {analysis.strongAreas.map((area, idx) => (
                          <div key={area.name} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                              <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800 dark:text-white/80">{area.name}</p>
                              <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">{area.score}% accuracy</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-white/50">Complete more assessments to identify your strengths</p>
                    )}
                  </div>

                  {/* Weak Areas */}
                  <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-500/5 dark:to-transparent p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                        <TrendDownIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">Focus Areas</h3>
                    </div>
                    {analysis.weakAreas.length > 0 ? (
                      <div className="space-y-3">
                        {analysis.weakAreas.map((area, idx) => (
                          <div key={area.name} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                              <svg className="w-3 h-3 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800 dark:text-white/80">{area.name}</p>
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                {analysis.recommendations.find(r => r.area === area.name)?.action}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-white/50">Great job! No major weak areas identified.</p>
                    )}
                  </div>
                </div>

                {/* Timing Analysis */}
                <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-blue-500" />
                    Time Management Analysis
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5">
                      <p className="text-xs text-gray-500 dark:text-white/50 mb-1">Total Duration</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{result.timeTaken}</p>
                      <p className="text-xs text-gray-400 dark:text-white/40 mt-1">of {exam.duration} allowed</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5">
                      <p className="text-xs text-gray-500 dark:text-white/50 mb-1">Average per Question</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{avgTimePerQuestion}s</p>
                      <p className="text-xs text-gray-400 dark:text-white/40 mt-1">optimal: 45-60s</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5">
                      <p className="text-xs text-gray-500 dark:text-white/50 mb-1">Pacing Efficiency</p>
                      <p className={`text-lg font-bold ${parseFloat(avgTimePerQuestion) < 45 ? "text-green-500" : parseFloat(avgTimePerQuestion) > 75 ? "text-amber-500" : "text-blue-500"}`}>
                        {parseFloat(avgTimePerQuestion) < 45 ? "Fast" : parseFloat(avgTimePerQuestion) > 75 ? "Slow" : "Optimal"}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-white/40 mt-1">compared to avg</p>
                    </div>
                  </div>
                </div>

                {/* Insights */}
                {result.insights.length > 0 && (
                  <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-gradient-to-br from-gray-50 to-white dark:from-white/[0.02] dark:to-transparent p-6">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Key Insights</h3>
                    <div className="space-y-3">
                      {result.insights.map((insight, idx) => (
                        <div 
                          key={idx}
                          className={`p-3 rounded-xl border ${
                            insight.type === 'strength' 
                              ? 'border-green-200 dark:border-green-500/20 bg-green-50/50 dark:bg-green-500/5' 
                              : insight.type === 'improvement'
                              ? 'border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5'
                              : 'border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5'
                          }`}
                        >
                          <p className="text-sm text-gray-700 dark:text-white/70">{insight.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DetailedResultModal;
