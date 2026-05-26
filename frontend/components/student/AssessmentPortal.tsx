"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "./Header";
import { Exam } from "./ExamCarousel";
import ExamDetailModal from "./ExamDetailModal";
import ExploreView from "./ExploreView";
import AptitudePreTest from "../assessment/aptitude/AptitudePreTest";
import AdaptiveAptitudePreTest from "../assessment/aptitude/AdaptiveAptitudePreTest";
import CommunicationPreTest from "../assessment/communication/CommunicationPreTest";
import RolePreTest from "../assessment/role/RolePreTest";
import MNCPreTest from "../assessment/mnc/MNCPreTest";
import AssessmentCard from "./AssessmentCard";
import { ProfileIcon } from "../icons";
import {
  EXAMS,
  EXAM_DETAILS,
  CODING_LANGUAGES,
  type AssessmentId,
  type ExtendedExam,
  type PricingTier,
} from "@/lib/exams";
import { usePaidAssessments, useCompletedAssessments, type PaymentKey } from "@/lib/payments";
import { useSession } from "@/lib/contexts/SessionContext";
import DashboardContent from "./dashboard/DashboardContent";
import ProfileView from "./ProfileView";
import { listAssignments, type Assignment } from "@/lib/api";
import { type InProgressAttempt } from "@/lib/assessmentResume";
import {
  securityCheckBeforeStart,
  getAssessmentCode,
  getUserId,
  type AssessmentModule,
} from "@/lib/assessmentSecurity";
import { getDisplayedQuestionCount } from "@/lib/assessmentQuestionCount";

type AssessmentView = "dashboard" | "assessment" | "profile" | "details" | "explore";
type AssessmentFilter = "all" | "ready" | "core" | "technical" | "career";
const LEGACY_TECH_API_URL = (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "" : process.env.NEXT_PUBLIC_TECH_API_URL?.replace(/\/$/, ""));
const TECH_API_BASE =
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "" : process.env.NEXT_PUBLIC_TECH_API_URL?.replace(/\/$/, "")) ||
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "";

const FILTERS: { label: string; value: AssessmentFilter }[] = [
  { label: "All", value: "all" },
  { label: "Ready", value: "ready" },
  { label: "Core Skills", value: "core" },
  { label: "Technical", value: "technical" },
  { label: "Career", value: "career" },
];

interface AssessmentPortalProps {
  userName?: string;
  onLogout?: () => void;
  initialView?: AssessmentView;
}

type AssessmentMode = "trial" | "main";

const AssessmentPortal: React.FC<AssessmentPortalProps> = ({ userName = "Student", onLogout, initialView = "explore" }) => {
  const [showAptitudeModal, setShowAptitudeModal] = useState(false);
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showMncModal, setShowMncModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isPaid, isVisible, isEntitlementsReady } = usePaidAssessments();
  const { isCompleted } = useCompletedAssessments();
  const { user } = useSession();
  
  const [currentView, setCurrentView] = useState<AssessmentView>(initialView);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleNavigate = (view: string) => {
    router.push(`/${view}`);
  };

  useEffect(() => {
    setCurrentView(initialView);
  }, [initialView]);

  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [filter, setFilter] = useState<AssessmentFilter>("all");
  const [showNextStepAlert, setShowNextStepAlert] = useState(true);
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>("main");
  const [assessmentsList, setAssessmentsList] = useState<any[]>([]);
  const [paidAssignments, setPaidAssignments] = useState<Assignment[] | null>(null);
  const [completionPopup, setCompletionPopup] = useState<{
    completed: AssessmentId;
    next: AssessmentId | null;
  } | null>(null);

  const [attemptsStats, setAttemptsStats] = useState<Record<string, { trial: number; main: number }>>({});
  const [limitExceededPopup, setLimitExceededPopup] = useState<{
    examId: string;
    examTitle: string;
    mode: "trial" | "main";
    limit: number;
    count: number;
  } | null>(null);
  const [inProgressAttempt, setInProgressAttempt] = useState<InProgressAttempt | null>(null);

  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      try {
        let activeEmail = user?.email || "";
        if (!activeEmail) {
          const storedProfile = localStorage.getItem("originbi:user-profile");
          if (storedProfile) {
            const parsed = JSON.parse(storedProfile);
            if (parsed && parsed.email) {
              activeEmail = parsed.email;
            }
          }
        }
        if (!activeEmail) {
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed && parsed.email) {
              activeEmail = parsed.email;
            }
          }
        }

        const emailParam = activeEmail ? `?userId=${encodeURIComponent(activeEmail)}` : "";
        if (TECH_API_BASE === undefined) return;
        const response = await fetch(`${TECH_API_BASE}/api/assessment/attempts-stats${emailParam}`);
        if (!response.ok) return;
        const json = await response.json();
        const data = json.data || json;
        if (json && data && active) {
          setAttemptsStats(data);
        }
      } catch (err) {
        // Optional dashboard enrichment; backend can be unavailable in UI-only sessions.
        if (active) {
          setAttemptsStats({});
        }
      }
    };

    fetchStats();
    return () => {
      active = false;
    };
  }, [currentView, user?.email]);

  useEffect(() => {
    let active = true;
    const fetchInProgress = async () => {
      if (currentView !== "dashboard") return;
      try {
        let activeEmail = user?.email || "";
        if (!activeEmail) {
          const storedProfile = localStorage.getItem("originbi:user-profile");
          if (storedProfile) {
            const parsed = JSON.parse(storedProfile);
            if (parsed && parsed.email) {
              activeEmail = parsed.email;
            }
          }
        }
        if (!activeEmail) {
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed && parsed.email) {
              activeEmail = parsed.email;
            }
          }
        }

        const emailParam = activeEmail ? `?userId=${encodeURIComponent(activeEmail)}` : "";
        if (TECH_API_BASE === undefined) return;
        const response = await fetch(`${TECH_API_BASE}/api/assessment/in-progress${emailParam}`);
        if (!response.ok) {
          if (active) setInProgressAttempt(null);
          return;
        }
        const json = await response.json();
        const data = json.data || json;
        const attempts = Array.isArray(data) ? data : [];
        if (active) setInProgressAttempt(attempts[0] ?? null);
      } catch {
        if (active) setInProgressAttempt(null);
      }
    };

    fetchInProgress();
    return () => {
      active = false;
    };
  }, [currentView, user?.email]);

  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
      if (LEGACY_TECH_API_URL === undefined) return;
      try {
        const response = await fetch(`${LEGACY_TECH_API_URL}/api/assessment/admin/assessments`);
        if (!response.ok) return;
        const json = await response.json();
        if (json && json.data && active) {
          setAssessmentsList(json.data);
        }
      } catch {
        // The Nest assessment admin API is optional for this frontend shell.
      }
    };
    fetchAll();
    return () => {
      active = false;
    };
  }, []);

  // Pull the user's paid assignments so we can show only the assessments
  // they've actually purchased. Coding is special — each language is its
  // own assignment, so we end up with one card per paid language.
  useEffect(() => {
    let active = true;
    const fetchPaid = async () => {
      try {
        const data = await listAssignments();
        if (active) setPaidAssignments(data.assignments ?? []);
      } catch {
        if (active) setPaidAssignments([]);
      }
    };
    fetchPaid();
    return () => {
      active = false;
    };
  }, []);  const dynamicExams = useMemo(() => {
    const mapped = EXAMS.map((exam) => {
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
          assessmentId: dbExam.assessment_id,
          assessmentCode: dbExam.assessment_code || exam.id,
          title: dbExam.assessment_name || exam.title,
          duration: `${dbExam.total_time_minutes || 60} min`,
          questions: getDisplayedQuestionCount(dbExam, exam.questions),
          trialQuestionsCount: dbExam.trial_questions_count || 0,
          mainQuestionsCount: dbExam.main_questions_count || 0,
          questionLimit: getDisplayedQuestionCount(dbExam, exam.questions),
          price: dbExam.amount !== undefined && dbExam.amount !== null ? Number(dbExam.amount) : exam.price,
          trialAttemptsLimit: dbExam.trial_attempts_limit !== undefined && dbExam.trial_attempts_limit !== null ? Number(dbExam.trial_attempts_limit) : 5,
          mainAttemptsLimit: dbExam.main_attempts_limit !== undefined && dbExam.main_attempts_limit !== null ? Number(dbExam.main_attempts_limit) : 2,
          tags: tags,
          enabledQuestionTypes: dbExam.enabled_question_types,
        };
      }
      return exam;
    });

    return mapped;
  }, [assessmentsList]);

  const visibleExams = useMemo(() => {
    if (!isEntitlementsReady) return [];
    return dynamicExams.filter((exam) => isVisible(exam.id));
  }, [dynamicExams, isVisible, isEntitlementsReady]);

  // Read view from URL and sync with currentView
  useEffect(() => {
    const viewFromUrl = searchParams.get("view") as AssessmentView | null;
    const validViews: AssessmentView[] = ["dashboard", "assessment", "profile", "details", "explore"];
    if (viewFromUrl && validViews.includes(viewFromUrl)) {
      setCurrentView(viewFromUrl);
    } else if (initialView && initialView !== currentView) {
      setCurrentView(initialView);
    }
  }, [searchParams, initialView]);

  const filteredExams = useMemo(() => {
    // While we don't know yet, show nothing rather than flashing every card.
    if (paidAssignments === null) return [];

    const paidRefs = new Set(
      paidAssignments
        .filter((a) => a.status === "active" || a.status === "completed")
        .map((a) => a.assignmentRef),
    );

    // For each exam, decide whether the user has paid for it. Coding is an
    // exception: instead of one "Coding Assessment" card, expand into one
    // card per language the user has paid for.
    const result: ExtendedExam[] = [];
    for (const exam of visibleExams) {
      if (exam.id === "coding") {
        const codingPaid = CODING_LANGUAGES.filter((lang) =>
          paidRefs.has(`coding:${lang.id}`) || isPaid(`coding:${lang.id}` as PaymentKey),
        );
        for (const lang of codingPaid) {
          // Synthesize a per-language card from the base coding exam.
          const langAssignment = paidAssignments.find(
            (a) => a.assignmentRef === `coding:${lang.id}`,
          );
          result.push({
            ...exam,
            id: `coding:${lang.id}` as any,
            title: `${exam.title} · ${lang.name}`,
            description: `${exam.description} (${lang.name})`,
            statusLabel: langAssignment?.completed ? "Completed" : "Ready",
            available: true,
            // Keep the original `tags`/`icon` etc.; the language accent is
            // wired in via accentColor so the card border picks it up.
            accentColor: lang.accent,
          } as ExtendedExam);
        }
        continue;
      }
      // Non-coding: include only if there's a matching paid assignment or legacy isPaid says so.
      if (paidRefs.has(exam.id) || isPaid(exam.id as PaymentKey)) {
        result.push(exam);
      }
    }

    const baseExams = result;
    if (filter === "ready" || filter === "all") return baseExams;
    return baseExams.filter((exam) => (exam as ExtendedExam).track === filter);
  }, [visibleExams, filter, paidAssignments, isPaid]);

  const hasPurchasedAny = useMemo(() => {
    if (paidAssignments && paidAssignments.length > 0) return true;
    if (visibleExams.some((exam) => exam.available && isPaid(exam.id as PaymentKey))) {
      return true;
    }
    return CODING_LANGUAGES.some((lang) => isPaid(`coding:${lang.id}` as PaymentKey));
  }, [visibleExams, isPaid, paidAssignments]);

  const isDataLoading = !isEntitlementsReady || paidAssignments === null;

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

  const launchAssessment = (exam: ExtendedExam, mode: AssessmentMode) => {
    // Per-language coding cards encode the language in the id (`coding:python`).
    if (exam.id.startsWith("coding:")) {
      const lang = exam.id.slice("coding:".length);
      router.push(`/assessment/coding?mode=${mode}&lang=${lang}`);
      return;
    }
    if (exam.id === "coding") {
      router.push(`/assessment/coding?mode=${mode}`);
      return;
    }

    if (exam.id === "aptitude") {
      setShowAptitudeModal(true);
      return;
    }

    if (exam.id === "communication") {
      setShowCommunicationModal(true);
      return;
    }

    if (exam.id === "role") {
      setShowRoleModal(true);
      return;
    }

    if (exam.id === "mnc") {
      setShowMncModal(true);
    }
  };

  const openAssessmentFlow = (exam: Exam, mode: AssessmentMode) => {
    console.log("=== openAssessmentFlow ===");
    console.log("Exam ID:", exam.id, "Mode:", mode);
    console.log("All attemptsStats:", attemptsStats);
    if (!exam.available) {
      setSelectedExam(exam);
      setShowDetailModal(true);
      return;
    }

    // Prevent re-taking already-completed non-coding assessments
    if (exam.id !== "coding" && isCompleted(exam.id as AssessmentId)) {
      router.push("/dashboard");
      return;
    }

    const dbModule = exam.id === "communication" ? "grammar" : exam.id;
    const stats = attemptsStats[dbModule] || { trial: 0, main: 0 };
    const currentCount = mode === "trial" ? stats.trial : stats.main;
    const limit = mode === "trial" ? ((exam as any).trialAttemptsLimit ?? 5) : ((exam as any).mainAttemptsLimit ?? 2);

    console.log("dbModule resolved to:", dbModule);
    console.log("Stats retrieved:", stats);
    console.log("currentCount:", currentCount, "limit:", limit);
    console.log("currentCount >= limit evaluates to:", currentCount >= limit);

    if (currentCount >= limit) {
      setLimitExceededPopup({
        examId: exam.id,
        examTitle: exam.title,
        mode: mode,
        limit: limit,
        count: currentCount,
      });
      return;
    }

    setAssessmentMode(mode);
    launchAssessment(exam as ExtendedExam, mode);
  };

  const resolveAssessmentForModule = (module: string, assessmentCode?: string) => {
    const dbModule = module === "communication" ? "grammar" : module;
    return (
      (assessmentCode
        ? assessmentsList.find((a) => a.assessment_code === assessmentCode)
        : null) ||
      assessmentsList.find((a) => a.module_type === dbModule)
    );
  };

  const startAdaptiveV2Attempt = async (
    module: "communication" | "mnc" | "role",
    mode: AssessmentMode,
    assessmentCode?: string,
  ): Promise<boolean> => {
    const dbModule = module === "communication" ? "grammar" : module;
    const dbExam = resolveAssessmentForModule(module, assessmentCode);
    if (!dbExam?.adaptive_enabled) return false;

    const apiBase = TECH_API_BASE || "";
    const security = await securityCheckBeforeStart(dbModule as AssessmentModule, mode, apiBase);
    if (!security.canProceed) {
      console.error("Adaptive start blocked:", security.error);
      return false;
    }

    const assessmentId = dbExam.assessment_id;
    if (!assessmentId) return false;

    const payload = {
      assessmentId,
      assessmentCode: dbExam.assessment_code ?? assessmentCode ?? getAssessmentCode(dbModule as AssessmentModule),
      userId: getUserId(),
      mode: security.sanitizedMode,
    };

    const res = await fetch(`${apiBase}/api/assessment/${module}/attempts/block-based`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      console.error(`Adaptive start failed (${module}):`, res.status, errText);
      return false;
    }

    const data = await res.json();
    const token = data?.attemptToken;
    if (!token) return false;

    router.push(
      `/assessment/${module}/adaptive?v2=true&mode=${security.sanitizedMode}&assessmentId=${assessmentId}&attemptToken=${token}`
    );
    return true;
  };

  const handleResumeAttempt = (attempt: InProgressAttempt) => {
    // SECURITY: Validate attempt token and prevent manipulation
    if (!attempt.attemptToken || !attempt.module) {
      console.error('Invalid attempt data:', attempt);
      return;
    }
    
    const resumeModule = attempt.module === "grammar" ? "communication" : attempt.module;
    const validModes = ['trial', 'main'] as const;
    const mode = validModes.includes(attempt.mode as any) ? attempt.mode : 'main';
    
    // Prevent infinite loops by checking if we're already on the target page
    const currentPath = window.location.pathname;
    const targetPath = attempt.isBlockBased
      ? `/assessment/${resumeModule}/adaptive`
      : `/assessment/${resumeModule}`;
      
    if (currentPath === targetPath) {
      console.warn('Already on target assessment page, preventing loop');
      return;
    }
    
    if (attempt.isBlockBased) {
      const matchingAssessment =
        assessmentsList.find((a) => a.assessment_code === attempt.assessmentCode) ||
        assessmentsList.find((a) => a.module_type === (resumeModule === "communication" ? "grammar" : resumeModule));
      const assessmentId = matchingAssessment?.assessment_id;

      if (assessmentId) {
        router.push(
          `/assessment/${resumeModule}/adaptive?v2=true&mode=${mode}&assessmentId=${assessmentId}&attemptToken=${attempt.attemptToken}`
        );
        return;
      }
    }

    router.push(`/assessment/${resumeModule}?mode=${mode}`);
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

  if (!isMounted) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-brand-light-secondary dark:bg-brand-dark-primary font-sans transition-colors duration-500">
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-green" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-brand-light-secondary dark:bg-brand-dark-primary font-sans transition-colors duration-500">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.12] dark:opacity-[0.08] assessment-grid" />
        <div className="absolute inset-0 opacity-[0.08] dark:opacity-[0.12] assessment-scan mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <Header
        currentView={currentHeaderView}
        onNavigate={(view) => {
          if (["dashboard", "assessment", "profile", "explore"].includes(view)) {
            router.push(`/${view}`);
          } else if (view === "details") {
            setCurrentView("details");
          }
        }}
        onLogout={() => onLogout?.()}
      />

      {/* Next Step Notification Alert */}
      {completionPopup && currentView === "dashboard" && (
        <div className="fixed top-24 left-4 right-4 sm:left-auto sm:right-4 z-50 animate-slide-left w-full sm:w-[360px]">
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
            assessments={visibleExams as any}
            examDetails={EXAM_DETAILS}
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

            {isDataLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-3xl p-6 flex flex-col h-full animate-pulse"
                  >
                    <div className="flex gap-4 mb-4">
                      {/* Left: Icon Skeleton */}
                      <div className="shrink-0 w-14 h-14 rounded-2xl bg-slate-200 dark:bg-white/10" />
                      {/* Title Skeleton */}
                      <div className="flex-1 flex items-center">
                        <div className="h-5 w-2/3 bg-slate-200 dark:bg-white/10 rounded-lg" />
                      </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col">
                      {/* Description lines */}
                      <div className="h-4 w-full bg-slate-200 dark:bg-white/10 rounded-lg mb-2" />
                      <div className="h-4 w-5/6 bg-slate-200 dark:bg-white/10 rounded-lg mb-4" />
                      
                      {/* Stats Row */}
                      <div className="flex items-center gap-5 mb-4">
                        {[1, 2, 3].map((j) => (
                          <div key={j} className="flex flex-col gap-1.5">
                            <div className="h-2.5 w-12 bg-slate-200 dark:bg-white/10 rounded" />
                            <div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded" />
                          </div>
                        ))}
                      </div>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                        <div className="h-5 w-12 bg-slate-200 dark:bg-white/10 rounded-md" />
                        <div className="h-5 w-16 bg-slate-200 dark:bg-white/10 rounded-md" />
                      </div>
                    </div>
                    
                    {/* Separator */}
                    <div className="h-[1px] w-full bg-black/10 dark:bg-white/10 mb-5" />
                    
                    {/* Bottom buttons */}
                    <div className="flex justify-end gap-2">
                      <div className="h-8 w-16 bg-slate-200 dark:bg-white/10 rounded-full" />
                      <div className="h-8 w-24 bg-slate-200 dark:bg-white/10 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !hasPurchasedAny ? (
              <div className="flex flex-col items-center justify-center text-center p-8 sm:p-16 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111a15] max-w-2xl mx-auto my-12 relative overflow-hidden">
                <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[#1ED36A] mb-8">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>

                <h3 className="text-2xl font-bold text-black dark:text-white tracking-tight leading-tight mb-3">
                  Access Your Assessments
                </h3>
                
                <p className="text-[14px] leading-relaxed text-black dark:text-white max-w-md mb-8">
                  You haven&apos;t unlocked any assessments on your account. Go to the <span className="font-bold text-[#1ED36A]">Explore</span> page to browse and select evaluations.
                </p>

                <button
                  type="button"
                  onClick={() => handleNavigate("explore")}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1ED36A] hover:bg-[#1bb85c] text-white font-bold uppercase tracking-wider text-[11px] px-8 py-3.5 transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  <span>Explore Assessments</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111a15] max-w-md mx-auto my-12">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-black dark:text-white mx-auto flex items-center justify-center mb-5">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-black dark:text-white mb-2">No Matching Assessments</h4>
                <p className="text-[13px] text-black dark:text-white leading-relaxed mb-6">
                  None of your unlocked assessments match the selected track. Try choosing another filter above or clear the filter.
                </p>
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
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
                    price={exam.price === 0 || !exam.price ? "Free" : `₹${exam.price}`}
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
            )}
          </div>
        ) : currentView === "dashboard" ? (
          <DashboardContent
            userName={userName}
            handleSelectExam={handleSelectExam}
            handleStartExam={handleModalStart}
            inProgressAttempt={inProgressAttempt}
            onResumeAttempt={handleResumeAttempt}
            dynamicExams={dynamicExams}
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

      {showAptitudeModal && (() => {
        const exam = dynamicExams.find(e => e.id === 'aptitude') as any;
        const stats = attemptsStats['aptitude'] || { trial: 0, main: 0 };
        return (
          <AdaptiveAptitudePreTest
            mode={assessmentMode}
            onStart={(mode) => router.push(`/assessment/aptitude?mode=${mode}${exam?.assessmentCode ? `&assessmentCode=${encodeURIComponent(exam.assessmentCode)}` : ""}`)}
            onClose={() => setShowAptitudeModal(false)}
            accentColor={exam?.accentColor}
            gradient={exam?.gradient}
          />
        );
      })()}

      {showCommunicationModal && (() => {
        const exam = dynamicExams.find(e => e.id === 'communication') as any;
        const stats = attemptsStats['grammar'] || { trial: 0, main: 0 };
        const currentCount = assessmentMode === 'trial' ? stats.trial : stats.main;
        return (
          <CommunicationPreTest
            mode={assessmentMode}
            onStart={async (mode) => {
              const startedAdaptive = await startAdaptiveV2Attempt("communication", mode, exam?.assessmentCode);
              if (!startedAdaptive) {
                router.push(`/assessment/communication?mode=${mode}${exam?.assessmentCode ? `&assessmentCode=${encodeURIComponent(exam.assessmentCode)}` : ''}`);
              }
            }}
            onClose={() => setShowCommunicationModal(false)}
            accentColor={exam?.accentColor || EXAMS.find(e => e.id === 'communication')?.accentColor}
            gradient={exam?.gradient || EXAMS.find(e => e.id === 'communication')?.gradient}
            questions={exam?.questions}
            duration={exam?.duration}
            trialAttemptsLimit={exam?.trialAttemptsLimit}
            mainAttemptsLimit={exam?.mainAttemptsLimit}
            attemptsCount={currentCount}
          />
        );
      })()}

      {showRoleModal && (() => {
        const exam = dynamicExams.find(e => e.id === 'role') as any;
        const stats = attemptsStats['role'] || { trial: 0, main: 0 };
        const currentCount = assessmentMode === 'trial' ? stats.trial : stats.main;
        return (
          <RolePreTest
            mode={assessmentMode}
            onStart={async (mode) => {
              const startedAdaptive = await startAdaptiveV2Attempt("role", mode, exam?.assessmentCode);
              if (!startedAdaptive) {
                router.push(`/assessment/role?mode=${mode}${exam?.assessmentCode ? `&assessmentCode=${encodeURIComponent(exam.assessmentCode)}` : ''}`);
              }
            }}
            onClose={() => setShowRoleModal(false)}
            accentColor={exam?.accentColor || EXAMS.find(e => e.id === 'role')?.accentColor}
            gradient={exam?.gradient || EXAMS.find(e => e.id === 'role')?.gradient}
            questions={exam?.questions}
            duration={exam?.duration}
            trialAttemptsLimit={exam?.trialAttemptsLimit}
            mainAttemptsLimit={exam?.mainAttemptsLimit}
            attemptsCount={currentCount}
          />
        );
      })()}

      {showMncModal && (() => {
        const exam = dynamicExams.find(e => e.id === 'mnc') as any;
        const stats = attemptsStats['mnc'] || { trial: 0, main: 0 };
        const currentCount = assessmentMode === 'trial' ? stats.trial : stats.main;
        return (
          <MNCPreTest
            mode={assessmentMode}
            onStart={async (mode) => {
              const startedAdaptive = await startAdaptiveV2Attempt("mnc", mode, exam?.assessmentCode);
              if (!startedAdaptive) {
                router.push(`/assessment/mnc?mode=${mode}${exam?.assessmentCode ? `&assessmentCode=${encodeURIComponent(exam.assessmentCode)}` : ''}`);
              }
            }}
            onClose={() => setShowMncModal(false)}
            accentColor={exam?.accentColor || EXAMS.find(e => e.id === 'mnc')?.accentColor}
            gradient={exam?.gradient || EXAMS.find(e => e.id === 'mnc')?.gradient}
            questions={exam?.questions}
            duration={exam?.duration}
            trialAttemptsLimit={exam?.trialAttemptsLimit}
            mainAttemptsLimit={exam?.mainAttemptsLimit}
            attemptsCount={currentCount}
          />
        );
      })()}

      {limitExceededPopup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-6 sm:px-6">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity cursor-pointer"
            onClick={() => setLimitExceededPopup(null)}
          />

          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-white/[0.08] dark:bg-[#19211C] animate-scale-in">
            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Header Icon matching application style */}
              <div 
                className={`flex h-14 w-14 items-center justify-center rounded-xl mb-5 text-white ${
                  limitExceededPopup.mode === 'trial' 
                    ? 'bg-amber-500' 
                    : 'bg-brand-green'
                }`}
              >
                {limitExceededPopup.mode === 'trial' ? (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              {/* Title & Description */}
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
                {limitExceededPopup.mode === 'trial' ? 'Practice Stage Complete!' : 'Evaluation Completed!'}
              </h3>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
                {limitExceededPopup.examTitle}
              </p>

              {/* Main descriptive block */}
              <p className="text-xs leading-relaxed text-slate-600 dark:text-gray-300 mb-6 font-medium">
                {limitExceededPopup.mode === 'trial' ? (
                  <>
                    You have completed all <strong className="text-amber-500 font-bold">{limitExceededPopup.limit} practice trials</strong> for this assessment. 
                    Your practice phase is fully complete. Now, take the official test to unlock hiring company matchings!
                  </>
                ) : (
                  <>
                    You have finished all <strong className="text-brand-green font-bold">{limitExceededPopup.limit} official attempts</strong> for this module. 
                    Your highest score has been securely saved. Keep practicing other modules to build an outstanding candidate profile!
                  </>
                )}
              </p>

              {/* Status Box */}
              <div className="w-full rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 mb-6 dark:border-white/[0.06] dark:bg-white/[0.01]">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-gray-400">
                  <span>Attempts Allowed</span>
                  <span>{limitExceededPopup.limit}</span>
                </div>
                <div className="h-[1px] w-full bg-slate-200/60 dark:bg-white/[0.06] my-3" />
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white">
                  <span>Your Completed Attempts</span>
                  <span className={limitExceededPopup.mode === 'trial' ? 'text-amber-600 dark:text-amber-400' : 'text-brand-green'}>
                    {limitExceededPopup.count} / {limitExceededPopup.limit} (Exhausted)
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => setLimitExceededPopup(null)}
                  className="sm:flex-1 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 border border-slate-200 dark:border-white/[0.08] dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all cursor-pointer"
                >
                  Close
                </button>
                {limitExceededPopup.mode === 'trial' ? (
                  <button
                    type="button"
                    onClick={() => {
                      const exam = dynamicExams.find(e => e.id === limitExceededPopup.examId);
                      setLimitExceededPopup(null);
                      if (exam) {
                        openAssessmentFlow(exam, 'main');
                      }
                    }}
                    className="sm:flex-1 px-5 py-2.5 rounded-xl bg-brand-green text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1bb85c] active:scale-95 transition-all cursor-pointer"
                  >
                    Start Main Test
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setLimitExceededPopup(null);
                      handleNavigate('profile');
                    }}
                    className="sm:flex-1 px-5 py-2.5 rounded-xl bg-brand-green text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1bb85c] active:scale-95 transition-all cursor-pointer"
                  >
                    View My Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentPortal;
