// ─── Core interfaces for the Adaptive Engine v2 ──────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionKind = 'mcq' | 'msq' | 'tf' | 'numerical';
export type AnswerStatus = 'correct' | 'wrong' | 'skipped';
export type PerformanceLevel = 'Excellent' | 'Good' | 'Average' | 'Basic' | 'Needs Foundation';
export type ReliabilityLevel = 'High' | 'Medium' | 'Low';
export type TopicMasteryLevel = 'Strong' | 'Moderate' | 'Weak';

// ── Blueprint ─────────────────────────────────────────────────────────────────

export interface CategoryBlueprint {
  weightPct: number;
  targetMarks: number;
}

export interface SubcategoryBlueprint {
  targetMarks: number;
}

export interface DifficultyProfile {
  easy: number;   // percentage of block marks
  medium: number;
  hard: number;
}

export interface BlueprintConfig {
  totalMarks: number;
  totalBlocks: number;
  marksPerBlock: number;
  secondsPerMark: number;
  categoryBlueprint: Record<string, CategoryBlueprint>;
  subcategoryBlueprint: Record<string, Record<string, SubcategoryBlueprint>>;
  difficultyProfiles: Record<Difficulty, DifficultyProfile>;
}

// ── Question slot (what the generator needs to fill) ─────────────────────────

export interface QuestionSlot {
  category: string;
  subcategory: string;
  difficulty: Difficulty;
  targetMarks: number;
}

// ── Question as returned to the frontend ─────────────────────────────────────

export interface AdaptiveQuestion {
  id: string;
  text: string;
  options: Array<{ id: string; text: string }>;
  difficulty: Difficulty;
  category: string;
  subcategory: string;
  marks: number;
  negativeMarks: number;
  kind: QuestionKind;
  imageUrl?: string;
  expectedTimeSecs: number;
  audioUrl?: string;
  passageText?: string;
  taskType?: string;
  rubricJson?: any;
}

// ── Block response ────────────────────────────────────────────────────────────

export interface BlockResponse {
  blockId: number;
  blockNumber: number;
  totalBlocks: number;
  difficulty: Difficulty;
  questions: AdaptiveQuestion[];
  totalBlockMarks: number;
  timeLimitSeconds: number;
  isLastBlock: boolean;
  coverageMap: Record<string, Record<string, number>>;
}

// ── Per-question answer state ─────────────────────────────────────────────────

export interface QuestionAnswerState {
  selectedOptionId: string | string[] | null;
  submittedAnswer: string | null;
  isCorrect: boolean | null;
  marksAwarded: number;
  timeTakenSeconds: number;
  status: AnswerStatus;
}

// ── Block metrics (computed from snapshot or latest answers) ──────────────────

export interface BlockMetrics {
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  attemptedCount: number;
  totalBlockMarks: number;
  obtainedMarks: number;
  skippedMarks: number;
  marksScore: number;           // 0-100
  adaptiveAccuracy: number;     // 0-100 (correct / total)
  attemptAccuracy: number;      // 0-100 (correct / attempted)
  skipCountRate: number;        // 0-100
  skippedMarksRate: number;     // 0-100
  skipImpact: number;           // 0-100
  skipConfidence: number;       // 0-100
  difficultyHandling: number;   // 0-100
  speedEfficiency: number;      // 0-100
  blockReadinessScore: number;  // 0-100
  nextBlockDifficulty: Difficulty;
  timeTakenSeconds: number;
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

export interface BlockSnapshot {
  attemptToken: string;
  blockNumber: number;
  questionAnswers: Record<string, QuestionAnswerState>;
  metrics: BlockMetrics;
  coverageMap: Record<string, Record<string, number>>;
  createdAt: Date;
}

// ── Reliability ───────────────────────────────────────────────────────────────

export interface ReliabilityResult {
  reliabilityScore: number;
  reliabilityLevel: ReliabilityLevel;
  totalPenaltyPoints: number;
  maxPossiblePenalty: number;
  changeDetails: Array<{
    questionId: string;
    changeType: string;
    penalty: number;
  }>;
}

// ── Topic mastery ─────────────────────────────────────────────────────────────

export interface TopicMastery {
  category: string;
  subcategory: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  totalMarks: number;
  obtainedMarks: number;
  skippedMarks: number;
  topicMarksScore: number;
  topicAccuracy: number;
  topicDifficultyHandling: number;
  topicSpeedEfficiency: number;
  topicMasteryScore: number;
  masteryLevel: TopicMasteryLevel;
}

// ── Final report ──────────────────────────────────────────────────────────────

export interface AdaptiveFinalReport {
  // Candidate info
  attemptToken: string;
  assessmentId: number;
  userId: number;

  // Scores
  totalMarks: number;
  obtainedMarks: number;
  marksPercentage: number;
  finalEvaluationScore: number;
  performanceLevel: PerformanceLevel;

  // Counts
  totalQuestions: number;
  attemptedQuestions: number;
  skippedQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;

  // Metrics
  skipImpact: number;
  skipConfidence: number;
  difficultyHandling: number;
  topicMasteryScore: number;
  speedEfficiency: number;
  reliabilityScore: number;
  reliabilityLevel: ReliabilityLevel;

  // Time
  timeTakenSeconds: number;
  avgTimePerQuestion: number;
  avgTimePerMark: number;

  // Adaptive journey
  adaptivePath: Difficulty[];
  blockPerformance: BlockMetrics[];
  categoryPerformance: Record<string, any>;

  // Topic analysis
  topicMastery: TopicMastery[];
  strongTopics: string[];
  weakTopics: string[];
  slowTopics: string[];
  skippedTopics: string[];
  recommendedTopics: string[];

  // Reliability detail
  reliabilityDetail: ReliabilityResult;
}
