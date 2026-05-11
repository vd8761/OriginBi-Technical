"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "./Header";
import { Exam } from "./ExamCarousel";
import ExamDetailModal from "./ExamDetailModal";
import ExploreView from "./ExploreView";
import AptitudePreTest from "../assessment/aptitude/AptitudePreTest";
import CommunicationPreTest from "../assessment/communication/CommunicationPreTest";
import RolePreTest from "../assessment/role/RolePreTest";
import MNCPreTest from "../assessment/mnc/MNCPreTest";
import AssessmentCard from "./AssessmentCard";
import { ProfileIcon } from "../icons";
import {
  EXAMS,
  EXAM_DETAILS,
  type AssessmentId,
  type ExtendedExam,
  type PricingTier,
} from "@/lib/exams";
import DashboardContent from "./dashboard/DashboardContent";
import ProfileView from "./ProfileView";

type AssessmentView = "dashboard" | "assessment" | "profile" | "details" | "explore";
type AssessmentFilter = "all" | "ready" | "core" | "technical" | "career";

const FILTERS: { label: string; value: AssessmentFilter }[] = [
  { label: "All", value: "all" },
  { label: "Ready", value: "ready" },
  { label: "Core Skills", value: "core" },
  { label: "Technical", value: "technical" },
  { label: "Career", value: "career" },
];

interface AssessmentPortalProps {
  userName?: string;
  initialView?: AssessmentView;
}

type AssessmentMode = "trial" | "main";

const AssessmentPortal: React.FC<AssessmentPortalProps> = ({ userName = "Student", initialView = "dashboard" }) => {
  const [showAptitudeModal, setShowAptitudeModal] = useState(false);
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showMncModal, setShowMncModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [currentView, setCurrentView] = useState<AssessmentView>(initialView);

  const handleNavigate = (view: string) => {
    router.push(`/${view}`);
  };

  useEffect(() => {
    setCurrentView(initialView);
  }, [initialView]);

  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [filter, setFilter] = useState<AssessmentFilter>("all");
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>("main");
  const [assessmentsList, setAssessmentsList] = useState<any[]>([]);
  const [completionPopup, setCompletionPopup] = useState<{
    completed: AssessmentId;
    next: AssessmentId | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_TECH_API_URL || "http://localhost:5000";
        const response = await fetch(`${API_BASE}/api/assessment/admin/assessments`);
        const json = await response.json();
        if (json && json.data && active) {
          setAssessmentsList(json.data);
        }
      } catch (err) {
        console.error("Failed to load assessments dynamically:", err);
      }
    };
    fetchAll();
    return () => {
      active = false;
    };
  }, []);

  const dynamicExams = useMemo(() => {
    return EXAMS.map((exam) => {
      const dbModule = exam.id === "communication" ? "grammar" : exam.id;
      const dbExam = assessmentsList.find(
        (a) => a.module_type === dbModule || a.assessment_code === exam.id
      );
      if (dbExam) {
        let tags = exam.tags;
        if (dbExam.categories) {
          let parsed: any[] = [];
          if (Array.isArray(dbExam.categories)) {
            parsed = dbExam.categories;
          } else if (typeof dbExam.categories === "string") {
            try {
              parsed = JSON.parse(dbExam.categories);
            } catch {
              parsed = [];
            }
          }
          if (parsed.length > 0) {
            tags = parsed.map((c: any) => {
              if (typeof c === "string") return c;
              return c.name || c.id || "";
            }).filter(Boolean);
          }
        }
        return {
          ...exam,
          title: dbExam.assessment_name || exam.title,
          duration: `${dbExam.total_time_minutes || 60} min`,
          questions: dbExam.question_limit > 0 ? dbExam.question_limit : (dbExam.total_questions || exam.questions),
          price: dbExam.amount !== undefined && dbExam.amount !== null ? Number(dbExam.amount) : exam.price,
          trialAttemptsLimit: dbExam.trial_attempts_limit !== undefined && dbExam.trial_attempts_limit !== null ? Number(dbExam.trial_attempts_limit) : 5,
          mainAttemptsLimit: dbExam.main_attempts_limit !== undefined && dbExam.main_attempts_limit !== null ? Number(dbExam.main_attempts_limit) : 2,
          tags: tags,
        };
      }
      return exam;
    });
  }, [assessmentsList]);

  const filteredExams = useMemo(() => {
    const baseExams = dynamicExams.filter((exam) => exam.available);
    if (filter === "ready" || filter === "all") {
      return baseExams;
    }
    return baseExams.filter((exam) => (exam as ExtendedExam).track === filter);
  }, [dynamicExams, filter]);

  const handleSelectExam = (exam: Exam) => {
    router.push(`/explore/${exam.id}`);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (currentView !== "dashboard") return;
    const completed = searchParams.get("completed") as AssessmentId | null;
    if (!completed) return;

    const recommendedOrder: AssessmentId[] = ["aptitude", "communication", "coding", "mnc", "role"];

    // Read from assessmentTracker storage
    const savedCompleted = (() => {
      const raw = window.localStorage.getItem("completed_assessments");
      if (!raw) return [];
      try {
        return JSON.parse(raw) as Array<{ assessmentCode?: string }>;
      } catch {
        return [];
      }
    })();

    // Also read from progress.ts storage (originbi:assessment-results)
    const savedResults = (() => {
      const raw = window.localStorage.getItem("originbi:assessment-results");
      if (!raw) return {};
      try {
        return JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return {};
      }
    })();

    // Build the full set of completed assessment IDs from both sources
    const completedCodes = new Set<AssessmentId>([
      // from assessmentTracker
      ...savedCompleted.map((c) => c.assessmentCode).filter(Boolean) as AssessmentId[],
      // from progress.ts results (keys are assessment IDs)
      ...Object.keys(savedResults).filter(k =>
        recommendedOrder.includes(k as AssessmentId)
      ) as AssessmentId[],
    ]);

    // Add the one just completed
    completedCodes.add(completed);

    // Find the next incomplete assessment in recommended order
    const next = recommendedOrder.find((id) => !completedCodes.has(id)) ?? null;

    // Only show popup if there's actually a next assessment to suggest
    if (next !== null) {
      setCompletionPopup({ completed, next });
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, [currentView, searchParams]);

  const launchAssessment = (examId: string, mode: AssessmentMode) => {
    if (examId === "coding") {
      router.push(`/assessment/coding?mode=${mode}`);
      return;
    }

    if (examId === "aptitude") {
      setShowAptitudeModal(true);
      return;
    }

    if (examId === "communication") {
      setShowCommunicationModal(true);
      return;
    }

    if (examId === "role") {
      setShowRoleModal(true);
      return;
    }

    if (examId === "mnc") {
      setShowMncModal(true);
    }
  };

  const openAssessmentFlow = (exam: Exam, mode: AssessmentMode) => {
    if (!exam.available) {
      setSelectedExam(exam);
      setShowDetailModal(true);
      return;
    }

    setAssessmentMode(mode);
    launchAssessment(exam.id, mode);
  };

  const handleCardTrialStart = (exam: Exam) => {
    openAssessmentFlow(exam, "trial");
  };

  const handleCardMainStart = (exam: Exam) => {
    openAssessmentFlow(exam, "main");
  };

  const handleModalStart = (exam: Exam, tier?: PricingTier) => {
    if (tier) {
      console.log(`Processing payment for ${exam.title} - ${tier.name} tier: ₹${tier.price}`);
      openAssessmentFlow(exam, "main");
      return;
    }

    openAssessmentFlow(exam, "trial");
  };

  const currentHeaderView: AssessmentView = currentView === "details" ? "assessment" : currentView;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-brand-light-secondary dark:bg-brand-dark-primary font-sans transition-colors duration-500">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.12] dark:opacity-[0.08] assessment-grid" />
        <div className="absolute inset-0 opacity-[0.08] dark:opacity-[0.12] assessment-scan mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <Header
        currentView={currentHeaderView}
        onNavigate={(view) => handleNavigate(view)}
        onLogout={() => console.log("Logging out...")}
      />

      {/* Next Step Notification Alert */}
      {completionPopup && currentView === "dashboard" && (
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
                  {(EXAMS.find((e) => e.id === completionPopup.completed)?.title ?? "Assessment")} Cleared!
                </h4>
                <p className="mt-1.5 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                  {completionPopup.next ? (
                    <>
                      Great work on{" "}
                      <strong className="text-slate-800 dark:text-white">
                        {EXAMS.find((e) => e.id === completionPopup.completed)?.title ?? "this assessment"}
                      </strong>
                      . Start{" "}
                      <strong className="text-slate-800 dark:text-white">
                        {EXAMS.find((e) => e.id === completionPopup.next)?.title ?? "the next assessment"}
                      </strong>{" "}
                      next to keep building your profile.
                    </>
                  ) : (
                    <>
                      Great work completing all available assessments. Review your results and insights to plan your next steps.
                    </>
                  )}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => {
                      const next = completionPopup.next ? EXAMS.find((e) => e.id === completionPopup.next) : null;
                      setCompletionPopup(null);
                      handleNavigate("assessment");
                      if (next) {
                        handleSelectExam(next);
                      }
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-sm transition-colors"
                  >
                    View Assessments
                  </button>
                  <button
                    onClick={() => setCompletionPopup(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setCompletionPopup(null)}
              className="absolute top-3 right-3 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <main className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 pt-[88px] sm:pt-[96px]">
        {currentView === "explore" ? (
          <ExploreView
            assessments={dynamicExams as any}
            examDetails={EXAM_DETAILS as any}
            onNavigateToDetails={(exam) => {
              router.push(`/explore/${exam.id}`);
            }}
          />
        ) : currentView === "assessment" ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-brand-text-light-primary dark:text-brand-text-primary">Assessment Library</h2>
                <p className="text-sm text-brand-text-light-secondary dark:text-brand-text-secondary mt-1">
                  Explore and start your technical evaluations
                </p>
              </div>
              <div className="relative flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-[#111a15]/70 backdrop-blur-md shadow-sm">
                {FILTERS.map((item) => {
                  const isActive = filter === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFilter(item.value)}
                      className={
                        "relative px-5 py-1.5 rounded-xl text-sm font-semibold transition-all duration-300 border " +
                        (isActive
                          ? "text-white bg-brand-green shadow-md"
                          : "text-brand-text-light-secondary dark:text-brand-text-secondary hover:text-brand-text-light-primary dark:hover:text-brand-text-primary hover:bg-brand-light-secondary dark:hover:bg-white/5")
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
                  accentColor={exam.accentColor}
                  gradient={exam.gradient}
                  trialAttemptsLimit={(exam as any).trialAttemptsLimit}
                  mainAttemptsLimit={(exam as any).mainAttemptsLimit}
                  onDetailsClick={() => handleSelectExam(exam)}
                  onTrialClick={() => handleCardTrialStart(exam)}
                  onMainClick={() => handleCardMainStart(exam)}
                />
              ))}
            </div>
          </div>
        ) : currentView === "dashboard" ? (
          <DashboardContent
            userName={userName}
            handleSelectExam={handleSelectExam}
            handleStartExam={handleModalStart}
            setShowDetailModal={setShowDetailModal}
          />
        ) : currentView === "profile" ? (
          <ProfileView onNavigate={(view) => handleNavigate(view as any)} />
        ) : (
          <section className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center rounded-3xl bg-brand-light-primary/80 dark:bg-brand-dark-secondary/80 backdrop-blur-xl border border-brand-light-tertiary/60 dark:border-white/10">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-light-secondary dark:bg-white/5 text-brand-text-light-secondary dark:text-brand-text-secondary">
              <ProfileIcon className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-2xl font-medium text-brand-text-light-primary dark:text-brand-text-primary">Profile & Settings</h2>
            <p className="mt-3 max-w-md text-brand-text-light-secondary dark:text-brand-text-secondary leading-relaxed">
              Your profile area is being prepared. You can continue exploring assessments and start any available test from the library.
            </p>
            <button
              onClick={() => handleNavigate("explore")}
              className="mt-6 px-6 py-3 rounded-xl bg-brand-green text-white text-sm font-semibold hover:opacity-90 transition-all"
            >
              Explore Assessments
            </button>
          </section>
        )}

        <footer className="py-8 text-center">
          <p className="text-sm text-brand-text-light-secondary/70 dark:text-brand-text-secondary">
            &copy; {new Date().getFullYear()} Origin BI | Powered by Beyond Intelligence
          </p>
        </footer>
      </main>

      <ExamDetailModal
        exam={selectedExam}
        detail={selectedExam ? EXAM_DETAILS[selectedExam.id as AssessmentId] : null}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onStart={(exam, tier) => {
          setShowDetailModal(false);
          handleModalStart(exam, tier);
        }}
      />

      {showAptitudeModal && (
        <AptitudePreTest
          mode={assessmentMode}
          onStart={(mode) => router.push(`/assessment/aptitude?mode=${mode}`)}
          onClose={() => setShowAptitudeModal(false)}
          accentColor={EXAMS.find(e => e.id === 'aptitude')?.accentColor}
          gradient={EXAMS.find(e => e.id === 'aptitude')?.gradient}
        />
      )}

      {showCommunicationModal && (
        <CommunicationPreTest
          mode={assessmentMode}
          onStart={(mode) => router.push(`/assessment/communication?mode=${mode}`)}
          onClose={() => setShowCommunicationModal(false)}
          accentColor={EXAMS.find(e => e.id === 'communication')?.accentColor}
          gradient={EXAMS.find(e => e.id === 'communication')?.gradient}
        />
      )}

      {showRoleModal && (
        <RolePreTest
          mode={assessmentMode}
          onStart={(mode) => router.push(`/assessment/role?mode=${mode}`)}
          onClose={() => setShowRoleModal(false)}
          accentColor={EXAMS.find(e => e.id === 'role')?.accentColor}
          gradient={EXAMS.find(e => e.id === 'role')?.gradient}
        />
      )}

      {showMncModal && (
        <MNCPreTest
          mode={assessmentMode}
          onStart={(mode) => router.push(`/assessment/mnc?mode=${mode}`)}
          onClose={() => setShowMncModal(false)}
          accentColor={EXAMS.find(e => e.id === 'mnc')?.accentColor}
          gradient={EXAMS.find(e => e.id === 'mnc')?.gradient}
        />
      )}
    </div>
  );
};

export default AssessmentPortal;
