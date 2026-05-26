interface QuestionCountSource {
  adaptive_enabled?: boolean | null;
  adaptive_total_questions?: number | null;
  question_limit?: number | null;
  total_questions?: number | null;
  main_questions_count?: number | null;
}

export function getDisplayedQuestionCount(
  assessment: QuestionCountSource | null | undefined,
  fallback: number,
): number {
  if (!assessment) return fallback;

  const adaptiveEnabled = Boolean(assessment.adaptive_enabled);
  const adaptiveTotalQuestions = Number(assessment.adaptive_total_questions ?? 0);
  if (adaptiveEnabled && adaptiveTotalQuestions > 0) {
    return adaptiveTotalQuestions;
  }

  const questionLimit = Number(assessment.question_limit ?? 0);
  if (questionLimit > 0) {
    return questionLimit;
  }

  const totalQuestions = Number(assessment.total_questions ?? 0);
  if (totalQuestions > 0) {
    return totalQuestions;
  }

  const mainQuestionsCount = Number(assessment.main_questions_count ?? 0);
  if (mainQuestionsCount > 0) {
    return mainQuestionsCount;
  }

  return fallback;
}
