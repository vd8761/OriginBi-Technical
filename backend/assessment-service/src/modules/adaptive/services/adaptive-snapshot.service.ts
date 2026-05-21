import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdaptiveEngineService } from './adaptive-engine.service';
import {
  Difficulty,
  QuestionAnswerState,
  BlockMetrics,
  AnswerStatus,
} from '../interfaces/adaptive.interfaces';

/**
 * AdaptiveSnapshotService
 *
 * Handles:
 *  - Writing the immutable block snapshot (called once on first "Next Block")
 *  - Reading snapshots for reliability comparison
 *  - Saving updated answers (post-snapshot edits) without changing the snapshot
 *  - Computing block metrics from either snapshot or latest answers
 */
@Injectable()
export class AdaptiveSnapshotService {
  private readonly logger = new Logger(AdaptiveSnapshotService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly engine: AdaptiveEngineService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Module config (same as generator — kept local to avoid circular deps)
  // ─────────────────────────────────────────────────────────────────────────

  private getModuleConfig(moduleType: string): {
    attempts: string; questions: string; junction: string;
    idCol: string; options: string; attemptIdCol: string; hasNegative: boolean;
    categoryCol: string; subcategoryCol: string;
    hasImageUrl: boolean;
    extraCols?: string;
  } | null {
    const map: Record<string, {
      attempts: string; questions: string; junction: string;
      idCol: string; options: string; attemptIdCol: string; hasNegative: boolean;
      categoryCol: string; subcategoryCol: string;
      hasImageUrl: boolean;
      extraCols?: string;
    }> = {
      aptitude: {
        attempts: 'tech_aptitude_attempts',
        questions: 'tech_aptitude_questions',
        junction: 'tech_aptitude_attempt_questions',
        idCol: 'aptitude_question_id',
        options: 'tech_aptitude_options',
        attemptIdCol: 'aptitude_attempt_id',
        hasNegative: true,
        categoryCol: 'category',
        subcategoryCol: 'subcategory',
        hasImageUrl: true,
      },
      grammar: {
        attempts: 'tech_grammar_attempts',
        questions: 'tech_grammar_questions',
        junction: 'tech_grammar_attempt_questions',
        idCol: 'grammar_question_id',
        options: 'tech_grammar_options',
        attemptIdCol: 'grammar_attempt_id',
        hasNegative: false,
        categoryCol: 'task_type',
        subcategoryCol: 'task_type',
        hasImageUrl: false,
        extraCols: 'audio_url, passage_text, task_type, rubric_json',
      },
      mnc: {
        attempts: 'tech_mnc_attempts',
        questions: 'tech_mnc_questions',
        junction: 'tech_mnc_attempt_questions',
        idCol: 'mnc_question_id',
        options: 'tech_mnc_options',
        attemptIdCol: 'mnc_attempt_id',
        hasNegative: false,
        categoryCol: 'category',
        subcategoryCol: 'subcategory',
        hasImageUrl: false,
      },
      role: {
        attempts: 'tech_role_attempts',
        questions: 'tech_role_questions',
        junction: 'tech_role_attempt_questions',
        idCol: 'role_question_id',
        options: 'tech_role_options',
        attemptIdCol: 'role_attempt_id',
        hasNegative: true,
        categoryCol: 'domain',
        subcategoryCol: 'domain',
        hasImageUrl: true,
      },
      // 'communication' assessments are stored as module_type='grammar' in the DB enum.
      // This alias handles any edge-case where the string reaches this service directly.
      communication: {
        attempts: 'tech_grammar_attempts',
        questions: 'tech_grammar_questions',
        junction: 'tech_grammar_attempt_questions',
        idCol: 'grammar_question_id',
        options: 'tech_grammar_options',
        attemptIdCol: 'grammar_attempt_id',
        hasNegative: false,
        categoryCol: 'task_type',
        subcategoryCol: 'task_type',
        hasImageUrl: false,
        extraCols: 'audio_url, passage_text, task_type, rubric_json',
      },
    };
    return map[moduleType] ?? null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Resolve attempt → module type + attempt ID
  // ─────────────────────────────────────────────────────────────────────────

  private async resolveAttempt(attemptToken: string): Promise<{
    attemptId: number;
    assessmentId: number;
    moduleType: string;
    cfg: ReturnType<AdaptiveSnapshotService['getModuleConfig']>;
  }> {
    // Try each module's attempts table in order
    const tables = [
      { table: 'tech_aptitude_attempts', idCol: 'aptitude_attempt_id', module: 'aptitude' },
      { table: 'tech_grammar_attempts',  idCol: 'grammar_attempt_id',  module: 'grammar' },
      { table: 'tech_mnc_attempts',      idCol: 'mnc_attempt_id',      module: 'mnc' },
      { table: 'tech_role_attempts',     idCol: 'role_attempt_id',     module: 'role' },
    ];

    for (const t of tables) {
      const rows = await this.dataSource.query(
        `SELECT ${t.idCol} AS aid, assessment_id FROM ${t.table} WHERE attempt_token=$1`,
        [attemptToken],
      );
      if (rows.length) {
        const cfg = this.getModuleConfig(t.module);
        return {
          attemptId: Number(rows[0].aid),
          assessmentId: Number(rows[0].assessment_id),
          moduleType: t.module,
          cfg,
        };
      }
    }
    throw new NotFoundException(`Attempt not found for token: ${attemptToken}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Load block questions with current answers from junction table
  // ─────────────────────────────────────────────────────────────────────────

  async loadBlockQuestions(
    attemptToken: string,
    blockNumber: number,
  ): Promise<Array<{
    questionId: string;
    id: string;
    text: string;
    difficulty: Difficulty;
    category: string;
    subcategory: string;
    marks: number;
    negativeMarks: number;
    selectedOptionId: string | string[] | null;
    submittedAnswer: string | null;
    isCorrect: boolean | null;
    marksAwarded: number;
    timeTakenSeconds: number;
    expectedTimeSecs: number;
    kind: string;
    correctOptionId: string | null;
    questionMetadata: any;
    options?: Array<{ id: string; text: string }>;
    imageUrl?: string;
    audioUrl?: string;
    passageText?: string;
    taskType?: string;
    rubricJson?: any;
  }>> {
    const { attemptId, moduleType, cfg } = await this.resolveAttempt(attemptToken);
    if (!cfg) throw new BadRequestException('Module not supported');

    const extraColsSelect = cfg.extraCols ? `, q.${cfg.extraCols.split(', ').join(', q.')}` : '';
    const imageColSelect = cfg.hasImageUrl ? ', q.image_url' : '';

    const rows = await this.dataSource.query(
      `SELECT aq.${cfg.idCol} AS question_id,
              aq.selected_option_id, aq.metadata AS attempt_meta,
              aq.is_correct, aq.score_awarded, aq.time_taken_seconds,
              aq.expected_time_seconds,
              q.question_text,
              q.difficulty, q.marks, q.negative_marks,
              q.metadata AS question_meta,
              q.correct_option_id,
              COALESCE(q.${cfg.categoryCol}, 'General') AS category,
              COALESCE(q.${cfg.subcategoryCol}, 'General') AS subcategory
              ${imageColSelect}
              ${extraColsSelect}
       FROM ${cfg.junction} aq
       JOIN ${cfg.questions} q ON q.${cfg.idCol}=aq.${cfg.idCol}
       WHERE aq.${cfg.attemptIdCol}=$1 AND aq.block_number=$2
       ORDER BY aq.block_sequence_order ASC`,
      [attemptId, blockNumber],
    );

    const questionsWithOpts = [];
    for (const r of rows) {
      const qMeta = typeof r.question_meta === 'object' ? r.question_meta : {};
      const aMeta = typeof r.attempt_meta === 'object' ? r.attempt_meta : {};
      const kind = this.engine.normalizeKind(qMeta?.kind);
      const selectedOptionId =
        (kind === 'msq' || kind === 'numerical')
          ? (aMeta?.submittedAnswer ?? null)
          : (r.selected_option_id ? String(r.selected_option_id) : null);

      const opts = await this.dataSource.query(
        `SELECT option_id::text AS id, option_text AS text
         FROM ${cfg.options} WHERE ${cfg.idCol}=$1 ORDER BY option_id`,
        [Number(r.question_id)],
      );

      questionsWithOpts.push({
        questionId: String(r.question_id),
        id: String(r.question_id),
        text: r.question_text ?? '',
        difficulty: (r.difficulty as Difficulty) ?? 'easy',
        category: r.category ?? 'General',
        subcategory: r.subcategory ?? 'General',
        marks: Number(r.marks ?? 1),
        negativeMarks: Number(r.negative_marks ?? 0),
        selectedOptionId,
        submittedAnswer: kind === 'numerical' ? (aMeta?.submittedAnswer ?? null) : null,
        isCorrect: r.is_correct,
        marksAwarded: Number(r.score_awarded ?? 0),
        timeTakenSeconds: Number(r.time_taken_seconds ?? 0),
        expectedTimeSecs: Number(r.expected_time_seconds ?? 0),
        kind,
        correctOptionId: r.correct_option_id ? String(r.correct_option_id) : null,
        questionMetadata: qMeta,
        options: opts,
        imageUrl: cfg.hasImageUrl ? (r.image_url ?? undefined) : undefined,
        audioUrl: r.audio_url ?? undefined,
        passageText: r.passage_text ?? undefined,
        taskType: r.task_type ?? undefined,
        rubricJson: r.rubric_json ?? undefined,
      });
    }

    return questionsWithOpts;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Evaluate correctness for a question
  // ─────────────────────────────────────────────────────────────────────────

  private evaluateAnswer(
    kind: string,
    selectedOptionId: string | string[] | null,
    submittedAnswer: string | null,
    correctOptionId: string | null,
    questionMetadata: any,
  ): { isCorrect: boolean; status: AnswerStatus } {
    const hasAnswer = Array.isArray(selectedOptionId)
      ? selectedOptionId.length > 0
      : (selectedOptionId !== null && selectedOptionId !== undefined && selectedOptionId !== '');
    const hasSubmitted = submittedAnswer !== null && submittedAnswer !== undefined && submittedAnswer !== '';

    if (!hasAnswer && !hasSubmitted) return { isCorrect: false, status: 'skipped' };

    let isCorrect = false;
    if (kind === 'msq') {
      const student: string[] = Array.isArray(selectedOptionId)
        ? selectedOptionId.map(String)
        : (selectedOptionId ? [String(selectedOptionId)] : []);
      const correct: string[] = Array.isArray(questionMetadata?.correctOptionIds)
        ? questionMetadata.correctOptionIds.map(String)
        : [];
      isCorrect = student.length > 0 &&
        student.length === correct.length &&
        student.every(id => correct.includes(id));
    } else if (kind === 'numerical') {
      const s = String(submittedAnswer ?? '').trim().toLowerCase();
      const c = String(questionMetadata?.correctAnswer ?? '').trim().toLowerCase();
      isCorrect = s !== '' && s === c;
    } else if (kind === 'tf') {
      isCorrect = String(selectedOptionId) === String(correctOptionId);
    } else {
      isCorrect = String(selectedOptionId) === String(correctOptionId);
    }

    return { isCorrect, status: isCorrect ? 'correct' : 'wrong' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Write snapshot (called once on first "Next Block" click)
  // Returns false if snapshot already exists (idempotent)
  // ─────────────────────────────────────────────────────────────────────────

  async writeSnapshot(
    attemptToken: string,
    blockNumber: number,
    answers: Record<string, string | string[]>,
    questionTiming: Record<string, number>,
    secondsPerMark: number,
  ): Promise<{
    alreadyExists: boolean;
    metrics: BlockMetrics;
    nextBlockDifficulty: Difficulty;
  }> {
    // Check if snapshot already exists
    const existing = await this.dataSource.query(
      `SELECT snapshot_id FROM block_snapshots WHERE attempt_token=$1 AND block_number=$2`,
      [attemptToken, blockNumber],
    );
    if (existing.length) {
      // Return existing snapshot metrics
      const snap = await this.dataSource.query(
        `SELECT * FROM block_snapshots WHERE attempt_token=$1 AND block_number=$2`,
        [attemptToken, blockNumber],
      );
      const s = snap[0];
      return {
        alreadyExists: true,
        metrics: this.rowToMetrics(s),
        nextBlockDifficulty: s.next_block_difficulty as Difficulty,
      };
    }

    const { attemptId, assessmentId, moduleType, cfg } = await this.resolveAttempt(attemptToken);
    const userId = await this.getUserId(attemptToken, moduleType);

    // Load block questions
    const questions = await this.loadBlockQuestions(attemptToken, blockNumber);

    // Build question answer states from provided answers
    const questionAnswers: Record<string, QuestionAnswerState> = {};
    const metricsInput: Array<{
      difficulty: Difficulty;
      marks: number;
      status: AnswerStatus;
      marksAwarded: number;
      timeTakenSeconds: number;
      expectedTimeSecs: number;
    }> = [];

    for (const q of questions) {
      const rawAnswer = answers[q.questionId];
      const sel = this.normalizeAnswer(rawAnswer);
      const timeSecs = questionTiming[q.questionId] ?? q.timeTakenSeconds;
      const expectedSecs = q.expectedTimeSecs > 0
        ? q.expectedTimeSecs
        : this.engine.computeExpectedTime(q.marks, q.difficulty, secondsPerMark);

      const { isCorrect, status } = this.evaluateAnswer(
        q.kind, sel, typeof sel === 'string' ? sel : null,
        q.correctOptionId, q.questionMetadata,
      );

      // Apply negative marks when the question is wrong (not skipped)
      const negativeDeduction = (!isCorrect && status === 'wrong') ? q.negativeMarks : 0;
      const marksAwarded = isCorrect ? q.marks : -negativeDeduction;

      questionAnswers[q.questionId] = {
        selectedOptionId: sel,
        submittedAnswer: q.kind === 'numerical' ? (typeof sel === 'string' ? sel : null) : null,
        isCorrect,
        marksAwarded,
        timeTakenSeconds: timeSecs,
        status,
      };

      metricsInput.push({
        difficulty: q.difficulty,
        marks: q.marks,
        status,
        marksAwarded,
        timeTakenSeconds: timeSecs,
        expectedTimeSecs: expectedSecs,
      });

      // Persist the evaluated answer to the junction table. The final report
      // (loadAllLatestAnswers) reads selected_option_id / is_correct /
      // score_awarded from the junction — without this write a block that is
      // only ever snapshotted (never re-edited) would score as all-skipped.
      if (cfg) {
        await this.persistJunctionAnswer(
          cfg, attemptId, q.questionId, q.kind, sel,
          isCorrect, marksAwarded, timeSecs, status,
        );
      }
    }

    const totalTimeSecs = Object.values(questionTiming).reduce((a, b) => a + b, 0);
    const partialMetrics = this.engine.computeBlockMetrics(
      metricsInput,
      await this.getBlockDifficulty(attemptToken, blockNumber),
      secondsPerMark,
    );

    const blockDifficulty = await this.getBlockDifficulty(attemptToken, blockNumber);
    const nextBlockDifficulty = this.engine.computeNextDifficulty(blockDifficulty, {
      attemptedCount: partialMetrics.attemptedCount,
      skipImpact: partialMetrics.skipImpact,
      adaptiveAccuracy: partialMetrics.adaptiveAccuracy,
      blockReadinessScore: partialMetrics.blockReadinessScore,
      speedEfficiency: partialMetrics.speedEfficiency,
    });

    const metrics: BlockMetrics = {
      ...partialMetrics,
      nextBlockDifficulty,
      timeTakenSeconds: totalTimeSecs,
    };

    // Build coverage map
    const coverageMap: Record<string, Record<string, number>> = {};
    for (const q of questions) {
      if (!coverageMap[q.category]) coverageMap[q.category] = {};
      coverageMap[q.category][q.subcategory] =
        (coverageMap[q.category][q.subcategory] ?? 0) + q.marks;
    }

    // Write snapshot (immutable)
    await this.dataSource.query(
      `INSERT INTO block_snapshots (
         attempt_token, block_number, assessment_id, user_id,
         question_answers, total_questions, correct_count, wrong_count,
         skipped_count, attempted_count, total_block_marks, obtained_marks,
         skipped_marks, marks_score, adaptive_accuracy, attempt_accuracy,
         skip_count_rate, skipped_marks_rate, skip_impact, skip_confidence,
         difficulty_handling, speed_efficiency, block_readiness_score,
         next_block_difficulty, time_taken_seconds, coverage_map
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
         $17,$18,$19,$20,$21,$22,$23,$24,$25,$26
       )
       ON CONFLICT (attempt_token, block_number) DO NOTHING`,
      [
        attemptToken, blockNumber, assessmentId, userId,
        JSON.stringify(questionAnswers),
        metrics.totalQuestions, metrics.correctCount, metrics.wrongCount,
        metrics.skippedCount, metrics.attemptedCount, metrics.totalBlockMarks,
        metrics.obtainedMarks, metrics.skippedMarks, metrics.marksScore,
        metrics.adaptiveAccuracy, metrics.attemptAccuracy,
        metrics.skipCountRate, metrics.skippedMarksRate, metrics.skipImpact,
        metrics.skipConfidence, metrics.difficultyHandling, metrics.speedEfficiency,
        metrics.blockReadinessScore, nextBlockDifficulty, totalTimeSecs,
        JSON.stringify(coverageMap),
      ],
    );

    // Update block_attempts with snapshot metrics
    await this.dataSource.query(
      `UPDATE block_attempts
       SET status='completed', completed_at=NOW(),
           time_taken_seconds=$1, obtained_marks=$2, total_block_marks=$3,
           skipped_count=$4, skipped_marks=$5, wrong_count=$6,
           marks_score=$7, adaptive_accuracy=$8, attempt_accuracy=$9,
           skip_count_rate=$10, skipped_marks_rate=$11, skip_impact=$12,
           skip_confidence=$13, difficulty_handling=$14, speed_efficiency=$15,
           block_readiness_score=$16, next_block_difficulty=$17,
           correct_count=$18, total_count=$19, accuracy_score=$20,
           snapshot_taken=true, updated_at=NOW()
       WHERE attempt_token=$21 AND block_number=$22`,
      [
        totalTimeSecs, metrics.obtainedMarks, metrics.totalBlockMarks,
        metrics.skippedCount, metrics.skippedMarks, metrics.wrongCount,
        metrics.marksScore, metrics.adaptiveAccuracy, metrics.attemptAccuracy,
        metrics.skipCountRate, metrics.skippedMarksRate, metrics.skipImpact,
        metrics.skipConfidence, metrics.difficultyHandling, metrics.speedEfficiency,
        metrics.blockReadinessScore, nextBlockDifficulty,
        metrics.correctCount, metrics.totalQuestions,
        metrics.adaptiveAccuracy / 100,
        attemptToken, blockNumber,
      ],
    );

    // Update adaptive_paths
    await this.dataSource.query(
      `UPDATE adaptive_paths
       SET accuracy_path   = accuracy_path   || $1::jsonb,
           time_path       = time_path       || $2::jsonb,
           total_correct   = total_correct   + $3,
           total_questions = total_questions + $4,
           updated_at      = NOW()
       WHERE attempt_token=$5`,
      [
        JSON.stringify([metrics.adaptiveAccuracy / 100]),
        JSON.stringify([totalTimeSecs]),
        metrics.correctCount, metrics.totalQuestions,
        attemptToken,
      ],
    );

    return { alreadyExists: false, metrics, nextBlockDifficulty };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Save updated answers (post-snapshot edit — does NOT change snapshot)
  // ─────────────────────────────────────────────────────────────────────────

  async saveUpdatedAnswers(
    attemptToken: string,
    blockNumber: number,
    answers: Record<string, string | string[]>,
    questionTiming?: Record<string, number>,
  ): Promise<{ saved: number }> {
    const { attemptId, moduleType, cfg } = await this.resolveAttempt(attemptToken);
    if (!cfg) throw new BadRequestException('Module not supported');

    // Verify block was already snapshotted
    const snap = await this.dataSource.query(
      `SELECT snapshot_id FROM block_snapshots WHERE attempt_token=$1 AND block_number=$2`,
      [attemptToken, blockNumber],
    );
    if (!snap.length) {
      throw new BadRequestException(
        `Block ${blockNumber} has not been completed yet. Complete the block first.`,
      );
    }

    const questions = await this.loadBlockQuestions(attemptToken, blockNumber);
    let saved = 0;

    for (const q of questions) {
      const rawAnswer = answers[q.questionId];
      if (rawAnswer === undefined) continue;

      const sel = this.normalizeAnswer(rawAnswer);
      const timeSecs = questionTiming?.[q.questionId];
      const { isCorrect, status } = this.evaluateAnswer(
        q.kind, sel, typeof sel === 'string' ? sel : null,
        q.correctOptionId, q.questionMetadata,
      );
      const negativeDeduction = (!isCorrect && status === 'wrong') ? q.negativeMarks : 0;
      const marksAwarded = isCorrect ? q.marks : -negativeDeduction;

      const hasAnswer = Array.isArray(sel)
        ? sel.length > 0
        : (sel !== null && sel !== undefined && sel !== '');

      if (hasAnswer) {
        await this.dataSource.query(
          `UPDATE ${cfg.junction}
           SET selected_option_id=$1, metadata=$2, is_correct=$3,
               score_awarded=$4, answered_at=NOW()
               ${timeSecs !== undefined ? ', time_taken_seconds=$6' : ''}
           WHERE ${cfg.attemptIdCol}=$5 AND ${cfg.idCol}=$${timeSecs !== undefined ? 7 : 6}`,
          timeSecs !== undefined
            ? [
                q.kind === 'msq' || q.kind === 'numerical' ? null : sel,
                JSON.stringify({ submittedAnswer: q.kind === 'msq' || q.kind === 'numerical' ? sel : null }),
                isCorrect, marksAwarded, attemptId, timeSecs, Number(q.questionId),
              ]
            : [
                q.kind === 'msq' || q.kind === 'numerical' ? null : sel,
                JSON.stringify({ submittedAnswer: q.kind === 'msq' || q.kind === 'numerical' ? sel : null }),
                isCorrect, marksAwarded, attemptId, Number(q.questionId),
              ],
        );
        saved++;
      } else {
        await this.dataSource.query(
          `UPDATE ${cfg.junction}
           SET selected_option_id=NULL, metadata=NULL, is_correct=NULL,
               score_awarded=0, answered_at=NULL
           WHERE ${cfg.attemptIdCol}=$1 AND ${cfg.idCol}=$2`,
          [attemptId, Number(q.questionId)],
        );
      }
    }

    return { saved };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Read snapshot for a block
  // ─────────────────────────────────────────────────────────────────────────

  async readSnapshot(
    attemptToken: string,
    blockNumber: number,
  ): Promise<Record<string, QuestionAnswerState> | null> {
    const rows = await this.dataSource.query(
      `SELECT question_answers FROM block_snapshots
       WHERE attempt_token=$1 AND block_number=$2`,
      [attemptToken, blockNumber],
    );
    return rows[0]?.question_answers ?? null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Read all snapshots for an attempt
  // ─────────────────────────────────────────────────────────────────────────

  async readAllSnapshots(
    attemptToken: string,
  ): Promise<Array<{ blockNumber: number; questionAnswers: Record<string, QuestionAnswerState> }>> {
    const rows = await this.dataSource.query(
      `SELECT block_number, question_answers FROM block_snapshots
       WHERE attempt_token=$1 ORDER BY block_number`,
      [attemptToken],
    );
    return rows.map((r: any) => ({
      blockNumber: r.block_number,
      questionAnswers: r.question_answers ?? {},
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private normalizeAnswer(raw: any): string | string[] | null {
    if (raw === undefined || raw === null) return null;
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === 'object') {
      return raw.optionId ?? raw.selectedOptionId ?? raw.value ?? null;
    }
    return String(raw);
  }

  /**
   * Write an evaluated answer back to the module's junction table so the
   * final report can read it as the candidate's "latest answer".
   */
  private async persistJunctionAnswer(
    cfg: NonNullable<ReturnType<AdaptiveSnapshotService['getModuleConfig']>>,
    attemptId: number,
    questionId: string,
    kind: string,
    sel: string | string[] | null,
    isCorrect: boolean,
    marksAwarded: number,
    timeSecs: number,
    status: AnswerStatus,
  ): Promise<void> {
    const isMulti = kind === 'msq' || kind === 'numerical';

    if (status === 'skipped') {
      await this.dataSource.query(
        `UPDATE ${cfg.junction}
         SET selected_option_id=NULL, metadata=NULL, is_correct=NULL,
             score_awarded=0, time_taken_seconds=$3, answered_at=NULL
         WHERE ${cfg.attemptIdCol}=$1 AND ${cfg.idCol}=$2`,
        [attemptId, Number(questionId), timeSecs],
      );
      return;
    }

    await this.dataSource.query(
      `UPDATE ${cfg.junction}
       SET selected_option_id=$1, metadata=$2, is_correct=$3,
           score_awarded=$4, time_taken_seconds=$5, answered_at=NOW()
       WHERE ${cfg.attemptIdCol}=$6 AND ${cfg.idCol}=$7`,
      [
        isMulti ? null : sel,
        JSON.stringify({ submittedAnswer: isMulti ? sel : null }),
        isCorrect, marksAwarded, timeSecs, attemptId, Number(questionId),
      ],
    );
  }

  private async getBlockDifficulty(
    attemptToken: string,
    blockNumber: number,
  ): Promise<Difficulty> {
    const rows = await this.dataSource.query(
      `SELECT difficulty_achieved FROM block_attempts
       WHERE attempt_token=$1 AND block_number=$2`,
      [attemptToken, blockNumber],
    );
    return (rows[0]?.difficulty_achieved as Difficulty) ?? 'easy';
  }

  private async getUserId(attemptToken: string, moduleType: string): Promise<number> {
    const tableMap: Record<string, { table: string; col: string }> = {
      aptitude:      { table: 'tech_aptitude_attempts', col: 'user_id' },
      grammar:       { table: 'tech_grammar_attempts',  col: 'user_id' },
      mnc:           { table: 'tech_mnc_attempts',      col: 'user_id' },
      role:          { table: 'tech_role_attempts',     col: 'user_id' },
      communication: { table: 'tech_grammar_attempts',  col: 'user_id' },
    };
    const t = tableMap[moduleType];
    if (!t) return 0;
    const rows = await this.dataSource.query(
      `SELECT ${t.col} AS uid FROM ${t.table} WHERE attempt_token=$1`,
      [attemptToken],
    );
    return Number(rows[0]?.uid ?? 0);
  }

  private rowToMetrics(r: any): BlockMetrics {
    return {
      totalQuestions:    Number(r.total_questions),
      correctCount:      Number(r.correct_count),
      wrongCount:        Number(r.wrong_count),
      skippedCount:      Number(r.skipped_count),
      attemptedCount:    Number(r.attempted_count),
      totalBlockMarks:   Number(r.total_block_marks),
      obtainedMarks:     Number(r.obtained_marks),
      skippedMarks:      Number(r.skipped_marks),
      marksScore:        Number(r.marks_score),
      adaptiveAccuracy:  Number(r.adaptive_accuracy),
      attemptAccuracy:   Number(r.attempt_accuracy),
      skipCountRate:     Number(r.skip_count_rate),
      skippedMarksRate:  Number(r.skipped_marks_rate),
      skipImpact:        Number(r.skip_impact),
      skipConfidence:    Number(r.skip_confidence),
      difficultyHandling: Number(r.difficulty_handling),
      speedEfficiency:   Number(r.speed_efficiency),
      blockReadinessScore: Number(r.block_readiness_score),
      nextBlockDifficulty: r.next_block_difficulty as Difficulty,
      timeTakenSeconds:  Number(r.time_taken_seconds),
    };
  }
}
