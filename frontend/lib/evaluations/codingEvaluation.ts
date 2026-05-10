/**
 * Coding Evaluation Engine
 * Specialized for code submissions with test case evaluation
 * Supports: Correctness, Efficiency, Code Quality metrics
 */

import type { AssessmentId } from "../exams";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CodingQuestion {
  questionId: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  maxMarks: number;
  testCases: number;
  timeLimitMs: number;
  memoryLimitKb: number;
}

export interface CodeSubmission {
  questionId: string;
  code: string;
  language: string;
  testCasesPassed: number;
  totalTestCases: number;
  executionTimeMs: number;
  memoryUsedKb: number;
  compileErrors?: string;
  runtimeErrors?: string;
  timeSpentSeconds: number;
  attempts: number; // Number of submission attempts
}

export interface CodingProblemResult {
  questionId: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  status: "solved" | "partial" | "unsolved" | "error";
  
  // Correctness
  testCasesPassed: number;
  totalTestCases: number;
  passPercentage: number;
  
  // Efficiency
  executionTimeMs: number;
  timeLimitMs: number;
  timeEfficiency: number; // 0-100
  memoryUsedKb: number;
  memoryLimitKb: number;
  memoryEfficiency: number; // 0-100
  
  // Scoring
  correctnessScore: number; // 0-70% weight
  efficiencyScore: number;  // 0-20% weight
  qualityScore: number;     // 0-10% weight
  totalScore: number;
  maxMarks: number;
  percentage: number;
  
  // Submissions
  attempts: number;
  timeSpent: number;
  finalCodeLength: number;
  
  // Errors
  hasCompileErrors: boolean;
  hasRuntimeErrors: boolean;
}

export interface CodingEvaluationResult {
  assessmentId: AssessmentId;
  attemptToken: string;
  completedAt: string;
  
  // Overall performance
  overallScore: number; // 0-100
  grade: "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
  skillLevel: "Expert" | "Proficient" | "Developing" | "Beginner";
  
  // Problems
  totalProblems: number;
  solved: number;
  partial: number;
  unsolved: number;
  
  // Detailed results
  problemResults: CodingProblemResult[];
  
  // Difficulty breakdown
  byDifficulty: {
    easy: { attempted: number; solved: number; avgScore: number };
    medium: { attempted: number; solved: number; avgScore: number };
    hard: { attempted: number; solved: number; avgScore: number };
  };
  
  // Aggregate metrics
  totalTestCases: number;
  passedTestCases: number;
  testCasePassRate: number;
  
  // Efficiency metrics
  avgExecutionTime: number;
  avgMemoryUsage: number;
  timeEfficiencyScore: number;
  spaceEfficiencyScore: number;
  
  // Code quality metrics
  totalAttempts: number;
  avgAttemptsPerProblem: number;
  problemsSolvedOnFirstTry: number;
  codeConcisenessScore: number;
  
  // Time analysis
  timeMetrics: {
    timeTaken: number;
    timeRemaining: number;
    avgTimePerProblem: number;
    timeDistribution: Record<string, number>; // problemId -> time spent
  };
  
  // Language breakdown
  languagesUsed: { language: string; problems: number; avgScore: number }[];
  
  // Reliability
  reliability: {
    confidenceScore: number;
    copyPasteIndicators: string[];
    suspiciousPatterns: string[];
    isReliable: boolean;
  };
  
  // Certification
  isCertified: boolean;
  certificationLevel?: "bronze" | "silver" | "gold" | "platinum";
  certificateId?: string;
  
  // Insights
  insights: { type: "strength" | "improvement" | "efficiency" | "quality"; text: string }[];
  
  // Recommendations
  skillGaps: string[];
  recommendedTopics: string[];
  nextSteps: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const CODING_CONFIG = {
  passingScore: 60,
  weights: {
    correctness: 0.70,  // 70% - Test cases passed
    efficiency: 0.20,   // 20% - Time/space complexity
    quality: 0.10,      // 10% - Code quality (attempts, conciseness)
  },
  difficultyBonus: {
    easy: 1.0,
    medium: 1.2,
    hard: 1.5,
  },
  firstTryBonus: 5, // Extra points for solving on first attempt
};

// ─────────────────────────────────────────────────────────────────────────────
// EVALUATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateCodingAttempt(
  submissions: CodeSubmission[],
  questions: CodingQuestion[],
  timeTaken: number,
  totalTimeAllowed: number,
  attemptToken: string
): CodingEvaluationResult {
  const completedAt = new Date().toISOString();
  
  const questionMap = new Map(questions.map(q => [q.questionId, q]));
  
  // Evaluate each problem
  const problemResults: CodingProblemResult[] = questions.map(question => {
    const submission = submissions.find(s => s.questionId === question.questionId);
    
    if (!submission) {
      // Not attempted
      return {
        questionId: question.questionId,
        title: question.title,
        difficulty: question.difficulty,
        status: "unsolved",
        testCasesPassed: 0,
        totalTestCases: question.testCases,
        passPercentage: 0,
        executionTimeMs: 0,
        timeLimitMs: question.timeLimitMs,
        timeEfficiency: 0,
        memoryUsedKb: 0,
        memoryLimitKb: question.memoryLimitKb,
        memoryEfficiency: 0,
        correctnessScore: 0,
        efficiencyScore: 0,
        qualityScore: 0,
        totalScore: 0,
        maxMarks: question.maxMarks,
        percentage: 0,
        attempts: 0,
        timeSpent: 0,
        finalCodeLength: 0,
        hasCompileErrors: false,
        hasRuntimeErrors: false,
      };
    }
    
    // Calculate correctness
    const passPercentage = submission.totalTestCases > 0
      ? (submission.testCasesPassed / submission.totalTestCases) * 100
      : 0;
    
    const correctnessScore = (passPercentage / 100) * CODING_CONFIG.weights.correctness * 100;
    
    // Determine status
    let status: CodingProblemResult["status"];
    if (passPercentage === 100) status = "solved";
    else if (passPercentage >= 50) status = "partial";
    else if (submission.compileErrors || submission.runtimeErrors) status = "error";
    else status = "unsolved";
    
    // Calculate efficiency (use question limits)
    const timeEfficiency = question.timeLimitMs > 0
      ? Math.max(0, 100 - (submission.executionTimeMs / question.timeLimitMs) * 100)
      : 0;
    
    const memoryEfficiency = question.memoryLimitKb > 0
      ? Math.max(0, 100 - (submission.memoryUsedKb / question.memoryLimitKb) * 100)
      : 0;
    
    const efficiencyScore = ((timeEfficiency + memoryEfficiency) / 2) * CODING_CONFIG.weights.efficiency;
    
    // Calculate quality score
    // Fewer attempts = higher quality
    const attemptScore = Math.max(0, 100 - (submission.attempts - 1) * 20);
    // Reasonable code length (not too short, not too long)
    const codeLength = submission.code.length;
    const lengthScore = codeLength > 20 && codeLength < 5000 ? 100 : 50;
    
    const qualityScore = ((attemptScore + lengthScore) / 2) * CODING_CONFIG.weights.quality;
    
    // First try bonus
    const firstTryBonus = submission.attempts === 1 && passPercentage === 100
      ? CODING_CONFIG.firstTryBonus
      : 0;
    
    // Total score
    const totalScore = correctnessScore + efficiencyScore + qualityScore + firstTryBonus;
    const percentage = (totalScore / 100) * question.maxMarks;
    
    return {
      questionId: question.questionId,
      title: question.title,
      difficulty: question.difficulty,
      status,
      testCasesPassed: submission.testCasesPassed,
      totalTestCases: submission.totalTestCases,
      passPercentage,
      executionTimeMs: submission.executionTimeMs,
      timeLimitMs: question.timeLimitMs,
      timeEfficiency,
      memoryUsedKb: submission.memoryUsedKb,
      memoryLimitKb: question.memoryLimitKb,
      memoryEfficiency,
      correctnessScore,
      efficiencyScore,
      qualityScore,
      totalScore,
      maxMarks: question.maxMarks,
      percentage,
      attempts: submission.attempts,
      timeSpent: submission.timeSpentSeconds,
      finalCodeLength: codeLength,
      hasCompileErrors: !!submission.compileErrors,
      hasRuntimeErrors: !!submission.runtimeErrors,
    };
  });
  
  // Aggregate statistics
  const solved = problemResults.filter(p => p.status === "solved").length;
  const partial = problemResults.filter(p => p.status === "partial").length;
  const unsolved = problemResults.filter(p => p.status === "unsolved").length;
  
  const totalTestCases = problemResults.reduce((sum, p) => sum + p.totalTestCases, 0);
  const passedTestCases = problemResults.reduce((sum, p) => sum + p.testCasesPassed, 0);
  const testCasePassRate = totalTestCases > 0 ? (passedTestCases / totalTestCases) * 100 : 0;
  
  const attemptedProblems = problemResults.filter(p => p.attempts > 0);
  const avgExecutionTime = attemptedProblems.length > 0
    ? attemptedProblems.reduce((sum, p) => sum + p.executionTimeMs, 0) / attemptedProblems.length
    : 0;
  
  const avgMemoryUsage = attemptedProblems.length > 0
    ? attemptedProblems.reduce((sum, p) => sum + p.memoryUsedKb, 0) / attemptedProblems.length
    : 0;
  
  // Efficiency scores
  const timeEfficiencyScore = attemptedProblems.length > 0
    ? attemptedProblems.reduce((sum, p) => sum + p.timeEfficiency, 0) / attemptedProblems.length
    : 0;
  
  const spaceEfficiencyScore = attemptedProblems.length > 0
    ? attemptedProblems.reduce((sum, p) => sum + p.memoryEfficiency, 0) / attemptedProblems.length
    : 0;
  
  // Difficulty breakdown
  const byDifficulty = {
    easy: calculateDifficultyStats(problemResults, "easy"),
    medium: calculateDifficultyStats(problemResults, "medium"),
    hard: calculateDifficultyStats(problemResults, "hard"),
  };
  
  // Language breakdown
  const languageMap = new Map<string, { count: number; scores: number[] }>();
  submissions.forEach(s => {
    const result = problemResults.find(p => p.questionId === s.questionId);
    if (result) {
      const existing = languageMap.get(s.language) || { count: 0, scores: [] };
      existing.count++;
      existing.scores.push(result.percentage);
      languageMap.set(s.language, existing);
    }
  });
  
  const languagesUsed = Array.from(languageMap.entries()).map(([lang, data]) => ({
    language: lang,
    problems: data.count,
    avgScore: data.scores.reduce((a, b) => a + b, 0) / data.count,
  })).sort((a, b) => b.avgScore - a.avgScore);
  
  // Code quality metrics
  const totalAttempts = submissions.reduce((sum, s) => sum + s.attempts, 0);
  const avgAttemptsPerProblem = submissions.length > 0 ? totalAttempts / submissions.length : 0;
  const problemsSolvedOnFirstTry = problemResults.filter(p => 
    p.status === "solved" && p.attempts === 1
  ).length;
  
  const avgCodeLength = submissions.length > 0
    ? submissions.reduce((sum, s) => sum + s.code.length, 0) / submissions.length
    : 0;
  const codeConcisenessScore = avgCodeLength > 100 && avgCodeLength < 2000 ? 100 : 50;
  
  // Calculate overall score
  const maxTotalMarks = questions.reduce((sum, q) => sum + q.maxMarks, 0);
  const totalScoreObtained = problemResults.reduce((sum, p) => sum + p.percentage, 0);
  
  // Apply difficulty bonus
  const difficultyBonus = problemResults.reduce((bonus, p) => {
    if (p.status === "solved") {
      return bonus + (CODING_CONFIG.difficultyBonus[p.difficulty] - 1) * 5;
    }
    return bonus;
  }, 0);
  
  const overallScore = maxTotalMarks > 0
    ? Math.min(100, (totalScoreObtained / maxTotalMarks) * 100 + difficultyBonus)
    : 0;
  
  // Reliability check
  const copyPasteIndicators: string[] = [];
  const suspiciousPatterns: string[] = [];
  
  // Check for identical code across different problems
  const codeFingerprints = submissions.map(s => ({
    id: s.questionId,
    length: s.code.length,
    fingerprint: s.code.replace(/\s/g, "").slice(0, 100), // Simple fingerprint
  }));
  
  for (let i = 0; i < codeFingerprints.length; i++) {
    for (let j = i + 1; j < codeFingerprints.length; j++) {
      if (codeFingerprints[i].fingerprint === codeFingerprints[j].fingerprint &&
          codeFingerprints[i].length > 50) {
        copyPasteIndicators.push(`Identical code structure detected between problems`);
      }
    }
  }
  
  // Check for impossible fast solutions
  const tooFastSubmissions = submissions.filter(s => 
    s.timeSpentSeconds < 30 && s.testCasesPassed === s.totalTestCases
  );
  
  if (tooFastSubmissions.length > 0) {
    suspiciousPatterns.push(`${tooFastSubmissions.length} problems solved in under 30 seconds`);
  }
  
  const confidenceScore = Math.max(0, 100 - copyPasteIndicators.length * 20 - suspiciousPatterns.length * 15);
  
  // Generate insights
  const insights: CodingEvaluationResult["insights"] = [];
  
  if (solved === questions.length) {
    insights.push({ type: "strength", text: "Perfect! You solved all problems. Outstanding performance!" });
  } else if (solved >= questions.length * 0.7) {
    insights.push({ type: "strength", text: `Strong performance! Solved ${solved}/${questions.length} problems.` });
  }
  
  if (byDifficulty.hard.solved > 0) {
    insights.push({ type: "strength", text: `You conquered ${byDifficulty.hard.solved} hard problem(s). Impressive!` });
  }
  
  if (byDifficulty.easy.solved < byDifficulty.easy.attempted) {
    const missedEasy = byDifficulty.easy.attempted - byDifficulty.easy.solved;
    insights.push({ type: "improvement", text: `You missed ${missedEasy} easy problem(s). Focus on fundamentals.` });
  }
  
  if (testCasePassRate < 70) {
    insights.push({ type: "improvement", text: `Test case pass rate is ${testCasePassRate.toFixed(0)}%. Debug edge cases more carefully.` });
  }
  
  if (avgAttemptsPerProblem > 3) {
    insights.push({ type: "quality", text: `Avg ${avgAttemptsPerProblem.toFixed(1)} attempts per problem. Try to think through before coding.` });
  }
  
  if (problemsSolvedOnFirstTry > 0) {
    insights.push({ type: "strength", text: `${problemsSolvedOnFirstTry} problem(s) solved on first attempt. Excellent planning!` });
  }
  
  if (timeEfficiencyScore > 80) {
    insights.push({ type: "efficiency", text: "Great time efficiency! Your solutions are well-optimized for speed." });
  }
  
  if (spaceEfficiencyScore > 80) {
    insights.push({ type: "efficiency", text: "Excellent memory management! Your code uses resources efficiently." });
  }
  
  // Skill gaps
  const skillGaps: string[] = [];
  if (byDifficulty.medium.solved === 0 && byDifficulty.medium.attempted > 0) {
    skillGaps.push("Medium difficulty problem solving");
  }
  if (byDifficulty.hard.solved === 0 && byDifficulty.hard.attempted > 0) {
    skillGaps.push("Advanced algorithm design");
  }
  if (testCasePassRate < 50) {
    skillGaps.push("Edge case handling");
  }
  
  // Recommended topics
  const recommendedTopics: string[] = [];
  if (byDifficulty.easy.solved < byDifficulty.easy.attempted) {
    recommendedTopics.push("Basic data structures review");
  }
  if (timeEfficiencyScore < 60) {
    recommendedTopics.push("Time complexity optimization");
  }
  if (avgAttemptsPerProblem > 5) {
    recommendedTopics.push("Problem-solving methodology");
  }
  
  // Grade and certification
  const grade = overallScore >= 90 ? "A+" :
                overallScore >= 80 ? "A" :
                overallScore >= 70 ? "B+" :
                overallScore >= 60 ? "B" :
                overallScore >= 50 ? "C" :
                overallScore >= 40 ? "D" : "F";
  
  const skillLevel = overallScore >= 80 ? "Expert" :
                     overallScore >= 65 ? "Proficient" :
                     overallScore >= 50 ? "Developing" : "Beginner";
  
  const isCertified = overallScore >= CODING_CONFIG.passingScore &&
                     testCasePassRate >= 60 &&
                     confidenceScore >= 60;
  
  const certificationLevel = isCertified
    ? overallScore >= 85 && solved >= questions.length * 0.8 ? "platinum"
      : overallScore >= 75 && solved >= questions.length * 0.7 ? "gold"
      : overallScore >= 65 && solved >= questions.length * 0.6 ? "silver"
      : "bronze"
    : undefined;
  
  const certificateId = isCertified
    ? `ORG-CODE-${completedAt.slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    : undefined;
  
  return {
    assessmentId: "coding",
    attemptToken,
    completedAt,
    overallScore: Math.round(overallScore * 100) / 100,
    grade,
    skillLevel,
    totalProblems: questions.length,
    solved,
    partial,
    unsolved,
    problemResults: problemResults.sort((a, b) => b.totalScore - a.totalScore),
    byDifficulty,
    totalTestCases,
    passedTestCases,
    testCasePassRate: Math.round(testCasePassRate * 100) / 100,
    avgExecutionTime: Math.round(avgExecutionTime * 100) / 100,
    avgMemoryUsage: Math.round(avgMemoryUsage),
    timeEfficiencyScore: Math.round(timeEfficiencyScore * 100) / 100,
    spaceEfficiencyScore: Math.round(spaceEfficiencyScore * 100) / 100,
    totalAttempts,
    avgAttemptsPerProblem: Math.round(avgAttemptsPerProblem * 100) / 100,
    problemsSolvedOnFirstTry,
    codeConcisenessScore,
    timeMetrics: {
      timeTaken,
      timeRemaining: totalTimeAllowed - timeTaken,
      avgTimePerProblem: submissions.length > 0 ? timeTaken / submissions.length : 0,
      timeDistribution: Object.fromEntries(
        submissions.map(s => [s.questionId, s.timeSpentSeconds])
      ),
    },
    languagesUsed,
    reliability: {
      confidenceScore: Math.round(confidenceScore * 10) / 10,
      copyPasteIndicators,
      suspiciousPatterns,
      isReliable: confidenceScore >= 60,
    },
    isCertified,
    certificationLevel,
    certificateId,
    insights,
    skillGaps,
    recommendedTopics,
    nextSteps: generateNextSteps(skillLevel, skillGaps, recommendedTopics),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function calculateDifficultyStats(
  results: CodingProblemResult[],
  difficulty: "easy" | "medium" | "hard"
) {
  const filtered = results.filter(p => p.difficulty === difficulty);
  const attempted = filtered.filter(p => p.attempts > 0);
  const solved = filtered.filter(p => p.status === "solved").length;
  const avgScore = attempted.length > 0
    ? attempted.reduce((sum, p) => sum + p.percentage, 0) / attempted.length
    : 0;
  
  return {
    attempted: attempted.length,
    solved,
    avgScore: Math.round(avgScore * 100) / 100,
  };
}

function generateNextSteps(
  skillLevel: string,
  skillGaps: string[],
  recommendedTopics: string[]
): string[] {
  const steps: string[] = [];
  
  if (skillLevel === "Beginner" || skillLevel === "Developing") {
    steps.push("Practice more easy problems to build confidence");
    steps.push("Review basic data structures (arrays, strings, hashmaps)");
  }
  
  if (skillLevel === "Proficient") {
    steps.push("Attempt medium problems with various techniques");
    steps.push("Study common algorithms (sorting, searching, DP)");
  }
  
  if (skillLevel === "Expert") {
    steps.push("Tackle hard problems to refine expertise");
    steps.push("Focus on system design and optimization");
  }
  
  if (skillGaps.includes("Edge case handling")) {
    steps.push("Practice writing comprehensive test cases");
  }
  
  if (recommendedTopics.includes("Time complexity optimization")) {
    steps.push("Learn Big-O analysis and optimization techniques");
  }
  
  return steps;
}

export const getCodingStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    solved: "#1ed36a",
    partial: "#f59e0b",
    unsolved: "#9ca3af",
    error: "#ef4444",
  };
  return colors[status] || "#9ca3af";
};

export const getDifficultyColor = (difficulty: string): string => {
  const colors: Record<string, string> = {
    easy: "#10b981",
    medium: "#f59e0b",
    hard: "#ef4444",
  };
  return colors[difficulty] || "#9ca3af";
};
