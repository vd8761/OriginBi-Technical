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
import DashboardContent from "./dashboard/DashboardContent";

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
}

const AssessmentPortal: React.FC<AssessmentPortalProps> = ({ userName = "Student" }) => {
  const [showAptitudeModal, setShowAptitudeModal] = useState(false);
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentView, setCurrentView] = useState<AssessmentView>("dashboard");
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [filter, setFilter] = useState<AssessmentFilter>("all");
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

    if (tier) {
      console.log(`Processing payment for ${exam.title} - ${tier.name} tier: ₹${tier.price}`);
    }

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
    <div className="relative min-h-screen w-full overflow-hidden bg-brand-light-secondary dark:bg-brand-dark-primary font-sans transition-colors duration-500">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand-green/20 via-brand-green/5 to-transparent blur-[90px] animate-float-slow opacity-80" />
        <div className="absolute -bottom-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-brand-green/15 via-brand-green/5 to-transparent blur-[100px] animate-float-slower opacity-70" />
        <div className="absolute inset-0 opacity-[0.12] dark:opacity-[0.08] assessment-grid" />
        <div className="absolute inset-0 opacity-[0.08] dark:opacity-[0.12] assessment-scan mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <Header
        currentView={currentHeaderView}
        onNavigate={(view) => setCurrentView(view)}
        onLogout={() => console.log("Logging out...")}
      />

      <main className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6">
        {currentView === "explore" ? (
          <ExploreView
            assessments={EXAMS as any}
            examDetails={{} as any}
            onNavigateToDetails={(exam) => {
              handleSelectExam(exam as Exam);
              setCurrentView("assessment");
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
              <button
                onClick={() => setCurrentView("dashboard")}
                className="px-5 py-2.5 rounded-xl border border-brand-light-tertiary/70 dark:border-white/10 bg-brand-light-primary/80 dark:bg-white/5 text-sm font-semibold text-brand-text-light-primary dark:text-brand-text-primary hover:bg-brand-light-primary transition-all"
              >
                Back to Dashboard
              </button>
            </div>

            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-brand-green/20 via-transparent to-brand-green/10 blur-lg opacity-70" />
              <div className="relative flex flex-wrap items-center gap-2 p-2 rounded-2xl border border-brand-light-tertiary/70 dark:border-white/10 bg-brand-light-primary/70 dark:bg-brand-dark-secondary/70 backdrop-blur-md shadow-sm">
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
                  onDetailsClick={() => handleSelectExam(exam)}
                  onStartClick={() => handleStartExam(exam)}
                />
              ))}
            </div>
          </div>
        ) : currentView === "dashboard" ? (
          <DashboardContent
            userName={userName}
            handleSelectExam={handleSelectExam}
            handleStartExam={handleStartExam}
            setShowDetailModal={setShowDetailModal}
          />
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
              onClick={() => setCurrentView("explore")}
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
