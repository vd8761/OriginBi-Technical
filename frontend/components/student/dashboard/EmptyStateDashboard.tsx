"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { EXAMS, EXAM_DETAILS, type AssessmentId, type ExtendedExam } from "@/lib/exams";
import { usePaidAssessments } from "@/lib/payments";
import { LockIcon } from "@/components/icons";

// Icons
const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const AwardIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const TrendUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const LightningIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const ChartIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const TargetIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BrainIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

interface Props { userName: string; onSelectExam: (id: AssessmentId) => void; onStartExam: (id: AssessmentId) => void; }

const TRACK_META: Record<string, { label: string; accent: string; description: string }> = {
  core: { label: "Core Skills", accent: "#10b981", description: "Foundation skills every professional needs" },
  technical: { label: "Technical", accent: "#f59e0b", description: "Coding & problem-solving capabilities" },
  career: { label: "Career", accent: "#8b5cf6", description: "Role-specific career preparation" },
};

// Value propositions for each assessment type
const VALUE_PROPOSITIONS: Record<AssessmentId, { benefits: string[]; careerImpact: string; targetAudience: string }> = {
  aptitude: {
    benefits: ["Identify your logical reasoning strengths", "Pinpoint numerical ability gaps", "Get section-wise time management tips", "Know which career paths fit your cognitive profile"],
    careerImpact: "Top MNCs use aptitude scores to filter 80% of candidates. Know where you stand.",
    targetAudience: "Students, job seekers, and professionals targeting campus placements"
  },
  communication: {
    benefits: ["Measure professional English proficiency", "Get feedback on clarity and fluency", "Identify improvement areas in writing & speaking", "Build confidence for interviews and client calls"],
    careerImpact: "Communication skills determine promotion speed. 73% of employers prioritize this.",
    targetAudience: "Professionals in client-facing roles, team leads, and job seekers"
  },
  coding: {
    benefits: ["Test programming fundamentals", "Validate problem-solving approach", "Get language-specific feedback", "Build a foundation for technical interviews"],
    careerImpact: "First-round coding screens eliminate 60% of applicants. Be in the top 40%.",
    targetAudience: "Engineering students, freshers, and developers preparing for interviews"
  },
  mnc: {
    benefits: ["Practice company-specific question patterns", "Master DSA fundamentals", "Build interview stamina with timed tests", "Get complexity analysis feedback"],
    careerImpact: "MNCs test DSA in 90% of technical rounds. This assessment mirrors real interviews.",
    targetAudience: "Experienced developers targeting product companies and MNCs"
  },
  role: {
    benefits: ["Discover roles that match your thinking style", "Test domain-specific knowledge", "Evaluate decision-making under constraints", "Get personalized career path recommendations"],
    careerImpact: "Right role-fit increases job satisfaction by 3x and accelerates growth.",
    targetAudience: "Professionals considering career transitions or specialization"
  },
};

const EmptyStateDashboard: React.FC<Props> = ({ userName, onSelectExam, onStartExam }) => {
  const { isPaid } = usePaidAssessments();
  const [activeTrack, setActiveTrack] = useState<string | "all">("all");

  const grouped = useMemo(() => {
    const map: Record<string, ExtendedExam[]> = { core: [], technical: [], career: [] };
    EXAMS.forEach((e) => map[(e as ExtendedExam).track].push(e as ExtendedExam));
    return map;
  }, []);

  const tracks = ["core", "technical", "career"];
  const liveCount = EXAMS.filter(e => e.available).length;

  const filteredExams = useMemo(() => {
    if (activeTrack === "all") return [...EXAMS];
    return grouped[activeTrack] || [];
  }, [activeTrack, grouped]);

  return (
    <div className="flex flex-col gap-10">
      {/* ── CREATIVE HERO SECTION ── */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.7 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-brand-green/20 dark:border-brand-green/15 bg-gradient-to-br from-[#0d1f12] via-[#0f1a12] to-[#0a1510] p-10 sm:p-16"
      >
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-brand-green/20 via-emerald-500/5 to-transparent rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-emerald-600/15 via-brand-green/5 to-transparent rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(30,211,106,0.05)_0%,transparent_50%)]" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_100%)]" />

        <div className="relative z-10 max-w-3xl">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-green/10 border border-brand-green/30 text-brand-green text-xs font-bold mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green" />
            </span>
            {liveCount} Professional Assessments Available
          </motion.div>

          {/* Main Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.3 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6"
          >
            Unlock Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green via-emerald-400 to-teal-400">
              True Potential
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.4 }}
            className="text-lg sm:text-xl text-white/60 leading-relaxed max-w-2xl mb-8"
          >
            {userName}, discover your hidden strengths through our AI-powered assessments. 
            Get detailed insights about your skills, identify growth areas, and receive a 
            personalized career roadmap.
          </motion.p>

          {/* Stats Row */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center gap-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <TargetIcon className="w-6 h-6 text-brand-green" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">5</p>
                <p className="text-xs text-white/50">Skill Tracks</p>
              </div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <ChartIcon className="w-6 h-6 text-brand-green" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">200+</p>
                <p className="text-xs text-white/50">Questions</p>
              </div>
            </div>
            <div className="h-10 w-px bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <AwardIcon className="w-6 h-6 text-brand-green" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">AI</p>
                <p className="text-xs text-white/50">Powered Analysis</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── ASSESSMENT LIBRARY ── */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-[24px] sm:text-[28px] font-bold text-brand-text-light-primary dark:text-white tracking-tight">Assessment Library</h2>
            <p className="text-[13px] text-brand-text-light-secondary dark:text-white/40 mt-1">Filter by track or browse all available assessments.</p>
          </div>
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white/70 dark:bg-white/[0.03]">
            {[{ l: "All", v: "all" }, ...tracks.map(t => ({ l: TRACK_META[t].label, v: t }))].map(f => (
              <button key={f.v} onClick={() => setActiveTrack(f.v)}
                className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all ${activeTrack === f.v ? "bg-brand-green text-white shadow-md shadow-brand-green/20" : "text-brand-text-light-secondary dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.05]"}`}>
                {f.l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="text-sm font-semibold text-brand-green">{filteredExams.length} assessments available</p>
          <p className="text-sm text-brand-text-light-secondary dark:text-white/40">{filteredExams.filter(e => e.available).length} ready to start</p>
        </div>

        {/* Assessment Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredExams.map((exam, idx) => {
            const valueProp = VALUE_PROPOSITIONS[exam.id as AssessmentId];
            const detail = EXAM_DETAILS[exam.id as AssessmentId];
            const trackMeta = TRACK_META[(exam as ExtendedExam).track];
            
            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="group relative rounded-[1.5rem] border border-gray-200/50 dark:border-white/[0.08] bg-white dark:bg-brand-dark-secondary/80 overflow-hidden hover:shadow-2xl hover:shadow-brand-green/10 transition-all duration-500"
              >
                {/* Animated Gradient Background on Hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ 
                    background: `linear-gradient(135deg, ${exam.accentColor}08 0%, transparent 50%)` 
                  }}
                />
                
                {/* Top Color Bar with Animation */}
                <div className="relative h-2 w-full overflow-hidden">
                  <div 
                    className="absolute inset-0 transition-transform duration-500 group-hover:scale-x-110 origin-left"
                    style={{ background: exam.gradient }}
                  />
                </div>
                
                <div className="relative p-6">
                  {/* Track Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span 
                      className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border"
                      style={{ 
                        background: `${trackMeta.accent}15`, 
                        borderColor: `${trackMeta.accent}30`,
                        color: trackMeta.accent 
                      }}
                    >
                      {trackMeta.label}
                    </span>
                    {exam.available ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Available Now
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-white/40">
                        <LockIcon className="w-3.5 h-3.5" />
                        Coming Soon
                      </span>
                    )}
                  </div>

                  {/* Header with Icon */}
                  <div className="flex items-start gap-4 mb-4">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                      style={{ 
                        background: `linear-gradient(135deg, ${exam.accentColor}15, ${exam.accentColor}08)`, 
                        borderColor: `${exam.accentColor}40`, 
                        color: exam.accentColor,
                        boxShadow: `0 8px 32px ${exam.accentColor}20`
                      }}
                    >
                      {exam.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-brand-text-light-primary dark:text-white group-hover:text-brand-green transition-colors">
                        {exam.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-brand-text-light-secondary dark:text-white/60">
                          {exam.difficulty}
                        </span>
                        <span className="text-xs text-brand-text-light-secondary/60 dark:text-white/40">
                          {exam.questions} Questions • {exam.duration}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-green to-emerald-500">
                        ₹{exam.price}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-brand-text-light-secondary dark:text-white/60 leading-relaxed mb-5">
                    {exam.description}
                  </p>

                  {/* Career Impact Callout */}
                  {valueProp && (
                    <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-500/5 dark:to-transparent border border-amber-200/50 dark:border-amber-500/20">
                      <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                        <span className="font-bold">Career Impact:</span> {valueProp.careerImpact}
                      </p>
                    </div>
                  )}

                  {/* What You Get - Value Proposition */}
                  {valueProp && (
                    <div className="mb-5">
                      <p className="text-xs font-bold text-brand-text-light-primary dark:text-white/80 mb-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-brand-green/10 flex items-center justify-center">
                          <TargetIcon className="w-3.5 h-3.5 text-brand-green" />
                        </div>
                        What you will discover
                      </p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {valueProp.benefits.slice(0, 4).map((benefit, i) => (
                          <li 
                            key={i} 
                            className="text-xs text-brand-text-light-secondary dark:text-white/60 flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-white/5"
                          >
                            <span 
                              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: `${exam.accentColor}20`, color: exam.accentColor }}
                            >
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 8 8">
                                <circle cx="4" cy="4" r="3" />
                              </svg>
                            </span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Skills Tags */}
                  {detail && (
                    <div className="flex flex-wrap gap-2 mb-5">
                      {detail.skills.slice(0, 3).map(s => (
                        <span 
                          key={s.title} 
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/[0.08] text-xs font-medium text-brand-text-light-primary dark:text-white/80 border border-gray-100 dark:border-white/[0.06]"
                        >
                          {s.title}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 mb-5 text-xs text-brand-text-light-secondary/70 dark:text-white/40">
                    <span className="flex items-center gap-1.5">
                      <BookIcon className="w-4 h-4" />
                      {exam.questions} questions
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ClockIcon className="w-4 h-4" />
                      {exam.duration}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <AwardIcon className="w-4 h-4" />
                      Certificate
                    </span>
                  </div>

                  {/* Skills Tags */}
                  {detail && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {detail.skills.slice(0, 3).map(s => (
                        <span 
                          key={s.title} 
                          className="px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 text-xs font-medium text-brand-text-light-primary dark:text-white/70 border border-gray-100 dark:border-white/[0.06]"
                        >
                          {s.title}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <motion.button 
                      whileHover={{ scale: 1.02 }} 
                      whileTap={{ scale: 0.98 }} 
                      onClick={() => onSelectExam(exam.id as AssessmentId)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-white/[0.1] text-sm font-semibold text-brand-text-light-primary dark:text-white hover:border-brand-green/40 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                    >
                      <EyeIcon className="w-4 h-4" />
                      View Details
                    </motion.button>
                    {exam.available ? (
                      <motion.button 
                        whileHover={{ scale: 1.02 }} 
                        whileTap={{ scale: 0.98 }} 
                        onClick={() => onStartExam(exam.id as AssessmentId)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-green to-emerald-500 text-white text-sm font-bold shadow-lg shadow-brand-green/20 hover:shadow-brand-green/30 transition-all"
                      >
                        Get Started
                        <ChevronRightIcon className="w-4 h-4" />
                      </motion.button>
                    ) : (
                      <span className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400 text-sm font-semibold">
                        <LockIcon className="w-4 h-4" />
                        Coming Soon
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Why Invest Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-brand-green/5 to-emerald-500/5 border border-brand-green/20"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green shrink-0">
              <SparklesIcon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-brand-text-light-primary dark:text-white mb-1">
                Why invest in assessments?
              </h4>
              <p className="text-sm text-brand-text-light-secondary dark:text-white/60">
                You are paying to discover your hidden strengths, identify skill gaps, and get a personalized roadmap for career growth. 
                Each assessment reveals insights about yourself that would take years to discover otherwise.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ── HOW IT WORKS ── */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <div className="text-center mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-green mb-2">How It Works</p>
          <h2 className="text-[24px] sm:text-[28px] font-bold text-brand-text-light-primary dark:text-white tracking-tight">Three steps to your career identity</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: "01", title: "Choose & Unlock", desc: "Browse our assessment library, pick the skills you want to validate, and unlock instant access.", icon: BookIcon, color: "#10b981" },
            { step: "02", title: "Take the Assessment", desc: "Complete timed, AI-proctored evaluations designed by industry experts. Get real-time feedback.", icon: LightningIcon, color: "#f59e0b" },
            { step: "03", title: "Get Your Identity", desc: "Receive detailed analytics, career mapping, and your unique professional identity profile.", icon: TrendUpIcon, color: "#8b5cf6" },
          ].map((s, i) => (
            <motion.div key={s.step} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 + i * 0.1 }}
              whileHover={{ y: -4 }}
              className="relative rounded-2xl border border-gray-100 dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.03] p-7 group hover:shadow-lg transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center border" style={{ background: `${s.color}10`, borderColor: `${s.color}25` }}>
                  <span style={{ color: s.color }}><s.icon className="w-5 h-5" /></span>
                </div>
                <span className="text-[32px] font-bold text-gray-100 dark:text-white/[0.06]">{s.step}</span>
              </div>
              <h3 className="text-[16px] font-bold text-brand-text-light-primary dark:text-white tracking-tight">{s.title}</h3>
              <p className="mt-2 text-[13px] text-brand-text-light-secondary dark:text-white/50 leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── FEATURES ── */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <div className="text-center mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-green mb-2">Why OriginBi</p>
          <h2 className="text-[24px] sm:text-[28px] font-bold text-brand-text-light-primary dark:text-white tracking-tight">Built for career excellence</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: BrainIcon, title: "AI-Powered Analysis", desc: "Real-time response evaluation for precise skill mapping.", color: "#1ed36a" },
            { icon: AwardIcon, title: "Industry Certified", desc: "Frameworks aligned with leading hiring standards.", color: "#8b5cf6" },
            { icon: ChartIcon, title: "Detailed Analytics", desc: "Section-wise breakdown and personalized roadmaps.", color: "#f59e0b" },
            { icon: TrendUpIcon, title: "Career Trajectories", desc: "AI-derived identity that evolves with each assessment.", color: "#06b6d4" },
          ].map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 + i * 0.08 }}
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-gray-100 dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.03] p-6 hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 border" style={{ background: `${f.color}10`, borderColor: `${f.color}25` }}>
                <span style={{ color: f.color }}><f.icon className="w-5 h-5" /></span>
              </div>
              <h3 className="text-[14px] font-bold text-brand-text-light-primary dark:text-white">{f.title}</h3>
              <p className="mt-1.5 text-[12px] text-brand-text-light-secondary dark:text-white/50 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── CTA ── */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="relative overflow-hidden rounded-[2rem] border border-brand-green/15">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1a0f] via-[#111f16] to-[#0d180f]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-brand-green/20 rounded-full blur-[100px]" />
        <div className="relative z-10 p-8 sm:p-12 text-center">
          <h2 className="text-[26px] sm:text-[32px] font-bold text-white tracking-tight">
            Ready to discover your <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green to-emerald-400">Career Identity</span>?
          </h2>
          <p className="mt-3 text-[14px] text-white/50 max-w-lg mx-auto">Take your first assessment and unlock AI-powered insights about your strengths and growth path.</p>
          <div className="flex justify-center gap-4 mt-8">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => onStartExam("aptitude")}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-green to-emerald-500 text-white font-bold text-[14px] shadow-xl shadow-brand-green/30">
              Start Aptitude — ₹99
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="px-8 py-4 rounded-2xl border border-white/15 bg-white/[0.06] text-white font-bold text-[14px]">
              View All
            </motion.button>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default EmptyStateDashboard;
