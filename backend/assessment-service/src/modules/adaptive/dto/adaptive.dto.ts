// ─── DTOs for the Adaptive Engine v2 ─────────────────────────────────────────
import {
  IsNumber,
  IsString,
  IsOptional,
  IsObject,
  IsIn,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Start attempt ─────────────────────────────────────────────────────────────

export class StartAdaptiveAttemptDto {
  @IsNumber()
  @Type(() => Number)
  assessmentId!: number;

  @IsNumber()
  @Type(() => Number)
  userId!: number;

  @IsString()
  @IsIn(['trial', 'main'])
  mode!: 'trial' | 'main';

  @IsOptional()
  @IsString()
  attemptToken?: string;
}

// ── Generate block ────────────────────────────────────────────────────────────

export class GenerateBlockDto {
  @IsNumber()
  @Type(() => Number)
  assessmentId!: number;

  @IsNumber()
  @Type(() => Number)
  blockNumber!: number;

  @IsNumber()
  @Type(() => Number)
  userId!: number;

  @IsString()
  @IsIn(['trial', 'main'])
  mode!: 'trial' | 'main';

  @IsString()
  attemptToken!: string;
}

// ── Complete block ────────────────────────────────────────────────────────────

/** Sent when the candidate clicks "Next Block" for the first time on a block. */
export class CompleteBlockDto {
  @IsString()
  attemptToken!: string;

  @IsNumber()
  @Type(() => Number)
  blockNumber!: number;

  /** Total seconds spent on this block */
  @IsNumber()
  @Type(() => Number)
  timeTaken!: number;

  /**
   * Map of questionId → answer.
   *  For MCQ: string optionId
   *  For MSQ: string[] optionIds
   *  For numerical: string value
   *  For TF: 'true' | 'false'
   */
  @IsOptional()
  @IsObject()
  answers!: Record<string, string | string[]>;

  /** Per-question timing: { questionId: seconds } */
  @IsOptional()
  @IsObject()
  questionTiming?: Record<string, number>;
}

// ── Complete block and generate next ──────────────────────────────────────────

export class CompleteAndGenerateNextDto {
  @IsString()
  attemptToken!: string;

  @IsNumber()
  @Type(() => Number)
  blockNumber!: number;

  @IsNumber()
  @Type(() => Number)
  timeTaken!: number;

  @IsOptional()
  @IsObject()
  answers!: Record<string, string | string[]>;

  @IsOptional()
  @IsObject()
  questionTiming?: Record<string, number>;

  @IsNumber()
  @Type(() => Number)
  assessmentId!: number;

  @IsNumber()
  @Type(() => Number)
  userId!: number;

  @IsString()
  @IsIn(['trial', 'main'])
  mode!: 'trial' | 'main';
}


// ── Save block answers ────────────────────────────────────────────────────────

/** Sent when the candidate edits answers in a previously completed block. */
export class SaveBlockAnswersDto {
  @IsString()
  attemptToken!: string;

  @IsNumber()
  @Type(() => Number)
  blockNumber!: number;

  @IsOptional()
  @IsObject()
  answers!: Record<string, string | string[]>;

  /** Per-question timing updates */
  @IsOptional()
  @IsObject()
  questionTiming?: Record<string, number>;
}

// ── Final submit ──────────────────────────────────────────────────────────────

export class FinalSubmitDto {
  @IsString()
  attemptToken!: string;

  @IsNumber()
  @Type(() => Number)
  assessmentId!: number;

  @IsNumber()
  @Type(() => Number)
  userId!: number;
}

// ── Adaptive settings (replaces SetupBlueprintDto) ────────────────────────────

/**
 * Used by PUT /api/adaptive/v2/settings/:assessmentId
 * All fields are optional — only provided fields are updated.
 * Blueprint is rebuilt automatically after any change.
 */
export class UpdateAdaptiveSettingsDto {
  @IsOptional()
  @IsBoolean()
  adaptiveEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  adaptiveTotalMarks?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  adaptiveTotalBlocks?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(300)
  @Type(() => Number)
  adaptiveSecondsPerMark?: number;
}
