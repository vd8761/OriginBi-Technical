/**
 * Aptitude Evaluation Engine
 * Specialized for MCQ assessments with negative marking
 * Supports: Quantitative, Logical, Verbal, Data Interpretation
 */

import type { AssessmentId } from "../exams";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface AptitudeQuestion {
  questionId: string;
  category: AptitudeCategory;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  negativeMarks: number;
  correctOptionId: string;
}

export type AptitudeCategory = 
  | "Quantitative Aptitude" 
  | "Logical Reasoning" 
  | "Verbal Ability" 
  | "Data Interpretation";

export interface AptitudeAnswer {
  questionId: string;
  selectedOptionId: string | null;
  timeSpentSeconds: number;
  answerChanges: number;
  confidenceLevel?: "high" | "medium" | "low";
}

export interface AptitudeSectionResult {
  category: AptitudeCategory;
  totalQuestions: number;
  answered: number;
  correct: number;
  incorrect: number;
  skipped: number;
  rawScore: number;
  negativeMarks: number;
  netScore: number;
  maxPossible: number;
  percentage: number;
  accuracy: number;
  isPassed: boolean;
}

export interface AptitudeEvaluationResult {
  assessmentId: AssessmentId;
  attemptToken: string;
  completedAt: string;
  
  // Core scores
  overallScore: number; // 0-100
  grade: "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
  skillLevel: "Expert" | "Proficient" | "Developing" | "Beginner";
  
  // Detailed metrics
  totalQuestions: number;
  answered: number;
  correct: number;
  incorrect: number;
  skipped: number;
  
  // Scoring
  rawScore: number;
  negativeMarks: number;
  netScore: number;
  maxPossibleScore: number;
  
  // Rates
  accuracy: number;      // Correct / Answered
  completionRate: number; // Answered / Total
  precision: number;      // Correct / (Correct + Incorrect)
  
  // Section breakdown
  sections: AptitudeSectionResult[];
  
  // Intelligence
  categoryStrengths: AptitudeCategory[];
  categoryWeaknesses: AptitudeCategory[];
  
  // Time analysis
  timeMetrics: {
    timeTaken: number;
    timeRemaining: number;
    avgTimePerQuestion: number;
    fastestCategory: AptitudeCategory | null;
    slowestCategory: AptitudeCategory | null;
    rushingScore: number;
    timeEfficiency: number;
  };
  
  // Reliability
  reliability: {
    confidenceScore: number;
    tooFastAnswers: number;
    randomGuessingIndicators: string[];
    isReliable: boolean;
  };
  
  // Certification
  isCertified: boolean;
  certificationLevel?: "bronze" | "silver" | "gold" | "platinum";
  certificateId?: string;
  
  // Insights
  insights: { type: "strength" | "improvement" | "time" | "strategy"; text: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const APTITUDE_CONFIG = {
  passingScore: 60,
  sectionPassingPercentage: 40,
  weights: {
    "Quantitative Aptitude": 0.30,
    "Logical Reasoning": 0.25,
    "Verbal Ability": 0.20,
    "Data Interpretation": 0.25,
  } as Record<AptitudeCategory, number>,
  categoryTimeBenchmarks: {
    "Quantitative Aptitude": 90, // seconds per question
    "Logical Reasoning": 75,
    "Verbal Ability": 45,
    "Data Interpretation": 120,
  } as Record<AptitudeCategory, number>,
};

// ─────────────────────────────────────────────────────────────────────────────
// EVALUATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateAptitudeAttempt(
  answers: AptitudeAnswer[],
  questions: AptitudeQuestion[],
  timeTaken: number,
  totalTimeAllowed: number,
  attemptToken: string
): AptitudeEvaluationResult {
  const completedAt = new Date().toISOString();
  
  // Map questions by ID for quick lookup
  const questionMap = new Map(questions.map(q => [q.questionId, q]));
  
  // Initialize section tracking
  const sectionMap = new Map<AptitudeCategory, {
    questions: AptitudeQuestion[];
    answers: AptitudeAnswer[];
  }>();
  
  // Group by category
  questions.forEach(q => {
    const group = sectionMap.get(q.category) || { questions: [], answers: [] };
    group.questions.push(q);
    sectionMap.set(q.category, group);
  });
  
  // Group answers by category
  answers.forEach(a => {
    const q = questionMap.get(a.questionId);
    if (q) {
      const group = sectionMap.get(q.category);
      if (group) {
        group.answers.push(a);
      }
    }
  });
  
  // Calculate section results
  const sections: AptitudeSectionResult[] = [];
  let totalRawScore = 0;
  let totalNegative = 0;
  let totalCorrect = 0;
  let totalAnswered = 0;
  
  sectionMap.forEach((group, category) => {
    const totalQuestions = group.questions.length;
    const answeredAnswers = group.answers.filter(a => a.selectedOptionId !== null);
    const answered = answeredAnswers.length;
    
    let correct = 0;
    let incorrect = 0;
    let rawScore = 0;
    let negativeMarks = 0;
    
    answeredAnswers.forEach(answer => {
      const question = questionMap.get(answer.questionId)!;
      const isCorrect = answer.selectedOptionId === question.correctOptionId;
      
      if (isCorrect) {
        correct++;
        rawScore += question.marks;
      } else {
        incorrect++;
        negativeMarks += question.negativeMarks;
      }
    });
    
    const skipped = totalQuestions - answered;
    const netScore = rawScore - negativeMarks;
    const maxPossible = group.questions.reduce((sum, q) => sum + q.marks, 0);
    const percentage = maxPossible > 0 ? (netScore / maxPossible) * 100 : 0;
    const accuracy = answered > 0 ? (correct / answered) * 100 : 0;
    
    sections.push({
      category,
      totalQuestions,
      answered,
      correct,
      incorrect,
      skipped,
      rawScore,
      negativeMarks,
      netScore,
      maxPossible,
      percentage,
      accuracy,
      isPassed: percentage >= APTITUDE_CONFIG.sectionPassingPercentage,
    });
    
    totalRawScore += rawScore;
    totalNegative += negativeMarks;
    totalCorrect += correct;
    totalAnswered += answered;
  });
  
  // Calculate totals
  const totalQuestions = questions.length;
  const totalIncorrect = totalAnswered - totalCorrect;
  const skipped = totalQuestions - totalAnswered;
  const netScore = totalRawScore - totalNegative;
  const maxPossibleScore = questions.reduce((sum, q) => sum + q.marks, 0);
  const overallScore = maxPossibleScore > 0 ? (netScore / maxPossibleScore) * 100 : 0;
  
  // Calculate rates
  const accuracy = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0;
  const completionRate = (totalAnswered / totalQuestions) * 100;
  const precision = (totalCorrect + totalIncorrect) > 0 
    ? (totalCorrect / (totalCorrect + totalIncorrect)) * 100 
    : 0;
  
  // Time analysis per category
  const categoryTimes: Record<AptitudeCategory, number[]> = {
    "Quantitative Aptitude": [],
    "Logical Reasoning": [],
    "Verbal Ability": [],
    "Data Interpretation": [],
  };
  
  answers.forEach(a => {
    const q = questionMap.get(a.questionId);
    if (q && a.timeSpentSeconds > 0) {
      categoryTimes[q.category].push(a.timeSpentSeconds);
    }
  });
  
  const categoryAvgTimes = Object.entries(categoryTimes).map(([cat, times]) => ({
    category: cat as AptitudeCategory,
    avg: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
  }));
  
  const fastestCategory = categoryAvgTimes.length > 0
    ? categoryAvgTimes.reduce((min, c) => c.avg < min.avg ? c : min, categoryAvgTimes[0]).category
    : null;
  
  const slowestCategory = categoryAvgTimes.length > 0
    ? categoryAvgTimes.reduce((max, c) => c.avg > max.avg ? c : max, categoryAvgTimes[0]).category
    : null;
  
  // Reliability analysis
  const tooFastThreshold = 5; // seconds
  const tooFastAnswers = answers.filter(a => a.timeSpentSeconds < tooFastThreshold).length;
  const randomGuessingIndicators: string[] = [];
  
  if (tooFastAnswers > answers.length * 0.15) {
    randomGuessingIndicators.push(`${tooFastAnswers} questions answered in under 5 seconds`);
  }
  
  // Detect ABAB patterns
  const selectedOptions = answers.map(a => a.selectedOptionId);
  let patternCount = 0;
  for (let i = 2; i < selectedOptions.length; i++) {
    if (selectedOptions[i] === selectedOptions[i - 2] && 
        selectedOptions[i - 1] === selectedOptions[i - 3]) {
      patternCount++;
    }
  }
  const patternScore = (patternCount / Math.max(1, selectedOptions.length - 2)) * 100;
  
  if (patternScore > 25) {
    randomGuessingIndicators.push(`Suspicious answer pattern detected (${patternScore.toFixed(1)}%)`);
  }
  
  const confidenceScore = Math.max(0, 100 - (tooFastAnswers / answers.length) * 40 - patternScore * 0.8);
  
  // Category strengths/weaknesses
  const categoryPerformance = sections.map(s => ({ 
    category: s.category, 
    score: s.percentage 
  })).sort((a, b) => b.score - a.score);
  
  const categoryStrengths = categoryPerformance
    .filter(c => c.score >= 75)
    .map(c => c.category);
  
  const categoryWeaknesses = categoryPerformance
    .filter(c => c.score < 50)
    .map(c => c.category);
  
  // Generate insights
  const insights: AptitudeEvaluationResult["insights"] = [];
  
  if (accuracy >= 80) {
    insights.push({ type: "strength", text: "Excellent accuracy! You have strong conceptual clarity." });
  } else if (accuracy < 50) {
    insights.push({ type: "improvement", text: "Focus on understanding concepts before attempting. Review fundamentals." });
  }
  
  if (skipped > totalQuestions * 0.2) {
    insights.push({ type: "strategy", text: `You skipped ${skipped} questions. Work on time management to attempt more.` });
  }
  
  if (totalNegative > totalRawScore * 0.1) {
    insights.push({ type: "strategy", text: `High negative marking (${totalNegative.toFixed(1)} pts). Avoid guessing - only attempt when confident.` });
  }
  
  categoryStrengths.forEach(cat => {
    insights.push({ type: "strength", text: `Strong performance in ${cat}` });
  });
  
  categoryWeaknesses.forEach(cat => {
    insights.push({ type: "improvement", text: `${cat} needs attention. Consider focused practice in this area.` });
  });
  
  // Time insights
  if (fastestCategory && slowestCategory && fastestCategory !== slowestCategory) {
    insights.push({ type: "time", text: `You were fastest in ${fastestCategory} and slowest in ${slowestCategory}. Adjust your strategy.` });
  }
  
  // Calculate grade
  const grade = overallScore >= 90 ? "A+" :
                overallScore >= 80 ? "A" :
                overallScore >= 70 ? "B+" :
                overallScore >= 60 ? "B" :
                overallScore >= 50 ? "C" :
                overallScore >= 40 ? "D" : "F";
  
  const skillLevel = overallScore >= 80 ? "Expert" :
                     overallScore >= 65 ? "Proficient" :
                     overallScore >= 50 ? "Developing" : "Beginner";
  
  // Certification
  const allSectionsPassed = sections.every(s => s.isPassed);
  const isCertified = overallScore >= APTITUDE_CONFIG.passingScore && 
                     accuracy >= 60 && 
                     completionRate >= 80 &&
                     allSectionsPassed &&
                     confidenceScore >= 60;
  
  const certificationLevel = isCertified
    ? overallScore >= 85 && accuracy >= 85 ? "platinum"
      : overallScore >= 75 && accuracy >= 75 ? "gold"
      : overallScore >= 65 && accuracy >= 65 ? "silver"
      : "bronze"
    : undefined;
  
  const certificateId = isCertified
    ? `ORG-APT-${completedAt.slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    : undefined;
  
  return {
    assessmentId: "aptitude",
    attemptToken,
    completedAt,
    overallScore: Math.round(overallScore * 100) / 100,
    grade,
    skillLevel,
    totalQuestions,
    answered: totalAnswered,
    correct: totalCorrect,
    incorrect: totalIncorrect,
    skipped,
    rawScore: totalRawScore,
    negativeMarks: totalNegative,
    netScore,
    maxPossibleScore,
    accuracy: Math.round(accuracy * 100) / 100,
    completionRate: Math.round(completionRate * 100) / 100,
    precision: Math.round(precision * 100) / 100,
    sections: sections.sort((a, b) => b.percentage - a.percentage),
    categoryStrengths,
    categoryWeaknesses,
    timeMetrics: {
      timeTaken,
      timeRemaining: totalTimeAllowed - timeTaken,
      avgTimePerQuestion: totalAnswered > 0 ? timeTaken / totalAnswered : 0,
      fastestCategory,
      slowestCategory,
      rushingScore: (tooFastAnswers / answers.length) * 100,
      timeEfficiency: Math.min(100, (totalTimeAllowed * 0.7 / timeTaken) * 100),
    },
    reliability: {
      confidenceScore: Math.round(confidenceScore * 10) / 10,
      tooFastAnswers,
      randomGuessingIndicators,
      isReliable: confidenceScore >= 60,
    },
    isCertified,
    certificationLevel,
    certificateId,
    insights,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const getAptitudeGradeColor = (grade: string): string => {
  const colors: Record<string, string> = {
    "A+": "#1ed36a",
    "A": "#10b981",
    "B+": "#3b82f6",
    "B": "#06b6d4",
    "C": "#f59e0b",
    "D": "#f97316",
    "F": "#ef4444",
  };
  return colors[grade] || "#9ca3af";
};

export const formatAptitudeTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  }
  return `${mins}m ${seconds % 60}s`;
};
