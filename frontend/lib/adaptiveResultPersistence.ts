"use client";

import { getLatestSubmittedResult } from "./api";
import type { AdaptiveFinalReport } from "./adaptiveApi";
import {
  mapSubmissionToAssessmentResult,
  saveAssessmentResultToStorage,
  type BackendAssessmentSubmissionResult,
} from "./assessmentResultMapper";
import type { AssessmentId, ExamDetailData } from "./exams";

const buildFallbackSubmission = (
  report: AdaptiveFinalReport,
): BackendAssessmentSubmissionResult => {
  const sections = Object.entries(report.categoryPerformance || {}).map(
    ([name, category]: [string, any]) => ({
      name,
      score: category.marksScore ?? category.accuracy ?? 0,
      weight: `${category.obtainedMarks ?? 0}/${category.totalMarks ?? 0}`,
      totalCount: category.totalQuestions,
      correctCount: category.correctCount,
      wrongCount: category.wrongCount,
      skippedCount: category.skippedCount,
    }),
  );

  return {
    attemptToken: report.attemptToken,
    module: undefined,
    overallScorePercent: report.marksPercentage,
    totalScore: report.obtainedMarks,
    maxScore: report.totalMarks,
    correctCount: report.correctAnswers,
    wrongCount: report.wrongAnswers,
    skippedCount: report.skippedQuestions,
    totalQuestions: report.totalQuestions,
    answeredCount: report.attemptedQuestions,
    timeTakenSeconds: report.timeTakenSeconds,
    sections,
    completedAt: new Date().toISOString(),
  };
};

const buildLegacyAdaptiveSnapshot = (report: AdaptiveFinalReport) => ({
  totalScore: report.obtainedMarks,
  overallScorePercent: report.marksPercentage,
  maxScore: report.totalMarks,
  correctCount: report.correctAnswers,
  wrongCount: report.wrongAnswers,
  skippedCount: report.skippedQuestions,
  totalQuestions: report.totalQuestions,
  timeTakenSeconds: report.timeTakenSeconds,
  finalEvaluationScore: report.finalEvaluationScore,
  performanceLevel: report.performanceLevel,
  reliabilityScore: report.reliabilityScore,
  reliabilityLevel: report.reliabilityLevel,
});

export async function persistAdaptiveResult(params: {
  assessmentKey: AssessmentId;
  moduleSlug: string;
  detail: ExamDetailData;
  report: AdaptiveFinalReport;
  userId: number;
  resultStorageKey: string;
}) {
  const { assessmentKey, moduleSlug, detail, report, userId, resultStorageKey } = params;

  localStorage.setItem("adaptiveV2Report", JSON.stringify(report));
  localStorage.setItem(resultStorageKey, JSON.stringify(buildLegacyAdaptiveSnapshot(report)));

  let submission: BackendAssessmentSubmissionResult = buildFallbackSubmission(report);

  try {
    const latest = await getLatestSubmittedResult(
      moduleSlug,
      String(userId),
      report.attemptToken,
    );
    if (latest) {
      submission = latest as BackendAssessmentSubmissionResult;
    }
  } catch (error) {
    console.error(`[AdaptiveResult] latest-result fetch failed for ${moduleSlug}:`, error);
  }

  const assessmentResult = mapSubmissionToAssessmentResult({
    assessmentId: assessmentKey,
    submission,
    detail,
  });

  saveAssessmentResultToStorage(assessmentResult);
}
