import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface BlockGenerationRequest {
  assessmentId: number;
  blockNumber: number;
  previousPerformance?: { accuracy: number; timeTaken: number; difficultyAchieved: string };
  userId: number;
  mode: 'trial' | 'main';
  attemptToken?: string;
}

export interface BlockQuestion {
  id: string;
  text: string;
  options: Array<{ id: string; text: string }>;
  difficulty: string;
  category: string;
  marks: number;
  negativeMarks: number;
  imageUrl?: string;
}

export interface BlockResponse {
  blockId: number;
  blockNumber: number;
  questions: BlockQuestion[];
  difficulty: string;
  timeLimit: number;
  totalBlocks: number;
  questionsPerBlock: number;
  totalQuestions: number;
  isLastBlock: boolean;
}

export interface CompleteBlockResult {
  nextBlockDifficulty: string;
  canProceed: boolean;
  accuracyScore: number;
  correctCount: number;
  totalCount: number;
  difficultyAchieved: string;
}

interface ModuleTableConfig {
  attempts: string; questions: string; junction: string;
  idCol: string; options: string; attemptIdCol: string;
  categoryCol: string; hasMode: boolean;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AdaptiveBlockService {
  private readonly logger = new Logger(AdaptiveBlockService.name);
  private readonly _colCache = new Map<string, boolean>();

  constructor(private readonly dataSource: DataSource) {}

  // ── Module config ──────────────────────────────────────────────────────────

  private getModuleConfig(moduleType: string): ModuleTableConfig | null {
    const map: Record<string, ModuleTableConfig> = {
      aptitude: {
        attempts: 'tech_aptitude_attempts', questions: 'tech_aptitude_questions',
        junction: 'tech_aptitude_attempt_questions', idCol: 'aptitude_question_id',
        options: 'tech_aptitude_options', attemptIdCol: 'aptitude_attempt_id',
        categoryCol: 'subcategory', hasMode: true,
      },
      grammar: {
        attempts: 'tech_grammar_attempts', questions: 'tech_grammar_questions',
        junction: 'tech_grammar_attempt_questions', idCol: 'grammar_question_id',
        options: 'tech_grammar_options', attemptIdCol: 'grammar_attempt_id',
        categoryCol: 'task_type', hasMode: true,
      },
      mnc: {
        attempts: 'tech_mnc_attempts', questions: 'tech_mnc_questions',
        junction: 'tech_mnc_attempt_questions', idCol: 'mnc_question_id',
        options: 'tech_mnc_options', attemptIdCol: 'mnc_attempt_id',
        categoryCol: 'topic_group', hasMode: true,
      },
    };
    return map[moduleType] ?? null;
  }

  // ── Column existence (cached) ──────────────────────────────────────────────

  private async columnExists(qr: any, table: string, col: string): Promise<boolean> {
    const key = `${table}.${col}`;
    if (this._colCache.has(key)) return this._colCache.get(key)!;
    try {
      const rows = await qr.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
        [table, col],
      );
      const exists = rows.length > 0;
      this._colCache.set(key, exists);
      return exists;
    } catch { return false; }
  }

  // ── Difficulty engine ──────────────────────────────────────────────────────

  /**
   * Core adaptive rule:
   *   accuracy >= 0.80 AND time < 300s  → upgrade
   *   accuracy <  0.40 OR  time > 600s  → downgrade
   *   otherwise                          → stay
   */
  computeNextDifficulty(current: string, accuracy: number, timeSecs: number): string {
    const order = ['easy', 'medium', 'hard'];
    const idx = Math.max(0, order.indexOf(current));
    if (accuracy >= 0.8 && timeSecs < 300) return order[Math.min(idx + 1, 2)];
    if (accuracy < 0.4  || timeSecs > 600) return order[Math.max(idx - 1, 0)];
    return order[idx];
  }

  // ── Initialize blocks ──────────────────────────────────────────────────────

  async initializeAdaptiveBlocks(
    assessmentId: number,
    overrides: { blocksPerAssessment: number; questionsPerBlock: number },
  ): Promise<void> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      for (let i = 1; i <= overrides.blocksPerAssessment; i++) {
        await qr.query(
          `INSERT INTO adaptive_blocks (assessment_id, block_number, difficulty_distribution, is_adaptive, status)
           VALUES ($1,$2,$3,true,'pending')
           ON CONFLICT (assessment_id, block_number) DO NOTHING`,
          [assessmentId, i, JSON.stringify({ easy: 60, medium: 30, hard: 10 })],
        );
      }
      await qr.commitTransaction();
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  // ── Generate a block ───────────────────────────────────────────────────────

  async generateBlock(req: BlockGenerationRequest): Promise<BlockResponse> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // 1. Load assessment + adaptive_blocks row
      const asmRows = await qr.query(
        `SELECT a.assessment_id, a.module_type, a.block_config, a.question_limit,
                ab.block_id, ab.difficulty_distribution
         FROM tech_assessments a
         JOIN adaptive_blocks ab ON ab.assessment_id=a.assessment_id AND ab.block_number=$2
         WHERE a.assessment_id=$1`,
        [req.assessmentId, req.blockNumber],
      );
      if (!asmRows.length) throw new NotFoundException(`Block ${req.blockNumber} not found`);

      const row = asmRows[0];
      const blockId = Number(row.block_id);
      const cfg = this.getModuleConfig(row.module_type);
      if (!cfg) throw new BadRequestException(`Module ${row.module_type} not supported for blocks`);

      const rawBC = row.block_config ?? {};
      let qpb = Number(rawBC.questionsPerBlock ?? rawBC.questions_per_block ?? 5);
      let totalBlocks = Number(rawBC.blocksPerAssessment ?? rawBC.blocks_per_assessment ?? 1);
      const qLimit = Number(row.question_limit ?? 0);

      if (req.mode === 'trial') {
        qpb = 5;
        totalBlocks = 1;
      }

      // 2. Resolve attempt + used IDs
      let attemptId: number | null = null;
      let usedIds: number[] = [];
      if (req.attemptToken) {
        const ar = await qr.query(
          `SELECT ${cfg.attemptIdCol} AS aid FROM ${cfg.attempts} WHERE attempt_token=$1`,
          [req.attemptToken],
        );
        if (ar.length) {
          attemptId = Number(ar[0].aid);
          const ur = await qr.query(
            `SELECT ${cfg.idCol} AS qid FROM ${cfg.junction} WHERE ${cfg.attemptIdCol}=$1`,
            [attemptId],
          );
          usedIds = ur.map((r: any) => Number(r.qid));
        }
      }

      // 3. Count total available questions
      const modeExists = await this.columnExists(qr, cfg.questions, 'mode');
      const cntParams: any[] = [req.assessmentId];
      let cntWhere = `WHERE assessment_id=$1 AND status='active'`;
      if (cfg.hasMode && modeExists) {
        cntParams.push(req.mode === 'trial' ? 'trial' : 'main');
        cntWhere += ` AND (mode=$${cntParams.length} OR mode IS NULL)`;
      }
      const cntRows = await qr.query(`SELECT COUNT(*)::int AS c FROM ${cfg.questions} ${cntWhere}`, cntParams);
      let totalAvail = Number(cntRows[0]?.c ?? 0);
      if (qLimit > 0) totalAvail = Math.min(totalAvail, qLimit);

      // 4. Compute desired count for this block
      const isLastBlock = req.blockNumber === totalBlocks;
      const remaining = Math.max(0, totalAvail - usedIds.length);
      const desiredCount = isLastBlock ? remaining : Math.min(qpb, remaining);
      if (desiredCount <= 0) throw new BadRequestException(`No remaining questions for block ${req.blockNumber}`);

      // 5. Determine difficulty
      const targetDiff = req.previousPerformance
        ? this.computeNextDifficulty(
            req.previousPerformance.difficultyAchieved,
            req.previousPerformance.accuracy,
            req.previousPerformance.timeTaken,
          )
        : 'easy';

      // 6. Fetch questions (with fallback)
      const questions = await this.fetchQuestions(qr, cfg, req.assessmentId, targetDiff, desiredCount, req.mode, usedIds, modeExists);
      if (!questions.length) throw new BadRequestException(`No questions available for block ${req.blockNumber}`);

      // 7. Insert into junction table (only current block — previous blocks already locked)
      if (attemptId) {
        for (let i = 0; i < questions.length; i++) {
          const displayOrder = usedIds.length + i + 1;
          await qr.query(
            `INSERT INTO ${cfg.junction}
               (${cfg.attemptIdCol}, ${cfg.idCol}, display_order, block_number, block_sequence_order, is_locked)
             VALUES ($1,$2,$3,$4,$5,false)
             ON CONFLICT (${cfg.attemptIdCol}, ${cfg.idCol}) DO NOTHING`,
            [attemptId, Number(questions[i].id), displayOrder, req.blockNumber, i + 1],
          );
        }
      }

      // 8. Update adaptive_blocks: store question IDs + mark generated
      await qr.query(
        `UPDATE adaptive_blocks SET status='generated', generated_questions=$1, updated_at=NOW() WHERE block_id=$2`,
        [JSON.stringify(questions.map(q => q.id)), blockId],
      );

      // 9. Upsert block_attempts row for this block
      const token = req.attemptToken ?? `${req.assessmentId}-${req.userId}-${Date.now()}`;
      await qr.query(
        `INSERT INTO block_attempts (attempt_token,block_id,user_id,block_number,status,started_at,difficulty_achieved,total_count)
         VALUES ($1,$2,$3,$4,'in_progress',NOW(),$5,$6)
         ON CONFLICT (attempt_token,block_number)
         DO UPDATE SET status='in_progress', started_at=NOW(), difficulty_achieved=$5, total_count=$6`,
        [token, blockId, req.userId, req.blockNumber, targetDiff, questions.length],
      );

      // 10. Update adaptive_paths: append difficulty to path
      await qr.query(
        `INSERT INTO adaptive_paths (attempt_token,assessment_id,user_id,difficulty_path,accuracy_path,time_path,current_block)
         VALUES ($1,$2,$3,$4,'[]'::jsonb,'[]'::jsonb,$5)
         ON CONFLICT (attempt_token) DO UPDATE
           SET difficulty_path = adaptive_paths.difficulty_path || $4::jsonb,
               current_block   = $5,
               updated_at      = NOW()`,
        [token, req.assessmentId, req.userId, JSON.stringify([targetDiff]), req.blockNumber],
      );

      await qr.commitTransaction();

      return {
        blockId, blockNumber: req.blockNumber, questions,
        difficulty: targetDiff,
        timeLimit: questions.length * 2,
        totalBlocks, questionsPerBlock: qpb,
        totalQuestions: totalAvail,
        isLastBlock,
      };
    } catch (e) {
      await qr.rollbackTransaction();
      this.logger.error('generateBlock error:', e);
      throw e;
    } finally {
      await qr.release();
    }
  }

  // ── Complete a block — save draft answers, compute adaptive difficulty ────────
  // Does NOT finalize scores. Scores are finalized only at submit-block-based.
  // The user can still go back and change answers in any unlocked block.
  async completeBlock(
    attemptToken: string,
    blockNumber: number,
    performance: { timeTaken?: number; answers?: Record<string, string> },
  ): Promise<CompleteBlockResult> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // 1. Resolve attempt
      const ar = await qr.query(
        `SELECT aptitude_attempt_id, assessment_id, mode FROM tech_aptitude_attempts WHERE attempt_token=$1`,
        [attemptToken],
      );
      if (!ar.length) throw new NotFoundException('Attempt not found');
      const attemptId = Number(ar[0].aptitude_attempt_id);
      const assessmentId = Number(ar[0].assessment_id);
      const attemptMode = ar[0].mode || 'main';

      // 2. Load this block's questions with correct answers + marks
      const bqs = await qr.query(
        `SELECT aq.attempt_question_id, aq.aptitude_question_id,
                q.correct_option_id, q.marks, q.negative_marks,
                q.subcategory AS category,
                ass.negative_mark_enabled, ass.negative_mark_value
         FROM tech_aptitude_attempt_questions aq
         JOIN tech_aptitude_questions q ON q.aptitude_question_id=aq.aptitude_question_id
         JOIN tech_assessments ass ON ass.assessment_id=q.assessment_id
         WHERE aq.aptitude_attempt_id=$1 AND aq.block_number=$2`,
        [attemptId, blockNumber],
      );

      const answers = performance.answers ?? {};
      let correctCount = 0;
      const totalCount = bqs.length;
      const categoryMap: Record<string, { correct: number; total: number }> = {};

      // 3. Save draft answers + compute accuracy for adaptive engine.
      //    selected_option_id is saved so the UI can restore answers when user navigates back.
      //    is_correct / score_awarded are also saved here as a preview — they will be
      //    re-computed from scratch at final submit to reflect any changes the user made.
      for (const aq of bqs) {
        const cat = aq.category ?? 'General';
        if (!categoryMap[cat]) categoryMap[cat] = { correct: 0, total: 0 };
        categoryMap[cat].total++;

        const qIdStr = String(aq.aptitude_question_id);
        const sel = answers[qIdStr] ?? answers[String(aq.attempt_question_id)];
        const qMarks = Number(aq.marks || 1);
        const negMarks = aq.negative_mark_enabled
          ? Number(aq.negative_marks || aq.negative_mark_value || 0)
          : 0;

        if (sel !== undefined && sel !== null && sel !== '') {
          const isCorrect = String(sel) === String(aq.correct_option_id);
          if (isCorrect) { correctCount++; categoryMap[cat].correct++; }
          // Save draft answer — NOT final, will be re-evaluated at submit
          await qr.query(
            `UPDATE tech_aptitude_attempt_questions
             SET selected_option_id=$1, is_correct=$2,
                 score_awarded=$3, negative_applied=$4, answered_at=NOW()
             WHERE attempt_question_id=$5`,
            [sel, isCorrect, isCorrect ? qMarks : 0, isCorrect ? 0 : negMarks, aq.attempt_question_id],
          );
        } else {
          // User left this question unanswered — clear any previous draft
          await qr.query(
            `UPDATE tech_aptitude_attempt_questions
             SET selected_option_id=NULL, is_correct=NULL,
                 score_awarded=0, negative_applied=0, answered_at=NULL
             WHERE attempt_question_id=$1`,
            [aq.attempt_question_id],
          );
        }
      }

      const accuracyScore = totalCount > 0 ? correctCount / totalCount : 0;
      const timeTaken = Number(performance.timeTaken ?? 0);

      // 4. Get this block's difficulty (set when block was generated)
      const baRow = await qr.query(
        `SELECT difficulty_achieved FROM block_attempts WHERE attempt_token=$1 AND block_number=$2`,
        [attemptToken, blockNumber],
      );
      const difficultyAchieved = baRow[0]?.difficulty_achieved ?? 'easy';

      // 5. Compute next block difficulty using adaptive engine
      const nextDiff = this.computeNextDifficulty(difficultyAchieved, accuracyScore, timeTaken);

      // 6. NO LOCKING — all generated blocks remain editable.
      //    Future (not-yet-generated) blocks are inaccessible because they don't exist in DB yet.

      // 7. Update block_attempts with draft performance metrics
      await qr.query(
        `UPDATE block_attempts
         SET status='completed', completed_at=NOW(), time_taken_seconds=$1,
             accuracy_score=$2, correct_count=$3, total_count=$4,
             next_block_difficulty=$5,
             performance_metrics=$6, updated_at=NOW()
         WHERE attempt_token=$7 AND block_number=$8`,
        [
          timeTaken, accuracyScore, correctCount, totalCount, nextDiff,
          JSON.stringify({ correctCount, totalCount, accuracyScore, timeTaken, categoryMap }),
          attemptToken, blockNumber,
        ],
      );

      // 8. Update adaptive_paths with this block's data
      await qr.query(
        `UPDATE adaptive_paths
         SET accuracy_path    = accuracy_path    || $1::jsonb,
             time_path        = time_path        || $2::jsonb,
             total_correct    = total_correct    + $3,
             total_questions  = total_questions  + $4,
             updated_at       = NOW()
         WHERE attempt_token=$5`,
        [
          JSON.stringify([accuracyScore]),
          JSON.stringify([timeTaken]),
          correctCount, totalCount,
          attemptToken,
        ],
      );

      // 9. Check if next block exists in adaptive_blocks
      const nextBlockRow = await qr.query(
        `SELECT block_id FROM adaptive_blocks WHERE assessment_id=$1 AND block_number=$2`,
        [assessmentId, blockNumber + 1],
      );
      const canProceed = attemptMode !== 'trial' && nextBlockRow.length > 0;

      await qr.commitTransaction();
      return {
        nextBlockDifficulty: nextDiff,
        canProceed,
        accuracyScore,
        correctCount,
        totalCount,
        difficultyAchieved,
      };
    } catch (e) {
      await qr.rollbackTransaction();
      this.logger.error('completeBlock error:', e);
      throw e;
    } finally {
      await qr.release();
    }
  }

  // ── Save answers for any unlocked block (user navigated back) ────────────────
  // Called when user is on block 3 and goes back to block 1 to change an answer.
  // Only saves selected_option_id — does NOT re-score or affect adaptive difficulty.
  async saveBlockAnswers(
    attemptToken: string,
    blockNumber: number,
    answers: Record<string, string>,
  ): Promise<{ saved: number }> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const ar = await qr.query(
        `SELECT aptitude_attempt_id FROM tech_aptitude_attempts WHERE attempt_token=$1`,
        [attemptToken],
      );
      if (!ar.length) throw new NotFoundException('Attempt not found');
      const attemptId = Number(ar[0].aptitude_attempt_id);

      // Verify this block exists and is accessible (was generated)
      const blockRow = await qr.query(
        `SELECT block_attempt_id FROM block_attempts
         WHERE attempt_token=$1 AND block_number=$2`,
        [attemptToken, blockNumber],
      );
      if (!blockRow.length) {
        throw new BadRequestException(`Block ${blockNumber} has not been unlocked yet`);
      }

      // Load the questions for this block
      const bqs = await qr.query(
        `SELECT aq.attempt_question_id, aq.aptitude_question_id
         FROM tech_aptitude_attempt_questions aq
         WHERE aq.aptitude_attempt_id=$1 AND aq.block_number=$2`,
        [attemptId, blockNumber],
      );

      let saved = 0;
      for (const aq of bqs) {
        const qIdStr = String(aq.aptitude_question_id);
        const sel = answers[qIdStr] ?? answers[String(aq.attempt_question_id)];

        if (sel !== undefined && sel !== null && sel !== '') {
          await qr.query(
            `UPDATE tech_aptitude_attempt_questions
             SET selected_option_id=$1, answered_at=NOW()
             WHERE attempt_question_id=$2`,
            [sel, aq.attempt_question_id],
          );
          saved++;
        } else {
          // Explicitly cleared
          await qr.query(
            `UPDATE tech_aptitude_attempt_questions
             SET selected_option_id=NULL, answered_at=NULL
             WHERE attempt_question_id=$1`,
            [aq.attempt_question_id],
          );
        }
      }

      await qr.commitTransaction();
      return { saved };
    } catch (e) {
      await qr.rollbackTransaction();
      this.logger.error('saveBlockAnswers error:', e);
      throw e;
    } finally {
      await qr.release();
    }
  }

  // ── Get a specific block's questions + saved answers (for navigation back) ──
  async getBlockQuestions(
    attemptToken: string,
    blockNumber: number,
  ): Promise<{
    blockNumber: number;
    difficulty: string;
    status: string;
    questions: Array<BlockQuestion & { selectedOptionId: string | null; answeredAt: string | null }>;
  }> {
    // Verify block exists
    const baRow = await this.dataSource.query(
      `SELECT difficulty_achieved, status FROM block_attempts
       WHERE attempt_token=$1 AND block_number=$2`,
      [attemptToken, blockNumber],
    );
    if (!baRow.length) {
      throw new BadRequestException(`Block ${blockNumber} has not been unlocked yet`);
    }

    const ar = await this.dataSource.query(
      `SELECT a.aptitude_attempt_id, a.assessment_id
       FROM tech_aptitude_attempts a WHERE a.attempt_token=$1`,
      [attemptToken],
    );
    if (!ar.length) throw new NotFoundException('Attempt not found');
    const attemptId = Number(ar[0].aptitude_attempt_id);
    const assessmentId = Number(ar[0].assessment_id);

    const rows = await this.dataSource.query(
      `SELECT aq.attempt_question_id, aq.aptitude_question_id,
              aq.selected_option_id, aq.answered_at,
              aq.block_sequence_order, aq.display_order,
              q.question_text, q.difficulty, q.subcategory AS category,
              q.marks, q.negative_marks, q.image_url
       FROM tech_aptitude_attempt_questions aq
       JOIN tech_aptitude_questions q ON q.aptitude_question_id=aq.aptitude_question_id
       WHERE aq.aptitude_attempt_id=$1 AND aq.block_number=$2
       ORDER BY aq.block_sequence_order ASC`,
      [attemptId, blockNumber],
    );

    const questions: any[] = [];
    for (const r of rows) {
      const opts = await this.dataSource.query(
        `SELECT option_id::text AS id, option_text AS text
         FROM tech_aptitude_options WHERE aptitude_question_id=$1 ORDER BY option_id`,
        [r.aptitude_question_id],
      );
      questions.push({
        id: String(r.aptitude_question_id),
        text: r.question_text,
        difficulty: r.difficulty,
        category: r.category ?? '',
        marks: Number(r.marks) || 1,
        negativeMarks: Number(r.negative_marks) || 0,
        imageUrl: r.image_url ?? undefined,
        options: opts,
        blockSequenceOrder: r.block_sequence_order,
        displayOrder: r.display_order,
        // Restore previously saved answer
        selectedOptionId: r.selected_option_id ? String(r.selected_option_id) : null,
        answeredAt: r.answered_at,
      });
    }

    return {
      blockNumber,
      difficulty: baRow[0].difficulty_achieved,
      status: baRow[0].status,
      questions,
    };
  }

  // ── Finalize analytics on submit ───────────────────────────────────────────

  async writePerformanceAnalytics(
    attemptToken: string,
    assessmentId: number,
    userId: number,
    totalScore: number,
    positiveScore: number,
    negativeScore: number,
    totalQuestions: number,
    correctCount: number,
    timeTakenSeconds: number,
  ): Promise<void> {
    try {
      // Gather block-level data
      const blocks = await this.dataSource.query(
        `SELECT block_number, difficulty_achieved, accuracy_score, correct_count,
                total_count, time_taken_seconds, next_block_difficulty, performance_metrics
         FROM block_attempts WHERE attempt_token=$1 ORDER BY block_number`,
        [attemptToken],
      );

      const diffPath = blocks.map((b: any) => b.difficulty_achieved);
      const accPath  = blocks.map((b: any) => Number(b.accuracy_score));
      const timePath = blocks.map((b: any) => Number(b.time_taken_seconds));
      const blockScores = blocks.map((b: any) => ({
        blockNumber: b.block_number,
        difficulty: b.difficulty_achieved,
        accuracy: Number(b.accuracy_score),
        correct: b.correct_count,
        total: b.total_count,
        timeSecs: b.time_taken_seconds,
      }));

      // Compute adaptation stats
      let upgrades = 0, downgrades = 0, stays = 0;
      const order = ['easy', 'medium', 'hard'];
      for (let i = 1; i < diffPath.length; i++) {
        const prev = order.indexOf(diffPath[i - 1]);
        const curr = order.indexOf(diffPath[i]);
        if (curr > prev) upgrades++;
        else if (curr < prev) downgrades++;
        else stays++;
      }
      const adaptationScore = blocks.length > 1
        ? parseFloat(((upgrades + stays) / (blocks.length - 1)).toFixed(4))
        : 1.0;

      // Category breakdown from performance_metrics
      const categoryMap: Record<string, { correct: number; total: number }> = {};
      for (const b of blocks) {
        const pm = b.performance_metrics ?? {};
        const cm = pm.categoryMap ?? {};
        for (const [cat, v] of Object.entries(cm as any)) {
          if (!categoryMap[cat]) categoryMap[cat] = { correct: 0, total: 0 };
          categoryMap[cat].correct += (v as any).correct ?? 0;
          categoryMap[cat].total   += (v as any).total   ?? 0;
        }
      }
      const weakCats   = Object.entries(categoryMap).filter(([, v]) => v.total > 0 && v.correct / v.total < 0.5).map(([k]) => k);
      const strongCats = Object.entries(categoryMap).filter(([, v]) => v.total > 0 && v.correct / v.total >= 0.8).map(([k]) => k);
      const accuracyPct = totalQuestions > 0 ? parseFloat(((correctCount / totalQuestions) * 100).toFixed(2)) : 0;

      await this.dataSource.query(
        `INSERT INTO adaptive_performance_analytics
           (attempt_token, assessment_id, user_id, total_score, positive_score, negative_score,
            total_questions, correct_count, accuracy_pct, time_taken_seconds,
            total_blocks_completed, difficulty_path, accuracy_path, time_path, block_scores,
            category_breakdown, weak_categories, strong_categories,
            difficulty_upgrades, difficulty_downgrades, difficulty_stays, adaptation_score)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
         ON CONFLICT (attempt_token) DO UPDATE
           SET total_score=$4, positive_score=$5, negative_score=$6,
               total_questions=$7, correct_count=$8, accuracy_pct=$9,
               time_taken_seconds=$10, total_blocks_completed=$11,
               difficulty_path=$12, accuracy_path=$13, time_path=$14, block_scores=$15,
               category_breakdown=$16, weak_categories=$17, strong_categories=$18,
               difficulty_upgrades=$19, difficulty_downgrades=$20, difficulty_stays=$21,
               adaptation_score=$22`,
        [
          attemptToken, assessmentId, userId,
          totalScore, positiveScore, negativeScore,
          totalQuestions, correctCount, accuracyPct, timeTakenSeconds,
          blocks.length,
          JSON.stringify(diffPath), JSON.stringify(accPath), JSON.stringify(timePath),
          JSON.stringify(blockScores),
          JSON.stringify(categoryMap),
          JSON.stringify(weakCats), JSON.stringify(strongCats),
          upgrades, downgrades, stays, adaptationScore,
        ],
      );

      // Mark adaptive_paths as completed
      await this.dataSource.query(
        `UPDATE adaptive_paths SET path_status='completed', updated_at=NOW() WHERE attempt_token=$1`,
        [attemptToken],
      );
    } catch (e) {
      this.logger.error('writePerformanceAnalytics error (non-fatal):', e);
      // Non-fatal — don't throw, submission should still succeed
    }
  }

  // ── Block status ───────────────────────────────────────────────────────────

  async getBlockStatus(attemptToken: string): Promise<any[]> {
    const rows = await this.dataSource.query(
      `SELECT block_number, status, difficulty_achieved, accuracy_score,
              correct_count, total_count, time_taken_seconds, next_block_difficulty
       FROM block_attempts WHERE attempt_token=$1 ORDER BY block_number`,
      [attemptToken],
    );
    return rows.map((b: any) => ({
      blockNumber: b.block_number,
      status: b.status,
      difficulty: b.difficulty_achieved,
      accuracy: Number(b.accuracy_score),
      correctCount: b.correct_count,
      totalCount: b.total_count,
      timeTaken: b.time_taken_seconds,
      nextBlockDifficulty: b.next_block_difficulty,
    }));
  }

  // ── Question fetching with 3-tier fallback ─────────────────────────────────

  // ── Aptitude topics that must each appear at least once per block ─────────
  private readonly APTITUDE_TOPICS = [
    'Logical Reasoning',
    'Quantitative Aptitude',
    'Data Interpretation',
    'Verbal Ability',
  ];

  private async fetchQuestions(
    qr: any,
    cfg: ModuleTableConfig,
    assessmentId: number,
    targetDiff: string,
    count: number,
    mode: string,
    excludeIds: number[],
    modeExists: boolean,
  ): Promise<BlockQuestion[]> {
    if (count <= 0) return [];

    // ── Helper: build WHERE clause ─────────────────────────────────────────
    const buildWhere = (
      params: any[],
      diff: string | null,
      exclude: number[],
      topic?: string | null,
    ): string => {
      let w = `WHERE q.assessment_id=$1 AND q.status='active'`;
      if (modeExists && cfg.hasMode) {
        params.push(mode === 'trial' ? 'trial' : 'main');
        w += ` AND (q.mode=$${params.length} OR q.mode IS NULL)`;
      }
      if (diff) {
        params.push(diff);
        w += ` AND q.difficulty=$${params.length}`;
      }
      if (topic) {
        params.push(topic);
        w += ` AND q.${cfg.categoryCol}=$${params.length}`;
      }
      if (exclude.length) {
        params.push(exclude);
        w += ` AND NOT (q.${cfg.idCol}=ANY($${params.length}::bigint[]))`;
      }
      return w;
    };

    // ── Helper: fetch N questions with optional topic + difficulty filter ──
    const fetchBatch = async (
      diff: string | null,
      need: number,
      excl: number[],
      topic?: string | null,
    ): Promise<BlockQuestion[]> => {
      if (need <= 0) return [];
      const params: any[] = [assessmentId];
      const where = buildWhere(params, diff, excl, topic);
      params.push(need);
      const rows = await qr.query(
        `SELECT q.${cfg.idCol}, q.question_text, q.difficulty,
                q.${cfg.categoryCol} AS category, q.marks, q.negative_marks, q.image_url,
                json_agg(
                  json_build_object('option_id', o.option_id, 'option_text', o.option_text)
                  ORDER BY o.option_id
                ) FILTER (WHERE o.option_id IS NOT NULL) AS options
         FROM ${cfg.questions} q
         LEFT JOIN ${cfg.options} o ON o.${cfg.idCol} = q.${cfg.idCol}
         ${where}
         GROUP BY q.${cfg.idCol}
         ORDER BY RANDOM()
         LIMIT $${params.length}`,
        params,
      );
      return rows.map((q: any) => ({
        id: String(q[cfg.idCol]),
        text: q.question_text,
        options: (q.options ?? []).map((o: any) => ({
          id: String(o.option_id),
          text: o.option_text,
        })),
        difficulty: q.difficulty,
        category: q.category ?? '',
        marks: Number(q.marks) || 1,
        negativeMarks: Number(q.negative_marks) || 0,
        imageUrl: q.image_url ?? undefined,
      }));
    };

    // ── Phase 1: 1 question per topic at target difficulty ─────────────────
    // Only applies to aptitude (4 known topics). For grammar/mnc we skip this.
    const isAptitude = cfg.categoryCol === 'subcategory';
    const results: BlockQuestion[] = [];
    const usedIds = [...excludeIds];

    if (isAptitude && count >= this.APTITUDE_TOPICS.length) {
      for (const topic of this.APTITUDE_TOPICS) {
        if (results.length >= count) break;
        // Try target difficulty first, then fallback to any difficulty
        let picked = await fetchBatch(targetDiff, 1, usedIds, topic);
        if (!picked.length) {
          // Fallback: any difficulty for this topic
          for (const fd of ['easy', 'medium', 'hard'].filter(d => d !== targetDiff)) {
            picked = await fetchBatch(fd, 1, usedIds, topic);
            if (picked.length) break;
          }
        }
        if (picked.length) {
          results.push(...picked);
          usedIds.push(Number(picked[0].id));
        }
      }
    }

    // ── Phase 2: fill remaining slots at target difficulty (any topic) ─────
    const remaining = count - results.length;
    if (remaining > 0) {
      const fill = await fetchBatch(targetDiff, remaining, usedIds);
      results.push(...fill);
      fill.forEach(q => usedIds.push(Number(q.id)));
    }

    // ── Phase 3: fallback difficulties if still short ──────────────────────
    if (results.length < count) {
      for (const fd of ['medium', 'easy', 'hard'].filter(d => d !== targetDiff)) {
        if (results.length >= count) break;
        const fill = await fetchBatch(fd, count - results.length, usedIds);
        results.push(...fill);
        fill.forEach(q => usedIds.push(Number(q.id)));
      }
    }

    // ── Phase 4: any difficulty, any topic (last resort) ──────────────────
    if (results.length < count) {
      const fill = await fetchBatch(null, count - results.length, usedIds);
      results.push(...fill);
    }

    // Shuffle so topic-1 is not always first
    for (let i = results.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [results[i], results[j]] = [results[j], results[i]];
    }

    return results.slice(0, count);
  }

  private predictNextDifficulty(currentDifficulty: string, performance?: any): string {
    if (!performance) return currentDifficulty;

    const accuracy = performance.accuracy || 0;
    
    if (currentDifficulty === 'easy' && accuracy > 0.8) return 'medium';
    if (currentDifficulty === 'medium' && accuracy > 0.85) return 'hard';
    if (currentDifficulty === 'hard' && accuracy < 0.5) return 'medium';
    if (currentDifficulty === 'medium' && accuracy < 0.4) return 'easy';
    
    return currentDifficulty;
  }

  private calculateNextDifficulty(
    currentDifficulty: string,
    accuracy: number,
    timeTaken: number
  ): string {
    const timeEfficiency = timeTaken < 300 ? 1 : 0.8; // Simplified time efficiency
    
    if (accuracy > 0.8 && timeEfficiency > 0.8) {
      return currentDifficulty === 'easy' ? 'medium' : 'hard';
    } else if (accuracy < 0.4 || timeEfficiency < 0.5) {
      return currentDifficulty === 'hard' ? 'medium' : 'easy';
    }
    
    return currentDifficulty;
  }
}
