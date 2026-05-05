"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { EXAMS, EXAM_DETAILS, type AssessmentId, type ExtendedExam } from "@/lib/exams";
import { usePaidAssessments } from "@/lib/payments";
import { LockIcon } from "@/components/icons";

const Sp = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>);
const Tr = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>);
const Zp = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>);
const Tg = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const Aw = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>);
const Bk = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>);
const Ch = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>);

interface Props { userName: string; onSelectExam: (id: AssessmentId) => void; onStartExam: (id: AssessmentId) => void; }

const AnimatedCounter = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const steps = 60; const inc = value / steps; let cur = 0;
    const t = setInterval(() => { cur += inc; if (cur >= value) { setCount(value); clearInterval(t); } else setCount(Math.floor(cur)); }, 2000 / steps);
    return () => clearInterval(t);
  }, [value]);
  return <span>{count}{suffix}</span>;
};

const TRACK_META: Record<string, { label: string; gradient: string; accent: string }> = {
  core: { label: "Core Skills", gradient: "from-emerald-500/20 to-emerald-500/5", accent: "#10b981" },
  technical: { label: "Technical Hiring", gradient: "from-amber-500/20 to-amber-500/5", accent: "#f59e0b" },
  career: { label: "Career Fit", gradient: "from-violet-500/20 to-violet-500/5", accent: "#8b5cf6" },
};

const FloatingOrb = ({ color, size, delay, duration }: { color: string; size: number; delay: number; duration: number }) => (
  <motion.div className="absolute rounded-full blur-3xl opacity-20 pointer-events-none" style={{ width: size, height: size, background: color }}
    animate={{ x: [0, 80, -40, 0], y: [0, -60, 30, 0], scale: [1, 1.15, 0.9, 1] }}
    transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }} />
);

const EmptyStateDashboard: React.FC<Props> = ({ userName, onSelectExam, onStartExam }) => {
  const { isPaid } = usePaidAssessments();
  const [activeTrack, setActiveTrack] = useState<string | "all">("all");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, ExtendedExam[]> = { core: [], technical: [], career: [] };
    EXAMS.forEach((e) => map[(e as ExtendedExam).track].push(e as ExtendedExam));
    return map;
  }, []);

  const tracks = ["core", "technical", "career"];
  const totalQ = EXAMS.reduce((s, e) => s + e.questions, 0);
  const avgDur = Math.round(EXAMS.reduce((s, e) => s + (parseInt(e.duration, 10) || 0), 0) / Math.max(EXAMS.length, 1));

  return (
    <div className="relative flex flex-col gap-12">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <FloatingOrb color="radial-gradient(circle, rgba(30,211,106,0.3) 0%, transparent 70%)" size={600} delay={0} duration={22} />
        <FloatingOrb color="radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)" size={400} delay={6} duration={27} />
        <FloatingOrb color="radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)" size={500} delay={12} duration={24} />
      </div>

      {/* ── CINEMATIC HERO ── */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-brand-green/15 dark:border-brand-green/10">
        {/* Dark gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1a0f] via-[#111f16] to-[#0d180f]" />
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-bl from-brand-green/20 to-transparent rounded-full blur-[150px] -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-600/10 to-transparent rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-brand-green/[0.06] rounded-full blur-[100px]" />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(30,211,106,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(30,211,106,0.3) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative z-10 p-8 sm:p-12 lg:p-16">
          {/* Top bar: badge + stats chips */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
            className="flex flex-wrap items-center justify-between gap-4 mb-10">
            <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-green/15 border border-brand-green/30 text-brand-green text-[11px] font-bold uppercase tracking-[0.15em]">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-60 animate-ping" /><span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green" /></span>
              {EXAMS.filter((e) => e.available).length} Assessments Live
            </motion.div>
            <div className="flex items-center gap-3">
              {[
                { value: totalQ, label: "Questions", icon: Bk },
                { value: `${avgDur}m`, label: "Avg Duration", icon: Tg },
                { value: tracks.length, label: "Tracks", icon: Ch },
              ].map((chip) => (
                <div key={chip.label} className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/70">
                  <chip.icon className="w-3.5 h-3.5 text-brand-green" />
                  <span className="text-[12px] font-bold text-white">{typeof chip.value === "number" ? <AnimatedCounter value={chip.value} /> : chip.value}</span>
                  <span className="text-[10px] font-medium text-white/40 hidden sm:inline">{chip.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Main headline */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7, ease: [0.32, 0.72, 0, 1] }}>
            <p className="text-[13px] font-bold uppercase tracking-[0.3em] text-white/30 mb-4">Technical Assessment Platform</p>
            <h1 className="text-[48px] sm:text-[64px] lg:text-[80px] font-bold text-white tracking-[-0.03em] leading-[0.9]">
              Welcome,{" "}<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green via-emerald-400 to-brand-green bg-[length:200%_auto] animate-[shimmer_3s_ease-in-out_infinite]">{userName}</span>
            </h1>
            <p className="mt-6 text-[17px] text-white/50 leading-relaxed max-w-2xl">
              Discover your career identity through AI-powered skill assessments. We measure aptitude, communication, coding fluency, and role-fit — then map your unique professional trajectory.
            </p>
          </motion.div>

          {/* CTA + Trust signals row */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-10 flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex flex-wrap gap-3">
              <motion.button whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => setActiveTrack("all")}
                className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-green to-emerald-500 text-white font-bold text-[15px] shadow-2xl shadow-brand-green/30 hover:shadow-brand-green/50 transition-all">
                <span className="flex items-center gap-2">Browse All Assessments <Tr className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="px-8 py-4 rounded-2xl border border-white/15 bg-white/[0.05] text-white font-bold text-[15px] hover:bg-white/[0.1] transition-all backdrop-blur-sm">
                How It Works
              </motion.button>
            </div>
            <div className="flex items-center gap-5 text-[12px] font-semibold text-white/35">
              {[{ icon: Zp, l: "AI Proctored" }, { icon: Aw, l: "Certified" }, { icon: Tr, l: "Career Mapping" }].map(({ icon: I, l }) => (
                <span key={l} className="flex items-center gap-1.5"><I className="w-3.5 h-3.5 text-brand-green/70" />{l}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── FILTER PILLS ── */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[22px] sm:text-[26px] font-bold text-brand-text-light-primary dark:text-white tracking-tight">Assessment Library</h2>
          <span className="text-xs font-semibold text-brand-text-light-secondary dark:text-white/40">{EXAMS.length} assessments · {EXAMS.filter(e => e.available).length} available</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {[{ label: "All Tracks", value: "all", count: EXAMS.length }, ...tracks.map((t) => ({ label: TRACK_META[t].label, value: t, count: grouped[t].length }))].map((item) => (
            <button key={item.value} onClick={() => setActiveTrack(item.value)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border ${activeTrack === item.value
                ? "text-white bg-gradient-to-r from-brand-green to-emerald-500 border-brand-green/30 shadow-lg shadow-brand-green/20"
                : "text-brand-text-light-secondary dark:text-white/50 border-brand-light-tertiary/40 dark:border-white/[0.08] bg-brand-light-primary/60 dark:bg-white/[0.03] hover:border-brand-green/30"}`}>
              {item.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${activeTrack === item.value ? "bg-white/20" : "bg-brand-light-tertiary/30 dark:bg-white/[0.08]"}`}>{item.count}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── ASSESSMENT CARDS ── */}
      <div className="grid grid-cols-1 gap-8">
        {tracks.filter((t) => activeTrack === "all" || activeTrack === t).map((track) => (
          <motion.div key={track} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-2 h-2 rounded-full" style={{ background: TRACK_META[track].accent }} />
              <span className="text-[12px] font-bold uppercase tracking-[0.15em] text-brand-text-light-secondary dark:text-white/40">{TRACK_META[track].label}</span>
              <div className={`h-px flex-1 bg-gradient-to-r ${TRACK_META[track].gradient}`} />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {grouped[track].map((exam, idx) => {
                const detail = EXAM_DETAILS[exam.id as AssessmentId];
                const paid = isPaid(exam.id as AssessmentId);
                return (
                  <motion.div key={exam.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * idx, duration: 0.5 }}
                    onMouseEnter={() => setHoveredCard(exam.id)} onMouseLeave={() => setHoveredCard(null)}
                    className="group relative overflow-hidden rounded-2xl border border-brand-light-tertiary/30 dark:border-white/[0.08] bg-brand-light-primary/90 dark:bg-brand-dark-secondary/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(25,33,28,0.05)] hover:shadow-[0_24px_60px_rgba(30,211,106,0.1)] transition-all duration-500 flex">
                    {/* Left accent stripe */}
                    <div className="w-1.5 shrink-0 rounded-l-2xl transition-all duration-500 group-hover:w-2" style={{ background: `linear-gradient(to bottom, ${exam.accentColor}, ${exam.accentColor}60)` }} />

                    <div className="flex-1 p-6 sm:p-7">
                      {/* Top row: icon + title + badge */}
                      <div className="flex items-start gap-4 mb-4">
                        <motion.div animate={{ scale: hoveredCard === exam.id ? 1.08 : 1, rotate: hoveredCard === exam.id ? 5 : 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                          style={{ background: `${exam.accentColor}12`, border: `1px solid ${exam.accentColor}30`, color: exam.accentColor }}>
                          {exam.icon}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-[17px] font-bold text-brand-text-light-primary dark:text-white tracking-tight truncate">{exam.title}</h3>
                            <span className={`shrink-0 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-[0.1em] ${exam.available
                              ? "bg-brand-green/12 text-brand-green border border-brand-green/25"
                              : "bg-brand-light-tertiary/25 text-brand-text-light-secondary/60 border border-brand-light-tertiary/40 dark:bg-white/[0.05] dark:text-white/30 dark:border-white/[0.08]"}`}>
                              {exam.statusLabel}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[13px] text-brand-text-light-secondary dark:text-white/45 leading-relaxed line-clamp-2">{exam.description}</p>
                        </div>
                      </div>

                      {/* Skill tags */}
                      {detail && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {detail.skills.slice(0, 4).map((skill) => (
                            <span key={skill.title} className="px-3 py-1 rounded-lg bg-brand-light-secondary/40 dark:bg-white/[0.05] border border-brand-light-tertiary/30 dark:border-white/[0.06] text-[10px] font-semibold text-brand-text-light-primary dark:text-white/70 hover:border-brand-green/25 transition-colors cursor-default">{skill.title}</span>
                          ))}
                        </div>
                      )}

                      {/* Stats + Price + CTA row */}
                      <div className="flex items-center justify-between gap-3 pt-4 border-t border-brand-light-tertiary/20 dark:border-white/[0.05]">
                        <div className="flex items-center gap-3 text-[11px] text-brand-text-light-secondary dark:text-white/40">
                          <span className="flex items-center gap-1.5"><Tg className="w-3.5 h-3.5 text-brand-green" />{exam.duration}</span>
                          <span className="w-px h-3 bg-brand-light-tertiary/30 dark:bg-white/[0.08]" />
                          <span className="flex items-center gap-1.5"><Bk className="w-3.5 h-3.5 text-violet-500" />{exam.questions} Qs</span>
                          <span className="w-px h-3 bg-brand-light-tertiary/30 dark:bg-white/[0.08]" />
                          <span className="font-bold text-brand-green text-[13px]">₹{exam.price}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {exam.available ? (<>
                            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => onSelectExam(exam.id as AssessmentId)}
                              className="px-4 py-2 rounded-lg border border-brand-light-tertiary/40 dark:border-white/[0.1] text-brand-text-light-primary dark:text-white text-[11px] font-bold hover:bg-brand-light-secondary/30 dark:hover:bg-white/[0.06] transition-all">Details</motion.button>
                            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => onStartExam(exam.id as AssessmentId)}
                              className="px-5 py-2 rounded-lg bg-gradient-to-r from-brand-green to-emerald-500 text-white text-[11px] font-bold shadow-md shadow-brand-green/20 hover:shadow-brand-green/30 transition-all">
                              {paid ? "Start" : "Unlock"}
                            </motion.button>
                          </>) : (
                            <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-light-secondary/20 dark:bg-white/[0.03] text-brand-text-light-secondary/50 dark:text-white/25 text-[11px] font-bold"><LockIcon className="w-3.5 h-3.5" />Soon</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── WHY ORIGINBI ── */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6 }}>
        <div className="text-center mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-green mb-3">Why OriginBi</p>
          <h2 className="text-[28px] sm:text-[34px] font-bold text-brand-text-light-primary dark:text-white tracking-tight">Built for Career Excellence</h2>
          <p className="mt-3 text-sm text-brand-text-light-secondary dark:text-white/50 max-w-lg mx-auto">Everything you need to assess, grow, and prove your professional capabilities.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Zp, title: "AI-Powered Analysis", desc: "Advanced algorithms evaluate your responses in real-time for precise skill mapping.", color: "#1ed36a" },
            { icon: Aw, title: "Industry Certified", desc: "Assessment frameworks aligned with leading industry standards and hiring practices.", color: "#8b5cf6" },
            { icon: Ch, title: "Detailed Analytics", desc: "Section-wise breakdown, competency radar, and personalized improvement roadmaps.", color: "#f59e0b" },
            { icon: Tr, title: "Career Trajectories", desc: "AI-derived career identity that evolves with every assessment you complete.", color: "#06b6d4" },
          ].map((feat, i) => (
            <motion.div key={feat.title} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 + i * 0.08 }}
              whileHover={{ y: -4, transition: { duration: 0.3 } }}
              className="group relative overflow-hidden rounded-2xl border border-brand-light-tertiary/30 dark:border-white/[0.08] bg-brand-light-primary/80 dark:bg-white/[0.03] backdrop-blur-xl p-6 hover:shadow-[0_20px_50px_rgba(30,211,106,0.08)] transition-all duration-500">
              <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ background: feat.color }} />
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border" style={{ background: `${feat.color}12`, borderColor: `${feat.color}25` }}>
                <span style={{ color: feat.color }}><feat.icon className="w-6 h-6" /></span>
              </div>
              <h3 className="text-[15px] font-bold text-brand-text-light-primary dark:text-white tracking-tight">{feat.title}</h3>
              <p className="mt-2 text-[12px] text-brand-text-light-secondary dark:text-white/50 leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── CTA BANNER ── */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}
        className="relative overflow-hidden rounded-[2rem] border border-brand-green/20">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark-primary via-[#1a2b1e] to-brand-dark-primary" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-green/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[200px] bg-emerald-500/10 rounded-full blur-[80px]" />
        <div className="relative z-10 p-8 sm:p-12 text-center">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-green/15 border border-brand-green/30 text-brand-green text-[11px] font-bold uppercase tracking-[0.15em] mb-5">
            <Sp className="w-4 h-4" />Start Your Journey
          </motion.div>
          <h2 className="text-[28px] sm:text-[36px] font-bold text-white tracking-tight leading-tight">
            Ready to Discover Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green to-emerald-400">Career Identity</span>?
          </h2>
          <p className="mt-4 text-[15px] text-white/50 max-w-xl mx-auto leading-relaxed">
            Take your first assessment and unlock AI-powered insights about your strengths, career fit, and growth opportunities.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <motion.button whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => onStartExam("aptitude")}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-green to-emerald-500 text-white font-bold text-[15px] shadow-xl shadow-brand-green/30 hover:shadow-brand-green/50 transition-all">
              Start Aptitude Assessment — ₹99
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="px-8 py-4 rounded-2xl border border-white/15 bg-white/[0.06] text-white font-bold text-[15px] hover:bg-white/[0.1] transition-all">
              View All Assessments
            </motion.button>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default EmptyStateDashboard;
