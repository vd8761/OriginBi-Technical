/**
 * OriginBI Unified Evaluation Engine
 * Handles all assessment types with advanced metrics and reliability scoring
 */

import type { AssessmentId } from "./exams";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface EvaluationConfig {
  assessmentId: AssessmentId;
  passingScore: number;
  negativeMarkingEnabled: boolean;
  negativeMarkValue: number;
  totalTimeMinutes: number;
  sectionWeights: Record<string, number>;
}

export interface RawAnswer {
  questionId: string;
  selectedOptionId?: string | null;
  answerText?: string;
  timeSpentSeconds: number;
  answerChanges: number; // Track revisions for confidence scoring
  confidenceLevel?: "high" | "medium" | "low";
}

export interface QuestionMetrics {
  questionId: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  maxMarks: number;
  negativeMarks: number;
  isCorrect: boolean;
  marksAwarded: number;
  negativeApplied: number;
  timeSpent: number;
  answered: boolean;
}

export interface SectionMetrics {
  name: string;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  totalMarks: number;
  scoreObtained: number;
  negativeMarks: number;
  netScore: number;
  percentage: number;
  weight: number;
  weightedScore: number;
  avgTimePerQuestion: number;
  passingPercentage: number;
  isPassed: boolean;
}

export interface ReliabilityMetrics {
  // Anti-cheating / Quality indicators
  tooFastAnswers: number;        // < 5 seconds (suspicious)
  patternMatchingScore: number;  // 0-100, higher = more suspicious patterns
  answerChangeRate: number;    // % of questions with multiple changes
  timeDistributionScore: number; // Std dev of time spent (lower = more consistent)
  confidenceScore: number;     // 0-100 reliability rating
  flags: string[];             // Suspicious behavior flags
}

export interface TimeMetrics {
  totalTimeAllowed: number;
  timeTaken: number;
  timeRemaining: number;
  avgTimePerQuestion: number;
  fastestAnswer: number;
  slowestAnswer: number;
  timeEfficiency: number; // 0-100, early completion bonus
  rushingScore: number;   // % of questions answered too quickly
}

export interface AdvancedScoreMetrics {
  // Raw scores
  positiveScore: number;
  negativeScore: number;
  netScore: number;
  
  // Percentage metrics
  accuracy: number;           // Correct / Attempted
  completionRate: number;     // Answered / Total
  precision: number;          // Correct / (Correct + Incorrect)
  
  // Comparative metrics
  percentileRank: number;     // Against peer group
  zScore: number;            // Standard deviations from mean
  
  // Difficulty adjusted
  difficultyAdjustedScore: number; // Weighted by question difficulty
  iRTScore: number;          // Item Response Theory theta score
}

export interface EvaluationResult {
  // Core identification
  assessmentId: AssessmentId;
  attemptToken: string;
  completedAt: string;
  
  // Status
  status: "completed" | "incomplete" | "disqualified";
  isCertified: boolean;
  certificationLevel?: "bronze" | "silver" | "gold" | "platinum";
  
  // Overall score
  overallScore: number; // 0-100
  grade: "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
  skillLevel: "Expert" | "Proficient" | "Developing" | "Beginner";
  
  // Detailed metrics
  scoreMetrics: AdvancedScoreMetrics;
  timeMetrics: TimeMetrics;
  reliabilityMetrics: ReliabilityMetrics;
  sections: SectionMetrics[];
  questionDetails: QuestionMetrics[];
  
  // Insights
  strengths: string[];
  improvements: string[];
  insights: { type: "strength" | "improvement" | "time" | "pattern"; text: string }[];
  
  // Certificate
  certificateId?: string;
  
  // Raw data for debugging
  rawAnswers: RawAnswer[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const EVALUATION_CONFIGS: Record<AssessmentId, EvaluationConfig> = {
  aptitude: {
    assessmentId: "aptitude",
    passingScore: 60,
    negativeMarkingEnabled: true,
    negativeMarkValue: 0.25,
    totalTimeMinutes: 60,
    sectionWeights: {
      "Quantitative": 0.30,
      "Logical": 0.25,
      "Verbal": 0.20,
      "Data Interpretation": 0.25,
    },
  },
  coding: {
    assessmentId: "coding",
    passingScore: 60,
    negativeMarkingEnabled: false,
    negativeMarkValue: 0,
    totalTimeMinutes: 90,
    sectionWeights: {
      "Correctness": 0.50,
      "Efficiency": 0.30,
      "Code Quality": 0.20,
    },
  },
  communication: {
    assessmentId: "communication",
    passingScore: 65,
    negativeMarkingEnabled: false,
    negativeMarkValue: 0,
    totalTimeMinutes: 45,
    sectionWeights: {
      "Reading": 0.25,
      "Writing": 0.25,
      "Speaking": 0.25,
      "Listening": 0.25,
    },
  },
  mnc: {
    assessmentId: "mnc",
    passingScore: 60,
    negativeMarkingEnabled: true,
    negativeMarkValue: 0.33,
    totalTimeMinutes: 60,
    sectionWeights: {
      "Aptitude": 0.40,
      "Technical": 0.35,
      "Behavioral": 0.25,
    },
  },
  role: {
    assessmentId: "role",
    passingScore: 70,
    negativeMarkingEnabled: false,
    negativeMarkValue: 0,
    totalTimeMinutes: 45,
    sectionWeights: {
      "Scenario": 0.50,
      "Conceptual": 0.30,
      "Situational": 0.20,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GRADING FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const calculateGrade = (score: number): EvaluationResult["grade"] => {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 40) return "D";
  return "F";
};

export const calculateSkillLevel = (score: number): EvaluationResult["skillLevel"] => {
  if (score >= 80) return "Expert";
  if (score >= 65) return "Proficient";
  if (score >= 50) return "Developing";
  return "Beginner";
};

export const calculateCertificationLevel = (
  score: number,
  accuracy: number,
  reliability: number
): EvaluationResult["certificationLevel"] => {
  if (score >= 85 && accuracy >= 85 && reliability >= 80) return "platinum";
  if (score >= 75 && accuracy >= 75 && reliability >= 70) return "gold";
  if (score >= 65 && accuracy >= 65 && reliability >= 60) return "silver";
  if (score >= 50) return "bronze";
  return undefined;
};

// ─────────────────────────────────────────────────────────────────────────────
// RELIABILITY ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export const calculateReliabilityMetrics = (
  answers: RawAnswer[],
  questionMetrics: QuestionMetrics[]
): ReliabilityMetrics => {
  const flags: string[] = [];
  
  // 1. Too fast answers (< 5 seconds)
  const tooFastThreshold = 5;
  const tooFastAnswers = answers.filter(a => a.timeSpentSeconds < tooFastThreshold).length;
  if (tooFastAnswers > answers.length * 0.1) {
    flags.push(`${tooFastAnswers} answers completed suspiciously fast`);
  }
  
  // 2. Pattern matching detection (e.g., A,B,A,B,A,B pattern)
  const detectPattern = (arr: (string | null | undefined)[]): number => {
    if (arr.length < 4) return 0;
    let patternScore = 0;
    // Check for ABAB pattern
    for (let i = 2; i < arr.length; i++) {
      if (arr[i] === arr[i - 2] && arr[i - 1] === arr[i - 3]) {
        patternScore++;
      }
    }
    return (patternScore / (arr.length - 2)) * 100;
  };
  
  const selectedOptions = answers.map(a => a.selectedOptionId);
  const patternMatchingScore = detectPattern(selectedOptions);
  if (patternMatchingScore > 30) {
    flags.push(`Unusual answer pattern detected (${patternMatchingScore.toFixed(1)}%)`);
  }
  
  // 3. Answer change rate
  const totalChanges = answers.reduce((sum, a) => sum + (a.answerChanges || 0), 0);
  const answerChangeRate = (totalChanges / answers.length) * 100;
  if (answerChangeRate > 50) {
    flags.push("Excessive answer revision detected");
  }
  
  // 4. Time distribution consistency
  const times = answers.map(a => a.timeSpentSeconds);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);
  const timeDistributionScore = Math.max(0, 100 - (stdDev / avg) * 100);
  
  // 5. Overall confidence score (0-100)
  const confidenceScore = Math.max(0, 100 
    - (tooFastAnswers / answers.length) * 30
    - patternMatchingScore * 0.5
    - (answerChangeRate > 30 ? 20 : 0)
    - (timeDistributionScore < 50 ? 15 : 0)
  );
  
  if (confidenceScore < 60) {
    flags.push("Low confidence score - potential irregularities detected");
  }
  
  return {
    tooFastAnswers,
    patternMatchingScore,
    answerChangeRate,
    timeDistributionScore,
    confidenceScore,
    flags,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// TIME METRICS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export const calculateTimeMetrics = (
  answers: RawAnswer[],
  totalTimeAllowed: number,
  timeTaken: number
): TimeMetrics => {
  const times = answers.map(a => a.timeSpentSeconds).filter(t => t > 0);
  
  const avgTimePerQuestion = times.length > 0 
    ? times.reduce((a, b) => a + b, 0) / times.length 
    : 0;
  
  const fastestAnswer = times.length > 0 ? Math.min(...times) : 0;
  const slowestAnswer = times.length > 0 ? Math.max(...times) : 0;
  
  // Time efficiency: Bonus for completing early (up to 20% bonus)
  const expectedTime = totalTimeAllowed * 0.7; // Expected to use 70% of time
  const timeEfficiency = Math.min(100, Math.max(0, 
    (expectedTime / timeTaken) * 100
  ));
  
  // Rushing score: % of questions answered too quickly (< 10 seconds)
  const rushingThreshold = 10;
  const rushedAnswers = times.filter(t => t < rushingThreshold).length;
  const rushingScore = (rushedAnswers / times.length) * 100;
  
  return {
    totalTimeAllowed,
    timeTaken,
    timeRemaining: totalTimeAllowed - timeTaken,
    avgTimePerQuestion,
    fastestAnswer,
    slowestAnswer,
    timeEfficiency,
    rushingScore,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTIONAL ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

export const calculateSectionMetrics = (
  questionMetrics: QuestionMetrics[],
  sectionWeights: Record<string, number>,
  passingPercentage: number = 40
): SectionMetrics[] => {
  const sectionMap = new Map<string, QuestionMetrics[]>();
  
  // Group by category
  questionMetrics.forEach(qm => {
    const list = sectionMap.get(qm.category) || [];
    list.push(qm);
    sectionMap.set(qm.category, list);
  });
  
  return Array.from(sectionMap.entries()).map(([name, questions]) => {
    const totalQuestions = questions.length;
    const answeredCount = questions.filter(q => q.answered).length;
    const correctCount = questions.filter(q => q.isCorrect).length;
    
    const totalMarks = questions.reduce((sum, q) => sum + q.maxMarks, 0);
    const scoreObtained = questions.reduce((sum, q) => sum + q.marksAwarded, 0);
    const negativeMarks = questions.reduce((sum, q) => sum + q.negativeApplied, 0);
    const netScore = scoreObtained - negativeMarks;
    
    const percentage = totalMarks > 0 ? (netScore / totalMarks) * 100 : 0;
    const weight = sectionWeights[name] || (1 / sectionMap.size);
    const weightedScore = percentage * weight;
    
    const answeredQuestions = questions.filter(q => q.timeSpent > 0);
    const avgTimePerQuestion = answeredQuestions.length > 0
      ? answeredQuestions.reduce((sum, q) => sum + q.timeSpent, 0) / answeredQuestions.length
      : 0;
    
    return {
      name,
      totalQuestions,
      answeredCount,
      correctCount,
      totalMarks,
      scoreObtained,
      negativeMarks,
      netScore,
      percentage,
      weight,
      weightedScore,
      avgTimePerQuestion,
      passingPercentage,
      isPassed: percentage >= passingPercentage,
    };
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// INSIGHTS GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export const generateInsights = (
  scoreMetrics: AdvancedScoreMetrics,
  timeMetrics: TimeMetrics,
  reliabilityMetrics: ReliabilityMetrics,
  sections: SectionMetrics[]
): { strengths: string[]; improvements: string[]; insights: EvaluationResult["insights"] } => {
  const strengths: string[] = [];
  const improvements: string[] = [];
  const insights: EvaluationResult["insights"] = [];
  
  // Score-based insights
  if (scoreMetrics.accuracy >= 80) {
    strengths.push("High accuracy");
    insights.push({ type: "strength", text: "Exceptional accuracy - you demonstrate strong subject mastery" });
  } else if (scoreMetrics.accuracy < 50) {
    improvements.push("Work on accuracy");
    insights.push({ type: "improvement", text: "Focus on understanding concepts before attempting questions" });
  }
  
  // Time-based insights
  if (timeMetrics.rushingScore > 30) {
    improvements.push("Time management");
    insights.push({ type: "time", text: "You may be rushing through questions. Take time to read carefully" });
  } else if (timeMetrics.timeEfficiency > 90) {
    strengths.push("Time efficiency");
    insights.push({ type: "strength", text: "Excellent time management - completed efficiently without rushing" });
  }
  
  // Section-based insights
  const bestSection = sections.reduce((best, s) => s.percentage > best.percentage ? s : best, sections[0]);
  const weakestSection = sections.reduce((weak, s) => s.percentage < weak.percentage ? s : weak, sections[0]);
  
  if (bestSection.percentage >= 80) {
    strengths.push(`${bestSection.name} expertise`);
    insights.push({ type: "strength", text: `Strong performance in ${bestSection.name}` });
  }
  
  if (weakestSection.percentage < 50) {
    improvements.push(`${weakestSection.name} skills`);
    insights.push({ type: "improvement", text: `Consider reviewing ${weakestSection.name} fundamentals` });
  }
  
  // Reliability insights
  if (reliabilityMetrics.confidenceScore < 70) {
    insights.push({ type: "pattern", text: "Some response patterns suggest guessing. Review uncertain areas" });
  }
  
  // Completion insight
  if (scoreMetrics.completionRate < 80) {
    insights.push({ type: "time", text: `Only ${scoreMetrics.completionRate.toFixed(0)}% completed. Practice time management` });
  }
  
  return { strengths, improvements, insights };
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EVALUATION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export interface EvaluateAttemptParams {
  assessmentId: AssessmentId;
  attemptToken: string;
  answers: RawAnswer[];
  questionMetrics: QuestionMetrics[];
  timeTaken: number;
  totalTimeAllowed: number;
  peerStats?: { mean: number; stdDev: number }; // For percentile calc
}

export const evaluateAttempt = (params: EvaluateAttemptParams): EvaluationResult => {
  const { 
    assessmentId, 
    attemptToken, 
    answers, 
    questionMetrics,
    timeTaken,
    totalTimeAllowed,
    peerStats
  } = params;
  
  const config = EVALUATION_CONFIGS[assessmentId];
  const completedAt = new Date().toISOString();
  
  // ── Calculate Score Metrics ──
  const positiveScore = questionMetrics.reduce((sum, q) => sum + q.marksAwarded, 0);
  const negativeScore = questionMetrics.reduce((sum, q) => sum + q.negativeApplied, 0);
  const netScore = positiveScore - negativeScore;
  
  const attemptedCount = questionMetrics.filter(q => q.answered).length;
  const correctCount = questionMetrics.filter(q => q.isCorrect).length;
  const totalQuestions = questionMetrics.length;
  const totalPossibleMarks = questionMetrics.reduce((sum, q) => sum + q.maxMarks, 0);
  
  const accuracy = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;
  const completionRate = (attemptedCount / totalQuestions) * 100;
  const precision = correctCount > 0 
    ? (correctCount / attemptedCount) * 100 
    : 0;
  
  const overallScore = totalPossibleMarks > 0 ? (netScore / totalPossibleMarks) * 100 : 0;
  
  // Percentile calculation (if peer stats available)
  let percentileRank = 50; // Default median
  let zScore = 0;
  if (peerStats && peerStats.stdDev > 0) {
    zScore = (netScore - peerStats.mean) / peerStats.stdDev;
    // Convert z-score to percentile (approximation)
    percentileRank = Math.min(99, Math.max(1, 
      50 + (zScore * 34) // Rough approximation
    ));
  }
  
  const scoreMetrics: AdvancedScoreMetrics = {
    positiveScore,
    negativeScore,
    netScore,
    accuracy,
    completionRate,
    precision,
    percentileRank,
    zScore,
    difficultyAdjustedScore: overallScore, // Placeholder for IRT
    iRTScore: 0,
  };
  
  // ── Calculate Time Metrics ──
  const timeMetrics = calculateTimeMetrics(answers, totalTimeAllowed, timeTaken);
  
  // ── Calculate Reliability Metrics ──
  const reliabilityMetrics = calculateReliabilityMetrics(answers, questionMetrics);
  
  // ── Calculate Section Metrics ──
  const sections = calculateSectionMetrics(questionMetrics, config.sectionWeights);
  
  // ── Check Certification ──
  const allSectionsPassed = sections.every(s => s.isPassed);
  const meetsAccuracyThreshold = accuracy >= 60;
  const meetsCompletionThreshold = completionRate >= 80;
  const meetsReliabilityThreshold = reliabilityMetrics.confidenceScore >= 60;
  
  const isCertified = 
    overallScore >= config.passingScore &&
    allSectionsPassed &&
    meetsAccuracyThreshold &&
    meetsCompletionThreshold &&
    meetsReliabilityThreshold;
  
  const certificationLevel = isCertified 
    ? calculateCertificationLevel(overallScore, accuracy, reliabilityMetrics.confidenceScore)
    : undefined;
  
  // ── Generate Insights ──
  const { strengths, improvements, insights } = generateInsights(
    scoreMetrics,
    timeMetrics,
    reliabilityMetrics,
    sections
  );
  
  // ── Generate Certificate ID ──
  const certificateId = isCertified
    ? `ORG-${assessmentId.toUpperCase()}-${completedAt.slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    : undefined;
  
  return {
    assessmentId,
    attemptToken,
    completedAt,
    status: reliabilityMetrics.confidenceScore < 40 ? "disqualified" : "completed",
    isCertified,
    certificationLevel,
    overallScore: Math.round(overallScore * 100) / 100,
    grade: calculateGrade(overallScore),
    skillLevel: calculateSkillLevel(overallScore),
    scoreMetrics,
    timeMetrics,
    reliabilityMetrics,
    sections,
    questionDetails: questionMetrics,
    strengths,
    improvements,
    insights,
    certificateId,
    rawAnswers: answers,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// API INTEGRATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "" : (process.env.NEXT_PUBLIC_ASSESSMENT_SERVICE_URL || "http://localhost:5000");

export const submitAndEvaluate = async (
  assessmentId: AssessmentId,
  attemptToken: string,
  answers: RawAnswer[],
  questionMetrics: QuestionMetrics[],
  timeTaken: number
): Promise<EvaluationResult> => {
  // 1. Local evaluation
  const config = EVALUATION_CONFIGS[assessmentId];
  const evaluation = evaluateAttempt({
    assessmentId,
    attemptToken,
    answers,
    questionMetrics,
    timeTaken,
    totalTimeAllowed: config.totalTimeMinutes * 60,
  });
  
  // 2. Submit to backend
  try {
    const response = await fetch(`${API_BASE}/api/assessment/${assessmentId}/attempts/${attemptToken}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers,
        evaluation: {
          totalScore: evaluation.scoreMetrics.netScore,
          positiveScore: evaluation.scoreMetrics.positiveScore,
          negativeScore: evaluation.scoreMetrics.negativeScore,
          accuracy: evaluation.scoreMetrics.accuracy,
          completionRate: evaluation.scoreMetrics.completionRate,
          timeTakenSeconds: timeTaken,
          sectionBreakdown: evaluation.sections,
          reliabilityScore: evaluation.reliabilityMetrics.confidenceScore,
          isCertified: evaluation.isCertified,
          certificateId: evaluation.certificateId,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error("Failed to submit assessment");
    }
    
    const serverResult = await response.json();
    
    // 3. Merge server response with local evaluation
    return {
      ...evaluation,
      ...serverResult,
      // Prefer server-calculated percentile if available
      scoreMetrics: {
        ...evaluation.scoreMetrics,
        percentileRank: serverResult.percentileRank || evaluation.scoreMetrics.percentileRank,
      },
    };
  } catch (error) {
    console.error("Submission error:", error);
    // Return local evaluation if server fails
    return evaluation;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const getGradeColor = (grade: string): string => {
  switch (grade) {
    case "A+": return "#1ed36a";
    case "A": return "#10b981";
    case "B+": return "#3b82f6";
    case "B": return "#06b6d4";
    case "C": return "#f59e0b";
    case "D": return "#f97316";
    default: return "#ef4444";
  }
};

export const getSkillLevelColor = (level: string): string => {
  switch (level) {
    case "Expert": return "#1ed36a";
    case "Proficient": return "#3b82f6";
    case "Developing": return "#f59e0b";
    default: return "#9ca3af";
  }
};

export const formatScore = (score: number, decimals: number = 1): string => {
  return `${score.toFixed(decimals)}%`;
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  }
  return `${mins}m ${secs}s`;
};
