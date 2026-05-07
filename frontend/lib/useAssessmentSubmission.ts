/**
 * Unified Assessment Submission Hook
 * Handles submission, evaluation, and result storage for all assessment types
 */

import { useCallback, useState } from "react";
import { useAssessmentResults } from "./progress";
import type { AssessmentId } from "./exams";
import {
  submitAndEvaluate,
  evaluateAttempt,
  type RawAnswer,
  type QuestionMetrics,
  type EvaluationResult,
  type EvaluateAttemptParams,
  calculateGrade,
  calculateSkillLevel,
  formatTime,
} from "./evaluationEngine";

export interface SubmissionState {
  isSubmitting: boolean;
  error: string | null;
  result: EvaluationResult | null;
}

export interface UseAssessmentSubmissionReturn {
  submit: (params: SubmitParams) => Promise<EvaluationResult | null>;
  submitLocalOnly: (params: LocalSubmitParams) => EvaluationResult;
  state: SubmissionState;
  reset: () => void;
}

export interface SubmitParams {
  assessmentId: AssessmentId;
  attemptToken: string;
  answers: RawAnswer[];
  questionMetrics: QuestionMetrics[];
  timeTaken: number;
  totalTimeAllowed: number;
}

export interface LocalSubmitParams {
  assessmentId: AssessmentId;
  attemptToken: string;
  answers: RawAnswer[];
  questionMetrics: QuestionMetrics[];
  timeTaken: number;
  totalTimeAllowed: number;
}

export const useAssessmentSubmission = (): UseAssessmentSubmissionReturn => {
  const [state, setState] = useState<SubmissionState>({
    isSubmitting: false,
    error: null,
    result: null,
  });
  
  const { saveResult } = useAssessmentResults();

  const submit = useCallback(async (params: SubmitParams): Promise<EvaluationResult | null> => {
    setState({ isSubmitting: true, error: null, result: null });
    
    try {
      // 1. Submit and get evaluation
      const result = await submitAndEvaluate(
        params.assessmentId,
        params.attemptToken,
        params.answers,
        params.questionMetrics,
        params.timeTaken
      );
      
      // 2. Store in progress system
      saveResult({
        assessmentId: params.assessmentId,
        completedAt: result.completedAt,
        overallScore: result.overallScore,
        accuracy: result.scoreMetrics.accuracy,
        timeTaken: formatTime(result.timeMetrics.timeTaken),
        sections: result.sections.map(s => ({
          name: s.name,
          score: Math.round(s.percentage),
          weight: `${(s.weight * 100).toFixed(0)}%`,
        })),
        insights: result.insights,
      });
      
      setState({ isSubmitting: false, error: null, result });
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Submission failed";
      setState({ isSubmitting: false, error: errorMessage, result: null });
      return null;
    }
  }, [saveResult]);

  const submitLocalOnly = useCallback((params: LocalSubmitParams): EvaluationResult => {
    const result = evaluateAttempt({
      assessmentId: params.assessmentId,
      attemptToken: params.attemptToken,
      answers: params.answers,
      questionMetrics: params.questionMetrics,
      timeTaken: params.timeTaken,
      totalTimeAllowed: params.totalTimeAllowed,
    });
    
    // Store in progress system
    saveResult({
      assessmentId: params.assessmentId,
      completedAt: result.completedAt,
      overallScore: result.overallScore,
      accuracy: result.scoreMetrics.accuracy,
      timeTaken: formatTime(result.timeMetrics.timeTaken),
      sections: result.sections.map(s => ({
        name: s.name,
        score: Math.round(s.percentage),
        weight: `${(s.weight * 100).toFixed(0)}%`,
      })),
      insights: result.insights,
    });
    
    setState({ isSubmitting: false, error: null, result });
    return result;
  }, [saveResult]);

  const reset = useCallback(() => {
    setState({ isSubmitting: false, error: null, result: null });
  }, []);

  return {
    submit,
    submitLocalOnly,
    state,
    reset,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// ASSESSMENT-SPECIFIC ADAPTERS
// ─────────────────────────────────────────────────────────────────────────────

// Aptitude Adapter
export const adaptAptitudeAnswers = (
  answers: Record<string, string>,
  questions: Array<{
    id: string;
    category: string;
    questionId?: string;
    difficulty?: string;
    marks?: number;
    negativeMarks?: number;
  }>,
  timePerQuestion: Record<string, number>
): { rawAnswers: RawAnswer[]; questionMetrics: QuestionMetrics[] } => {
  const rawAnswers: RawAnswer[] = [];
  const questionMetrics: QuestionMetrics[] = [];
  
  questions.forEach((q, index) => {
    const selectedOptionId = answers[q.id];
    const timeSpent = timePerQuestion[q.id] || 0;
    
    // Create raw answer
    rawAnswers.push({
      questionId: q.id,
      selectedOptionId,
      timeSpentSeconds: timeSpent,
      answerChanges: 0, // Track if available
    });
    
    // Note: isCorrect and marks need to be determined by backend or local comparison
    // This creates placeholder metrics that should be updated with actual correctness
    questionMetrics.push({
      questionId: q.id,
      category: q.category,
      difficulty: (q.difficulty as any) || "medium",
      maxMarks: q.marks || 2,
      negativeMarks: q.negativeMarks || 0.5,
      isCorrect: false, // To be determined
      marksAwarded: 0,  // To be determined
      negativeApplied: 0,
      timeSpent,
      answered: !!selectedOptionId,
    });
  });
  
  return { rawAnswers, questionMetrics };
};

// Coding Adapter
export const adaptCodingAnswers = (
  submissions: Array<{
    questionId: string | number;
    code: string;
    language: string;
    testCasesPassed: number;
    totalTestCases: number;
    timeSpent: number;
  }>,
  timeTaken: number
): { rawAnswers: RawAnswer[]; questionMetrics: QuestionMetrics[] } => {
  const rawAnswers: RawAnswer[] = [];
  const questionMetrics: QuestionMetrics[] = [];
  
  submissions.forEach((sub) => {
    const isCorrect = sub.testCasesPassed === sub.totalTestCases && sub.totalTestCases > 0;
    const marks = isCorrect ? 10 : (sub.testCasesPassed / sub.totalTestCases) * 10;
    
    rawAnswers.push({
      questionId: String(sub.questionId),
      answerText: sub.code,
      timeSpentSeconds: sub.timeSpent,
      answerChanges: 0,
    });
    
    questionMetrics.push({
      questionId: String(sub.questionId),
      category: sub.language || "Coding",
      difficulty: "medium",
      maxMarks: 10,
      negativeMarks: 0,
      isCorrect,
      marksAwarded: marks,
      negativeApplied: 0,
      timeSpent: sub.timeSpent,
      answered: !!sub.code && sub.code.length > 10,
    });
  });
  
  return { rawAnswers, questionMetrics };
};

// Communication Adapter
export const adaptCommunicationAnswers = (
  responses: Array<{
    questionId: string;
    type: "reading" | "writing" | "speaking" | "listening";
    answer: string;
    audioUrl?: string;
    aiScore?: number;
    timeSpent: number;
  }>
): { rawAnswers: RawAnswer[]; questionMetrics: QuestionMetrics[] } => {
  const rawAnswers: RawAnswer[] = [];
  const questionMetrics: QuestionMetrics[] = [];
  
  responses.forEach((resp) => {
    const isCorrect = (resp.aiScore || 0) >= 70;
    const marks = (resp.aiScore || 0) / 10; // Convert to 0-10 scale
    
    rawAnswers.push({
      questionId: resp.questionId,
      answerText: resp.answer,
      timeSpentSeconds: resp.timeSpent,
      answerChanges: 0,
    });
    
    questionMetrics.push({
      questionId: resp.questionId,
      category: resp.type,
      difficulty: "medium",
      maxMarks: 10,
      negativeMarks: 0,
      isCorrect,
      marksAwarded: marks,
      negativeApplied: 0,
      timeSpent: resp.timeSpent,
      answered: !!resp.answer || !!resp.audioUrl,
    });
  });
  
  return { rawAnswers, questionMetrics };
};

// MNC & Role Adapters (Similar to Aptitude)
export const adaptMCQAnswers = (
  answers: Record<string, string>,
  questions: Array<{
    id: string;
    category: string;
    marks?: number;
    negativeMarks?: number;
  }>,
  timePerQuestion: Record<string, number>,
  correctAnswers?: Record<string, string>
): { rawAnswers: RawAnswer[]; questionMetrics: QuestionMetrics[] } => {
  const rawAnswers: RawAnswer[] = [];
  const questionMetrics: QuestionMetrics[] = [];
  
  questions.forEach((q) => {
    const selectedOptionId = answers[q.id];
    const correctOptionId = correctAnswers?.[q.id];
    const isCorrect = selectedOptionId && correctOptionId && selectedOptionId === correctOptionId;
    const timeSpent = timePerQuestion[q.id] || 0;
    
    rawAnswers.push({
      questionId: q.id,
      selectedOptionId,
      timeSpentSeconds: timeSpent,
      answerChanges: 0,
    });
    
    const maxMarks = q.marks || 2;
    const negativeMarks = q.negativeMarks || 0.5;
    
    questionMetrics.push({
      questionId: q.id,
      category: q.category,
      difficulty: "medium",
      maxMarks,
      negativeMarks,
      isCorrect: isCorrect || false,
      marksAwarded: isCorrect ? maxMarks : 0,
      negativeApplied: selectedOptionId && !isCorrect ? negativeMarks : 0,
      timeSpent,
      answered: !!selectedOptionId,
    });
  });
  
  return { rawAnswers, questionMetrics };
};
