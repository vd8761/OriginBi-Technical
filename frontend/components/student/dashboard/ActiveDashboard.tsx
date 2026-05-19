"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { EXAMS, EXAM_DETAILS, CODING_LANGUAGES, type AssessmentId, type ExtendedExam } from "@/lib/exams";
import { usePaidAssessments, codingPaymentKey, type PaymentKey } from "@/lib/payments";
import { useAssessmentResults, deriveCareerIdentity, type AssessmentResult, type SectionResult } from "@/lib/progress";
import { useAssessmentTracker } from "@/lib/assessmentTracker";
import dynamic from "next/dynamic";

const GoogleStyleAnalysisModal = dynamic(() => import("./GoogleStyleAnalysisModal"), { ssr: false });
const CertificatePreviewModal = dynamic(() => import("../certificate/CertificatePreviewModal"), { ssr: false });
import type { Exam } from "../ExamCarousel";
import { type InProgressAttempt } from "@/lib/assessmentResume";

// ── Icons ──
const PlayIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TargetIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const TrendUpIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const ChevronRightIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
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

const ShareIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const DownloadIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const EyeIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const LinkedInIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const BarChartIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

// ── Helpers ──
interface ActiveDashboardProps {
  userName: string;
  onSelectExam: (exam: Exam) => void;
  onStartExam: (exam: Exam) => void;
  inProgressAttempt?: InProgressAttempt | null;
  onResumeAttempt?: (attempt: InProgressAttempt) => void;
  dynamicExams?: Exam[];
}

function examPaidStatus(exam: ExtendedExam, isPaid: (k: PaymentKey) => boolean): "paid" | "partial" | "none" {
  if (exam.id === "coding") {
    const paidCount = CODING_LANGUAGES.filter((l) => isPaid(codingPaymentKey(l.id))).length;
    return paidCount === 0 ? "none" : paidCount === CODING_LANGUAGES.length ? "paid" : "partial";
  }
  return isPaid(exam.id as AssessmentId) ? "paid" : "none";
}

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

const formatTimeLeft = (seconds?: number) => {
  if (seconds === undefined || seconds === null) return "";
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
};

const labelForModule = (module: string) => {
  switch (module) {
    case "grammar":
      return "Communication";
    case "mnc":
      return "MNC Career";
    case "role":
      return "Role Based";
    case "aptitude":
      return "Aptitude";
    case "coding":
      return "Coding";
    default:
      return module;
  }
};

const getTraitImage = (archetype: string): string => {
  const map: Record<string, string> = {
    "Analytical Thinker": "/student_traits/Analytical_Leader.png",
    "Business Communicator": "/student_traits/Supportive_Energizer.png",
    "Technical Problem Solver": "/student_traits/Logical_Innovator.png",
    "Systems Architect": "/student_traits/Strategic_Stabilizer.png",
    "Creative Leader": "/student_traits/Charismatic_Leader.png",
    "Full Spectrum Professional": "/student_traits/Decisive_Analyst.png",
    "Explorer": "/student_traits/Creative_Thinker.png",
  };
  return map[archetype] || "/student_traits/Creative_Thinker.png";
};

// ── Sub-components (rendered outside main component to avoid IIFE issues) ──
const RingChart: React.FC<{ results: Record<string, AssessmentResult> }> = ({ results }) => {
  const metrics = [
    { r: 70, score: results.aptitude?.overallScore || 0, color: "#10b981" },
    { r: 56, score: results.communication?.overallScore || 0, color: "#06b6d4" },
    { r: 42, score: results.coding?.overallScore || 0, color: "#f59e0b" },
  ].filter(m => m.score > 0);
  const avg = metrics.length > 0
    ? Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length)
    : 0;

  return (
    <>
      {metrics.map((m, i) => {
        const c = 2 * Math.PI * m.r;
        const dash = (m.score / 100) * c;
        return (
          <motion.circle
            key={m.r}
            cx="80" cy="80" r={m.r}
            fill="none"
            stroke={m.color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ delay: 0.5 + i * 0.15, duration: 0.8 }}
          />
        );
      })}
      <text x="80" y="75" textAnchor="middle" className="fill-gray-900 dark:fill-white text-2xl font-black" style={{ transform: "rotate(90deg)", transformOrigin: "80px 80px" }}>
        {avg}
      </text>
      <text x="80" y="90" textAnchor="middle" className="fill-gray-500 dark:fill-gray-400 text-[8px] font-bold uppercase tracking-wider" style={{ transform: "rotate(90deg)", transformOrigin: "80px 80px" }}>
        Growth
      </text>
    </>
  );
};

const Legend: React.FC<{ results: Record<string, AssessmentResult> }> = ({ results }) => {
  const dims = [
    { key: "aptitude", label: "Aptitude", color: "#10b981" },
    { key: "communication", label: "Communication", color: "#06b6d4" },
    { key: "coding", label: "Coding", color: "#f59e0b" },
    { key: "mnc", label: "MNC Career", color: "#6366f1" },
    { key: "role", label: "Role Based", color: "#84cc16" },
  ];
  const completedDims = dims.filter(d => results[d.key]?.overallScore);

  if (completedDims.length === 0) return <div className="h-4" />;

  return (
    <div className="space-y-3">
      {completedDims.map((dim) => {
        const score = results[dim.key]!.overallScore;
        return (
          <div key={dim.key} className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dim.color }} />
            <span className="text-sm font-bold text-gray-900 dark:text-white dark:text-white flex-1">{dim.label}</span>
            <span className="text-sm font-black text-gray-900 dark:text-white dark:text-white">{score}%</span>
          </div>
        );
      })}
    </div>
  );
};

// ── Component ──
const ActiveDashboard: React.FC<ActiveDashboardProps> = ({
  userName,
  onSelectExam,
  onStartExam,
  inProgressAttempt,
  onResumeAttempt,
  dynamicExams,
}) => {
  const router = useRouter();
  const { isPaid } = usePaidAssessments();
  const { results, isCompleted, getResult } = useAssessmentResults();
  const {
    notifications,
    markNotificationRead,
    clearAllNotifications,
  } = useAssessmentTracker();
  const [selectedResult, setSelectedResult] = useState<{ exam: Exam; result: AssessmentResult } | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<{ exam: Exam; result: AssessmentResult } | null>(null);

  const baseExamsList = dynamicExams || EXAMS;
  const purchasedExams = baseExamsList.filter((e) => examPaidStatus(e as ExtendedExam, isPaid) !== "none");
  const unpurchasedExams = baseExamsList.filter((e) => examPaidStatus(e as ExtendedExam, isPaid) === "none" && e.available);
  const completedIds = Object.keys(results).filter(
    (key) => results[key as AssessmentId]?.mode !== 'trial'
  ) as AssessmentId[];
  const identity = deriveCareerIdentity(completedIds);

  const statusOf = (exam: Exam): "completed" | "pending" => {
    const res = getResult(exam.id as AssessmentId);
    return res && res.mode !== 'trial' ? "completed" : "pending";
  };

  const completedCount = completedIds.length;
  const purchasedCount = purchasedExams.length;

  return (
    <div className="flex flex-col gap-8 pt-2" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>

      {/* ===== GREETING ===== */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-3"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1ed36a] mb-1">Dashboard</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {userName && userName !== 'Student' ? `${userName.split(' ')[0]}'s` : 'Your'} Assessments
          </h1>
        </div>
        {completedCount > 0 && (
          <p className="text-sm text-gray-500 dark:text-slate-400 font-medium tabular-nums">
            {completedCount} of {purchasedCount} completed
          </p>
        )}
      </motion.div>

      {inProgressAttempt && onResumeAttempt && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-white/95 p-6 shadow-lg backdrop-blur-xl dark:border-amber-400/20 dark:bg-[#111a15]/90"
        >
          <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-amber-400/20 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-16 w-16 rounded-full bg-amber-200/20 blur-2xl" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <ClockIcon c="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Incomplete Assessment</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  Resume {inProgressAttempt.assessmentName || labelForModule(inProgressAttempt.module)}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {inProgressAttempt.timeLeftSeconds !== undefined
                    ? `Time left: ${formatTimeLeft(inProgressAttempt.timeLeftSeconds)}`
                    : "Your previous session is still active."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onResumeAttempt(inProgressAttempt)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-amber-500/30 transition hover:bg-amber-600"
            >
              Resume Now
              <ChevronRightIcon c="h-4 w-4" />
            </button>
          </div>
        </motion.section>
      )}

      {/* ===== HERO + 360 IMPACT: Side by side grid ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Personality card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-3 relative rounded-3xl overflow-hidden min-h-[280px] sm:min-h-[360px]"
        >
          <div className="absolute inset-0">
            <img
              src={getTraitImage(identity.archetype)}
              alt={identity.archetype}
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Content */}
          <div className="relative p-5 sm:p-6 flex flex-col h-full justify-start items-start">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="inline-block text-xs sm:text-sm font-bold text-white mb-0.5">
                Your Personality
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-[1.1] mb-2 max-w-[220px] sm:max-w-[280px]"
            >
              {identity.archetype}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <span className="text-white font-medium text-xs sm:text-sm leading-relaxed max-w-md">
                {identity.subtitle}
              </span>
            </motion.p>
          </div>
        </motion.section>

        {/* Right: 360 Impact card */}
        {completedCount > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="lg:col-span-2 rounded-3xl bg-white/80 dark:bg-[#1a2520] backdrop-blur-xl border border-gray-200 dark:border-white/[0.12] p-6 sm:p-8 flex flex-col"
          >
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">360° Impact Assessment</h2>
              <p className="text-xs text-gray-700 dark:text-slate-300 mt-1">Holistic growth across core professional dimensions</p>
            </div>

            {/* Ring chart */}
            <div className="flex-shrink-0 mx-auto mb-5">
              <div className="relative w-40 h-40 sm:w-48 sm:h-48">
                <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" className="text-[#f3f4f6] dark:text-white/10" strokeWidth="6" />
                  <circle cx="80" cy="80" r="56" fill="none" stroke="currentColor" className="text-[#f3f4f6] dark:text-white/10" strokeWidth="6" />
                  <circle cx="80" cy="80" r="42" fill="none" stroke="currentColor" className="text-[#f3f4f6] dark:text-white/10" strokeWidth="6" />

                  <RingChart results={results} />
                </svg>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1">
              <Legend results={results} />
            </div>
          </motion.section>
        )}
      </div>

      {/* ===== RESULTS: Professional UI Layout ===== */}
      <motion.section
        id="results"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChartIcon c="w-5 h-5 text-slate-500 dark:text-slate-400" />
              Assessment Results
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review your performance across completed modules</p>
          </div>
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-white/10">
            {completedCount} of {purchasedCount} Completed
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {purchasedExams.map((exam, idx) => {
            const status = statusOf(exam);
            const result = getResult(exam.id as AssessmentId);
            const done = status === "completed";

            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx }}
                className="group relative flex flex-col bg-white dark:bg-[#111a15] rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden hover:border-brand-green/30 transition-colors shadow-sm"
              >
                {/* Top strip for brand color */}
                <div className="h-1 w-full" style={{ background: exam.accentColor }} />
                
                <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border border-slate-100 dark:border-white/5"
                      style={{ background: `${exam.accentColor}10`, color: exam.accentColor }}
                    >
                      {exam.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white text-lg leading-tight">{exam.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                           <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                           {exam.difficulty}
                        </span>
                        <span className="flex items-center gap-1.5">
                           <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                           {exam.questions} questions
                        </span>
                        <span className="flex items-center gap-1.5">
                           <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                           {exam.duration}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Score or Action */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6">
                    {done && result ? (
                      <>
                        <div className="flex items-center gap-6 bg-slate-50 dark:bg-white/[0.02] px-4 py-2.5 rounded-lg border border-slate-100 dark:border-white/5">
                          {/* Mini bars */}
                          <div className="hidden sm:flex items-end gap-1.5 h-10 border-r border-slate-200 dark:border-white/10 pr-6">
                            {result.sections?.slice(0, 3).map((s: SectionResult) => (
                              <div key={s.name} className="flex flex-col items-center gap-1 justify-end h-full">
                                <div className="w-1.5 bg-slate-200 dark:bg-white/10 rounded-t-sm overflow-hidden h-6 relative">
                                  <div
                                    className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all"
                                    style={{ height: `${s.score}%`, background: getSkillColor(s.score) }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="text-right">
                            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{result.overallScore}%</p>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1.5">{getSkillLabel(result.overallScore)}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedResult({ exam, result })}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-transparent text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/20 transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                          View Analysis
                          <ChevronRightIcon c="w-4 h-4 text-slate-400" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onStartExam(exam)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-brand-green text-white text-sm font-semibold hover:bg-brand-green/90 transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <PlayIcon c="w-4 h-4" />
                        Start Assessment
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded section breakdown for completed */}
                {done && result && result.sections && result.sections.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] p-5 sm:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                      {result.sections.map((section: SectionResult) => (
                        <div key={section.name} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                             <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate pr-2">{section.name}</span>
                             <span className="text-sm font-bold" style={{ color: getSkillColor(section.score) }}>{section.score}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${section.score}%` }}
                              transition={{ delay: 0.4 + idx * 0.05, duration: 0.5 }}
                              className="h-full rounded-full"
                              style={{ background: getSkillColor(section.score) }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Strong / Weak summary */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-5 border-t border-slate-100 dark:border-white/5">
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        {result.sections.filter((s: SectionResult) => s.score >= 75).length > 0 && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded-md border border-emerald-100 dark:border-emerald-500/20">
                            <CheckIcon c="w-4 h-4" />
                            {result.sections.filter((s: SectionResult) => s.score >= 75).length} Strong Areas
                          </span>
                        )}
                        {result.sections.filter((s: SectionResult) => s.score < 60).length > 0 && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1.5 rounded-md border border-amber-100 dark:border-amber-500/20">
                            <AlertIcon c="w-4 h-4" />
                            {result.sections.filter((s: SectionResult) => s.score < 60).length} Growth Areas
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span>Accuracy: <span className="text-slate-700 dark:text-slate-200">{result.accuracy}%</span></span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span>Time: <span className="text-slate-700 dark:text-slate-200">{result.timeTaken}</span></span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* ===== YOUR CERTIFICATES: Professional Grid Layout ===== */}
      {completedCount > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Certificates & Achievements
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Download and share your verified credentials</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {purchasedExams
              .filter(e => {
                const res = getResult(e.id as AssessmentId);
                return res && res.mode !== 'trial';
              })
              .map((exam, idx) => {
                const result = getResult(exam.id as AssessmentId);
                if (!result) return null;
                const dateStr = new Date(result.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                return (
                  <motion.div
                    key={exam.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    className="group relative flex flex-col bg-white dark:bg-[#111a15] rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden hover:border-brand-green/30 transition-colors shadow-sm"
                  >
                    {/* Top strip for brand color */}
                    <div className="h-1 w-full" style={{ background: exam.accentColor }} />

                    <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      {/* Left: Info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-xl shrink-0 border border-slate-100 dark:border-white/5"
                          style={{ background: `${exam.accentColor}10`, color: exam.accentColor }}
                        >
                          {exam.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white leading-tight text-lg">{exam.title}</h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                              CERTIFIED
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Issued on {dateStr}
                          </p>
                        </div>
                      </div>
                      
                      {/* Right: Score + Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6">
                        <div className="flex items-center gap-6 bg-slate-50 dark:bg-white/[0.02] px-4 py-2.5 rounded-lg border border-slate-100 dark:border-white/5">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{result.overallScore}%</p>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1.5">Score</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedCertificate({ exam, result })}
                            className="px-5 py-2.5 bg-brand-green text-white text-sm font-semibold rounded-lg hover:bg-brand-green/90 transition-colors flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
                          >
                            <EyeIcon c="w-4 h-4" />
                            View Certificate
                          </button>
                          <button
                            onClick={() => {
                              const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
                              window.open(url, '_blank');
                            }}
                            className="w-10 h-10 flex items-center justify-center border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-sm"
                            title="Share on LinkedIn"
                          >
                            <LinkedInIcon c="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({
                                  title: `${exam.title} - ${result.overallScore}%`,
                                  text: `I scored ${result.overallScore}% on ${exam.title} via OriginBi!`,
                                  url: window.location.href,
                                });
                              } else {
                                navigator.clipboard.writeText(`I scored ${result.overallScore}% on ${exam.title} via OriginBi! ${window.location.href}`);
                              }
                            }}
                            className="w-10 h-10 flex items-center justify-center border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-sm"
                            title="Share Link"
                          >
                            <ShareIcon c="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </motion.section>
      )}

      {/* ===== MODALS ===== */}
      <GoogleStyleAnalysisModal
        isOpen={!!selectedResult}
        onClose={() => setSelectedResult(null)}
        exam={selectedResult?.exam || null}
        result={selectedResult?.result || null}
        detail={selectedResult ? EXAM_DETAILS[selectedResult.exam.id as AssessmentId] : null}
      />
      <CertificatePreviewModal
        isOpen={!!selectedCertificate}
        onClose={() => setSelectedCertificate(null)}
        exam={selectedCertificate?.exam || null}
        result={selectedCertificate?.result || null}
        userName={userName}
      />
    </div>
  );
};

export default ActiveDashboard;
