"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EXAMS, EXAM_DETAILS, CODING_LANGUAGES, type AssessmentId, type ExtendedExam } from "@/lib/exams";
import { usePaidAssessments, codingPaymentKey, type PaymentKey } from "@/lib/payments";
import { useAssessmentResults, deriveCareerIdentity } from "@/lib/progress";
import AssessmentResultCard from "./AssessmentResultCard";
import CareerIdentityBanner from "./CareerIdentityBanner";
import type { Exam } from "../ExamCarousel";

const TrendingUpIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>);
const ClockIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const BookOpenIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>);
const PlayIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const SparklesIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>);

interface ActiveDashboardProps { userName: string; onSelectExam: (exam: Exam) => void; onStartExam: (exam: Exam) => void; }

function examPaidStatus(exam: ExtendedExam, isPaid: (k: PaymentKey) => boolean): "paid" | "partial" | "none" {
  if (exam.id === "coding") { const c = CODING_LANGUAGES.filter((l) => isPaid(codingPaymentKey(l.id))).length; return c === 0 ? "none" : c === CODING_LANGUAGES.length ? "paid" : "partial"; }
  return isPaid(exam.id as AssessmentId) ? "paid" : "none";
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  completed: { bg: "bg-brand-green/10", text: "text-brand-green", border: "border-brand-green/20", dot: "bg-brand-green" },
  in_progress: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20", dot: "bg-blue-500" },
  pending: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20", dot: "bg-amber-500" },
};

const ActiveDashboard: React.FC<ActiveDashboardProps> = ({ userName, onSelectExam, onStartExam }) => {
  const { isPaid } = usePaidAssessments();
  const { results, isCompleted, getResult } = useAssessmentResults();
  const [expandedResult, setExpandedResult] = useState<AssessmentId | null>(null);

  const purchasedExams = EXAMS.filter((e) => examPaidStatus(e as ExtendedExam, isPaid) !== "none");
  const completedIds = Object.keys(results) as AssessmentId[];
  const identity = deriveCareerIdentity(completedIds);
  const statusOf = (exam: Exam): "completed" | "in_progress" | "pending" => isCompleted(exam.id as AssessmentId) ? "completed" : "pending";
  const overallProgress = Math.round((completedIds.length / Math.max(purchasedExams.length, 1)) * 100);
  const circumference = 2 * Math.PI * 38;

  return (
    <div className="flex flex-col gap-10">
      {/* Career Identity Banner */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}>
        <CareerIdentityBanner userName={userName} identity={identity} />
      </motion.div>

      {/* Welcome + Progress Overview */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-[1.5rem] border border-brand-light-tertiary/40 dark:border-white/[0.08] bg-brand-light-primary/80 dark:bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8"
      >
        <div>
          <h2 className="text-[26px] sm:text-[30px] font-bold text-brand-text-light-primary dark:text-white tracking-tight leading-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green to-emerald-400">{userName}</span>
          </h2>
          <p className="mt-2 text-sm text-brand-text-light-secondary dark:text-white/50">
            {purchasedExams.length} purchased assessment{purchasedExams.length !== 1 ? "s" : ""} · {completedIds.length} completed
          </p>
        </div>
        <div className="flex items-center gap-5">
          {/* Progress Ring */}
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r="38" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-brand-light-tertiary/20 dark:text-white/[0.06]" />
              <motion.circle cx="40" cy="40" r="38" fill="transparent" stroke="url(#progressGrad)" strokeWidth="5"
                strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference * (1 - overallProgress / 100) }}
                transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1], delay: 0.4 }} strokeLinecap="round"
              />
              <defs><linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1ed36a" /><stop offset="100%" stopColor="#10b981" /></linearGradient></defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-brand-green">{overallProgress}%</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-text-light-secondary dark:text-white/40">Progress</p>
            <p className="text-lg font-bold text-brand-text-light-primary dark:text-white tracking-tight">{completedIds.length} / {purchasedExams.length}</p>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Purchased", value: purchasedExams.length, color: "brand-green", icon: SparklesIcon },
          { label: "Completed", value: completedIds.length, color: "brand-green", icon: TrendingUpIcon },
          { label: "Pending", value: purchasedExams.length - completedIds.length, color: "amber-500", icon: ClockIcon },
          { label: "Avg Score", value: completedIds.length > 0 ? `${Math.round(completedIds.reduce((s, id) => s + (results[id]?.overallScore || 0), 0) / completedIds.length)}%` : "—", color: "blue-500", icon: BookOpenIcon },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
            className="rounded-2xl border border-brand-light-tertiary/40 dark:border-white/[0.08] bg-brand-light-primary/70 dark:bg-white/[0.03] backdrop-blur-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-text-light-secondary dark:text-white/40">{stat.label}</p>
              <stat.icon className={`w-4 h-4 text-${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-brand-text-light-primary dark:text-white tracking-tight">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Assessment Cards */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[18px] font-bold text-brand-text-light-primary dark:text-white tracking-tight">Your Assessments</h3>
          <span className="text-xs font-semibold text-brand-text-light-secondary dark:text-white/40">{purchasedExams.length} active</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {purchasedExams.map((exam, idx) => {
            const status = statusOf(exam);
            const result = getResult(exam.id as AssessmentId);
            const isExpanded = expandedResult === exam.id;
            const pct = result ? result.overallScore : 0;
            const style = STATUS_STYLES[status];

            return (
              <motion.div key={exam.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx, duration: 0.5 }} whileHover={{ y: -6, transition: { duration: 0.3 } }}
                className="group relative overflow-hidden rounded-[1.5rem] border border-brand-light-tertiary/40 dark:border-white/[0.08] bg-brand-light-primary/80 dark:bg-brand-dark-secondary/80 backdrop-blur-xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(25,33,28,0.06)] hover:shadow-[0_30px_70px_rgba(30,211,106,0.1)] transition-all duration-500 flex flex-col"
              >
                <div className="absolute inset-0 rounded-[1.5rem] bg-gradient-to-br from-brand-green/[0.06] via-transparent to-brand-green/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-25 transition-opacity duration-500" style={{ background: exam.accentColor }} />

                {/* Header */}
                <div className="flex items-start justify-between mb-5 relative z-10">
                  <motion.div whileHover={{ rotate: 5, scale: 1.08 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex h-14 w-14 items-center justify-center rounded-[16px]"
                    style={{ background: `${exam.accentColor}15`, color: exam.accentColor, border: `1px solid ${exam.accentColor}30` }}
                  >{exam.icon}</motion.div>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3.5 py-1.5 rounded-full border uppercase tracking-[0.1em] ${style.bg} ${style.text} ${style.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {status === "completed" ? "Completed" : status === "in_progress" ? "In Progress" : "Pending"}
                  </span>
                </div>

                <h4 className="text-[16px] font-bold text-brand-text-light-primary dark:text-white tracking-tight relative z-10">{exam.shortTitle}</h4>
                <p className="mt-2 text-xs text-brand-text-light-secondary dark:text-white/50 leading-relaxed line-clamp-2 relative z-10">{exam.description}</p>

                {/* Progress or Meta */}
                <div className="mt-5 flex items-center gap-4 relative z-10">
                  {status === "completed" && result ? (
                    <div className="flex items-center gap-4">
                      <div className="relative w-14 h-14 shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="3" className="text-brand-light-tertiary/20 dark:text-white/[0.06]" />
                          <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="3.5" strokeDasharray={2 * Math.PI * 24} strokeDashoffset={2 * Math.PI * 24 * (1 - pct / 100)} strokeLinecap="round" className="text-brand-green" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-brand-text-light-primary dark:text-white">{pct}%</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-brand-text-light-primary dark:text-white">{result.accuracy}% accuracy</p>
                        <p className="text-[11px] text-brand-text-light-secondary dark:text-white/40">{result.timeTaken}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-xs text-brand-text-light-secondary dark:text-white/40">
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-light-secondary/30 dark:bg-white/[0.04]"><ClockIcon className="w-3.5 h-3.5 text-brand-green" />{exam.duration}</span>
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-light-secondary/30 dark:bg-white/[0.04]"><BookOpenIcon className="w-3.5 h-3.5 text-violet-500" />{exam.questions} Qs</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-auto pt-6 flex items-center gap-3 relative z-10">
                  {status === "completed" && result ? (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => setExpandedResult(isExpanded ? null : (exam.id as AssessmentId))}
                      className="flex-1 py-3 rounded-[12px] border border-brand-green/30 bg-brand-green/[0.08] text-brand-green text-xs font-bold hover:bg-brand-green/15 transition-all"
                    >{isExpanded ? "Hide Results" : "View Results"}</motion.button>
                  ) : (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => onStartExam(exam)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[12px] bg-gradient-to-r from-brand-green to-emerald-500 text-white text-xs font-bold shadow-lg shadow-brand-green/25"
                    ><PlayIcon className="w-4 h-4" />Start Now</motion.button>
                  )}
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectExam(exam)}
                    className="px-5 py-3 rounded-[12px] border border-brand-light-tertiary/60 dark:border-white/[0.1] bg-brand-light-primary/80 dark:bg-white/[0.05] text-brand-text-light-primary dark:text-white text-xs font-bold hover:bg-brand-light-secondary dark:hover:bg-white/[0.08] transition-all"
                  >Details</motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Expanded Result */}
      <AnimatePresence>
        {expandedResult && (
          <motion.section initial={{ opacity: 0, y: 20, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: 20, height: 0 }} transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-bold text-brand-text-light-primary dark:text-white tracking-tight">Detailed Results</h3>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setExpandedResult(null)}
                className="text-xs font-bold text-brand-text-light-secondary dark:text-white/40 hover:text-brand-text-light-primary dark:hover:text-white transition-colors"
              >Close</motion.button>
            </div>
            {(() => { const exam = EXAMS.find((e) => e.id === expandedResult)!; const result = getResult(expandedResult)!; const detail = EXAM_DETAILS[expandedResult] ?? null; return <AssessmentResultCard exam={exam} result={result} detail={detail} />; })()}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Continue Learning */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
        className="rounded-[1.5rem] border border-brand-light-tertiary/40 dark:border-white/[0.08] bg-brand-light-primary/80 dark:bg-white/[0.03] backdrop-blur-xl p-7 sm:p-9"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-[18px] font-bold text-brand-text-light-primary dark:text-white tracking-tight">Continue Learning</h3>
            <p className="mt-1 text-xs text-brand-text-light-secondary dark:text-white/50">Recommended based on your journey</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXAMS.filter((e) => examPaidStatus(e as ExtendedExam, isPaid) === "none" && e.available).map((exam, idx) => (
            <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * idx }} whileHover={{ y: -2 }}
              className="flex items-center gap-4 rounded-2xl border border-brand-light-tertiary/40 dark:border-white/[0.08] bg-brand-light-secondary/25 dark:bg-white/[0.03] p-4 transition-all hover:border-brand-green/30"
            >
              <motion.div whileHover={{ rotate: 5, scale: 1.05 }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]"
                style={{ background: `${exam.accentColor}15`, color: exam.accentColor, border: `1px solid ${exam.accentColor}30` }}
              >{exam.icon}</motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-brand-text-light-primary dark:text-white truncate">{exam.shortTitle}</p>
                <p className="text-[11px] text-brand-text-light-secondary dark:text-white/40 mt-0.5">₹{exam.price} · {exam.duration}</p>
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onSelectExam(exam)}
                className="px-4 py-2 rounded-[10px] bg-gradient-to-r from-brand-green to-emerald-500 text-white text-[10px] font-bold shadow-md shadow-brand-green/20"
              >Unlock</motion.button>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
};

export default ActiveDashboard;
