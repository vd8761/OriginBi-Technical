import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface AnswerInput {
  questionId: string;
  selectedOptionId?: string | null;
  answerText?: string;
  timeSpentSeconds: number;
  answerChanges?: number;
}

export interface QuestionEvaluation {
  questionId: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
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
  tooFastAnswers: number;
  patternMatchingScore: number;
  answerChangeRate: number;
  timeDistributionScore: number;
  confidenceScore: number;
  flags: string[];
}

export interface TimeMetrics {
  totalTimeAllowed: number;
  timeTaken: number;
  timeRemaining: number;
  avgTimePerQuestion: number;
  fastestAnswer: number;
  slowestAnswer: number;
  timeEfficiency: number;
  rushingScore: number;
}

export interface ScoreMetrics {
  positiveScore: number;
  negativeScore: number;
  netScore: number;
  accuracy: number;
  completionRate: number;
  precision: number;
  percentileRank: number;
  zScore: number;
}

export interface EvaluationResult {
  assessmentId: string;
  attemptToken: string;
  completedAt: string;
  status: 'completed' | 'incomplete' | 'disqualified';
  isCertified: boolean;
  certificationLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
  overallScore: number;
  grade: string;
  skillLevel: string;
  scoreMetrics: ScoreMetrics;
  timeMetrics: TimeMetrics;
  reliabilityMetrics: ReliabilityMetrics;
  sections: SectionMetrics[];
  questionDetails: QuestionEvaluation[];
  strengths: string[];
  improvements: string[];
  insights: { type: string; text: string }[];
  certificateId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const ASSESSMENT_CONFIGS: Record<string, {
  passingScore: number;
  sectionWeights: Record<string, number>;
  sectionPassingPercentage: number;
}> = {
  aptitude: {
    passingScore: 60,
    sectionWeights: {
      'Quantitative Aptitude': 0.30,
      'Logical Reasoning': 0.25,
      'Verbal Ability': 0.20,
      'Data Interpretation': 0.25,
    },
    sectionPassingPercentage: 40,
  },
  coding: {
    passingScore: 60,
    sectionWeights: {
      'Problem Solving': 0.50,
      'Code Efficiency': 0.30,
      'Code Quality': 0.20,
    },
    sectionPassingPercentage: 40,
  },
  communication: {
    passingScore: 65,
    sectionWeights: {
      'Reading': 0.25,
      'Writing': 0.25,
      'Speaking': 0.25,
      'Listening': 0.25,
    },
    sectionPassingPercentage: 50,
  },
  mnc: {
    passingScore: 60,
    sectionWeights: {
      'Quantitative': 0.35,
      'Logical': 0.25,
      'Technical': 0.25,
      'Verbal': 0.15,
    },
    sectionPassingPercentage: 40,
  },
  role: {
    passingScore: 70,
    sectionWeights: {
      'Scenarios': 0.50,
      'Conceptual': 0.30,
      'Situational': 0.20,
    },
    sectionPassingPercentage: 50,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GRADING FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

const calculateGrade = (score: number): string => {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  return 'F';
};

const calculateSkillLevel = (score: number): string => {
  if (score >= 80) return 'Expert';
  if (score >= 65) return 'Proficient';
  if (score >= 50) return 'Developing';
  return 'Beginner';
};

const calculateCertificationLevel = (
  score: number,
  accuracy: number,
  reliability: number
): 'bronze' | 'silver' | 'gold' | 'platinum' | undefined => {
  if (score >= 85 && accuracy >= 85 && reliability >= 80) return 'platinum';
  if (score >= 75 && accuracy >= 75 && reliability >= 70) return 'gold';
  if (score >= 65 && accuracy >= 65 && reliability >= 60) return 'silver';
  if (score >= 50) return 'bronze';
  return undefined;
};

// ─────────────────────────────────────────────────────────────────────────────
// RELIABILITY ENGINE
// ─────────────────────────────────────────────────────────────────────────────

const calculateReliabilityMetrics = (
  answers: AnswerInput[],
  questionMetrics: QuestionEvaluation[]
): ReliabilityMetrics => {
  const flags: string[] = [];
  
  // Too fast answers (< 5 seconds)
  const tooFastThreshold = 5;
  const tooFastAnswers = answers.filter(a => a.timeSpentSeconds < tooFastThreshold).length;
  if (tooFastAnswers > answers.length * 0.1) {
    flags.push(`${tooFastAnswers} answers completed suspiciously fast`);
  }
  
  // Pattern detection
  const detectPattern = (arr: (string | null | undefined)[]): number => {
    if (arr.length < 4) return 0;
    let patternScore = 0;
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
  
  // Answer change rate
  const totalChanges = answers.reduce((sum, a) => sum + (a.answerChanges || 0), 0);
  const answerChangeRate = (totalChanges / answers.length) * 100;
  if (answerChangeRate > 50) {
    flags.push('Excessive answer revision detected');
  }
  
  // Time distribution
  const times = answers.map(a => a.timeSpentSeconds).filter(t => t > 0);
  const avg = times.reduce((a, b) => a + b, 0) / times.length || 1;
  const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length || 0;
  const stdDev = Math.sqrt(variance);
  const timeDistributionScore = Math.max(0, 100 - (stdDev / avg) * 100);
  
  // Confidence score
  const confidenceScore = Math.max(0, 100 
    - (tooFastAnswers / answers.length) * 30
    - patternMatchingScore * 0.5
    - (answerChangeRate > 30 ? 20 : 0)
    - (timeDistributionScore < 50 ? 15 : 0)
  );
  
  if (confidenceScore < 60) {
    flags.push('Low confidence score - potential irregularities detected');
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
// TIME METRICS
// ─────────────────────────────────────────────────────────────────────────────

const calculateTimeMetrics = (
  answers: AnswerInput[],
  totalTimeAllowed: number,
  timeTaken: number
): TimeMetrics => {
  const times = answers.map(a => a.timeSpentSeconds).filter(t => t > 0);
  
  const avgTimePerQuestion = times.length > 0 
    ? times.reduce((a, b) => a + b, 0) / times.length 
    : 0;
  
  const fastestAnswer = times.length > 0 ? Math.min(...times) : 0;
  const slowestAnswer = times.length > 0 ? Math.max(...times) : 0;
  
  const expectedTime = totalTimeAllowed * 0.7;
  const timeEfficiency = Math.min(100, Math.max(0, (expectedTime / timeTaken) * 100));
  
  const rushingThreshold = 10;
  const rushedAnswers = times.filter(t => t < rushingThreshold).length;
  const rushingScore = times.length > 0 ? (rushedAnswers / times.length) * 100 : 0;
  
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

const calculateSectionMetrics = (
  questionMetrics: QuestionEvaluation[],
  config: typeof ASSESSMENT_CONFIGS[string]
): SectionMetrics[] => {
  const sectionMap = new Map<string, QuestionEvaluation[]>();
  
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
    const weight = config.sectionWeights[name] || (1 / sectionMap.size);
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
      passingPercentage: config.sectionPassingPercentage,
      isPassed: percentage >= config.sectionPassingPercentage,
    };
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// INSIGHTS GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

const generateInsights = (
  scoreMetrics: ScoreMetrics,
  timeMetrics: TimeMetrics,
  reliabilityMetrics: ReliabilityMetrics,
  sections: SectionMetrics[]
): { strengths: string[]; improvements: string[]; insights: { type: string; text: string }[] } => {
  const strengths: string[] = [];
  const improvements: string[] = [];
  const insights: { type: string; text: string }[] = [];
  
  // Score-based
  if (scoreMetrics.accuracy >= 80) {
    strengths.push('High accuracy');
    insights.push({ type: 'strength', text: 'Exceptional accuracy demonstrates strong subject mastery' });
  } else if (scoreMetrics.accuracy < 50) {
    improvements.push('Work on accuracy');
    insights.push({ type: 'improvement', text: 'Focus on understanding concepts before attempting questions' });
  }
  
  // Time-based
  if (timeMetrics.rushingScore > 30) {
    improvements.push('Time management');
    insights.push({ type: 'time', text: 'You may be rushing through questions. Take time to read carefully' });
  } else if (timeMetrics.timeEfficiency > 90) {
    strengths.push('Time efficiency');
    insights.push({ type: 'strength', text: 'Excellent time management - completed efficiently without rushing' });
  }
  
  // Section-based
  if (sections.length > 0) {
    const bestSection = sections.reduce((best, s) => s.percentage > best.percentage ? s : best, sections[0]);
    const weakestSection = sections.reduce((weak, s) => s.percentage < weak.percentage ? s : weak, sections[0]);
    
    if (bestSection.percentage >= 80) {
      strengths.push(`${bestSection.name} expertise`);
      insights.push({ type: 'strength', text: `Strong performance in ${bestSection.name}` });
    }
    
    if (weakestSection.percentage < 50) {
      improvements.push(`${weakestSection.name} skills`);
      insights.push({ type: 'improvement', text: `Consider reviewing ${weakestSection.name} fundamentals` });
    }
  }
  
  // Reliability-based
  if (reliabilityMetrics.confidenceScore < 70) {
    insights.push({ type: 'pattern', text: 'Some response patterns suggest guessing. Review uncertain areas' });
  }
  
  // Completion
  if (scoreMetrics.completionRate < 80) {
    insights.push({ type: 'time', text: `Only ${scoreMetrics.completionRate.toFixed(0)}% completed. Practice time management` });
  }
  
  return { strengths, improvements, insights };
};

// ─────────────────────────────────────────────────────────────────────────────
// PERCENTILE CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(private dataSource: DataSource) {}

  async calculatePercentile(
    assessmentId: number,
    score: number,
    tableName: string
  ): Promise<{ percentile: number; zScore: number }> {
    try {
      // Get statistics from last 90 days
      const stats = await this.dataSource.query(`
        SELECT 
          AVG(total_score) as mean,
          STDDEV(total_score) as std_dev,
          COUNT(*) as count
        FROM ${tableName}
        WHERE assessment_id = $1 
          AND status = 'completed'
          AND created_at > NOW() - INTERVAL '90 days'
      `, [assessmentId]);
      
      const mean = parseFloat(stats[0]?.mean) || score;
      const stdDev = parseFloat(stats[0]?.std_dev) || 1;
      const count = parseInt(stats[0]?.count) || 0;
      
      if (count < 10) {
        // Not enough data for reliable percentile
        return { percentile: 50, zScore: 0 };
      }
      
      const zScore = (score - mean) / stdDev;
      
      // Approximate percentile from z-score using error function approximation
      // percentile = 50 + 50 * erf(z / sqrt(2))
      const percentile = 50 + 50 * this.erf(zScore / Math.sqrt(2));
      
      return {
        percentile: Math.max(1, Math.min(99, Math.round(percentile))),
        zScore: Math.round(zScore * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Percentile calculation error:', error);
      return { percentile: 50, zScore: 0 };
    }
  }
  
  private erf(x: number): number {
    // Error function approximation
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN EVALUATION FUNCTION
  // ─────────────────────────────────────────────────────────────────────────

  async evaluateAttempt(params: {
    assessmentType: string;
    assessmentId: number;
    attemptId: number;
    attemptToken: string;
    answers: AnswerInput[];
    questionMetrics: QuestionEvaluation[];
    timeTaken: number;
    totalTimeAllowed: number;
    negativeMarkEnabled: boolean;
  }): Promise<EvaluationResult> {
    const {
      assessmentType,
      assessmentId,
      attemptToken,
      answers,
      questionMetrics,
      timeTaken,
      totalTimeAllowed,
    } = params;
    
    const config = ASSESSMENT_CONFIGS[assessmentType] || {
      passingScore: 60,
      sectionWeights: {},
      sectionPassingPercentage: 40,
    };
    
    const completedAt = new Date().toISOString();
    
    // Calculate scores
    const positiveScore = questionMetrics.reduce((sum, q) => sum + q.marksAwarded, 0);
    const negativeScore = questionMetrics.reduce((sum, q) => sum + q.negativeApplied, 0);
    const netScore = positiveScore - negativeScore;
    
    const attemptedCount = questionMetrics.filter(q => q.answered).length;
    const correctCount = questionMetrics.filter(q => q.isCorrect).length;
    const totalQuestions = questionMetrics.length;
    const totalPossibleMarks = questionMetrics.reduce((sum, q) => sum + q.maxMarks, 0);
    
    const accuracy = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;
    const completionRate = (attemptedCount / totalQuestions) * 100;
    const precision = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;
    
    const overallScore = totalPossibleMarks > 0 ? (netScore / totalPossibleMarks) * 100 : 0;
    
    // Calculate percentile
    const tableName = `tech_${assessmentType}_attempts`;
    const { percentile: percentileRank, zScore } = await this.calculatePercentile(
      assessmentId,
      netScore,
      tableName
    );
    
    const scoreMetrics: ScoreMetrics = {
      positiveScore,
      negativeScore,
      netScore,
      accuracy,
      completionRate,
      precision,
      percentileRank,
      zScore,
    };
    
    // Calculate other metrics
    const timeMetrics = calculateTimeMetrics(answers, totalTimeAllowed, timeTaken);
    const reliabilityMetrics = calculateReliabilityMetrics(answers, questionMetrics);
    const sections = calculateSectionMetrics(questionMetrics, config);
    
    // Certification check
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
    
    // Generate insights
    const { strengths, improvements, insights } = generateInsights(
      scoreMetrics,
      timeMetrics,
      reliabilityMetrics,
      sections
    );
    
    // Generate certificate ID
    const certificateId = isCertified
      ? `ORG-${assessmentType.toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      : undefined;
    
    return {
      assessmentId: assessmentType,
      attemptToken,
      completedAt,
      status: reliabilityMetrics.confidenceScore < 40 ? 'disqualified' : 'completed',
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
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // DATABASE UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  async saveEvaluationToDatabase(
    attemptId: number,
    tableName: string,
    result: EvaluationResult
  ): Promise<void> {
    await this.dataSource.query(`
      UPDATE ${tableName}
      SET 
        status = $1,
        submitted_at = $2,
        total_score = $3,
        positive_score = $4,
        negative_score = $5,
        accuracy = $6,
        completion_rate = $7,
        time_taken_seconds = $8,
        percentile_rank = $9,
        reliability_score = $10,
        is_certified = $11,
        certificate_id = $12,
        section_breakdown = $13,
        updated_at = NOW()
      WHERE ${tableName.replace('tech_', '').replace('_attempts', '')}_attempt_id = $14
    `, [
      result.status,
      result.completedAt,
      result.scoreMetrics.netScore,
      result.scoreMetrics.positiveScore,
      result.scoreMetrics.negativeScore,
      result.scoreMetrics.accuracy,
      result.scoreMetrics.completionRate,
      result.timeMetrics.timeTaken,
      result.scoreMetrics.percentileRank,
      result.reliabilityMetrics.confidenceScore,
      result.isCertified,
      result.certificateId,
      JSON.stringify(result.sections),
      attemptId,
    ]);
  }
}
