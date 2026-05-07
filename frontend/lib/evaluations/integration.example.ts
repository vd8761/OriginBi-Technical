/**
 * Integration Examples for All Evaluation Engines
 * Shows how to integrate into existing assessment components
 */

import { useState } from "react";

import {
  evaluateAptitudeAttempt,
  evaluateCodingAttempt,
  evaluateCommunicationAttempt,
  evaluateMNCAttempt,
  evaluateRoleAttempt,
  type AptitudeAnswer,
  type AptitudeQuestion,
  type CodeSubmission,
  type CodingQuestion,
  type CommunicationResponse,
  type CommunicationQuestion,
  type MNCRoleAnswer,
  type MNCQuestion,
  type RoleQuestion,
} from "./index";

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 1: AptitudeEngine Integration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IN AptitudeEngine.tsx:
 * 
 * 1. Track time per question:
 */
const exampleAptitudeTracking = () => {
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [timePerQuestion, setTimePerQuestion] = useState<Record<string, number>>({});
  const [answerChanges, setAnswerChanges] = useState<Record<string, number>>({});
  
  const handleAnswerSelect = (questionId: string, optionId: string) => {
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    
    setTimePerQuestion(prev => ({
      ...prev,
      [questionId]: timeSpent
    }));
    
    // Track if changing answer
    setAnswerChanges(prev => ({
      ...prev,
      [questionId]: (prev[questionId] || 0) + 1
    }));
  };
  
  return { handleAnswerSelect };
};

/**
 * 2. On submit:
 */
const exampleAptitudeSubmit = (
  answers: Record<string, string>,
  questions: Array<{ id: string; category: string; marks: number; negativeMarks: number; correctOptionId: string }>,
  timePerQuestion: Record<string, number>,
  answerChanges: Record<string, number>,
  timeLeft: number,
  attemptToken: string
) => {
  // Convert to evaluation format
  const aptitudeAnswers: AptitudeAnswer[] = Object.entries(answers).map(([qId, selectedOptionId]) => ({
    questionId: qId,
    selectedOptionId,
    timeSpentSeconds: timePerQuestion[qId] || 0,
    answerChanges: answerChanges[qId] || 0,
  }));
  
  const aptitudeQuestions: AptitudeQuestion[] = questions.map(q => ({
    questionId: q.id,
    category: q.category as any,
    difficulty: "medium",
    marks: q.marks,
    negativeMarks: q.negativeMarks,
    correctOptionId: q.correctOptionId,
  }));
  
  // Evaluate
  const result = evaluateAptitudeAttempt(
    aptitudeAnswers,
    aptitudeQuestions,
    3600 - timeLeft, // time taken
    3600, // total time
    attemptToken
  );
  
  console.log("Aptitude Result:", result);
  // result contains:
  // - overallScore, grade, skillLevel
  // - sections[] with Quantitative, Logical, Verbal, Data Interpretation
  // - categoryStrengths, categoryWeaknesses
  // - reliability.confidenceScore
  // - insights[] for personalized feedback
  
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 2: CodingAssessment Integration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IN CodingAssessment.tsx:
 * 
 * Track submissions with evaluation data:
 */
const exampleCodingSubmit = (
  submissions: Array<{
    questionId: string;
    code: string;
    language: string;
    testCasesPassed: number;
    totalTestCases: number;
    executionTimeMs: number;
    memoryUsedKb: number;
    timeSpentSeconds: number;
    attempts: number;
  }>,
  questions: Array<{
    id: string;
    title: string;
    difficulty: "easy" | "medium" | "hard";
    maxMarks: number;
    testCases: number;
    timeLimitMs: number;
    memoryLimitKb: number;
  }>,
  timeTaken: number,
  attemptToken: string
) => {
  // Convert to evaluation format
  const codeSubmissions: CodeSubmission[] = submissions.map(s => ({
    questionId: s.questionId,
    code: s.code,
    language: s.language,
    testCasesPassed: s.testCasesPassed,
    totalTestCases: s.totalTestCases,
    executionTimeMs: s.executionTimeMs,
    memoryUsedKb: s.memoryUsedKb,
    timeSpentSeconds: s.timeSpentSeconds,
    attempts: s.attempts,
  }));
  
  const codingQuestions: CodingQuestion[] = questions.map(q => ({
    questionId: q.id,
    title: q.title,
    difficulty: q.difficulty,
    maxMarks: q.maxMarks,
    testCases: q.testCases,
    timeLimitMs: q.timeLimitMs,
    memoryLimitKb: q.memoryLimitKb,
  }));
  
  // Evaluate
  const result = evaluateCodingAttempt(
    codeSubmissions,
    codingQuestions,
    timeTaken,
    5400, // 90 minutes
    attemptToken
  );
  
  console.log("Coding Result:", result);
  // result contains:
  // - overallScore, grade
  // - solved/partial/unsolved counts
  // - byDifficulty stats (easy/medium/hard)
  // - problemResults[] with correctness, efficiency, quality scores
  // - timeEfficiencyScore, spaceEfficiencyScore
  // - skillGaps, recommendedTopics
  // - reliability.copyPasteIndicators
  
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 3: CommunicationEngine Integration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IN CommunicationEngine.tsx:
 */
const exampleCommunicationSubmit = (
  responses: Array<{
    questionId: string;
    skill: "reading" | "writing" | "speaking" | "listening";
    textResponse?: string;
    audioUrl?: string;
    aiScore: number;
    grammarScore: number;
    vocabularyScore: number;
    coherenceScore: number;
    pronunciationScore?: number;
    fluencyScore?: number;
    comprehensionScore?: number;
    timeSpentSeconds: number;
    wordCount?: number;
    attemptCount: number;
  }>,
  questions: Array<{
    id: string;
    skill: "reading" | "writing" | "speaking" | "listening";
    maxMarks: number;
  }>,
  timeTaken: number,
  attemptToken: string
) => {
  // Convert to evaluation format
  const commResponses: CommunicationResponse[] = responses.map(r => ({
    questionId: r.questionId,
    skill: r.skill,
    textResponse: r.textResponse,
    audioUrl: r.audioUrl,
    aiEvaluation: {
      score: r.aiScore,
      grammarScore: r.grammarScore,
      vocabularyScore: r.vocabularyScore,
      coherenceScore: r.coherenceScore,
      pronunciationScore: r.pronunciationScore,
      fluencyScore: r.fluencyScore,
      comprehensionScore: r.comprehensionScore,
    },
    timeSpentSeconds: r.timeSpentSeconds,
    wordCount: r.wordCount,
    attemptCount: r.attemptCount,
  }));
  
  const commQuestions: CommunicationQuestion[] = questions.map(q => ({
    questionId: q.id,
    skill: q.skill,
    difficulty: "medium",
    maxMarks: q.maxMarks,
  }));
  
  // Evaluate
  const result = evaluateCommunicationAttempt(
    commResponses,
    commQuestions,
    timeTaken,
    2700, // 45 minutes
    attemptToken
  );
  
  console.log("Communication Result:", result);
  // result contains:
  // - overallScore, grade, cefrLevel (A1-C2)
  // - proficiencyLevel (Beginner to Native-like)
  // - skills[] breakdown for reading/writing/speaking/listening
  // - strongestSkill, weakestSkill
  // - avgGrammarScore, avgVocabularyScore, avgCoherenceScore
  // - totalWordsWritten
  // - skillGaps[], recommendedFocus[], suggestedResources[]
  
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 4: MNC Assessment Integration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IN MNCEngine.tsx:
 */
const exampleMNCSubmit = (
  answers: Record<string, string>,
  questions: Array<{
    id: string;
    category: "Quantitative" | "Logical" | "Technical" | "Verbal";
    marks: number;
    negativeMarks: number;
    correctOptionId: string;
  }>,
  timePerQuestion: Record<string, number>,
  timeTaken: number,
  attemptToken: string
) => {
  // Convert to evaluation format
  const mncAnswers: MNCRoleAnswer[] = Object.entries(answers).map(([qId, selectedOptionId]) => ({
    questionId: qId,
    selectedOptionId: selectedOptionId || null,
    timeSpentSeconds: timePerQuestion[qId] || 0,
    answerChanges: 0,
  }));
  
  const mncQuestions: MNCQuestion[] = questions.map(q => ({
    questionId: q.id,
    category: q.category,
    difficulty: "medium",
    marks: q.marks,
    negativeMarks: q.negativeMarks,
    correctOptionId: q.correctOptionId,
  }));
  
  // Evaluate
  const result = evaluateMNCAttempt(
    mncAnswers,
    mncQuestions,
    timeTaken,
    3600, // 60 minutes
    attemptToken
  );
  
  console.log("MNC Result:", result);
  // result contains:
  // - overallScore, grade
  // - mncReadinessScore (0-100)
  // - readinessLevel (MNC Ready / Developing / Needs Improvement / Not Ready)
  // - topCompanyMatches[] (FAANG, Product, Service, Startup)
  // - technicalCompetency { score, level, strongTopics, weakTopics }
  // - companyRecommendations[]
  // - nextSteps[]
  
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 5: Role Assessment Integration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IN RoleEngine.tsx:
 */
const exampleRoleSubmit = (
  answers: Record<string, string>,
  questions: Array<{
    id: string;
    category: "Scenarios" | "Conceptual" | "Situational";
    marks: number;
    correctOptionId: string;
  }>,
  timePerQuestion: Record<string, number>,
  timeTaken: number,
  attemptToken: string
) => {
  // Convert to evaluation format
  const roleAnswers: MNCRoleAnswer[] = Object.entries(answers).map(([qId, selectedOptionId]) => ({
    questionId: qId,
    selectedOptionId: selectedOptionId || null,
    timeSpentSeconds: timePerQuestion[qId] || 0,
    answerChanges: 0,
  }));
  
  const roleQuestions: RoleQuestion[] = questions.map(q => ({
    questionId: q.id,
    category: q.category,
    difficulty: "medium",
    marks: q.marks,
    correctOptionId: q.correctOptionId,
  }));
  
  // Evaluate
  const result = evaluateRoleAttempt(
    roleAnswers,
    roleQuestions,
    timeTaken,
    2700, // 45 minutes
    attemptToken
  );
  
  console.log("Role Result:", result);
  // result contains:
  // - overallScore, grade
  // - roleFitLevel (Excellent Fit / Good Fit / Moderate Fit / Low Fit)
  // - primaryStrength (Scenarios/Conceptual/Situational)
  // - areasForGrowth[]
  // - competencies { problemSolving, decisionMaking, communication, adaptability, leadership }
  // - recommendedRoles[] (Product Manager, Team Lead, Consultant, etc.)
  // - developmentAreas[]
  // - careerAdvice[]
  
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 6: Display Components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Usage in Score Page:
 */
const exampleScorePageUsage = () => {
  // The evaluation result can be passed to the Score page
  // which can then display:
  
  // - Hero section with overall score, grade, certification badge
  // - Section breakdown cards
  // - Reliability/confidence score
  // - Time analysis
  // - Personalized insights
  // - Skill gaps & recommendations
  // - Certificate (if certified)
  
  return {
    // All data needed for the enhanced Score page
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 7: API Integration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Backend Integration Pattern:
 */
const exampleBackendIntegration = async (
  assessmentType: "aptitude" | "coding" | "communication" | "mnc" | "role",
  attemptToken: string,
  evaluationResult: any
) => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  
  const response = await fetch(`${API_BASE}/api/assessment/${assessmentType}/attempts/${attemptToken}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // Include raw answers
      answers: evaluationResult.rawAnswers,
      // Include evaluation summary
      evaluation: {
        overallScore: evaluationResult.overallScore,
        grade: evaluationResult.grade,
        isCertified: evaluationResult.isCertified,
        certificationLevel: evaluationResult.certificationLevel,
        certificateId: evaluationResult.certificateId,
        sections: evaluationResult.sections,
        reliabilityScore: evaluationResult.reliability?.confidenceScore,
      },
    }),
  });
  
  return response.json();
};
