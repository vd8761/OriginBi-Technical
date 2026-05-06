"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EXAMS, CODING_LANGUAGES, type AssessmentId, type ExtendedExam } from "@/lib/exams";
import { usePaidAssessments, codingPaymentKey, type PaymentKey } from "@/lib/payments";
import EmptyStateDashboard from "./EmptyStateDashboard";
import ActiveDashboard from "./ActiveDashboard";
import type { Exam } from "../ExamCarousel";

interface DashboardContentProps {
  userName: string;
  handleSelectExam: (exam: Exam) => void;
  handleStartExam: (exam: Exam, tier?: any) => void;
  setShowDetailModal: (v: boolean) => void;
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
  setShowDetailModal,
}) => {
  const { isPaid } = usePaidAssessments();

  const hasPurchases = useMemo(() => {
    return EXAMS.some((e) => examPaidStatus(e as ExtendedExam, isPaid) !== "none");
  }, [isPaid]);

  const onSelectExam = (examId: AssessmentId) => {
    const exam = EXAMS.find((e) => e.id === examId);
    if (exam) {
      handleSelectExam(exam);
      setShowDetailModal(true);
    }
  };

  const onStartExam = (examId: AssessmentId) => {
    const exam = EXAMS.find((e) => e.id === examId);
    if (exam) {
      handleStartExam(exam);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={hasPurchases ? "active" : "empty"}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      >
        {hasPurchases ? (
          <ActiveDashboard
            userName={userName}
            onSelectExam={handleSelectExam}
            onStartExam={handleStartExam}
          />
        ) : (
          <EmptyStateDashboard
            userName={userName}
            onSelectExam={onSelectExam}
            onStartExam={onStartExam}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default DashboardContent;
