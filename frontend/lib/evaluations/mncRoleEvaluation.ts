/**
 * MNC & Role Evaluation Engine
 * Specialized for MCQ assessments (MNC-specific and Role-fit)
 * MNC Sections: Quantitative, Logical, Technical, Verbal
 * Role Sections: Scenarios, Conceptual, Situational
 */

import type { AssessmentId } from "../exams";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface MNCQuestion {
  questionId: string;
  category: MNCCategory;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  negativeMarks: number;
  correctOptionId: string;
}

export type MNCCategory = 
  | "Quantitative" 
  | "Logical" 
  | "Technical" 
  | "Verbal";

export interface RoleQuestion {
  questionId: string;
  category: RoleCategory;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  correctOptionId: string;
}

export type RoleCategory = 
  | "Scenarios" 
  | "Conceptual" 
  | "Situational";

export type AssessmentCategory = MNCCategory | RoleCategory;

export interface MNCRoleAnswer {
  questionId: string;
  selectedOptionId: string | null;
  timeSpentSeconds: number;
  answerChanges: number;
}

export interface MNCSectionResult {
  category: MNCCategory;
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
  mncReadiness: number; // 0-100 MNC-specific readiness score
  isPassed: boolean;
}

export interface RoleSectionResult {
  category: RoleCategory;
  totalQuestions: number;
  answered: number;
  correct: number;
  incorrect: number;
  skipped: number;
  score: number;
  maxPossible: number;
  percentage: number;
  roleFitScore: number; // 0-100 role fitness score
  isPassed: boolean;
}

export interface MNCEvaluationResult {
  assessmentId: "mnc";
  attemptToken: string;
  completedAt: string;
  
  // Overall
  overallScore: number;
  grade: "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
  readinessLevel: "MNC Ready" | "Developing" | "Needs Improvement" | "Not Ready";
  
  // Company readiness
  mncReadinessScore: number; // 0-100
  topCompanyMatches: string[];
  
  // Statistics
  totalQuestions: number;
  answered: number;
  correct: number;
  incorrect: number;
  skipped: number;
  
  // Scoring
  rawScore: number;
  negativeMarks: number;
  netScore: number;
  accuracy: number;
  completionRate: number;
  
  // Sections
  sections: MNCSectionResult[];
  strongestArea?: MNCCategory;
  weakestArea?: MNCCategory;
  
  // Technical competency
  technicalCompetency: {
    score: number;
    level: "Expert" | "Proficient" | "Intermediate" | "Beginner";
    strongTopics: string[];
    weakTopics: string[];
  };
  
  // Time analysis
  timeMetrics: {
    timeTaken: number;
    timeRemaining: number;
    avgTimePerQuestion: number;
    timeEfficiency: number;
    rushingScore: number;
  };
  
  // Reliability
  reliability: {
    confidenceScore: number;
    flags: string[];
    isReliable: boolean;
  };
  
  // Certification
  isCertified: boolean;
  certificationLevel?: "bronze" | "silver" | "gold" | "platinum";
  certificateId?: string;
  
  // Insights
  insights: { type: "strength" | "improvement" | "strategy" | "readiness"; text: string }[];
  
  // Recommendations
  companyRecommendations: string[];
  skillGaps: string[];
  nextSteps: string[];
}

export interface RoleEvaluationResult {
  assessmentId: "role";
  attemptToken: string;
  completedAt: string;
  
  // Overall
  overallScore: number;
  grade: "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
  roleFitLevel: "Excellent Fit" | "Good Fit" | "Moderate Fit" | "Low Fit";
  
  // Role analysis
  primaryStrength: RoleCategory;
  areasForGrowth: RoleCategory[];
  
  // Statistics
  totalQuestions: number;
  answered: number;
  correct: number;
  incorrect: number;
  skipped: number;
  
  // Scoring
  score: number;
  maxPossible: number;
  accuracy: number;
  completionRate: number;
  
  // Sections
  sections: RoleSectionResult[];
  
  // Competency breakdown
  competencies: {
    problemSolving: number;
    decisionMaking: number;
    communication: number;
    adaptability: number;
    leadership: number;
  };
  
  // Time analysis
  timeMetrics: {
    timeTaken: number;
    timeRemaining: number;
    avgTimePerQuestion: number;
  };
  
  // Reliability
  reliability: {
    confidenceScore: number;
    flags: string[];
    isReliable: boolean;
  };
  
  // Certification
  isCertified: boolean;
  certificationLevel?: "bronze" | "silver" | "gold" | "platinum";
  certificateId?: string;
  
  // Insights
  insights: { type: "strength" | "improvement" | "fit"; text: string }[];
  
  // Recommendations
  recommendedRoles: string[];
  developmentAreas: string[];
  careerAdvice: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const MNC_CONFIG = {
  passingScore: 60,
  sectionPassingPercentage: 40,
  weights: {
    "Quantitative": 0.35,
    "Logical": 0.25,
    "Technical": 0.25,
    "Verbal": 0.15,
  } as Record<MNCCategory, number>,
  companyThresholds: {
    "FAANG Ready": 85,
    "Product Company Ready": 75,
    "Service Company Ready": 65,
    "Startup Ready": 55,
  },
};

const ROLE_CONFIG = {
  passingScore: 70,
  sectionPassingPercentage: 60,
  weights: {
    "Scenarios": 0.50,
    "Conceptual": 0.30,
    "Situational": 0.20,
  } as Record<RoleCategory, number>,
  competencyMapping: {
    "Scenarios": ["problemSolving", "decisionMaking"],
    "Conceptual": ["communication", "adaptability"],
    "Situational": ["leadership", "adaptability"],
  } as Record<RoleCategory, string[]>,
};

// ─────────────────────────────────────────────────────────────────────────────
// MNC EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateMNCAttempt(
  answers: MNCRoleAnswer[],
  questions: MNCQuestion[],
  timeTaken: number,
  totalTimeAllowed: number,
  attemptToken: string
): MNCEvaluationResult {
  const completedAt = new Date().toISOString();
  
  const questionMap = new Map(questions.map(q => [q.questionId, q]));
  
  // Group by category
  const categoryGroups = new Map<MNCCategory, {
    questions: MNCQuestion[];
    answers: MNCRoleAnswer[];
  }>();
  
  (["Quantitative", "Logical", "Technical", "Verbal"] as MNCCategory[]).forEach(cat => {
    categoryGroups.set(cat, { questions: [], answers: [] });
  });
  
  questions.forEach(q => {
    const group = categoryGroups.get(q.category);
    if (group) group.questions.push(q);
  });
  
  answers.forEach(a => {
    const q = questionMap.get(a.questionId);
    if (q) {
      const group = categoryGroups.get(q.category);
      if (group) group.answers.push(a);
    }
  });
  
  // Calculate section results
  const sections: MNCSectionResult[] = [];
  let totalRawScore = 0;
  let totalNegative = 0;
  let totalCorrect = 0;
  let totalAnswered = 0;
  
  categoryGroups.forEach((group, category) => {
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
    
    // MNC-specific readiness calculation
    const mncReadiness = Math.round(
      percentage * 0.7 + 
      accuracy * 0.2 + 
      (answered / totalQuestions) * 100 * 0.1
    );
    
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
      percentage: Math.round(percentage * 100) / 100,
      accuracy: Math.round(accuracy * 100) / 100,
      mncReadiness: Math.round(mncReadiness * 100) / 100,
      isPassed: percentage >= MNC_CONFIG.sectionPassingPercentage,
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
  const accuracy = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0;
  const completionRate = (totalAnswered / totalQuestions) * 100;
  
  // Identify strengths/weaknesses
  const sortedSections = [...sections].sort((a, b) => b.percentage - a.percentage);
  const strongestArea = sortedSections[0]?.percentage > 0 ? sortedSections[0].category : undefined;
  const weakestArea = sortedSections[sortedSections.length - 1]?.percentage > 0 
    ? sortedSections[sortedSections.length - 1].category 
    : undefined;
  
  // Technical competency analysis
  const technicalSection = sections.find(s => s.category === "Technical");
  const techScore = technicalSection?.percentage || 0;
  const technicalCompetency: MNCEvaluationResult["technicalCompetency"] = {
    score: techScore,
    level: techScore >= 80 ? "Expert" :
           techScore >= 65 ? "Proficient" :
           techScore >= 50 ? "Intermediate" : "Beginner",
    strongTopics: sections.filter(s => s.percentage >= 75).map(s => s.category),
    weakTopics: sections.filter(s => s.percentage < 50).map(s => s.category),
  };
  
  // MNC Readiness Score
  const mncReadinessScore = Math.round(
    overallScore * 0.4 +
    (sections.find(s => s.category === "Quantitative")?.percentage || 0) * 0.2 +
    (sections.find(s => s.category === "Technical")?.percentage || 0) * 0.2 +
    accuracy * 0.1 +
    completionRate * 0.1
  );
  
  // Company matches
  const topCompanyMatches: string[] = [];
  if (mncReadinessScore >= MNC_CONFIG.companyThresholds["FAANG Ready"]) {
    topCompanyMatches.push("FAANG (Google, Meta, Amazon, Netflix, Apple)");
  }
  if (mncReadinessScore >= MNC_CONFIG.companyThresholds["Product Company Ready"]) {
    topCompanyMatches.push("Top Product Companies (Microsoft, Adobe, Salesforce)");
  }
  if (mncReadinessScore >= MNC_CONFIG.companyThresholds["Service Company Ready"]) {
    topCompanyMatches.push("IT Services (TCS, Infosys, Wipro, Cognizant)");
  }
  if (mncReadinessScore >= MNC_CONFIG.companyThresholds["Startup Ready"]) {
    topCompanyMatches.push("Startups & Mid-size Companies");
  }
  
  // Reliability
  const tooFastAnswers = answers.filter(a => a.timeSpentSeconds < 5).length;
  const flags: string[] = [];
  if (tooFastAnswers > answers.length * 0.15) {
    flags.push(`${tooFastAnswers} answers completed suspiciously fast`);
  }
  const confidenceScore = Math.max(0, 100 - (tooFastAnswers / answers.length) * 40);
  
  // Time metrics
  const timeEfficiency = Math.min(100, (totalTimeAllowed * 0.7 / timeTaken) * 100);
  const rushingScore = (tooFastAnswers / answers.length) * 100;
  
  // Generate insights
  const insights: MNCEvaluationResult["insights"] = [];
  
  if (mncReadinessScore >= 80) {
    insights.push({ type: "readiness", text: "Excellent MNC readiness! You're competitive for top companies." });
  } else if (mncReadinessScore >= 65) {
    insights.push({ type: "readiness", text: "Good foundation for MNC recruitment. Focus on weak areas." });
  } else {
    insights.push({ type: "readiness", text: "Needs improvement for MNC readiness. Targeted practice recommended." });
  }
  
  if (strongestArea) {
    insights.push({ type: "strength", text: `${strongestArea} is your strongest suit for MNC assessments.` });
  }
  
  if (weakestArea) {
    insights.push({ type: "improvement", text: `${weakestArea} needs attention for better MNC prospects.` });
  }
  
  if (technicalSection && technicalSection.percentage >= 75) {
    insights.push({ type: "strength", text: "Strong technical foundation - key for technical interviews!" });
  }
  
  if (totalNegative > totalRawScore * 0.15) {
    insights.push({ type: "strategy", text: `High negative marking impact. Be more selective in attempts.` });
  }
  
  // Recommendations
  const companyRecommendations: string[] = [];
  if (mncReadinessScore >= 80) {
    companyRecommendations.push("Apply to FAANG companies");
    companyRecommendations.push("Target unicorn startups");
  } else if (mncReadinessScore >= 65) {
    companyRecommendations.push("Apply to Tier-2 product companies");
    companyRecommendations.push("Consider IT services as backup");
  } else {
    companyRecommendations.push("Focus on skill development first");
    companyRecommendations.push("Consider internship programs");
  }
  
  const skillGaps = sections.filter(s => !s.isPassed).map(s => s.category);
  
  const nextSteps: string[] = [];
  if (weakestArea) {
    nextSteps.push(`Practice ${weakestArea.toLowerCase()} questions daily`);
  }
  if (technicalSection && technicalSection.percentage < 70) {
    nextSteps.push("Review technical concepts and coding fundamentals");
  }
  nextSteps.push("Take mock MNC assessments regularly");
  
  // Grade and certification
  const grade = overallScore >= 90 ? "A+" :
                overallScore >= 80 ? "A" :
                overallScore >= 70 ? "B+" :
                overallScore >= 60 ? "B" :
                overallScore >= 50 ? "C" :
                overallScore >= 40 ? "D" : "F";
  
  const readinessLevel: MNCEvaluationResult["readinessLevel"] = 
    mncReadinessScore >= 80 ? "MNC Ready" :
    mncReadinessScore >= 65 ? "Developing" :
    mncReadinessScore >= 50 ? "Needs Improvement" : "Not Ready";
  
  const isCertified = overallScore >= MNC_CONFIG.passingScore &&
                     accuracy >= 60 &&
                     completionRate >= 80 &&
                     sections.every(s => s.isPassed);
  
  const certificationLevel = isCertified
    ? mncReadinessScore >= 85 ? "platinum"
      : mncReadinessScore >= 75 ? "gold"
      : mncReadinessScore >= 65 ? "silver"
      : "bronze"
    : undefined;
  
  const certificateId = isCertified
    ? `ORG-MNC-${completedAt.slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    : undefined;
  
  return {
    assessmentId: "mnc",
    attemptToken,
    completedAt,
    overallScore: Math.round(overallScore * 100) / 100,
    grade,
    readinessLevel,
    mncReadinessScore,
    topCompanyMatches,
    totalQuestions,
    answered: totalAnswered,
    correct: totalCorrect,
    incorrect: totalIncorrect,
    skipped,
    rawScore: totalRawScore,
    negativeMarks: totalNegative,
    netScore,
    accuracy: Math.round(accuracy * 100) / 100,
    completionRate: Math.round(completionRate * 100) / 100,
    sections: sections.sort((a, b) => b.percentage - a.percentage),
    strongestArea,
    weakestArea,
    technicalCompetency,
    timeMetrics: {
      timeTaken,
      timeRemaining: totalTimeAllowed - timeTaken,
      avgTimePerQuestion: totalAnswered > 0 ? timeTaken / totalAnswered : 0,
      timeEfficiency: Math.round(timeEfficiency * 100) / 100,
      rushingScore: Math.round(rushingScore * 100) / 100,
    },
    reliability: {
      confidenceScore: Math.round(confidenceScore * 10) / 10,
      flags,
      isReliable: confidenceScore >= 60,
    },
    isCertified,
    certificationLevel,
    certificateId,
    insights,
    companyRecommendations,
    skillGaps,
    nextSteps,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateRoleAttempt(
  answers: MNCRoleAnswer[],
  questions: RoleQuestion[],
  timeTaken: number,
  totalTimeAllowed: number,
  attemptToken: string
): RoleEvaluationResult {
  const completedAt = new Date().toISOString();
  
  const questionMap = new Map(questions.map(q => [q.questionId, q]));
  
  // Group by category
  const categoryGroups = new Map<RoleCategory, {
    questions: RoleQuestion[];
    answers: MNCRoleAnswer[];
  }>();
  
  (["Scenarios", "Conceptual", "Situational"] as RoleCategory[]).forEach(cat => {
    categoryGroups.set(cat, { questions: [], answers: [] });
  });
  
  questions.forEach(q => {
    const group = categoryGroups.get(q.category);
    if (group) group.questions.push(q);
  });
  
  answers.forEach(a => {
    const q = questionMap.get(a.questionId);
    if (q) {
      const group = categoryGroups.get(q.category);
      if (group) group.answers.push(a);
    }
  });
  
  // Calculate section results
  const sections: RoleSectionResult[] = [];
  let totalCorrect = 0;
  let totalAnswered = 0;
  
  categoryGroups.forEach((group, category) => {
    const totalQuestions = group.questions.length;
    const answeredAnswers = group.answers.filter(a => a.selectedOptionId !== null);
    const answered = answeredAnswers.length;
    
    let correct = 0;
    let incorrect = 0;
    let score = 0;
    
    answeredAnswers.forEach(answer => {
      const question = questionMap.get(answer.questionId)!;
      const isCorrect = answer.selectedOptionId === question.correctOptionId;
      
      if (isCorrect) {
        correct++;
        score += question.marks;
      } else {
        incorrect++;
      }
    });
    
    const skipped = totalQuestions - answered;
    const maxPossible = group.questions.reduce((sum, q) => sum + q.marks, 0);
    const percentage = maxPossible > 0 ? (score / maxPossible) * 100 : 0;
    
    // Role fit score (weighted by category importance)
    const roleFitScore = Math.round(
      percentage * ROLE_CONFIG.weights[category] * 100
    );
    
    sections.push({
      category,
      totalQuestions,
      answered,
      correct,
      incorrect,
      skipped,
      score,
      maxPossible,
      percentage: Math.round(percentage * 100) / 100,
      roleFitScore,
      isPassed: percentage >= ROLE_CONFIG.sectionPassingPercentage,
    });
    
    totalCorrect += correct;
    totalAnswered += answered;
  });
  
  // Calculate totals
  const totalQuestions = questions.length;
  const totalIncorrect = totalAnswered - totalCorrect;
  const skipped = totalQuestions - totalAnswered;
  const score = sections.reduce((sum, s) => sum + s.score, 0);
  const maxPossible = questions.reduce((sum, q) => sum + q.marks, 0);
  const overallScore = maxPossible > 0 ? (score / maxPossible) * 100 : 0;
  const accuracy = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0;
  const completionRate = (totalAnswered / totalQuestions) * 100;
  
  // Sort sections by performance
  const sortedSections = [...sections].sort((a, b) => b.percentage - a.percentage);
  const primaryStrength = sortedSections[0].category;
  const areasForGrowth = sortedSections.slice(1).filter(s => !s.isPassed).map(s => s.category);
  
  // Calculate competencies
  const competencies = {
    problemSolving: Math.round(
      (sections.find(s => s.category === "Scenarios")?.percentage || 0) * 0.6 +
      (sections.find(s => s.category === "Situational")?.percentage || 0) * 0.4
    ),
    decisionMaking: Math.round(
      (sections.find(s => s.category === "Scenarios")?.percentage || 0) * 0.7 +
      (sections.find(s => s.category === "Situational")?.percentage || 0) * 0.3
    ),
    communication: Math.round(sections.find(s => s.category === "Conceptual")?.percentage || 0),
    adaptability: Math.round(
      (sections.find(s => s.category === "Situational")?.percentage || 0) * 0.5 +
      (sections.find(s => s.category === "Scenarios")?.percentage || 0) * 0.5
    ),
    leadership: Math.round(
      (sections.find(s => s.category === "Situational")?.percentage || 0) * 0.7 +
      (sections.find(s => s.category === "Conceptual")?.percentage || 0) * 0.3
    ),
  };
  
  // Reliability
  const tooFastAnswers = answers.filter(a => a.timeSpentSeconds < 10).length;
  const flags: string[] = [];
  if (tooFastAnswers > answers.length * 0.2) {
    flags.push(`${tooFastAnswers} scenario answers completed too quickly`);
  }
  const confidenceScore = Math.max(0, 100 - (tooFastAnswers / answers.length) * 30);
  
  // Generate insights
  const insights: RoleEvaluationResult["insights"] = [];
  
  const roleFitLevel: RoleEvaluationResult["roleFitLevel"] = 
    overallScore >= 85 ? "Excellent Fit" :
    overallScore >= 70 ? "Good Fit" :
    overallScore >= 55 ? "Moderate Fit" : "Low Fit";
  
  insights.push({ type: "fit", text: `Overall role fit: ${roleFitLevel}` });
  
  insights.push({ 
    type: "strength", 
    text: `${primaryStrength} is your strongest area - you excel in ${primaryStrength.toLowerCase()} situations.` 
  });
  
  if (areasForGrowth.length > 0) {
    insights.push({ 
      type: "improvement", 
      text: `Focus on ${areasForGrowth.join(" and ")} to improve overall role fit.` 
    });
  }
  
  if (competencies.problemSolving >= 80) {
    insights.push({ type: "strength", text: "Strong problem-solving ability - key for any role!" });
  }
  
  if (competencies.leadership >= 75) {
    insights.push({ type: "strength", text: "Leadership potential detected - consider leadership tracks." });
  }
  
  if (competencies.adaptability < 60) {
    insights.push({ type: "improvement", text: "Work on adaptability - crucial for dynamic work environments." });
  }
  
  // Recommendations
  const recommendedRoles: string[] = [];
  if (competencies.problemSolving >= 75 && competencies.decisionMaking >= 70) {
    recommendedRoles.push("Product Manager");
    recommendedRoles.push("Business Analyst");
  }
  if (competencies.communication >= 75 && competencies.leadership >= 70) {
    recommendedRoles.push("Team Lead");
    recommendedRoles.push("Project Manager");
  }
  if (competencies.adaptability >= 70) {
    recommendedRoles.push("Consultant");
    recommendedRoles.push("Startup Roles");
  }
  if (recommendedRoles.length === 0) {
    recommendedRoles.push("Individual Contributor");
    recommendedRoles.push("Specialist Roles");
  }
  
  const developmentAreas: string[] = [];
  if (competencies.problemSolving < 70) developmentAreas.push("Problem-solving methodology");
  if (competencies.communication < 70) developmentAreas.push("Communication skills");
  if (competencies.adaptability < 70) developmentAreas.push("Adaptability & flexibility");
  if (competencies.leadership < 70) developmentAreas.push("Leadership fundamentals");
  
  const careerAdvice: string[] = [];
  if (overallScore >= 80) {
    careerAdvice.push("You show strong potential for senior roles");
    careerAdvice.push("Consider management track if interested");
  } else if (overallScore >= 65) {
    careerAdvice.push("Good foundation - focus on identified growth areas");
    careerAdvice.push("Seek mentorship opportunities");
  } else {
    careerAdvice.push("Build core competencies through training");
    careerAdvice.push("Consider entry-level roles to gain experience");
  }
  
  // Grade and certification
  const grade = overallScore >= 90 ? "A+" :
                overallScore >= 80 ? "A" :
                overallScore >= 70 ? "B+" :
                overallScore >= 60 ? "B" :
                overallScore >= 50 ? "C" :
                overallScore >= 40 ? "D" : "F";
  
  const isCertified = overallScore >= ROLE_CONFIG.passingScore &&
                     completionRate >= 85 &&
                     sections.every(s => s.isPassed);
  
  const certificationLevel = isCertified
    ? overallScore >= 85 ? "platinum"
      : overallScore >= 75 ? "gold"
      : overallScore >= 70 ? "silver"
      : "bronze"
    : undefined;
  
  const certificateId = isCertified
    ? `ORG-ROLE-${completedAt.slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    : undefined;
  
  return {
    assessmentId: "role",
    attemptToken,
    completedAt,
    overallScore: Math.round(overallScore * 100) / 100,
    grade,
    roleFitLevel,
    primaryStrength,
    areasForGrowth,
    totalQuestions,
    answered: totalAnswered,
    correct: totalCorrect,
    incorrect: totalIncorrect,
    skipped,
    score,
    maxPossible,
    accuracy: Math.round(accuracy * 100) / 100,
    completionRate: Math.round(completionRate * 100) / 100,
    sections: sortedSections,
    competencies,
    timeMetrics: {
      timeTaken,
      timeRemaining: totalTimeAllowed - timeTaken,
      avgTimePerQuestion: totalAnswered > 0 ? timeTaken / totalAnswered : 0,
    },
    reliability: {
      confidenceScore: Math.round(confidenceScore * 10) / 10,
      flags,
      isReliable: confidenceScore >= 60,
    },
    isCertified,
    certificationLevel,
    certificateId,
    insights,
    recommendedRoles,
    developmentAreas,
    careerAdvice,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const getMNCReadinessColor = (score: number): string => {
  if (score >= 80) return "#1ed36a";
  if (score >= 65) return "#3b82f6";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
};

export const getRoleFitColor = (level: string): string => {
  const colors: Record<string, string> = {
    "Excellent Fit": "#1ed36a",
    "Good Fit": "#3b82f6",
    "Moderate Fit": "#f59e0b",
    "Low Fit": "#ef4444",
  };
  return colors[level] || "#9ca3af";
};

export const formatMNCScore = (score: number): string => {
  return `${Math.round(score)}% Ready`;
};
