"use client";

import React, { useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { EXAMS, CODING_LANGUAGES, type AssessmentId, type ExtendedExam } from "@/lib/exams";
import { usePaidAssessments, codingPaymentKey, type PaymentKey } from "@/lib/payments";
import ActiveDashboard from "./ActiveDashboard";
import type { Exam } from "../ExamCarousel";

interface DashboardContentProps {
  userName: string;
  handleSelectExam: (exam: Exam) => void;
  handleStartExam: (exam: Exam) => void;
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

const DashboardContent: React.FC<DashboardContentProps> = ({
  userName,
  handleSelectExam,
  handleStartExam,
}) => {
  const router = useRouter();
  const { isPaid } = usePaidAssessments();

  const hasPurchases = useMemo(() => {
    return EXAMS.some((e) => examPaidStatus(e as ExtendedExam, isPaid) !== "none");
  }, [isPaid]);

  // Redirect new users to explore page instead of showing empty dashboard
  useEffect(() => {
    if (!hasPurchases) {
      router.push("/explore");
    }
  }, [hasPurchases, router]);

  // Show loading or nothing while redirecting new users
  if (!hasPurchases) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Redirecting to explore...</p>
      </div>
    );
  }

  return (
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
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default DashboardContent;
