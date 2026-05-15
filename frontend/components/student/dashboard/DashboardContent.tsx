"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { EXAMS, CODING_LANGUAGES, type AssessmentId, type ExtendedExam } from "@/lib/exams";
import { usePaidAssessments, codingPaymentKey, type PaymentKey } from "@/lib/payments";
import ActiveDashboard from "./ActiveDashboard";
import { type InProgressAttempt } from "@/lib/assessmentResume";
import type { Exam } from "../ExamCarousel";

interface DashboardContentProps {
  userName: string;
  handleSelectExam: (exam: Exam) => void;
  handleStartExam: (exam: Exam) => void;
  inProgressAttempt?: InProgressAttempt | null;
  onResumeAttempt?: (attempt: InProgressAttempt) => void;
}

function examPaidStatus(exam: ExtendedExam, isPaid: (k: PaymentKey) => boolean): "paid" | "partial" | "none" {
  if (exam.id === "coding") {
    const paidCount = CODING_LANGUAGES.filter((l) => isPaid(codingPaymentKey(l.id))).length;
    if (paidCount === 0) return "none";
    if (paidCount === CODING_LANGUAGES.length) return "paid";
    return "partial";
  }
  return isPaid(exam.id as AssessmentId) ? "paid" : "none";
}

import { useDataHydration } from "@/lib/contexts/DataHydrationContext";

const DashboardContent: React.FC<DashboardContentProps> = ({
  userName,
  handleSelectExam,
  handleStartExam,
  inProgressAttempt,
  onResumeAttempt,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isPaid } = usePaidAssessments();
  const { isSyncing, isInitialized: isHydrated } = useDataHydration();

  // Redirect new users to explore page instead of showing empty dashboard.
  // Only redirect after we've confirmed the paid set is loaded AND there's no
  // in-flight completion result to display.
  const hasPurchases = useMemo(() => {
    return EXAMS.some((e) => examPaidStatus(e as ExtendedExam, isPaid) !== "none");
  }, [isPaid]);

  const justCompleted = searchParams.get("completed");

  useEffect(() => {
    if (!isHydrated || isSyncing) return;
    if (justCompleted) return;
    if (!hasPurchases) {
      router.push("/explore");
    }
  }, [isHydrated, isSyncing, hasPurchases, justCompleted, router]);

  // Show a spinner while we wait for the initial hydration, or while
  // syncing progress.
  if (!isHydrated || (isSyncing && !hasPurchases)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#1ed36a] border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm font-medium text-slate-600 dark:text-gray-400">
          {isSyncing ? "Syncing your progress..." : "Loading dashboard..."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {isSyncing && hasPurchases && (
        <div className="fixed top-20 right-8 z-50">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-white/10 backdrop-blur-md border border-emerald-500/20 shadow-lg">
            <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Syncing</span>
          </div>
        </div>
      )}
      
      <AnimatePresence mode="wait">
        <motion.div
          key="active"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        >
          <ActiveDashboard
            userName={userName}
            onSelectExam={handleSelectExam}
            onStartExam={handleStartExam}
            inProgressAttempt={inProgressAttempt}
            onResumeAttempt={onResumeAttempt}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DashboardContent;
