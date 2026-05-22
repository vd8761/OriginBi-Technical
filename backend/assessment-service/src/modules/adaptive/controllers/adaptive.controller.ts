import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdaptiveEngineService } from '../services/adaptive-engine.service';
import { AdaptiveBlockGeneratorService } from '../services/adaptive-block-generator.service';
import { AdaptiveSnapshotService } from '../services/adaptive-snapshot.service';
import { AdaptiveAnalyticsService } from '../services/adaptive-analytics.service';
import { AdaptiveBlueprintService } from '../services/adaptive-blueprint.service';
import {
  GenerateBlockDto,
  CompleteBlockDto,
  SaveBlockAnswersDto,
  FinalSubmitDto,
  StartAdaptiveAttemptDto,
} from '../dto/adaptive.dto';
import { Difficulty } from '../interfaces/adaptive.interfaces';

/**
 * AdaptiveController
 *
 * Route prefix: 'adaptive/v2'
 * With global 'api' prefix: /api/adaptive/v2/...
 *
 * Blueprint is FULLY AUTOMATIC — no manual setup endpoint.
 * It is built/refreshed from the question bank automatically.
 *
 * Endpoints:
 *   GET  /api/adaptive/v2/health
 *
 *   -- Assessment adaptive settings (replaces blueprint admin UI) --
 *   PUT  /api/adaptive/v2/settings/:assessmentId
 *   GET  /api/adaptive/v2/settings/:assessmentId
 *
 *   -- Blueprint (read-only + manual refresh) --
 *   GET  /api/adaptive/v2/blueprint/:assessmentId
 *   POST /api/adaptive/v2/blueprint/:assessmentId/refresh
 *
 *   -- Block flow --
 *   POST /api/adaptive/v2/block/generate
 *   POST /api/adaptive/v2/block/complete
 *   POST /api/adaptive/v2/block/save-answers
 *   GET  /api/adaptive/v2/block/:attemptToken/:blockNumber
 *   GET  /api/adaptive/v2/status/:attemptToken
 *
 *   -- Submission --
 *   POST /api/adaptive/v2/submit
 *   GET  /api/adaptive/v2/report/:attemptToken
 *
 *   -- Debug --
 *   GET  /api/adaptive/v2/snapshot/:attemptToken/:blockNumber
 */
@Controller('adaptive/v2')
export class AdaptiveController {
  private readonly logger = new Logger(AdaptiveController.name);

  constructor(
    private readonly engine: AdaptiveEngineService,
    private readonly generator: AdaptiveBlockGeneratorService,
    private readonly snapshot: AdaptiveSnapshotService,
    private readonly analytics: AdaptiveAnalyticsService,
    private readonly blueprint: AdaptiveBlueprintService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Health ────────────────────────────────────────────────────────────────

  @Get('health')
  async health() {
    try {
      const tables = await this.dataSource.query(`
        SELECT
          EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='adaptive_blueprint')           AS blueprint,
          EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='block_snapshots')              AS snapshots,
          EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='adaptive_blocks')              AS blocks,
          EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='block_attempts')               AS attempts,
          EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='adaptive_subcategory_coverage') AS coverage,
          EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='adaptive_performance_analytics') AS analytics,
          EXISTS(SELECT 1 FROM information_schema.columns
                 WHERE table_name='tech_assessments' AND column_name='adaptive_total_marks')              AS settings_cols
      `);
      const t = tables[0];
      const allReady = t.blueprint && t.snapshots && t.blocks && t.attempts && t.coverage && t.analytics && t.settings_cols;
      return {
        success: true,
        status: allReady ? 'healthy' : 'degraded',
        tables: t,
        message: allReady
          ? 'All adaptive v2 tables are ready. Blueprint is fully automatic.'
          : 'Run migration 003_adaptive_settings_and_auto_blueprint.sql to create missing tables/columns.',
      };
    } catch (e) {
      return { success: false, status: 'failed', error: String(e) };
    }
  }

  // ── Assessment Adaptive Settings ──────────────────────────────────────────

  /**
   * PUT /api/adaptive/v2/settings/:assessmentId
   *
   * Update adaptive settings for an assessment.
   * Changing these settings automatically invalidates and rebuilds the blueprint.
   *
   * Body: {
   *   adaptiveEnabled: boolean,
   *   adaptiveTotalMarks: number,      // default 100
   *   adaptiveTotalBlocks: number,     // default 4
   *   adaptiveSecondsPerMark: number,  // default 45
   * }
   */
  @Put('settings/:assessmentId')
  async updateAdaptiveSettings(
    @Param('assessmentId') assessmentId: string,
    @Body() body: {
      adaptiveEnabled?: boolean;
      adaptiveTotalMarks?: number;
      adaptiveTotalBlocks?: number;
      adaptiveSecondsPerMark?: number;
    },
  ) {
    const id = parseInt(assessmentId);
    if (isNaN(id)) throw new BadRequestException('Invalid assessment ID');

    const updates: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (body.adaptiveEnabled !== undefined) {
      updates.push(`adaptive_enabled = $${pIdx++}`);
      params.push(Boolean(body.adaptiveEnabled));
    }
    if (body.adaptiveTotalMarks !== undefined) {
      const marks = Number(body.adaptiveTotalMarks);
      if (marks <= 0) throw new BadRequestException('adaptiveTotalMarks must be > 0');
      updates.push(`adaptive_total_marks = $${pIdx++}`);
      params.push(marks);
    }
    if (body.adaptiveTotalBlocks !== undefined) {
      const blocks = Number(body.adaptiveTotalBlocks);
      if (blocks < 1 || blocks > 20) throw new BadRequestException('adaptiveTotalBlocks must be 1–20');
      updates.push(`adaptive_total_blocks = $${pIdx++}`);
      params.push(blocks);
    }
    if (body.adaptiveSecondsPerMark !== undefined) {
      const spm = Number(body.adaptiveSecondsPerMark);
      if (spm < 10 || spm > 300) throw new BadRequestException('adaptiveSecondsPerMark must be 10–300');
      updates.push(`adaptive_seconds_per_mark = $${pIdx++}`);
      params.push(spm);
    }

    if (!updates.length) throw new BadRequestException('No settings provided to update');

    updates.push('updated_at = NOW()');
    params.push(id);

    await this.dataSource.query(
      `UPDATE tech_assessments SET ${updates.join(', ')} WHERE assessment_id = $${pIdx}`,
      params,
    );

    // If adaptive is being enabled or settings changed, rebuild blueprint immediately
    const shouldRebuild = body.adaptiveEnabled === true ||
      body.adaptiveTotalMarks !== undefined ||
      body.adaptiveTotalBlocks !== undefined ||
      body.adaptiveSecondsPerMark !== undefined;

    let newBlueprint = null;
    if (shouldRebuild) {
      try {
        newBlueprint = await this.blueprint.refreshBlueprint(id);
      } catch (e: any) {
        // Blueprint rebuild may fail if no questions yet — that's OK
        this.logger.warn(`Blueprint rebuild after settings update: ${e.message}`);
      }
    }

    const rows = await this.dataSource.query(
      `SELECT assessment_id, adaptive_enabled, adaptive_total_marks,
              adaptive_total_blocks, adaptive_seconds_per_mark
       FROM tech_assessments WHERE assessment_id=$1`,
      [id],
    );

    return {
      success: true,
      settings: rows[0],
      blueprint: newBlueprint,
      message: newBlueprint
        ? 'Settings updated and blueprint rebuilt from question bank.'
        : 'Settings updated. Blueprint will be built automatically when questions are available.',
    };
  }

  /**
   * GET /api/adaptive/v2/settings/:assessmentId
   * Returns current adaptive settings for an assessment.
   */
  @Get('settings/:assessmentId')
  async getAdaptiveSettings(@Param('assessmentId') assessmentId: string) {
    const id = parseInt(assessmentId);
    if (isNaN(id)) throw new BadRequestException('Invalid assessment ID');

    const rows = await this.dataSource.query(
      `SELECT assessment_id, assessment_name, module_type,
              adaptive_enabled, adaptive_total_marks,
              adaptive_total_blocks, adaptive_seconds_per_mark
       FROM tech_assessments WHERE assessment_id=$1`,
      [id],
    );
    if (!rows.length) throw new NotFoundException(`Assessment ${id} not found`);

    const categoriesInfo = await this.blueprint.getCategoriesForAssessment(id).catch(() => null);

    // Auto-build blueprint on first settings page load when adaptive is enabled
    // and questions are available — so the UI shows the blueprint immediately.
    let existingBlueprint = await this.blueprint.getBlueprint(id);
    if (!existingBlueprint && rows[0].adaptive_enabled && (categoriesInfo?.totalActiveQuestions ?? 0) > 0) {
      existingBlueprint = await this.blueprint.ensureBlueprint(id).catch(() => null);
    }

    return {
      success: true,
      settings: rows[0],
      questionBank: categoriesInfo,
      blueprint: existingBlueprint
        ? {
            exists: true,
            totalMarks: existingBlueprint.totalMarks,
            totalBlocks: existingBlueprint.totalBlocks,
            categories: Object.keys(existingBlueprint.categoryBlueprint),
            categoryBlueprint: existingBlueprint.categoryBlueprint,
            subcategoryBlueprint: existingBlueprint.subcategoryBlueprint,
          }
        : { exists: false },
    };
  }

  // ── Blueprint (read-only + manual refresh) ────────────────────────────────

  /**
   * GET /api/adaptive/v2/blueprint/:assessmentId
   * Returns the current auto-computed blueprint.
   */
  @Get('blueprint/:assessmentId')
  async getBlueprint(@Param('assessmentId') assessmentId: string) {
    const id = parseInt(assessmentId);
    if (isNaN(id)) throw new BadRequestException('Invalid assessment ID');
    const config = await this.blueprint.getBlueprint(id);
    if (!config) {
      throw new NotFoundException(
        `No blueprint found for assessment ${id}. ` +
        `Enable adaptive mode and add questions — blueprint is built automatically.`,
      );
    }
    return { success: true, blueprint: config };
  }

  /**
   * POST /api/adaptive/v2/blueprint/:assessmentId/refresh
   * Manually trigger a blueprint rebuild from the current question bank.
   * Useful after bulk-importing questions.
   */
  @Post('blueprint/:assessmentId/refresh')
  async refreshBlueprint(@Param('assessmentId') assessmentId: string) {
    const id = parseInt(assessmentId);
    if (isNaN(id)) throw new BadRequestException('Invalid assessment ID');

    const config = await this.blueprint.refreshBlueprint(id);
    if (!config) {
      throw new BadRequestException(
        `Assessment ${id} does not have adaptive mode enabled, or has no active questions.`,
      );
    }
    return {
      success: true,
      blueprint: config,
      message: 'Blueprint rebuilt from question bank.',
    };
  }

  // ── Block generation ──────────────────────────────────────────────────────

  /**
   * POST /api/adaptive/v2/block/generate
   *
   * Generate the next block for a candidate.
   * Block 1 always starts at 'easy'.
   * Subsequent blocks use the difficulty decided by the previous block snapshot.
   * Blueprint is auto-built from the question bank if not yet created.
   */
  @Post('block/generate')
  async generateBlock(@Body() dto: GenerateBlockDto) {
    if (!dto.assessmentId || !dto.blockNumber || !dto.userId || !dto.attemptToken) {
      throw new BadRequestException('assessmentId, blockNumber, userId, and attemptToken are required');
    }

    // Determine target difficulty
    let targetDifficulty: Difficulty = 'easy';
    if (dto.blockNumber > 1) {
      const prevSnap = await this.dataSource.query(
        `SELECT next_block_difficulty FROM block_snapshots
         WHERE attempt_token=$1 AND block_number=$2`,
        [dto.attemptToken, dto.blockNumber - 1],
      );
      if (prevSnap.length) {
        targetDifficulty = prevSnap[0].next_block_difficulty as Difficulty;
      } else {
        const prevAttempt = await this.dataSource.query(
          `SELECT next_block_difficulty FROM block_attempts
           WHERE attempt_token=$1 AND block_number=$2`,
          [dto.attemptToken, dto.blockNumber - 1],
        );
        if (prevAttempt.length) {
          targetDifficulty = prevAttempt[0].next_block_difficulty as Difficulty;
        }
      }
    }

    let block;
    try {
      block = await this.generator.generateBlock({
        assessmentId: dto.assessmentId,
        blockNumber: dto.blockNumber,
        userId: dto.userId,
        mode: dto.mode ?? 'main',
        attemptToken: dto.attemptToken,
        targetDifficulty,
      });
    } catch (e: any) {
      this.logger.error(
        `generateBlock failed: assessment=${dto.assessmentId} block=${dto.blockNumber} user=${dto.userId} token=${dto.attemptToken} err=${e.message}`,
        e.stack,
      );
      if (e.status) throw e; // Re-throw NestJS HTTP exceptions as-is
      throw new BadRequestException(
        `Failed to generate block ${dto.blockNumber} for assessment ${dto.assessmentId}. ` +
        `Ensure the assessment has active questions and the blueprint is ready. Detail: ${e.message}`,
      );
    }

    return { success: true, block };
  }

  // ── Complete block (write snapshot) ──────────────────────────────────────

  /**
   * POST /api/adaptive/v2/block/complete
   * Called when candidate clicks "Next Block" for the first time.
   * Writes the immutable snapshot. Adaptive decision is locked here.
   * If snapshot already exists (idempotent), returns existing decision.
   */
  @Post('block/complete')
  async completeBlock(@Body() dto: CompleteBlockDto) {
    if (!dto.attemptToken || !dto.blockNumber) {
      throw new BadRequestException('attemptToken and blockNumber are required');
    }

    // Load secondsPerMark from blueprint via attempt token
    const bpRows = await this.dataSource.query(
      `SELECT bp.seconds_per_mark
       FROM adaptive_blueprint bp
       WHERE bp.assessment_id = (
         SELECT assessment_id FROM block_attempts
         WHERE attempt_token=$1
         LIMIT 1
       )`,
      [dto.attemptToken],
    );
    const secondsPerMark = Number(bpRows[0]?.seconds_per_mark ?? 45);

    let result;
    try {
      result = await this.snapshot.writeSnapshot(
        dto.attemptToken,
        dto.blockNumber,
        dto.answers ?? {},
        dto.questionTiming ?? {},
        secondsPerMark,
      );
    } catch (e: any) {
      this.logger.error(
        `writeSnapshot failed: token=${dto.attemptToken} block=${dto.blockNumber} err=${e.message}`,
        e.stack,
      );
      if (e.status) throw e;
      throw new BadRequestException(
        `Failed to complete block ${dto.blockNumber}. Detail: ${e.message}`,
      );
    }

    return {
      success: true,
      alreadySnapshotted: result.alreadyExists,
      nextBlockDifficulty: result.nextBlockDifficulty,
      blockMetrics: result.metrics,
    };
  }

  // ── Save answers (post-snapshot edit) ────────────────────────────────────

  /**
   * POST /api/adaptive/v2/block/save-answers
   * Called when candidate navigates back to a completed block and changes answers.
   * Does NOT change the snapshot or adaptive decision.
   * Final marks use these updated answers.
   */
  @Post('block/save-answers')
  async saveBlockAnswers(@Body() dto: SaveBlockAnswersDto) {
    if (!dto.attemptToken || !dto.blockNumber) {
      throw new BadRequestException('attemptToken and blockNumber are required');
    }
    const result = await this.snapshot.saveUpdatedAnswers(
      dto.attemptToken,
      dto.blockNumber,
      dto.answers ?? {},
      dto.questionTiming,
    );
    return { success: true, saved: result.saved };
  }

  // ── Get block questions ───────────────────────────────────────────────────

  /**
   * GET /api/adaptive/v2/block/:attemptToken/:blockNumber
   * Returns questions for a block with current saved answers (for back-navigation).
   */
  @Get('block/:attemptToken/:blockNumber')
  async getBlockQuestions(
    @Param('attemptToken') attemptToken: string,
    @Param('blockNumber') blockNumber: string,
  ) {
    const bn = parseInt(blockNumber);
    if (isNaN(bn)) throw new BadRequestException('Invalid block number');

    let rawQuestions: any[];
    try {
      rawQuestions = await this.snapshot.loadBlockQuestions(attemptToken, bn);
    } catch (e: any) {
      this.logger.error(`loadBlockQuestions failed: ${e.message}`, e.stack);
      if (e.status === 404 || e instanceof NotFoundException) throw e;
      if (e.status === 400 || e instanceof BadRequestException) throw e;
      throw new NotFoundException(
        `Block data could not be loaded for attempt ${attemptToken}, block ${bn}. ` +
        `Ensure the attempt exists and all required migrations have been run. Detail: ${e.message}`,
      );
    }

    const baRows = await this.dataSource.query(
      `SELECT difficulty_achieved, status, snapshot_taken,
              marks_score, block_readiness_score, next_block_difficulty
       FROM block_attempts WHERE attempt_token=$1 AND block_number=$2`,
      [attemptToken, bn],
    );
    if (!baRows.length) throw new NotFoundException(`Block ${bn} not found for attempt ${attemptToken}`);

    // Map to the AdaptiveQuestion shape the frontend expects
    const questions = rawQuestions.map(q => ({
      id: q.id ?? q.questionId,
      text: q.text ?? '',
      options: q.options ?? [],
      difficulty: q.difficulty,
      category: q.category,
      subcategory: q.subcategory,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      kind: q.kind,
      imageUrl: q.imageUrl,
      expectedTimeSecs: q.expectedTimeSecs,
      audioUrl: q.audioUrl,
      passageText: q.passageText,
      taskType: q.taskType,
      rubricJson: q.rubricJson,
      // Restore saved answer so the frontend can pre-fill selections
      selectedOptionId: q.selectedOptionId ?? null,
    }));

    // Assessment-wide question-count info so the frontend can render
    // continuous numbering ("Question N of TOTAL") when resuming.
    const asmRows = await this.dataSource.query(
      `SELECT a.adaptive_total_questions, a.adaptive_total_blocks
       FROM tech_assessments a
       JOIN block_attempts ba ON ba.assessment_id = a.assessment_id
       WHERE ba.attempt_token = $1
       LIMIT 1`,
      [attemptToken],
    );
    const totalBlocks = Math.max(1, Number(asmRows[0]?.adaptive_total_blocks ?? 1));
    const totalQuestions = Math.max(
      questions.length,
      Math.round(Number(asmRows[0]?.adaptive_total_questions ?? 0)),
    );
    const questionsPerBlock = Math.max(1, Math.round(totalQuestions / totalBlocks));

    return {
      success: true,
      blockNumber: bn,
      difficulty: baRows[0].difficulty_achieved,
      status: baRows[0].status,
      snapshotTaken: baRows[0].snapshot_taken ?? false,
      marksScore: baRows[0].marks_score,
      blockReadinessScore: baRows[0].block_readiness_score,
      nextBlockDifficulty: baRows[0].next_block_difficulty,
      totalBlocks,
      totalQuestions,
      questionsPerBlock,
      questions,
    };
  }

  // ── Block status ──────────────────────────────────────────────────────────

  /**
   * GET /api/adaptive/v2/status/:attemptToken
   * Returns status of all blocks for an attempt.
   */
  @Get('status/:attemptToken')
  async getStatus(@Param('attemptToken') attemptToken: string) {
    const blocks = await this.blueprint.getBlockStatus(attemptToken);
    const path = await this.dataSource.query(
      `SELECT difficulty_path, accuracy_path, current_block
       FROM adaptive_paths WHERE attempt_token=$1`,
      [attemptToken],
    );
    return {
      success: true,
      attemptToken,
      blocks,
      adaptivePath: path[0]?.difficulty_path ?? [],
      currentBlock: path[0]?.current_block ?? 1,
    };
  }

  // ── Final submit ──────────────────────────────────────────────────────────

  /**
   * POST /api/adaptive/v2/submit
   * Finalizes the assessment. Computes final report using latest answers.
   * Adaptive path uses block snapshots. Reliability compares snapshot vs latest.
   */
  @Post('submit')
  async finalSubmit(@Body() dto: FinalSubmitDto) {
    try {
      if (!dto.attemptToken || !dto.assessmentId || !dto.userId) {
        throw new BadRequestException('attemptToken, assessmentId, and userId are required');
      }

      const report = await this.analytics.computeAndPersistFinalReport(
        dto.attemptToken,
        dto.assessmentId,
        dto.userId,
      );

      return { success: true, report };
    } catch (e: any) {
      return { success: false, error: e.message, stack: e.stack };
    }
  }

  // ── Get report ────────────────────────────────────────────────────────────

  /**
   * GET /api/adaptive/v2/report/:attemptToken
   * Returns the final adaptive report for a completed attempt.
   */
  @Get('report/:attemptToken')
  async getReport(@Param('attemptToken') attemptToken: string) {
    const report = await this.analytics.getReport(attemptToken);
    if (!report) {
      throw new NotFoundException(
        `No report found for attempt ${attemptToken}. Submit the assessment first.`,
      );
    }
    return { success: true, report };
  }

  // ── Snapshot (debug / admin) ──────────────────────────────────────────────

  /**
   * GET /api/adaptive/v2/snapshot/:attemptToken/:blockNumber
   * Returns the immutable snapshot for a block (admin/debug use).
   */
  @Get('snapshot/:attemptToken/:blockNumber')
  async getSnapshot(
    @Param('attemptToken') attemptToken: string,
    @Param('blockNumber') blockNumber: string,
  ) {
    const bn = parseInt(blockNumber);
    if (isNaN(bn)) throw new BadRequestException('Invalid block number');
    const snap = await this.snapshot.readSnapshot(attemptToken, bn);
    if (!snap) throw new NotFoundException(`No snapshot found for block ${bn}`);
    return { success: true, blockNumber: bn, snapshot: snap };
  }
}
