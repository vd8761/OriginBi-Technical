"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EXAMS, EXAM_DETAILS, CODING_LANGUAGES, type AssessmentId, type ExtendedExam } from "@/lib/exams";
import { usePaidAssessments, codingPaymentKey, type PaymentKey } from "@/lib/payments";
import { useAssessmentResults, deriveCareerIdentity, type AssessmentResult } from "@/lib/progress";
import DetailedResultModal from "./DetailedResultModal";
import type { Exam } from "../ExamCarousel";

// Icons
const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ChartIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const TargetIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const TrendUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const AwardIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

interface ActiveDashboardProps { 
  userName: string; 
  onSelectExam: (exam: Exam) => void; 
  onStartExam: (exam: Exam) => void; 
}

function examPaidStatus(exam: ExtendedExam, isPaid: (k: PaymentKey) => boolean): "paid" | "partial" | "none" {
  if (exam.id === "coding") { 
    const c = CODING_LANGUAGES.filter((l) => isPaid(codingPaymentKey(l.id))).length; 
    return c === 0 ? "none" : c === CODING_LANGUAGES.length ? "paid" : "partial"; 
  }
  return isPaid(exam.id as AssessmentId) ? "paid" : "none";
}

// Generate personality traits based on completed assessments and scores
const generatePersonalityTraits = (completedIds: AssessmentId[], results: Record<string, AssessmentResult>): string[] => {
  const traits: string[] = [];
  const hasAptitude = completedIds.includes("aptitude");
  const hasCommunication = completedIds.includes("communication");
  const hasCoding = completedIds.includes("coding");
  const hasRole = completedIds.includes("role");
  
  // Check scores for each assessment
  const aptitudeScore = results.aptitude?.overallScore || 0;
  const communicationScore = results.communication?.overallScore || 0;
  const codingScore = results.coding?.overallScore || 0;
  
  if (hasAptitude && aptitudeScore >= 75) traits.push("Logical Thinker");
  if (hasAptitude && aptitudeScore >= 60 && aptitudeScore < 75) traits.push("Analytical Mind");
  if (hasCommunication && communicationScore >= 75) traits.push("Articulate Communicator");
  if (hasCommunication && communicationScore >= 60 && communicationScore < 75) traits.push("Clear Expresser");
  if (hasCoding && codingScore >= 75) traits.push("Code Architect");
  if (hasCoding && codingScore >= 60 && codingScore < 75) traits.push("Problem Solver");
  if (hasRole) traits.push("Strategic Decision-Maker");
  
  // Combined traits
  if (hasAptitude && hasCommunication && aptitudeScore >= 70 && communicationScore >= 70) {
    traits.push("Business Leader");
  }
  if (hasAptitude && hasCoding && aptitudeScore >= 70 && codingScore >= 70) {
    traits.push("Tech Visionary");
  }
  if (hasAptitude && hasCommunication && hasCoding) {
    traits.push("Full-Spectrum Professional");
  }
  
  return traits.length > 0 ? traits : ["Rising Talent"];
};

const ActiveDashboard: React.FC<ActiveDashboardProps> = ({ userName, onSelectExam, onStartExam }) => {
  const { isPaid } = usePaidAssessments();
  const { results, isCompleted, getResult } = useAssessmentResults();
  const [selectedResult, setSelectedResult] = useState<{ exam: Exam; result: AssessmentResult } | null>(null);

  const purchasedExams = EXAMS.filter((e) => examPaidStatus(e as ExtendedExam, isPaid) !== "none");
  const unpurchasedExams = EXAMS.filter((e) => examPaidStatus(e as ExtendedExam, isPaid) === "none" && e.available);
  const completedIds = Object.keys(results) as AssessmentId[];
  const identity = deriveCareerIdentity(completedIds);
  const personalityTraits = generatePersonalityTraits(completedIds, results);
  
  const statusOf = (exam: Exam): "completed" | "pending" => 
    isCompleted(exam.id as AssessmentId) ? "completed" : "pending";

  // Calculate overall progress stats
  const completedCount = completedIds.length;
  const purchasedCount = purchasedExams.length;
  const progressPercentage = purchasedCount > 0 ? Math.round((completedCount / purchasedCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-10 pt-2">
      {/* ── HERO HEADER WITH BIG PERSONALITY TYPE ── */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.7 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-brand-green/20 dark:border-brand-green/15 bg-gradient-to-br from-[#0d1f12] via-[#111f16] to-[#0a1a0f] p-8 sm:p-12 lg:p-16"
      >
        {/* Animated Background Effects */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-brand-green/15 via-emerald-500/5 to-transparent rounded-full blur-[150px] -translate-y-1/3 translate-x-1/4 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-600/10 via-brand-green/5 to-transparent rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzNDQwNDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative z-10">
          {/* Top Row: Name and XP */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div>
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3 mb-3"
              >
                <span className="text-sm font-medium text-white/60 uppercase tracking-wider">Welcome back</span>
                <div className="h-px w-8 bg-white/20" />
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.3 }}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight"
              >
                {userName}
              </motion.h1>
            </div>
            
            {/* Career Intelligence Score - Creative Alternative to XP */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ delay: 0.3 }}
              className="flex items-center gap-4 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-md border border-white/[0.12] rounded-2xl px-6 py-4 relative overflow-hidden"
            >
              {/* Animated background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-brand-green/10 via-transparent to-emerald-500/10 opacity-0 hover:opacity-100 transition-opacity duration-500" />
              
              <div className="text-right relative z-10">
                <div className="flex items-center gap-2 justify-end mb-1">
                  <SparklesIcon className="w-3.5 h-3.5 text-brand-green" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">Career Intelligence</p>
                </div>
                <p className="text-3xl font-black text-white tracking-tight">
                  {identity.xp > 0 ? Math.round((identity.xp / identity.xpToNext) * 100) : 0}
                  <span className="text-lg text-white/50 font-medium ml-1">/ 100</span>
                </p>
                <p className="text-[11px] text-white/40 mt-0.5">Insight Score</p>
              </div>
              
              {/* Creative Circular Progress with Pulsing Ring */}
              <div className="relative w-18 h-18">
                {/* Outer pulsing ring */}
                <div className="absolute inset-0 rounded-full border-2 border-brand-green/30 animate-ping" style={{ animationDuration: '3s' }} />
                
                <svg className="w-full h-full transform -rotate-90">
                  {/* Background track */}
                  <circle cx="36" cy="36" r="30" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-white/5" />
                  
                  {/* Progress arc with gradient */}
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="36" cy="36" r="30" fill="transparent" stroke="url(#progressGradient)" strokeWidth="4"
                    strokeDasharray={189} 
                    strokeDashoffset={189 - (189 * Math.min(100, (identity.xp / identity.xpToNext) * 100)) / 100}
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  />
                </svg>
                
                {/* Center content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <AwardIcon className="w-5 h-5 text-brand-green mx-auto mb-0.5" />
                    <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">
                      {identity.xp >= 800 ? "Elite" : identity.xp >= 400 ? "Pro" : "Explorer"}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* BIG PERSONALITY TYPE - The Main Feature */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mb-8"
          >
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {personalityTraits.slice(0, 2).map((trait, idx) => (
                <motion.span 
                  key={trait}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + idx * 0.1 }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-brand-green/20 to-emerald-500/10 border border-brand-green/30 text-sm font-bold text-brand-green"
                >
                  <SparklesIcon className="w-4 h-4" />
                  {trait}
                </motion.span>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
              <span className="text-white/60 text-lg sm:text-xl font-medium">You are a</span>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-green via-emerald-400 to-teal-400 tracking-tight">
                {identity.archetype}
              </h2>
            </div>
            <p className="text-white/50 text-base sm:text-lg mt-3 max-w-2xl leading-relaxed">
              {identity.subtitle}. {identity.quote}
            </p>
          </motion.div>

          {/* Badges & Stats Row */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.7 }}
            className="flex flex-wrap items-center gap-4"
          >
            {identity.badges.map((badge, i) => (
              <span 
                key={badge} 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-xs font-semibold text-white/70 hover:bg-white/[0.08] transition-all"
              >
                <AwardIcon className="w-3.5 h-3.5 text-brand-green" />
                {badge}
              </span>
            ))}
            <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block" />
            <div className="flex items-center gap-2 text-sm text-white/50">
              <ChartIcon className="w-4 h-4" />
              <span>{completedCount} of {purchasedCount} assessments completed</span>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── YOUR ASSESSMENTS RESULTS ── */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-text-light-primary dark:text-white tracking-tight">
              Your Assessment Results
            </h2>
            <p className="text-sm text-brand-text-light-secondary dark:text-white/50 mt-1">
              Track your progress and unlock detailed insights
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green/10 border border-brand-green/20">
            <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
            <span className="text-sm font-semibold text-brand-green">{progressPercentage}% Progress</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {purchasedExams.map((exam, idx) => {
            const status = statusOf(exam);
            const result = getResult(exam.id as AssessmentId);

            return (
              <motion.div 
                key={exam.id} 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.1 * idx }}
                className="group relative rounded-2xl border border-gray-100 dark:border-white/[0.08] bg-white dark:bg-brand-dark-secondary/80 shadow-sm hover:shadow-lg hover:shadow-brand-green/5 transition-all duration-300 overflow-hidden"
              >
                {/* Status Indicator Line */}
                <div 
                  className="absolute top-0 left-0 w-1 h-full" 
                  style={{ background: status === 'completed' ? exam.accentColor : '#f59e0b' }} 
                />
                
                <div className="p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center gap-6">
                  {/* Icon & Title */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-transform group-hover:scale-105"
                      style={{ 
                        background: `${exam.accentColor}10`, 
                        borderColor: `${exam.accentColor}30`, 
                        color: exam.accentColor 
                      }}
                    >
                      {exam.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="text-lg font-bold text-brand-text-light-primary dark:text-white truncate">
                          {exam.title}
                        </h3>
                        <span 
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            status === 'completed' 
                              ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' 
                              : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {status === 'completed' ? 'Completed' : 'Start Now'}
                        </span>
                      </div>
                      <p className="text-sm text-brand-text-light-secondary dark:text-white/50 line-clamp-2">
                        {exam.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-brand-text-light-secondary/70 dark:text-white/40">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5" />
                          {exam.duration}
                        </span>
                        <span>{exam.questions} questions</span>
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5">{exam.difficulty}</span>
                      </div>
                    </div>
                  </div>

                  {/* Score or Action */}
                  <div className="flex items-center gap-6 w-full lg:w-auto shrink-0">
                    {status === "completed" && result ? (
                      <>
                        {/* Score Display */}
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div 
                              className="text-3xl font-black"
                              style={{ color: result.overallScore >= 80 ? exam.accentColor : result.overallScore >= 60 ? '#f59e0b' : '#ef4444' }}
                            >
                              {result.overallScore}%
                            </div>
                            <div className="text-xs font-medium text-brand-text-light-secondary dark:text-white/40 mt-0.5">Score</div>
                          </div>
                          <div className="h-12 w-px bg-gray-100 dark:bg-white/10 hidden sm:block" />
                          <div className="text-center hidden sm:block">
                            <div className="text-xl font-bold text-brand-text-light-primary dark:text-white">{result.accuracy}%</div>
                            <div className="text-xs font-medium text-brand-text-light-secondary dark:text-white/40 mt-0.5">Accuracy</div>
                          </div>
                        </div>
                        
                        {/* View Details Button */}
                        <motion.button 
                          onClick={() => setSelectedResult({ exam, result })}
                          whileHover={{ scale: 1.02 }} 
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-brand-green to-emerald-500 text-white text-sm font-bold shadow-lg shadow-brand-green/20 hover:shadow-brand-green/30 transition-all"
                        >
                          View Details
                          <ChevronRightIcon className="w-4 h-4" />
                        </motion.button>
                      </>
                    ) : (
                      <motion.button 
                        onClick={() => onStartExam(exam)}
                        whileHover={{ scale: 1.02 }} 
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-green to-emerald-500 text-white text-sm font-bold shadow-lg shadow-brand-green/20 hover:shadow-brand-green/30 transition-all"
                      >
                        <PlayIcon className="w-4 h-4" />
                        Start Assessment
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* ── NEXT ASSESSMENT RECOMMENDATIONS ── */}
      {unpurchasedExams.length > 0 && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4, duration: 0.6 }}
          className="rounded-[2rem] border border-gray-100 dark:border-white/[0.08] bg-gradient-to-br from-white to-gray-50/50 dark:from-brand-dark-secondary/60 dark:to-brand-dark-primary/40 p-8 sm:p-10 backdrop-blur-xl"
        >
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-green/20 to-emerald-500/10 flex items-center justify-center text-brand-green shrink-0">
                <TargetIcon className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-text-light-primary dark:text-white tracking-tight">
                  Unlock Your Full Potential
                </h2>
                <p className="text-sm text-brand-text-light-secondary dark:text-white/50 mt-1 max-w-xl">
                  As a <span className="text-brand-green font-semibold">{identity.archetype}</span>, these assessments will reveal new dimensions of your capabilities and accelerate your career growth.
                </p>
              </div>
            </div>
          </div>

          {/* Recommendation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {unpurchasedExams.map((exam, idx) => {
              const detail = EXAM_DETAILS[exam.id as AssessmentId];
              const keyBenefit = detail?.outcomes[0] || "Comprehensive skill assessment";
              
              return (
                <motion.div 
                  key={exam.id} 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="group relative rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 hover:shadow-xl hover:shadow-brand-green/10 hover:border-brand-green/20 transition-all duration-300"
                >
                  {/* Price Badge */}
                  <div className="absolute top-4 right-4">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-brand-green/10 text-brand-green border border-brand-green/20">
                      ₹{exam.price}
                    </span>
                  </div>

                  {/* Icon */}
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 border transition-transform group-hover:scale-110"
                    style={{ 
                      background: `${exam.accentColor}12`, 
                      borderColor: `${exam.accentColor}30`, 
                      color: exam.accentColor 
                    }}
                  >
                    {exam.icon}
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-bold text-brand-text-light-primary dark:text-white mb-2 group-hover:text-brand-green transition-colors">
                    {exam.title}
                  </h3>
                  <p className="text-sm text-brand-text-light-secondary dark:text-white/50 leading-relaxed mb-4 line-clamp-2">
                    {exam.description}
                  </p>

                  {/* Key Benefit */}
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 dark:bg-white/5 mb-4">
                    <TrendUpIcon className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                    <span className="text-xs text-brand-text-light-secondary dark:text-white/60">{keyBenefit}</span>
                  </div>

                  {/* CTA */}
                  <motion.button 
                    onClick={() => onSelectExam(exam)} 
                    whileHover={{ scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-green to-emerald-500 text-white text-sm font-bold shadow-lg shadow-brand-green/20 hover:shadow-brand-green/30 transition-all flex items-center justify-center gap-2"
                  >
                    Explore Assessment
                    <ChevronRightIcon className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="mt-8 text-center">
            <p className="text-sm text-brand-text-light-secondary dark:text-white/50">
              Invest in yourself. Each assessment reveals skills you never knew you had.
            </p>
          </div>
        </motion.section>
      )}

      {/* ── DETAILED RESULT MODAL ── */}
      <DetailedResultModal
        isOpen={!!selectedResult}
        onClose={() => setSelectedResult(null)}
        exam={selectedResult?.exam || null}
        result={selectedResult?.result || null}
        detail={selectedResult ? EXAM_DETAILS[selectedResult.exam.id as AssessmentId] : null}
      />
    </div>
  );
};

export default ActiveDashboard;
