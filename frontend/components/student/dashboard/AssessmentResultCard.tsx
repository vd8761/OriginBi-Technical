"use client";

import React from "react";
import { motion } from "framer-motion";
import type { Exam } from "../ExamCarousel";
import type { ExamDetailData } from "@/lib/exams";
import type { AssessmentResult } from "@/lib/progress";

interface AssessmentResultCardProps {
  exam: Exam;
  result: AssessmentResult;
  detail: ExamDetailData | null;
}

const COLORS = ["#1ed36a", "#3b82f6", "#8b5cf6", "#f59e0b", "#f43f5e", "#06b6d4"];
const colorForIndex = (i: number) => {
  const bg = ["bg-brand-green", "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
  return bg[i % bg.length];
};

const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const ArrowUp = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
);
const Clock = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

const Lightbulb = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
);

const INSIGHT_CONFIG = {
  strength: { icon: CheckCircle, bg: "bg-brand-green/[0.06]", border: "border-brand-green/20", accent: "text-brand-green" },
  improvement: { icon: ArrowUp, bg: "bg-amber-500/[0.06]", border: "border-amber-500/20", accent: "text-amber-500" },
  time: { icon: Clock, bg: "bg-blue-500/[0.06]", border: "border-blue-500/20", accent: "text-blue-500" },
  pattern: { icon: Lightbulb, bg: "bg-purple-500/[0.06]", border: "border-purple-500/20", accent: "text-purple-500" },
};

const AssessmentResultCard: React.FC<AssessmentResultCardProps> = ({ exam, result, detail }) => {
  const fallbackSections = detail?.sections.map((s, i) => ({ name: s.name, score: 70 + ((i * 13) % 25), weight: s.weight })) ?? [];
  const sections = result.sections.length ? result.sections : fallbackSections;
  const correctCount = result.correctCount ?? 0;
  const wrongCount = result.wrongCount ?? 0;
  const answeredCount = result.answeredCount ?? (correctCount + wrongCount);
  const totalQuestions = result.totalQuestions ?? detail?.questions ?? exam.questions ?? answeredCount;
  const skippedCount = result.skippedCount ?? Math.max(0, totalQuestions - answeredCount);
  const fallbackInsights: typeof result.insights = [
    { type: "strength", text: `Excellent performance in ${sections[0]?.name || "core concepts"}. Strong foundational understanding demonstrated.` },
    { type: "improvement", text: `Focus on ${sections[sections.length - 1]?.name || "advanced topics"} to reach the next proficiency tier.` },
    { type: "time", text: `Optimal pacing maintained across ${sections.length} sections with minimal variance.` },
  ];
  const insights = result.insights.length ? result.insights : fallbackInsights;
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (circumference * result.overallScore) / 100;

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Hero Stats */}
      <div className="relative overflow-hidden rounded-[2rem] border border-brand-light-tertiary/40 dark:border-white/[0.08] bg-gradient-to-br from-brand-light-primary/90 to-brand-light-secondary/60 dark:from-brand-dark-secondary/90 dark:to-brand-dark-primary/60 backdrop-blur-xl p-6 sm:p-8 lg:p-10 shadow-[0_20px_60px_rgba(25,33,28,0.08)]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-green/[0.06] rounded-full blur-[100px] -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center">
          {/* Score Ring */}
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }} className="relative w-40 h-40 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="6" className="text-brand-light-tertiary/20 dark:text-white/[0.06]" />
              <motion.circle
                cx="80" cy="80" r="70" fill="transparent" stroke="url(#scoreGrad)" strokeWidth="8"
                strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, ease: [0.32, 0.72, 0, 1], delay: 0.3 }} strokeLinecap="round"
              />
              <defs><linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1ed36a" /><stop offset="100%" stopColor="#10b981" /></linearGradient></defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-brand-text-light-primary dark:text-white">{result.overallScore}%</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-text-light-secondary dark:text-white/50 mt-1">Overall</span>
            </div>
          </motion.div>

          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center gap-3 mb-2 justify-center lg:justify-start">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: `${exam.accentColor}1a`, color: exam.accentColor, borderColor: `${exam.accentColor}40` }}>{exam.icon}</div>
              <h2 className="text-2xl font-bold text-brand-text-light-primary dark:text-white tracking-tight">{exam.title} Results</h2>
            </div>
            <p className="text-sm text-brand-text-light-secondary dark:text-white/50 max-w-xl mb-5 leading-relaxed">
              Completed on {new Date(result.completedAt).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}. Scored {result.overallScore}% with {result.accuracy}% accuracy over {result.timeTaken}.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Answered", value: `${answeredCount}` },
                { label: "Correct", value: `${correctCount}`, accent: true },
                { label: "Wrong", value: `${wrongCount}` },
                { label: "Skipped", value: `${skippedCount}` },
                { label: "Time Taken", value: result.timeTaken },
                { label: "Total Qs", value: `${totalQuestions}`, accent: true },
              ].map((stat) => (
                <div key={stat.label} className="bg-brand-light-secondary/40 dark:bg-white/[0.04] p-3.5 rounded-2xl border border-brand-light-tertiary/50 dark:border-white/[0.08]">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-text-light-secondary dark:text-white/40 mb-1">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.accent ? "text-brand-green" : "text-brand-text-light-primary dark:text-white"}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sectional + Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-[2rem] border border-brand-light-tertiary/40 dark:border-white/[0.08] bg-brand-light-primary/70 dark:bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8">
          <h3 className="text-xs font-bold text-brand-text-light-secondary dark:text-white/40 uppercase tracking-[0.2em] mb-6">Sectional Analysis</h3>
          <div className="flex flex-col gap-5">
            {sections.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${colorForIndex(idx)}`} />
                    <span className="text-[12px] font-bold text-brand-text-light-primary dark:text-white tracking-tight">{item.name}</span>
                  </div>
                  <span className="text-[12px] font-bold text-brand-text-light-primary dark:text-white">{item.score}%</span>
                </div>
                <div className="h-2.5 w-full bg-brand-light-tertiary/30 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${item.score}%` }}
                    transition={{ duration: 1, delay: 0.1 * idx, ease: [0.32, 0.72, 0, 1] }}
                    className="h-full rounded-full" style={{ background: COLORS[idx % COLORS.length] }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-brand-text-light-secondary/60 dark:text-white/30">Weight: {item.weight}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-brand-light-tertiary/40 dark:border-white/[0.08] bg-brand-light-primary/70 dark:bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 flex flex-col">
          <h3 className="text-xs font-bold text-brand-text-light-secondary dark:text-white/40 uppercase tracking-[0.2em] mb-6">Mind Analysis</h3>
          <div className="flex flex-col gap-4 flex-1">
            {insights.map((insight, idx) => {
              const config = INSIGHT_CONFIG[insight.type];
              const Icon = config.icon;
              return (
                <div key={idx} className={`p-4 rounded-2xl border ${config.bg} ${config.border} flex gap-3`}>
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.accent}`} />
                  <p className="text-[12px] text-brand-text-light-secondary dark:text-white/60 leading-relaxed">{insight.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Radar + Next Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-[2rem] border border-brand-light-tertiary/40 dark:border-white/[0.08] bg-brand-light-primary/70 dark:bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8">
          <h3 className="text-xs font-bold text-brand-text-light-secondary dark:text-white/40 uppercase tracking-[0.2em] mb-4">Competency Radar</h3>
          <div className="aspect-square w-full max-w-[300px] mx-auto relative flex items-center justify-center p-4">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {[0.2, 0.4, 0.6, 0.8, 1].map((level) => (<circle key={level} cx="50" cy="50" r={40 * level} fill="none" stroke="currentColor" strokeWidth="0.15" className="text-brand-light-tertiary/30 dark:text-white/[0.08]" />))}
              {sections.map((_, i) => { const a = (i * 2 * Math.PI) / sections.length - Math.PI / 2; return <line key={i} x1="50" y1="50" x2={50 + 40 * Math.cos(a)} y2={50 + 40 * Math.sin(a)} stroke="currentColor" strokeWidth="0.15" className="text-brand-light-tertiary/30 dark:text-white/[0.08]" />; })}
              <polygon
                points={sections.map((d, i) => { const a = (i * 2 * Math.PI) / sections.length - Math.PI / 2; const r = (40 * d.score) / 100; return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`; }).join(" ")}
                fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.5" className="text-brand-green"
              />
              {sections.map((d, i) => { const a = (i * 2 * Math.PI) / sections.length - Math.PI / 2; const r = (40 * d.score) / 100; return <circle key={i} cx={50 + r * Math.cos(a)} cy={50 + r * Math.sin(a)} r="1.8" fill="currentColor" className="text-brand-green" />; })}
              {sections.map((d, i) => { const a = (i * 2 * Math.PI) / sections.length - Math.PI / 2; const x = 50 + 48 * Math.cos(a); const y = 50 + 48 * Math.sin(a); return <text key={i} x={x} y={y} fontSize="2.8" textAnchor="middle" dominantBaseline="middle" fill="currentColor" className="font-bold uppercase text-brand-text-light-secondary dark:text-white/40">{d.name.substring(0, 5)}</text>; })}
            </svg>
          </div>
        </div>

        <div className="rounded-[2rem] border border-brand-light-tertiary/40 dark:border-white/[0.08] bg-brand-light-primary/70 dark:bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-brand-text-light-secondary dark:text-white/40 uppercase tracking-[0.2em] mb-4">Recommended Next Steps</h3>
            <div className="space-y-3">
              {detail?.outcomes.slice(0, 3).map((outcome, i) => (
                <div key={i} className="p-3.5 bg-brand-light-secondary/30 dark:bg-white/[0.04] rounded-2xl border border-brand-light-tertiary/40 dark:border-white/[0.08] flex items-center gap-3 hover:border-brand-green/30 transition-all">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${COLORS[(i + 1) % COLORS.length]}15` }}>
                    <span className="text-xs font-bold" style={{ color: COLORS[(i + 1) % COLORS.length] }}>{i + 1}</span>
                  </div>
                  <p className="text-[12px] font-semibold text-brand-text-light-primary dark:text-white">{outcome}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 p-4 rounded-2xl bg-brand-green/[0.06] border border-brand-green/20">
            <p className="text-[11px] text-brand-text-light-secondary dark:text-white/50 leading-relaxed">
              <span className="font-bold text-brand-text-light-primary dark:text-white">Pro tip:</span> Revisit weaker sections via the detailed roadmap to push your overall score above 90%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResultCard;
