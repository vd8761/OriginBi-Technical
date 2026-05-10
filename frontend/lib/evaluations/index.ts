/**
 * OriginBI Evaluation Engines - Unified Export
 * 
 * Each assessment type has its own specialized evaluation engine:
 * - Aptitude: MCQ with negative marking
 * - Coding: Test case based with efficiency metrics
 * - Communication: AI-evaluated skills with CEFR levels
 * - MNC: MNC-readiness focused MCQ
 * - Role: Role-fit and competency analysis
 */

// Aptitude Evaluation
export {
  evaluateAptitudeAttempt,
  getAptitudeGradeColor,
  formatAptitudeTime,
  type AptitudeAnswer,
  type AptitudeQuestion,
  type AptitudeCategory,
  type AptitudeSectionResult,
  type AptitudeEvaluationResult,
} from "./aptitudeEvaluation";

// Coding Evaluation
export {
  evaluateCodingAttempt,
  getCodingStatusColor,
  getDifficultyColor,
  type CodeSubmission,
  type CodingQuestion,
  type CodingProblemResult,
  type CodingEvaluationResult,
} from "./codingEvaluation";

// Communication Evaluation
export {
  evaluateCommunicationAttempt,
  getSkillIcon,
  getSkillColor,
  getCEFRDescription,
  type CommunicationResponse,
  type CommunicationQuestion,
  type CommunicationSkill,
  type SkillResult,
  type CommunicationEvaluationResult,
} from "./communicationEvaluation";

// MNC & Role Evaluation
export {
  evaluateMNCAttempt,
  evaluateRoleAttempt,
  getMNCReadinessColor,
  getRoleFitColor,
  formatMNCScore,
  type MNCRoleAnswer,
  type MNCQuestion,
  type RoleQuestion,
  type MNCCategory,
  type RoleCategory,
  type MNCSectionResult,
  type RoleSectionResult,
  type MNCEvaluationResult,
  type RoleEvaluationResult,
} from "./mncRoleEvaluation";

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED TYPES
// ─────────────────────────────────────────────────────────────────────────────

import type { AssessmentId } from "../exams";
import type { AptitudeEvaluationResult } from "./aptitudeEvaluation";
import type { CodingEvaluationResult } from "./codingEvaluation";
import type { CommunicationEvaluationResult } from "./communicationEvaluation";
import type { MNCEvaluationResult, RoleEvaluationResult } from "./mncRoleEvaluation";

export type EvaluationResult =
  | AptitudeEvaluationResult
  | CodingEvaluationResult
  | CommunicationEvaluationResult
  | MNCEvaluationResult
  | RoleEvaluationResult;

// Type guard helpers
export const isAptitudeResult = (result: EvaluationResult): result is AptitudeEvaluationResult =>
  result.assessmentId === "aptitude";

export const isCodingResult = (result: EvaluationResult): result is CodingEvaluationResult =>
  result.assessmentId === "coding";

export const isCommunicationResult = (result: EvaluationResult): result is CommunicationEvaluationResult =>
  result.assessmentId === "communication";

export const isMNCResult = (result: EvaluationResult): result is MNCEvaluationResult =>
  result.assessmentId === "mnc";

export const isRoleResult = (result: EvaluationResult): result is RoleEvaluationResult =>
  result.assessmentId === "role";

// ─────────────────────────────────────────────────────────────────────────────
// COMMON HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const getCertificationColor = (level: string): string => {
  const colors: Record<string, string> = {
    platinum: "#e5e4e2",
    gold: "#ffd700",
    silver: "#c0c0c0",
    bronze: "#cd7f32",
  };
  return colors[level.toLowerCase()] || "#9ca3af";
};

export const getCertificationBadge = (level: string): string => {
  const badges: Record<string, string> = {
    platinum: "🏆 Platinum",
    gold: "🥇 Gold",
    silver: "🥈 Silver",
    bronze: "🥉 Bronze",
  };
  return badges[level.toLowerCase()] || level;
};

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  
  if (hrs > 0) {
    return `${hrs}h ${mins % 60}m`;
  }
  return `${mins}m ${seconds % 60}s`;
};

export const calculateGlobalPercentile = (score: number, assessmentType: AssessmentId): string => {
  // Mock percentile calculation - in real app, fetch from backend
  const mockPercentiles: Record<string, number> = {
    aptitude: 65,
    coding: 58,
    communication: 72,
    mnc: 61,
    role: 69,
  };
  
  const base = mockPercentiles[assessmentType] || 60;
  const adjusted = Math.max(1, Math.min(99, base + (score - 60) * 0.5));
  
  return `Top ${Math.round(100 - adjusted)}%`;
};
