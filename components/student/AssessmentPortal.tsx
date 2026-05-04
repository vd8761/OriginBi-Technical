"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "./Header";
import ExamCarousel, { Exam } from "./ExamCarousel";
import ExamDetailModal from "./ExamDetailModal";
import ExploreView from "./ExploreView";
import AptitudePreTest from "../assessment/aptitude/AptitudePreTest";
import CommunicationPreTest from "../assessment/communication/CommunicationPreTest";
import RolePreTest from "../assessment/role/RolePreTest";
import AssessmentCard from "./AssessmentCard";
import { ProfileIcon } from "../icons";
import {
  EXAMS,
  EXAM_DETAILS,
  type AssessmentId,
  type ExtendedExam,
  type PricingTier,
} from "@/lib/exams";

type AssessmentView = "dashboard" | "assessment" | "profile" | "details" | "explore";
type AssessmentFilter = "all" | "ready" | "core" | "technical" | "career";


const FILTERS: { label: string; value: AssessmentFilter }[] = [
  { label: "All", value: "all" },
  { label: "Ready now", value: "ready" },
  { label: "Core skills", value: "core" },
  { label: "Tech hiring", value: "technical" },
  { label: "Career fit", value: "career" },
];

const TRACK_PALETTE = {
  core: "#10b981",
  technical: "#f59e0b",
  career: "#06b6d4",
} as const;

const AssessmentPortal: React.FC = () => {
  const [showAptitudeModal, setShowAptitudeModal] = useState(false);
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentView, setCurrentView] = useState<AssessmentView>("dashboard");
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [filter, setFilter] = useState<AssessmentFilter>("all");
  const [showNextStepAlert, setShowNextStepAlert] = useState(true);
  const router = useRouter();

  const readyExams = useMemo(() => EXAMS.filter((exam) => exam.available), []);

  const filteredExams = useMemo(() => {
    if (filter === "ready") {
      return EXAMS.filter((exam) => exam.available);
    }
    if (filter === "all") {
      return EXAMS;
    }
    return EXAMS.filter((exam) => (exam as ExtendedExam).track === filter);
  }, [filter]);

  const totalQuestions = useMemo(() => EXAMS.reduce((sum, exam) => sum + exam.questions, 0), []);
  const totalDuration = useMemo(
    () => EXAMS.reduce((sum, exam) => sum + (parseInt(exam.duration, 10) || 0), 0),
    [],
  );

  const readinessScore = useMemo(() => {
    if (!EXAMS.length) {
      return 0;
    }
    return Math.round((readyExams.length / EXAMS.length) * 100);
  }, [readyExams.length]);

  const avgDuration = useMemo(
    () => Math.round(totalDuration / Math.max(EXAMS.length, 1)),
    [totalDuration],
  );

  const avgPrice = useMemo(
    () => Math.round(EXAMS.reduce((sum, exam) => sum + exam.price, 0) / Math.max(EXAMS.length, 1)),
    [],
  );

  const maxPrice = useMemo(
    () => EXAMS.reduce((max, exam) => Math.max(max, exam.price), 0),
    [],
  );

  const largestExam = useMemo(
    () => EXAMS.reduce((prev, exam) => (exam.questions > prev.questions ? exam : prev), EXAMS[0]),
    [],
  );

  const trackCounts = useMemo(() => {
    const counts: Record<Exclude<AssessmentFilter, "all" | "ready">, number> = {
      core: 0,
      technical: 0,
      career: 0,
    };

    EXAMS.forEach((exam) => {
      const track = (exam as ExtendedExam).track;
      if (track) {
        counts[track] += 1;
      }
    });

    return counts;
  }, []);

  const spotlightExam = (readyExams[0] ?? EXAMS[0]) as Exam;

  const trackLanes = [
    {
      id: "core",
      label: "Core skills",
      description: "Quant, logic, and communication drills.",
      count: trackCounts.core,
      accent: TRACK_PALETTE.core,
    },
    {
      id: "technical",
      label: "Tech hiring",
      description: "Coding, DSA, and interview patterns.",
      count: trackCounts.technical,
      accent: TRACK_PALETTE.technical,
    },
    {
      id: "career",
      label: "Career fit",
      description: "Role-fit judgement and scenarios.",
      count: trackCounts.career,
      accent: TRACK_PALETTE.career,
    },
  ];

  const queueExams = readyExams.slice(0, 3);

  const momentumTrend = [36, 48, 42, 58, 66, 72, 68];

  const insightMetrics = [
    {
      label: "Career readiness",
      value: `${readinessScore}%`,
      detail: "skills verified",
    },
    {
      label: "Skill coverage",
      value: "12+",
      detail: "core competencies",
    },
    {
      label: "Industry aligned",
      value: "5",
      detail: "sectors covered",
    },
    {
      label: "Learning paths",
      value: "3",
      detail: "career tracks",
    },
  ];

  const signalHighlights = [
    {
      label: "Recommended start",
      value: "Aptitude",
      detail: "foundational skills first",
    },
    {
      label: "Growth potential",
      value: "High",
      detail: "based on skill gaps",
    },
    {
      label: "Certification path",
      value: "Available",
      detail: "completion badge ready",
    },
  ];

  const focusSignals = [
    {
      label: "Recommended start",
      value: spotlightExam.shortTitle,
      detail: `${spotlightExam.duration} - ${spotlightExam.questions} Qs`,
    },
    {
      label: "Core lane depth",
      value: `${trackCounts.core} exams`,
      detail: "quant + logic coverage",
    },
    {
      label: "Tech lane depth",
      value: `${trackCounts.technical} exams`,
      detail: "coding + MNC focus",
    },
    {
      label: "Career lane depth",
      value: `${trackCounts.career} exams`,
      detail: "role-fit diagnostics",
    },
  ];

  const updateFeed = [
    {
      title: "Aptitude benchmark refreshed",
      detail: "New logic patterns added to reasoning set.",
      time: "2h ago",
    },
    {
      title: "Communication tasks upgraded",
      detail: "Listening cues now graded for nuance.",
      time: "Yesterday",
    },
    {
      title: "Role-fit rubric expanded",
      detail: "Scenario variants for product roles.",
      time: "2 days ago",
    },
  ];

  const handleSelectExam = (exam: Exam) => {
    setSelectedExam(exam);
    setShowDetailModal(true);
  };

  const handleStartExam = (exam: Exam, tier?: PricingTier) => {
    if (!exam.available) {
      setSelectedExam(exam);
      setShowDetailModal(true);
      return;
    }

    // If a tier was selected, we could handle payment here
    if (tier) {
      console.log(`Processing payment for ${exam.title} - ${tier.name} tier: ₹${tier.price}`);
    }

    // Show appropriate pre-test modal or navigate directly
    if (exam.id === "aptitude") {
      setShowAptitudeModal(true);
    } else if (exam.id === "communication") {
      setShowCommunicationModal(true);
    } else if (exam.id === "role") {
      setShowRoleModal(true);
    } else if (exam.id === "coding") {
      router.push("/assessment/coding");
    } else if (exam.id === "mnc") {
      router.push("/assessment/mnc");
    }
  };

  const currentHeaderView: AssessmentView = currentView === "details" ? "assessment" : currentView;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#f5fbf7] dark:bg-[#0f1712] font-sans transition-colors duration-500">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-400/25 via-cyan-300/10 to-transparent blur-[90px] animate-float-slow opacity-80" />
        <div className="absolute -bottom-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-amber-300/20 via-emerald-300/10 to-transparent blur-[100px] animate-float-slower opacity-70" />
        <div className="absolute inset-0 opacity-[0.12] dark:opacity-[0.08] assessment-grid" />
        <div className="absolute inset-0 opacity-[0.08] dark:opacity-[0.12] assessment-scan mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <Header
        currentView={currentHeaderView}
        onNavigate={(view) => setCurrentView(view)}
        onLogout={() => console.log("Logging out...")}
      />

      {/* Next Step Notification Alert */}
      {showNextStepAlert && currentView === "dashboard" && (
        <div className="fixed top-24 right-4 z-50 animate-slide-left w-[360px]">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-white/95 dark:bg-[#111a15]/95 p-5 shadow-2xl backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start gap-4 relative z-10">
              <div className="flex w-10 h-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                  Aptitude Cleared!
                </h4>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Excellent work on Logic. Start the{" "}
                  <strong className="text-slate-800 dark:text-white">Communication Assessment</strong>{" "}
                  next to unlock Technical Groupings and discover your true Role-Fit.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowNextStepAlert(false);
                      setCurrentView("assessment");
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-sm transition-colors"
                  >
                    View Assessments
                  </button>
                  <button
                    onClick={() => setShowNextStepAlert(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowNextStepAlert(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <main className="relative z-10 mx-auto flex max-w-[1480px] flex-col gap-8 px-4 pb-8 pt-24 sm:px-6 lg:px-10">
        {currentView === "explore" ? (
          <ExploreView
            assessments={EXAMS}
            examDetails={EXAM_DETAILS}
            onNavigateToDetails={(exam) => router.push(`/explore/${exam.id}`)}
          />
        ) : currentView === "assessment" ? (
          <div className="animate-slide-up space-y-10" style={{ animationDelay: "100ms" }}>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Assessments</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select an assessment to validate your skills and get certified.</p>
              </div>

              <div className="relative flex flex-wrap items-center gap-2 p-2 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-[#111a15]/70 backdrop-blur-md shadow-sm">
                {FILTERS.map((item) => {
                  const isActive = filter === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFilter(item.value)}
                      className={
                        "relative px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 " +
                        (isActive
                          ? "text-white bg-slate-900 dark:bg-white dark:text-slate-900 shadow-md"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5")
                      }
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredExams.map((exam) => (
                <AssessmentCard
                  key={exam.id}
                  title={exam.title}
                  description={exam.description}
                  statusLabel={exam.statusLabel}
                  statusTone={exam.available ? "success" : "warning"}
                  totalQuestions={exam.questions}
                  duration={exam.duration}
                  price={`₹${exam.price}`}
                  tags={exam.tags}
                  icon={exam.icon}
                  available={exam.available}
                  level={exam.difficulty}
                  insight={exam.statusLabel}
                  onDetailsClick={() => handleSelectExam(exam)}
                  onStartClick={() => handleStartExam(exam)}
                />
              ))}
            </div>
          </div>
        ) : currentView === "dashboard" ? (
          <>
            {/* Command Deck */}
            <section className="relative overflow-hidden rounded-[2.75rem] border border-white/70 dark:border-white/10 bg-white/70 dark:bg-[#101814]/80 backdrop-blur-2xl shadow-[0_28px_80px_rgba(15,23,42,0.12)] dark:shadow-[0_32px_90px_rgba(0,0,0,0.55)] p-8 sm:p-12 lg:p-14">
              <div className="absolute inset-0">
                <div className="absolute -top-16 left-[-8%] h-72 w-72 rounded-full bg-gradient-to-br from-emerald-400/20 to-transparent blur-[60px] animate-float-slow" />
                <div className="absolute bottom-[-25%] right-[-6%] h-80 w-80 rounded-full bg-gradient-to-tr from-cyan-400/20 to-transparent blur-[70px] animate-float-slower" />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.03),rgba(15,23,42,0))] dark:bg-[linear-gradient(120deg,rgba(255,255,255,0.06),rgba(255,255,255,0))]" />
              </div>

              <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
                <div className="animate-slide-up" style={{ animationDelay: "80ms" }}>
                  <div className="inline-flex items-center gap-3 rounded-full border border-emerald-200/70 dark:border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-500/10 px-5 py-2.5 text-emerald-700 dark:text-emerald-300 text-sm font-semibold tracking-wide shadow-sm">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    {readyExams.length} live assessments ready
                  </div>

                  <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-800 dark:text-white tracking-tight leading-[1.05]">
                    Your career compass
                    <span className="block mt-2 bg-gradient-to-r from-emerald-500 via-brand-green to-cyan-500 bg-clip-text text-transparent">
                      discover, validate, and accelerate.
                    </span>
                  </h1>

                  <p className="mt-5 text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                    Identify your strengths, bridge skill gaps, and align with industry expectations. Each assessment unlocks personalized insights for your professional journey.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-4">
                    <button className="px-7 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-xl shadow-slate-900/20 dark:shadow-white/10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                      Explore library
                    </button>
                    <button className="px-7 py-4 rounded-2xl bg-white/80 dark:bg-white/5 text-slate-700 dark:text-white font-semibold border border-slate-200/70 dark:border-white/10 shadow-sm hover:bg-white hover:-translate-y-1 transition-all duration-300">
                      Run quick scan
                    </button>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {["AI proctored", "Instant reports", "Role fit mapping"].map((item) => (
                      <span key={item} className="rounded-full border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 px-4 py-2 shadow-sm">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 animate-slide-up" style={{ animationDelay: "160ms" }}>
                  <div className="sm:col-span-2 relative overflow-hidden rounded-3xl border border-white/70 dark:border-white/10 bg-white/70 dark:bg-[#0f1712]/70 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Readiness index</p>
                        <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-white">
                          {readinessScore}% ready
                        </p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          Based on live assessments and total question volume.
                        </p>
                      </div>
                      <div
                        className="relative h-24 w-24 rounded-full [--ring-track:rgba(15,23,42,0.08)] dark:[--ring-track:rgba(255,255,255,0.16)]"
                        style={{ background: `conic-gradient(#1ed36a ${readinessScore * 3.6}deg, var(--ring-track) 0deg)` }}
                      >
                        <span className="absolute inset-0 rounded-full border border-emerald-500/20 animate-pulse-ring" />
                        <div className="absolute inset-2 rounded-full bg-white/90 dark:bg-[#0f1712] border border-white/80 dark:border-white/10 flex items-center justify-center text-sm font-bold text-slate-800 dark:text-white">
                          {readinessScore}%
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                      <div className="rounded-2xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 p-3">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Exams</p>
                        <p className="text-lg font-bold text-slate-800 dark:text-white">{EXAMS.length}</p>
                      </div>
                      <div className="rounded-2xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 p-3">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Live</p>
                        <p className="text-lg font-bold text-slate-800 dark:text-white">{readyExams.length}</p>
                      </div>
                      <div className="rounded-2xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 p-3">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avg time</p>
                        <p className="text-lg font-bold text-slate-800 dark:text-white">{avgDuration} min</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-3xl border border-white/70 dark:border-white/10 bg-white/70 dark:bg-[#0f1712]/70 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Spotlight</p>
                      <span
                        className={
                          "text-[10px] font-bold px-2.5 py-1 rounded-full " +
                          (spotlightExam.available
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300")
                        }
                      >
                        {spotlightExam.statusLabel}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl"
                        style={{ background: `${spotlightExam.accentColor}1a`, color: spotlightExam.accentColor }}
                      >
                        {spotlightExam.icon}
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-800 dark:text-white">{spotlightExam.shortTitle}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {spotlightExam.duration} - {spotlightExam.questions} questions
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartExam(spotlightExam)}
                      className="mt-5 w-full rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 py-2.5 text-sm font-semibold text-slate-700 dark:text-white hover:bg-white hover:shadow-md transition-all"
                    >
                      {spotlightExam.available ? "Start now" : "View details"}
                    </button>
                  </div>

                  <div className="relative overflow-hidden rounded-3xl border border-white/70 dark:border-white/10 bg-white/70 dark:bg-[#0f1712]/70 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Track mix</p>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Live</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {trackLanes.map((lane) => (
                        <div key={lane.id}>
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <span>{lane.label}</span>
                            <span>{lane.count}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(18, Math.round((lane.count / Math.max(EXAMS.length, 1)) * 100))}%`,
                                background: lane.accent,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Signal Board */}
            <section
              className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] animate-slide-up"
              style={{ animationDelay: "240ms" }}
            >
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/70 dark:border-white/10 bg-white/70 dark:bg-[#0f1712]/70 backdrop-blur-xl p-6 sm:p-8 shadow-[0_18px_60px_rgba(15,23,42,0.1)]">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Assessment flight plan</p>
                    <h3 className="mt-3 text-2xl font-bold text-slate-800 dark:text-white">Build mastery lanes</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
                      Stack the right mix of core, technical, and career signals for your target role.
                    </p>
                  </div>
                  <div className="rounded-full border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Live track map
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {trackLanes.map((lane) => (
                    <div
                      key={lane.id}
                      className="relative overflow-hidden rounded-2xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-white/5 p-4 shadow-sm"
                    >
                      <div
                        className="absolute inset-0 opacity-70"
                        style={{ background: `linear-gradient(135deg, ${lane.accent}1f, transparent 60%)` }}
                      />
                      <div className="relative">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{lane.label}</p>
                        <p className="mt-3 text-2xl font-bold" style={{ color: lane.accent }}>
                          {lane.count}
                        </p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{lane.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/70 dark:border-white/10 bg-white/70 dark:bg-[#0f1712]/70 backdrop-blur-xl p-6 sm:p-8 shadow-[0_18px_60px_rgba(15,23,42,0.1)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Launch queue</p>
                    <h3 className="mt-3 text-2xl font-bold text-slate-800 dark:text-white">Ready to start now</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Jump into the next best assessment while your momentum is high.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFilter("ready")}
                    className="rounded-full border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white transition-all"
                  >
                    Show ready
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {queueExams.length ? (
                    queueExams.map((exam) => (
                      <div
                        key={exam.id}
                        className="flex flex-col gap-4 rounded-2xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-2xl"
                            style={{ background: `${exam.accentColor}1a`, color: exam.accentColor }}
                          >
                            {exam.icon}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{exam.shortTitle}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {exam.duration} - {exam.questions} questions
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartExam(exam)}
                          className="rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-slate-900 hover:opacity-90 transition-all"
                        >
                          Start
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-white/5 p-4 text-sm text-slate-500 dark:text-slate-400">
                      All tracks are prepping. Check back soon.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Track Filters */}
            <section
              className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 animate-slide-up"
              style={{ animationDelay: "320ms" }}
            >
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Assessment orbit</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Choose a lane to shape the library.</p>
              </div>
              <div className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-transparent to-cyan-500/20 blur-lg opacity-70" />
                <div className="relative flex flex-wrap items-center gap-2 p-2 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-[#111a15]/70 backdrop-blur-md shadow-sm">
                  {FILTERS.map((item) => {
                    const isActive = filter === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setFilter(item.value)}
                        className={
                          "relative px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 " +
                          (isActive
                            ? "text-white bg-slate-900 dark:bg-white dark:text-slate-900 shadow-md"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5")
                        }
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Assessment Library */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Assessment library</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Swipe or use the arrows to explore.</p>
                </div>
                <div className="rounded-full border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Showing {filteredExams.length} exams
                </div>
              </div>
              <ExamCarousel
                exams={filteredExams}
                onSelectExam={handleSelectExam}
                onStartExam={handleStartExam}
              />
            </section>

            {/* Intelligence Brief */}
            <section className="py-12 border-t border-slate-200/60 dark:border-white/10 mt-4 animate-slide-up" style={{ animationDelay: "520ms" }}>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Intelligence brief</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Advanced signals distilled from the full assessment stack.</p>
                </div>
                <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">Live snapshot</div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/60 dark:border-white/10 bg-white/70 dark:bg-white/5 p-6 sm:p-8 shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
                  <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_55%)]" />
                  <div className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Signal density</p>
                        <h4 className="mt-2 text-2xl font-bold text-slate-800 dark:text-white">Library performance pulse</h4>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xl">
                          A high-level look at scale, runtime, and pricing intensity across the assessment library.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {["Refreshed hourly", "AI-scored", "Multi-track"].map((chip) => (
                          <span
                            key={chip}
                            className="rounded-full border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {insightMetrics.map((metric) => (
                        <div
                          key={metric.label}
                          className="rounded-2xl border border-white/70 dark:border-white/10 bg-white/80 dark:bg-white/5 p-4 shadow-sm"
                        >
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{metric.label}</p>
                          <p className="mt-2 text-lg font-bold text-slate-800 dark:text-white">{metric.value}</p>
                          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{metric.detail}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 rounded-3xl border border-white/70 dark:border-white/10 bg-white/80 dark:bg-white/5 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Momentum trend</p>
                          <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Weekly readiness velocity</p>
                        </div>
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">+14% vs last week</span>
                      </div>
                      <div className="mt-4 flex h-20 items-end gap-2">
                        {momentumTrend.map((value, index) => (
                          <div key={value + index} className="flex-1 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15">
                            <div
                              className="w-full rounded-xl bg-gradient-to-t from-emerald-500 to-cyan-400"
                              style={{ height: `${Math.max(value, 18)}%` }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        {signalHighlights.map((item) => (
                          <div key={item.label} className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-white/5 p-3">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.label}</p>
                            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-white">{item.value}</p>
                            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{item.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="rounded-[2.5rem] border border-slate-200/60 dark:border-white/10 bg-white/70 dark:bg-white/5 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Focus signals</p>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">Live</span>
                    </div>
                    <div className="mt-4 space-y-4">
                      {focusSignals.map((signal) => (
                        <div key={signal.label} className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-white/5 p-4">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{signal.label}</p>
                          <p className="mt-2 text-sm font-bold text-slate-800 dark:text-white">{signal.value}</p>
                          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{signal.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[2.5rem] border border-slate-200/60 dark:border-white/10 bg-white/70 dark:bg-white/5 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Update feed</p>
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Recent</span>
                    </div>
                    <div className="mt-4 space-y-4">
                      {updateFeed.map((update) => (
                        <div key={update.title} className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-white/5 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{update.title}</p>
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">{update.time}</span>
                          </div>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{update.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center rounded-3xl bg-white/80 dark:bg-[#111a15]/80 backdrop-blur-xl border border-slate-200/60 dark:border-white/10">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
              <ProfileIcon className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-2xl font-medium text-slate-800 dark:text-white">Profile & Settings</h2>
            <p className="mt-3 max-w-md text-slate-500 dark:text-slate-400 leading-relaxed">
              Your profile area is being prepared. You can continue exploring assessments and start any available test from the library.
            </p>
            <button
              type="button"
              onClick={() => setCurrentView("assessment")}
              className="mt-6 px-6 py-3 rounded-xl bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-sm font-medium transition-all hover:opacity-90"
            >
              View assessments
            </button>
          </section>
        )}

        <footer className="py-8 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} Origin BI | Powered by Beyond Intelligence
          </p>
        </footer>
      </main>

      {/* Modals */}
      <ExamDetailModal
        exam={selectedExam}
        detail={selectedExam ? EXAM_DETAILS[selectedExam.id as AssessmentId] : null}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onStart={(exam, tier) => {
          setShowDetailModal(false);
          handleStartExam(exam, tier);
        }}
      />

      {showAptitudeModal && (
        <AptitudePreTest
          onStart={() => router.push("/assessment/aptitude")}
          onClose={() => setShowAptitudeModal(false)}
        />
      )}

      {showCommunicationModal && (
        <CommunicationPreTest
          onStart={() => router.push("/assessment/communication")}
          onClose={() => setShowCommunicationModal(false)}
        />
      )}

      {showRoleModal && (
        <RolePreTest
          onStart={() => router.push("/assessment/role")}
          onClose={() => setShowRoleModal(false)}
        />
      )}
    </div>
  );
};

export default AssessmentPortal;
