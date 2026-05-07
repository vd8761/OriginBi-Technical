/**
 * Communication Evaluation Engine
 * Specialized for AI-evaluated communication skills
 * Supports: Reading, Writing, Speaking, Listening
 */

import type { AssessmentId } from "../exams";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type CommunicationSkill = "reading" | "writing" | "speaking" | "listening";

export interface CommunicationQuestion {
  questionId: string;
  skill: CommunicationSkill;
  difficulty: "easy" | "medium" | "hard";
  maxMarks: number;
}

export interface CommunicationResponse {
  questionId: string;
  skill: CommunicationSkill;
  textResponse?: string;
  audioUrl?: string;
  aiEvaluation: {
    score: number; // 0-100 AI score
    grammarScore: number;
    vocabularyScore: number;
    coherenceScore: number;
    pronunciationScore?: number; // For speaking
    fluencyScore?: number;       // For speaking/listening
    comprehensionScore?: number; // For reading/listening
  };
  timeSpentSeconds: number;
  wordCount?: number;
  attemptCount: number;
}

export interface SkillResult {
  skill: CommunicationSkill;
  totalQuestions: number;
  answered: number;
  avgAiScore: number;
  weightedScore: number;
  maxPossible: number;
  percentage: number;
  isPassed: boolean;
  
  // Component scores
  avgGrammar: number;
  avgVocabulary: number;
  avgCoherence: number;
  avgPronunciation?: number;
  avgFluency?: number;
  avgComprehension?: number;
}

export interface CommunicationEvaluationResult {
  assessmentId: AssessmentId;
  attemptToken: string;
  completedAt: string;
  
  // Overall
  overallScore: number; // 0-100
  grade: "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
  proficiencyLevel: "Native-like" | "Advanced" | "Intermediate" | "Basic" | "Beginner";
  cefrLevel?: "C2" | "C1" | "B2" | "B1" | "A2" | "A1";
  
  // Skills breakdown
  skills: SkillResult[];
  strongestSkill?: CommunicationSkill;
  weakestSkill?: CommunicationSkill;
  
  // Aggregate metrics
  totalQuestions: number;
  answered: number;
  completionRate: number;
  
  // AI evaluation summary
  avgAiScore: number;
  avgGrammarScore: number;
  avgVocabularyScore: number;
  avgCoherenceScore: number;
  
  // Speaking-specific (if applicable)
  avgPronunciation?: number;
  avgFluency?: number;
  
  // Writing-specific (if applicable)
  totalWordsWritten: number;
  avgWordsPerResponse: number;
  writingConcisenessScore: number;
  
  // Time analysis
  timeMetrics: {
    timeTaken: number;
    timeRemaining: number;
    avgTimePerQuestion: number;
    fastestSkill?: CommunicationSkill;
    slowestSkill?: CommunicationSkill;
  };
  
  // Quality indicators
  quality: {
    responsesWithMultipleAttempts: number;
    incompleteResponses: number;
    veryShortResponses: number; // < 10 words for writing
    qualityScore: number; // 0-100
  };
  
  // Reliability
  reliability: {
    confidenceScore: number;
    aiConfidenceFlags: string[];
    isReliable: boolean;
  };
  
  // Certification
  isCertified: boolean;
  certificationLevel?: "bronze" | "silver" | "gold" | "platinum";
  certificateId?: string;
  
  // Insights
  insights: { type: "strength" | "improvement" | "skill" | "quality"; text: string }[];
  
  // Recommendations
  skillGaps: CommunicationSkill[];
  recommendedFocus: string[];
  suggestedResources: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const COMM_CONFIG = {
  passingScore: 65,
  skillWeights: {
    reading: 0.25,
    writing: 0.25,
    speaking: 0.25,
    listening: 0.25,
  } as Record<CommunicationSkill, number>,
  skillBenchmarks: {
    reading: { easy: 60, medium: 90, hard: 120 },
    writing: { easy: 120, medium: 180, hard: 300 },
    speaking: { easy: 45, medium: 60, hard: 90 },
    listening: { easy: 30, medium: 60, hard: 90 },
  } as Record<CommunicationSkill, Record<string, number>>,
  cefrThresholds: {
    "C2": 95,
    "C1": 85,
    "B2": 75,
    "B1": 65,
    "A2": 50,
    "A1": 0,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// EVALUATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateCommunicationAttempt(
  responses: CommunicationResponse[],
  questions: CommunicationQuestion[],
  timeTaken: number,
  totalTimeAllowed: number,
  attemptToken: string
): CommunicationEvaluationResult {
  const completedAt = new Date().toISOString();
  
  const questionMap = new Map(questions.map(q => [q.questionId, q]));
  
  // Group by skill
  const skillGroups = new Map<CommunicationSkill, {
    questions: CommunicationQuestion[];
    responses: CommunicationResponse[];
  }>();
  
  // Initialize all skills
  (["reading", "writing", "speaking", "listening"] as CommunicationSkill[]).forEach(skill => {
    skillGroups.set(skill, { questions: [], responses: [] });
  });
  
  // Group questions
  questions.forEach(q => {
    const group = skillGroups.get(q.skill);
    if (group) group.questions.push(q);
  });
  
  // Group responses
  responses.forEach(r => {
    const group = skillGroups.get(r.skill);
    if (group) group.responses.push(r);
  });
  
  // Calculate skill results
  const skills: SkillResult[] = [];
  
  skillGroups.forEach((group, skill) => {
    if (group.questions.length === 0) return;
    
    const totalQuestions = group.questions.length;
    const answeredResponses = group.responses;
    const answered = answeredResponses.length;
    
    if (answered === 0) {
      skills.push({
        skill,
        totalQuestions,
        answered: 0,
        avgAiScore: 0,
        weightedScore: 0,
        maxPossible: group.questions.reduce((sum, q) => sum + q.maxMarks, 0),
        percentage: 0,
        isPassed: false,
        avgGrammar: 0,
        avgVocabulary: 0,
        avgCoherence: 0,
      });
      return;
    }
    
    // Calculate averages
    const avgAiScore = answeredResponses.reduce((sum, r) => sum + r.aiEvaluation.score, 0) / answered;
    const avgGrammar = answeredResponses.reduce((sum, r) => sum + r.aiEvaluation.grammarScore, 0) / answered;
    const avgVocabulary = answeredResponses.reduce((sum, r) => sum + r.aiEvaluation.vocabularyScore, 0) / answered;
    const avgCoherence = answeredResponses.reduce((sum, r) => sum + r.aiEvaluation.coherenceScore, 0) / answered;
    
    const avgPronunciation = skill === "speaking" || skill === "listening"
      ? answeredResponses.reduce((sum, r) => sum + (r.aiEvaluation.pronunciationScore || 0), 0) / answered
      : undefined;
    
    const avgFluency = skill === "speaking" || skill === "listening"
      ? answeredResponses.reduce((sum, r) => sum + (r.aiEvaluation.fluencyScore || 0), 0) / answered
      : undefined;
    
    const avgComprehension = skill === "reading" || skill === "listening"
      ? answeredResponses.reduce((sum, r) => sum + (r.aiEvaluation.comprehensionScore || 0), 0) / answered
      : undefined;
    
    // Calculate weighted score
    const maxPossible = group.questions.reduce((sum, q) => sum + q.maxMarks, 0);
    const weightedScore = (avgAiScore / 100) * maxPossible * COMM_CONFIG.skillWeights[skill];
    const percentage = (avgAiScore / 100) * 100;
    
    skills.push({
      skill,
      totalQuestions,
      answered,
      avgAiScore: Math.round(avgAiScore * 100) / 100,
      weightedScore: Math.round(weightedScore * 100) / 100,
      maxPossible,
      percentage: Math.round(percentage * 100) / 100,
      isPassed: percentage >= COMM_CONFIG.passingScore,
      avgGrammar: Math.round(avgGrammar * 100) / 100,
      avgVocabulary: Math.round(avgVocabulary * 100) / 100,
      avgCoherence: Math.round(avgCoherence * 100) / 100,
      avgPronunciation: avgPronunciation ? Math.round(avgPronunciation * 100) / 100 : undefined,
      avgFluency: avgFluency ? Math.round(avgFluency * 100) / 100 : undefined,
      avgComprehension: avgComprehension ? Math.round(avgComprehension * 100) / 100 : undefined,
    });
  });
  
  // Sort skills by performance
  skills.sort((a, b) => b.percentage - a.percentage);
  
  const strongestSkill = skills.length > 0 && skills[0].percentage > 0 ? skills[0].skill : undefined;
  const weakestSkill = skills.length > 0 && skills[skills.length - 1].percentage > 0 
    ? skills[skills.length - 1].skill 
    : undefined;
  
  // Calculate totals
  const totalQuestions = questions.length;
  const answered = responses.length;
  const completionRate = (answered / totalQuestions) * 100;
  
  // Aggregate AI scores
  const avgAiScore = responses.length > 0
    ? responses.reduce((sum, r) => sum + r.aiEvaluation.score, 0) / responses.length
    : 0;
  
  const avgGrammarScore = responses.length > 0
    ? responses.reduce((sum, r) => sum + r.aiEvaluation.grammarScore, 0) / responses.length
    : 0;
  
  const avgVocabularyScore = responses.length > 0
    ? responses.reduce((sum, r) => sum + r.aiEvaluation.vocabularyScore, 0) / responses.length
    : 0;
  
  const avgCoherenceScore = responses.length > 0
    ? responses.reduce((sum, r) => sum + r.aiEvaluation.coherenceScore, 0) / responses.length
    : 0;
  
  // Speaking-specific
  const speakingResponses = responses.filter(r => r.skill === "speaking");
  const avgPronunciation = speakingResponses.length > 0
    ? speakingResponses.reduce((sum, r) => sum + (r.aiEvaluation.pronunciationScore || 0), 0) / speakingResponses.length
    : undefined;
  
  const avgFluency = responses.filter(r => ["speaking", "listening"].includes(r.skill)).length > 0
    ? responses.filter(r => ["speaking", "listening"].includes(r.skill))
        .reduce((sum, r) => sum + (r.aiEvaluation.fluencyScore || 0), 0) / 
      responses.filter(r => ["speaking", "listening"].includes(r.skill)).length
    : undefined;
  
  // Writing-specific
  const writingResponses = responses.filter(r => r.skill === "writing");
  const totalWordsWritten = writingResponses.reduce((sum, r) => sum + (r.wordCount || 0), 0);
  const avgWordsPerResponse = writingResponses.length > 0
    ? totalWordsWritten / writingResponses.length
    : 0;
  const writingConcisenessScore = avgWordsPerResponse > 50 && avgWordsPerResponse < 500 ? 100 : 60;
  
  // Time analysis
  const skillTimes = new Map<CommunicationSkill, number[]>();
  responses.forEach(r => {
    const times = skillTimes.get(r.skill) || [];
    times.push(r.timeSpentSeconds);
    skillTimes.set(r.skill, times);
  });
  
  const skillAvgTimes = Array.from(skillTimes.entries()).map(([skill, times]) => ({
    skill,
    avg: times.reduce((a, b) => a + b, 0) / times.length,
  }));
  
  const fastestSkill = skillAvgTimes.length > 0
    ? skillAvgTimes.reduce((min, s) => s.avg < min.avg ? s : min, skillAvgTimes[0]).skill
    : undefined;
  
  const slowestSkill = skillAvgTimes.length > 0
    ? skillAvgTimes.reduce((max, s) => s.avg > max.avg ? s : max, skillAvgTimes[0]).skill
    : undefined;
  
  // Quality indicators
  const responsesWithMultipleAttempts = responses.filter(r => r.attemptCount > 1).length;
  const incompleteResponses = responses.filter(r => !r.textResponse && !r.audioUrl).length;
  const veryShortResponses = responses.filter(r => r.skill === "writing" && (r.wordCount || 0) < 10).length;
  
  const qualityScore = Math.max(0, 100 
    - responsesWithMultipleAttempts * 5
    - incompleteResponses * 10
    - veryShortResponses * 15
  );
  
  // Reliability
  const aiConfidenceFlags: string[] = [];
  
  const lowConfidenceResponses = responses.filter(r => r.aiEvaluation.score < 40);
  if (lowConfidenceResponses.length > responses.length * 0.3) {
    aiConfidenceFlags.push(`${lowConfidenceResponses.length} responses had low AI confidence scores`);
  }
  
  const veryFastResponses = responses.filter(r => r.timeSpentSeconds < 20);
  if (veryFastResponses.length > responses.length * 0.2) {
    aiConfidenceFlags.push(`${veryFastResponses.length} responses completed unusually fast`);
  }
  
  const confidenceScore = Math.max(0, 100 
    - (lowConfidenceResponses.length / Math.max(1, responses.length)) * 30
    - (veryFastResponses.length / Math.max(1, responses.length)) * 20
  );
  
  // Determine CEFR level
  let cefrLevel: CommunicationEvaluationResult["cefrLevel"] = "A1";
  for (const [level, threshold] of Object.entries(COMM_CONFIG.cefrThresholds)) {
    if (avgAiScore >= threshold) {
      cefrLevel = level as CommunicationEvaluationResult["cefrLevel"];
      break;
    }
  }
  
  // Proficiency level
  const proficiencyLevel: CommunicationEvaluationResult["proficiencyLevel"] = 
    cefrLevel === "C2" ? "Native-like" :
    cefrLevel === "C1" ? "Advanced" :
    cefrLevel === "B2" ? "Intermediate" :
    cefrLevel === "B1" ? "Basic" : "Beginner";
  
  // Calculate overall score
  const maxWeightedScore = questions.reduce((sum, q) => sum + q.maxMarks * COMM_CONFIG.skillWeights[q.skill], 0);
  const achievedWeightedScore = skills.reduce((sum, s) => sum + s.weightedScore, 0);
  const overallScore = maxWeightedScore > 0 ? (achievedWeightedScore / maxWeightedScore) * 100 : 0;
  
  // Generate insights
  const insights: CommunicationEvaluationResult["insights"] = [];
  
  if (strongestSkill) {
    const skillName = strongestSkill.charAt(0).toUpperCase() + strongestSkill.slice(1);
    insights.push({ type: "strength", text: `${skillName} is your strongest skill. Keep it up!` });
  }
  
  if (weakestSkill) {
    const skillName = weakestSkill.charAt(0).toUpperCase() + weakestSkill.slice(1);
    insights.push({ type: "improvement", text: `${skillName} needs more practice for balanced proficiency.` });
  }
  
  if (avgGrammarScore >= 80) {
    insights.push({ type: "strength", text: "Excellent grammar usage across responses!" });
  } else if (avgGrammarScore < 60) {
    insights.push({ type: "improvement", text: "Grammar needs attention. Review basic grammar rules." });
  }
  
  if (avgVocabularyScore >= 80) {
    insights.push({ type: "strength", text: "Rich vocabulary demonstrated in your responses!" });
  }
  
  if (avgCoherenceScore < 60) {
    insights.push({ type: "improvement", text: "Work on organizing your thoughts more coherently." });
  }
  
  if (veryShortResponses > 0) {
    insights.push({ type: "quality", text: `${veryShortResponses} writing responses were very short. Expand your answers.` });
  }
  
  if (cefrLevel && ["C1", "C2"].includes(cefrLevel)) {
    insights.push({ type: "strength", text: `Your ${cefrLevel} level indicates professional-level communication skills!` });
  }
  
  // Skill gaps
  const skillGaps = skills
    .filter(s => !s.isPassed)
    .map(s => s.skill);
  
  // Recommended focus
  const recommendedFocus: string[] = [];
  if (avgGrammarScore < 70) recommendedFocus.push("Grammar fundamentals");
  if (avgVocabularyScore < 70) recommendedFocus.push("Vocabulary expansion");
  if (avgCoherenceScore < 70) recommendedFocus.push("Sentence structure & flow");
  if (weakestSkill) recommendedFocus.push(`${weakestSkill} skill development`);
  
  // Suggested resources
  const suggestedResources: string[] = [];
  if (skillGaps.includes("speaking")) {
    suggestedResources.push("Daily conversation practice with AI tutors");
    suggestedResources.push("Record and review your speaking exercises");
  }
  if (skillGaps.includes("writing")) {
    suggestedResources.push("Grammar checking tools (Grammarly, ProWritingAid)");
    suggestedResources.push("Daily journaling in English");
  }
  if (skillGaps.includes("reading")) {
    suggestedResources.push("Read articles from The Economist, BBC");
    suggestedResources.push("Practice summarizing what you read");
  }
  if (skillGaps.includes("listening")) {
    suggestedResources.push("TED Talks with subtitles");
    suggestedResources.push("English podcasts at your level");
  }
  
  // Grade and certification
  const grade = overallScore >= 90 ? "A+" :
                overallScore >= 80 ? "A" :
                overallScore >= 70 ? "B+" :
                overallScore >= 60 ? "B" :
                overallScore >= 50 ? "C" :
                overallScore >= 40 ? "D" : "F";
  
  const isCertified = overallScore >= COMM_CONFIG.passingScore &&
                     completionRate >= 80 &&
                     confidenceScore >= 60 &&
                     skills.every(s => s.percentage >= 50); // Minimum 50% in each skill
  
  const certificationLevel = isCertified
    ? overallScore >= 85 && cefrLevel && ["C1", "C2"].includes(cefrLevel) ? "platinum"
      : overallScore >= 75 && cefrLevel === "B2" ? "gold"
      : overallScore >= 65 ? "silver"
      : "bronze"
    : undefined;
  
  const certificateId = isCertified
    ? `ORG-COMM-${completedAt.slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    : undefined;
  
  return {
    assessmentId: "communication",
    attemptToken,
    completedAt,
    overallScore: Math.round(overallScore * 100) / 100,
    grade,
    proficiencyLevel,
    cefrLevel,
    skills,
    strongestSkill,
    weakestSkill,
    totalQuestions,
    answered,
    completionRate: Math.round(completionRate * 100) / 100,
    avgAiScore: Math.round(avgAiScore * 100) / 100,
    avgGrammarScore: Math.round(avgGrammarScore * 100) / 100,
    avgVocabularyScore: Math.round(avgVocabularyScore * 100) / 100,
    avgCoherenceScore: Math.round(avgCoherenceScore * 100) / 100,
    avgPronunciation: avgPronunciation ? Math.round(avgPronunciation * 100) / 100 : undefined,
    avgFluency: avgFluency ? Math.round(avgFluency * 100) / 100 : undefined,
    totalWordsWritten,
    avgWordsPerResponse: Math.round(avgWordsPerResponse * 100) / 100,
    writingConcisenessScore,
    timeMetrics: {
      timeTaken,
      timeRemaining: totalTimeAllowed - timeTaken,
      avgTimePerQuestion: answered > 0 ? timeTaken / answered : 0,
      fastestSkill,
      slowestSkill,
    },
    quality: {
      responsesWithMultipleAttempts,
      incompleteResponses,
      veryShortResponses,
      qualityScore: Math.round(qualityScore * 100) / 100,
    },
    reliability: {
      confidenceScore: Math.round(confidenceScore * 10) / 10,
      aiConfidenceFlags,
      isReliable: confidenceScore >= 60,
    },
    isCertified,
    certificationLevel,
    certificateId,
    insights,
    skillGaps,
    recommendedFocus,
    suggestedResources,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const getSkillIcon = (skill: CommunicationSkill): string => {
  const icons: Record<CommunicationSkill, string> = {
    reading: "📖",
    writing: "✍️",
    speaking: "🎤",
    listening: "👂",
  };
  return icons[skill];
};

export const getSkillColor = (skill: CommunicationSkill): string => {
  const colors: Record<CommunicationSkill, string> = {
    reading: "#3b82f6",    // blue
    writing: "#10b981",    // green
    speaking: "#f59e0b",   // amber
    listening: "#8b5cf6",  // purple
  };
  return colors[skill];
};

export const getCEFRDescription = (level: string): string => {
  const descriptions: Record<string, string> = {
    "C2": "Mastery - Can express themselves spontaneously, very fluently and precisely",
    "C1": "Advanced - Can express ideas fluently and spontaneously without much searching",
    "B2": "Upper-Intermediate - Can interact with a degree of fluency and spontaneity",
    "B1": "Intermediate - Can deal with most situations likely to arise while traveling",
    "A2": "Elementary - Can communicate in simple and routine tasks",
    "A1": "Beginner - Can understand and use familiar everyday expressions",
  };
  return descriptions[level] || "Unknown level";
};
