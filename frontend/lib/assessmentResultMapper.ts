"use client";

import type { AssessmentId, ExamDetailData } from "./exams";
import type { AssessmentResult, QuestionReviewItem, SectionResult } from "./progress";

type InsightType = "strength" | "improvement" | "time" | "pattern";

export interface BackendAssessmentSubmissionResult {
  token?: string;
  attemptToken?: string;
  module?: string;
  mode?: string;
  overallScore?: number;
  overallScorePercent?: number;
  totalScore?: number;
  maxScore?: number;
  positiveScore?: number;
  negativeScore?: number;
  accuracy?: number;
  accuracyPct?: number;
  timeTakenSeconds?: number;
  totalQuestions?: number;
  answeredCount?: number;
  objectiveAnsweredCount?: number;
  subjectiveAnsweredCount?: number;
  correctCount?: number;
  wrongCount?: number;
  skippedCount?: number;
  completedAt?: string;
  submittedAt?: string;
  submitted_at?: string;
  updatedAt?: string;
  sections?: Array<Record<string, unknown>>;
  questionReviews?: Array<Record<string, unknown>>;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asString = (value: unknown, fallback = "") => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
};

const formatShortNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");

const parseWeightRatio = (weight: unknown): { score: number; max: number } | null => {
  if (typeof weight !== "string") return null;
  const [left, right] = weight.split("/").map((part) => Number(part.trim()));
  if (!Number.isFinite(left) || !Number.isFinite(right) || right <= 0) return null;
  return { score: left, max: right };
};

const normalizeSections = (
  rawSections: BackendAssessmentSubmissionResult["sections"],
  overallScore: number,
): SectionResult[] => {
  if (!Array.isArray(rawSections) || rawSections.length === 0) {
    return [{ name: "Overall", score: overallScore, weight: "100%" }];
  }

  return rawSections.map((section, index) => {
    const name = asString(section.name, `Section ${index + 1}`);
    const scoreRaw = toNumber(section.score, NaN);
    const maxScoreRaw = toNumber(section.maxScore, NaN);
    const weight = asString(section.weight, "");
    const parsedRatio = parseWeightRatio(weight);
    const pctFromAccuracy = toNumber(section.accuracyPct ?? section.percentage, NaN);

    let percentage = pctFromAccuracy;
    if (!Number.isFinite(percentage) && Number.isFinite(scoreRaw) && Number.isFinite(maxScoreRaw) && maxScoreRaw > 0) {
      percentage = (scoreRaw / maxScoreRaw) * 100;
    }
    if (!Number.isFinite(percentage) && parsedRatio) {
      percentage = (parsedRatio.score / parsedRatio.max) * 100;
    }
    if (!Number.isFinite(percentage) && Number.isFinite(scoreRaw) && scoreRaw <= 100) {
      percentage = scoreRaw;
    }

    const safePercentage = clamp(Math.round(Number.isFinite(percentage) ? percentage : 0), 0, 100);

    let weightLabel = weight;
    if (!weightLabel && Number.isFinite(scoreRaw) && Number.isFinite(maxScoreRaw) && maxScoreRaw > 0) {
      weightLabel = `${formatShortNumber(scoreRaw)}/${formatShortNumber(maxScoreRaw)}`;
    }
    if (!weightLabel && parsedRatio) {
      weightLabel = `${formatShortNumber(parsedRatio.score)}/${formatShortNumber(parsedRatio.max)}`;
    }
    if (!weightLabel) {
      weightLabel = "100%";
    }

    const rawScore = Number.isFinite(scoreRaw)
      ? scoreRaw
      : parsedRatio
        ? parsedRatio.score
        : safePercentage;
    const rawMaxScore = Number.isFinite(maxScoreRaw)
      ? maxScoreRaw
      : parsedRatio
        ? parsedRatio.max
        : 100;
    const totalCount = toNumber(section.totalCount ?? section.total, NaN);
    const answeredCount = toNumber(section.answeredCount, NaN);
    const correctCount = toNumber(section.correctCount ?? section.correct, NaN);
    const wrongCount = toNumber(section.wrongCount, NaN);
    const accuracyPct = toNumber(section.accuracyPct, NaN);

    return {
      name,
      score: safePercentage,
      weight: weightLabel,
      rawScore: Number.isFinite(rawScore) ? rawScore : undefined,
      maxScore: Number.isFinite(rawMaxScore) ? rawMaxScore : undefined,
      totalCount: Number.isFinite(totalCount) ? Math.max(0, Math.round(totalCount)) : undefined,
      answeredCount: Number.isFinite(answeredCount) ? Math.max(0, Math.round(answeredCount)) : undefined,
      correctCount: Number.isFinite(correctCount) ? Math.max(0, Math.round(correctCount)) : undefined,
      wrongCount: Number.isFinite(wrongCount) ? Math.max(0, Math.round(wrongCount)) : undefined,
      accuracyPct: Number.isFinite(accuracyPct) ? clamp(Math.round(accuracyPct), 0, 100) : undefined,
    };
  });
};

const normalizeReviewStatus = (value: unknown): QuestionReviewItem["status"] | undefined => {
  if (
    value === "correct" ||
    value === "incorrect" ||
    value === "unanswered" ||
    value === "subjective"
  ) {
    return value;
  }
  return undefined;
};

const normalizeQuestionReviews = (
  rawReviews: BackendAssessmentSubmissionResult["questionReviews"],
): QuestionReviewItem[] => {
  if (!Array.isArray(rawReviews) || rawReviews.length === 0) return [];

  const mapped = rawReviews.map((review, index): QuestionReviewItem => {
    const options = Array.isArray(review.options)
      ? review.options
          .map((option) => ({
            id: asString((option as any).id, ""),
            text: asString((option as any).text, ""),
          }))
          .filter((option) => option.id.length > 0 || option.text.length > 0)
      : [];

    const selectedOptionId = review.selectedOptionId === null ? null : asString(review.selectedOptionId, "");
    const correctOptionId = review.correctOptionId === null ? null : asString(review.correctOptionId, "");
    const fallbackSelectedText =
      selectedOptionId && options.find((opt) => opt.id === selectedOptionId)?.text;
    const fallbackCorrectText =
      correctOptionId && options.find((opt) => opt.id === correctOptionId)?.text;
    const selectedAnswerText =
      review.selectedAnswerText === null
        ? null
        : asString(review.selectedAnswerText, fallbackSelectedText ?? "");
    const correctAnswerText =
      review.correctAnswerText === null
        ? null
        : asString(review.correctAnswerText, fallbackCorrectText ?? "");
    const hasSelected = Boolean((selectedOptionId && selectedOptionId.length > 0) || (selectedAnswerText && selectedAnswerText.length > 0));
    const hasCorrect = Boolean(correctOptionId && correctOptionId.length > 0);

    const explicitStatus = normalizeReviewStatus(review.status);
    const boolCorrect = typeof review.isCorrect === "boolean" ? review.isCorrect : null;
    const derivedStatus: QuestionReviewItem["status"] =
      explicitStatus ??
      (boolCorrect === true
        ? "correct"
        : boolCorrect === false
          ? "incorrect"
          : hasSelected
            ? hasCorrect
              ? "incorrect"
              : "subjective"
            : "unanswered");

    return {
      questionId: asString(review.questionId, `q-${index + 1}`),
      displayOrder: toNumber(review.displayOrder, index + 1),
      category: typeof review.category === "string" ? review.category : undefined,
      type: asString(review.type, "mcq"),
      questionText: asString(review.questionText, `Question ${index + 1}`),
      options,
      selectedOptionId: selectedOptionId || null,
      selectedAnswerText: selectedAnswerText || null,
      correctOptionId: correctOptionId || null,
      correctAnswerText: correctAnswerText || null,
      isCorrect: boolCorrect,
      status: derivedStatus,
    };
  });

  mapped.sort((a, b) => {
    const orderA = toNumber(a.displayOrder, 0);
    const orderB = toNumber(b.displayOrder, 0);
    return orderA - orderB;
  });

  return mapped;
};

const buildInsights = (
  sections: SectionResult[],
  timeTakenSeconds: number,
  detail?: ExamDetailData | null,
) => {
  const strong = sections.filter((section) => section.score >= 75).map((section) => section.name);
  const weak = sections.filter((section) => section.score < 60).map((section) => section.name);
  const insights: { type: InsightType; text: string }[] = [];

  if (strong.length > 0) {
    insights.push({
      type: "strength",
      text: `Strong performance in ${strong.slice(0, 3).join(", ")}.`,
    });
  }
  if (weak.length > 0) {
    insights.push({
      type: "improvement",
      text: `Focus next on ${weak.slice(0, 3).join(", ")} to close your skill gap.`,
    });
  }
  if (timeTakenSeconds > 0) {
    const mins = Math.max(1, Math.round(timeTakenSeconds / 60));
    insights.push({
      type: "time",
      text: `Assessment completed in ${mins} minutes. Keep pacing consistent section by section.`,
    });
  }
  if (detail?.focus) {
    insights.push({
      type: "pattern",
      text: detail.focus,
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: "pattern",
      text: "Complete more assessments to unlock deeper performance insights.",
    });
  }

  return insights;
};

export const mapSubmissionToAssessmentResult = ({
  assessmentId,
  submission,
  detail,
  fallbackTotalQuestions,
}: {
  assessmentId: AssessmentId;
  submission: BackendAssessmentSubmissionResult;
  detail?: ExamDetailData | null;
  fallbackTotalQuestions?: number;
}): AssessmentResult => {
  const completedAt = asString(
    submission.completedAt ?? submission.submittedAt ?? submission.submitted_at ?? submission.updatedAt,
    new Date().toISOString(),
  );
  const attemptToken = asString(submission.attemptToken ?? submission.token, "");
  const submissionModule = asString(submission.module, "");    const submissionMode = asString(submission.mode, "main");
  const rawTotalScore = toNumber(
    submission.totalScore,
    toNumber(submission.overallScore, 0),
  );
  const maxScore = toNumber(submission.maxScore, NaN);
  const accuracyFromSubmission = toNumber(submission.accuracy ?? submission.accuracyPct, NaN);
  const reviews = normalizeQuestionReviews(submission.questionReviews);

  const totalQuestions = Math.max(
    0,
    Math.round(
      toNumber(
        submission.totalQuestions,
        reviews.length > 0 ? reviews.length : fallbackTotalQuestions ?? 0,
      ),
    ),
  );

  const correctFromReviews = reviews.filter((review) => review.status === "correct").length;
  const incorrectFromReviews = reviews.filter((review) => review.status === "incorrect").length;
  const subjectiveFromReviews = reviews.filter((review) => review.status === "subjective").length;
  const answeredFromReviews = reviews.filter((review) => review.status !== "unanswered").length;

  const correctCount = Math.max(0, Math.round(toNumber(submission.correctCount, correctFromReviews)));
  const objectiveAnsweredCount = Math.max(
    0,
    Math.round(toNumber(submission.objectiveAnsweredCount, correctFromReviews + incorrectFromReviews)),
  );
  const subjectiveAnsweredCount = Math.max(
    0,
    Math.round(toNumber(submission.subjectiveAnsweredCount, subjectiveFromReviews)),
  );
  const answeredCount = Math.max(
    0,
    Math.round(toNumber(submission.answeredCount, answeredFromReviews)),
  );
  const wrongCount = Math.max(
    0,
    Math.round(toNumber(submission.wrongCount, Math.max(0, objectiveAnsweredCount - correctCount))),
  );
  const skippedCount = Math.max(
    0,
    Math.round(toNumber(submission.skippedCount, Math.max(0, totalQuestions - answeredCount))),
  );

  let overallScore = toNumber(submission.overallScorePercent, NaN);
  if (!Number.isFinite(overallScore) && Number.isFinite(maxScore) && maxScore > 0) {
    overallScore = (rawTotalScore / maxScore) * 100;
  }
  if (!Number.isFinite(overallScore)) {
    const candidate = toNumber(submission.overallScore, NaN);
    if (Number.isFinite(candidate) && candidate <= 100) {
      overallScore = candidate;
    }
  }
  if (!Number.isFinite(overallScore)) {
    overallScore = Number.isFinite(accuracyFromSubmission) ? accuracyFromSubmission : 0;
  }
  overallScore = clamp(Math.round(overallScore), 0, 100);

  const accuracy = clamp(
    Math.round(
      Number.isFinite(accuracyFromSubmission)
        ? accuracyFromSubmission
        : objectiveAnsweredCount > 0
          ? (correctCount / objectiveAnsweredCount) * 100
          : answeredCount > 0
            ? (correctCount / answeredCount) * 100
            : 0,
    ),
    0,
    100,
  );

  const timeTakenSeconds = Math.max(0, Math.round(toNumber(submission.timeTakenSeconds, 0)));
  const timeTaken = timeTakenSeconds > 0
    ? `${Math.max(1, Math.round(timeTakenSeconds / 60))} min`
    : "0 min";

  const sections = normalizeSections(submission.sections, overallScore);
  const insights = buildInsights(sections, timeTakenSeconds, detail);

  return {
    assessmentId,
    completedAt,
    overallScore,
    accuracy,
    timeTaken,
    timeTakenSeconds,
    totalQuestions,
    answeredCount,
    correctCount,
    wrongCount,
    skippedCount,
    positiveScore: toNumber(submission.positiveScore, 0),
    negativeScore: toNumber(submission.negativeScore, 0),
    netScore: rawTotalScore,
    attemptToken: attemptToken || undefined,
    module: submissionModule || undefined,
    maxScore: Number.isFinite(maxScore) ? maxScore : undefined,
    objectiveAnsweredCount,
    subjectiveAnsweredCount,
    sections,
    questionReviews: reviews,
    insights,
  };
};

export const saveAssessmentResultToStorage = (result: AssessmentResult) => {
  if (typeof window === "undefined") return;
  const existingResults = JSON.parse(localStorage.getItem("originbi:assessment-results") || "{}");
  existingResults[result.assessmentId] = result;
  localStorage.setItem("originbi:assessment-results", JSON.stringify(existingResults));
  window.dispatchEvent(new CustomEvent("originbi:results-changed"));
};

export const unlockAssessmentForDashboard = (assessmentId: AssessmentId) => {
  if (typeof window === "undefined") return;
  const paidAssessments = JSON.parse(localStorage.getItem("originbi:paid-assessments") || "[]");
  if (!paidAssessments.includes(assessmentId)) {
    paidAssessments.push(assessmentId);
    localStorage.setItem("originbi:paid-assessments", JSON.stringify(paidAssessments));
    window.dispatchEvent(new CustomEvent("originbi:paid-changed"));
  }
};
