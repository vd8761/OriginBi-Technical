// ─── DTOs for the Adaptive Engine v2 ─────────────────────────────────────────

export class StartAdaptiveAttemptDto {
  assessmentId!: number;
  userId!: number;
  mode!: 'trial' | 'main';
  attemptToken?: string;
}

export class GenerateBlockDto {
  assessmentId!: number;
  blockNumber!: number;
  userId!: number;
  mode!: 'trial' | 'main';
  attemptToken!: string;
}

/** Sent when the candidate clicks "Next Block" for the first time on a block. */
export class CompleteBlockDto {
  attemptToken!: string;
  blockNumber!: number;
  /** Total seconds spent on this block */
  timeTaken!: number;
  /** Map of questionId → answer.
   *  For MCQ: string optionId
   *  For MSQ: string[] optionIds
   *  For numerical: string value
   *  For TF: 'true' | 'false'
   */
  answers!: Record<string, string | string[]>;
  /** Per-question timing: { questionId: seconds } */
  questionTiming?: Record<string, number>;
}

/** Sent when the candidate edits answers in a previously completed block. */
export class SaveBlockAnswersDto {
  attemptToken!: string;
  blockNumber!: number;
  answers!: Record<string, string | string[]>;
  /** Per-question timing updates */
  questionTiming?: Record<string, number>;
}

export class SetupBlueprintDto {
  assessmentId!: number;
  totalMarks!: number;
  totalBlocks!: number;
  secondsPerMark?: number;
  /** Optional custom category weightage: { "Quantitative Aptitude": 30, ... } */
  categoryWeightage?: Record<string, number>;
  /** Optional custom subcategory weightage per category */
  subcategoryWeightage?: Record<string, Record<string, number>>;
}

export class FinalSubmitDto {
  attemptToken!: string;
  assessmentId!: number;
  userId!: number;
}
