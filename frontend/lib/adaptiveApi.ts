"use client";

/**
 * Adaptive Engine v2 API client
 * All calls go to /api/adaptive/v2/...
 */

import { apiFetch } from "./api";

const BASE = "/api/adaptive/v2";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Difficulty = "easy" | "medium" | "hard";
export type QuestionKind = "mcq" | "msq" | "tf" | "numerical";
export type AnswerStatus = "correct" | "wrong" | "skipped";
export type PerformanceLevel = "Excellent" | "Good" | "Average" | "Basic" | "Needs Foundation";
export type ReliabilityLevel = "High" | "Medium" | "Low";
export type TopicMasteryLevel = "Strong" | "Moderate" | "Weak";

export interface AdaptiveOption {
  id: string;
  text: string;
}

export interface AdaptiveQuestion {
  id: string;
  text: string;
  options: AdaptiveOption[];
  difficulty: Difficulty;
  category: string;
  subcategory: string;
  marks: number;
  negativeMarks: number;
  kind: QuestionKind;
  imageUrl?: string;
  expectedTimeSecs: number;
  // Populated when loading a previously answered block
  selectedOptionId?: string | string[] | null;
  answeredAt?: string | null;
  audioUrl?: string;
  passageText?: string;
  taskType?: string;
  rubricJson?: any;
}

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

export interface BlockMetrics {
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  attemptedCount: number;
  totalBlockMarks: number;
  obtainedMarks: number;
  skippedMarks: number;
  marksScore: number;
  adaptiveAccuracy: number;
  attemptAccuracy: number;
  skipCountRate: number;
  skippedMarksRate: number;
  skipImpact: number;
  skipConfidence: number;
  difficultyHandling: number;
  speedEfficiency: number;
  blockReadinessScore: number;
  nextBlockDifficulty: Difficulty;
  timeTakenSeconds: number;
}

export interface BlockStatus {
  blockNumber: number;
  status: string;
  difficulty: Difficulty;
  snapshotTaken: boolean;
  marksScore: number | null;
  blockReadinessScore: number | null;
  nextBlockDifficulty: Difficulty | null;
}

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

export interface AdaptiveFinalReport {
  attemptToken: string;
  assessmentId: number;
  userId: number;
  totalMarks: number;
  obtainedMarks: number;
  marksPercentage: number;
  finalEvaluationScore: number;
  performanceLevel: PerformanceLevel;
  totalQuestions: number;
  attemptedQuestions: number;
  skippedQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skipImpact: number;
  skipConfidence: number;
  difficultyHandling: number;
  topicMasteryScore: number;
  speedEfficiency: number;
  reliabilityScore: number;
  reliabilityLevel: ReliabilityLevel;
  timeTakenSeconds: number;
  avgTimePerQuestion: number;
  avgTimePerMark: number;
  adaptivePath: Difficulty[];
  blockPerformance: BlockMetrics[];
  categoryPerformance: Record<string, any>;
  topicMastery: TopicMastery[];
  strongTopics: string[];
  weakTopics: string[];
  slowTopics: string[];
  skippedTopics: string[];
  recommendedTopics: string[];
  reliabilityDetail: any;
}

export interface BlueprintConfig {
  totalMarks: number;
  totalBlocks: number;
  marksPerBlock: number;
  secondsPerMark: number;
  categoryBlueprint: Record<string, { weightPct: number; targetMarks: number }>;
  subcategoryBlueprint: Record<string, Record<string, { targetMarks: number }>>;
  difficultyProfiles: Record<Difficulty, { easy: number; medium: number; hard: number }>;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/** Check if all v2 tables are ready */
export async function checkAdaptiveHealth(): Promise<{
  status: "healthy" | "degraded" | "failed";
  tables: Record<string, boolean>;
  message: string;
}> {
  const res = await apiFetch<any>(`${BASE}/health`);
  return res;
}

/** Get the marks blueprint for an assessment */
export async function getBlueprint(assessmentId: number): Promise<BlueprintConfig> {
  const res = await apiFetch<{ blueprint: BlueprintConfig }>(`${BASE}/blueprint/${assessmentId}`);
  return res.blueprint;
}

/** Generate the next block for a candidate */
export async function generateBlock(params: {
  assessmentId: number;
  blockNumber: number;
  userId: number;
  mode: "trial" | "main";
  attemptToken: string;
}): Promise<BlockResponse> {
  const res = await apiFetch<{ block: BlockResponse }>(`${BASE}/block/generate`, {
    method: "POST",
    body: JSON.stringify(params),
  });
  return res.block;
}

/**
 * Complete a block — writes the immutable snapshot.
 * Call this when the candidate clicks "Next Block" for the first time.
 */
export async function completeBlock(params: {
  attemptToken: string;
  blockNumber: number;
  timeTaken: number;
  answers: Record<string, string | string[]>;
  questionTiming?: Record<string, number>;
}): Promise<{
  alreadySnapshotted: boolean;
  nextBlockDifficulty: Difficulty;
  blockMetrics: BlockMetrics;
}> {
  const res = await apiFetch<any>(`${BASE}/block/complete`, {
    method: "POST",
    body: JSON.stringify(params),
  });
  return res;
}

/**
 * Save updated answers for a previously completed block.
 * Does NOT change the snapshot or adaptive decision.
 */
export async function saveBlockAnswers(params: {
  attemptToken: string;
  blockNumber: number;
  answers: Record<string, string | string[]>;
  questionTiming?: Record<string, number>;
}): Promise<{ saved: number }> {
  const res = await apiFetch<{ saved: number }>(`${BASE}/block/save-answers`, {
    method: "POST",
    body: JSON.stringify(params),
  });
  return res;
}

/** Get questions for a block with current saved answers */
export async function getBlockQuestions(
  attemptToken: string,
  blockNumber: number,
): Promise<{
  blockNumber: number;
  difficulty: Difficulty;
  status: string;
  snapshotTaken: boolean;
  marksScore: number | null;
  blockReadinessScore: number | null;
  nextBlockDifficulty: Difficulty | null;
  questions: AdaptiveQuestion[];
}> {
  const res = await apiFetch<any>(`${BASE}/block/${attemptToken}/${blockNumber}`);
  return res;
}

/** Get status of all blocks for an attempt */
export async function getAttemptStatus(attemptToken: string): Promise<{
  blocks: BlockStatus[];
  adaptivePath: Difficulty[];
  currentBlock: number;
}> {
  const res = await apiFetch<any>(`${BASE}/status/${attemptToken}`);
  return res;
}

/** Submit the assessment and get the final report */
export async function submitAssessment(params: {
  attemptToken: string;
  assessmentId: number;
  userId: number;
}): Promise<AdaptiveFinalReport> {
  const res = await apiFetch<{ report: AdaptiveFinalReport }>(`${BASE}/submit`, {
    method: "POST",
    body: JSON.stringify(params),
  });
  return res.report;
}

/** Get the final report for a completed attempt */
export async function getReport(attemptToken: string): Promise<AdaptiveFinalReport> {
  const res = await apiFetch<{ report: AdaptiveFinalReport }>(`${BASE}/report/${attemptToken}`);
  return res.report;
}
