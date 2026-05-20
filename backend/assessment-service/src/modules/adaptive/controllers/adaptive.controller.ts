import {
  Controller,
  Get,
  Post,
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
  SetupBlueprintDto,
  GenerateBlockDto,
  CompleteBlockDto,
  SaveBlockAnswersDto,
  FinalSubmitDto,
} from '../dto/adaptive.dto';
import { Difficulty } from '../interfaces/adaptive.interfaces';

/**
 * AdaptiveController
 *
 * Route prefix: 'adaptive/v2'
 * With global 'api' prefix: /api/adaptive/v2/...
 *
 * Endpoints:
 *   POST /api/adaptive/v2/blueprint/setup
 *   GET  /api/adaptive/v2/blueprint/:assessmentId
 *   POST /api/adaptive/v2/block/generate
 *   POST /api/adaptive/v2/block/complete
 *   POST /api/adaptive/v2/block/save-answers
 *   GET  /api/adaptive/v2/block/:attemptToken/:blockNumber
 *   GET  /api/adaptive/v2/status/:attemptToken
 *   POST /api/adaptive/v2/submit
 *   GET  /api/adaptive/v2/report/:attemptToken
 *   GET  /api/adaptive/v2/health
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
          EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='adaptive_blueprint')    AS blueprint,
          EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='block_snapshots')       AS snapshots,
          EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='adaptive_blocks')       AS blocks,
          EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='block_attempts')        AS attempts,
          EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='adaptive_subcategory_coverage') AS coverage
      `);
      const t = tables[0];
      const allReady = t.blueprint && t.snapshots && t.blocks && t.attempts && t.coverage;
      return {
        success: true,
        status: allReady ? 'healthy' : 'degraded',
        tables: t,
        message: allReady
          ? 'All adaptive v2 tables are ready'
          : 'Run migration 003_adaptive_engine_v2.sql to create missing tables',
      };
    } catch (e) {
      return { success: false, status: 'failed', error: String(e) };
    }
  }

  // ── Blueprint ─────────────────────────────────────────────────────────────

  /**
   * POST /api/adaptive/v2/blueprint/setup
   * Admin sets up the marks blueprint for an assessment.
   */
  @Post('blueprint/setup')
  async setupBlueprint(@Body() dto: SetupBlueprintDto) {
    if (!dto.assessmentId || !dto.totalMarks || !dto.totalBlocks) {
      throw new BadRequestException('assessmentId, totalMarks, and totalBlocks are required');
    }
    const config = await this.blueprint.setupBlueprint(dto);
    return { success: true, blueprint: config };
  }

  /**
   * GET /api/adaptive/v2/blueprint/:assessmentId
   */
  @Get('blueprint/:assessmentId')
  async getBlueprint(@Param('assessmentId') assessmentId: string) {
    const id = parseInt(assessmentId);
    if (isNaN(id)) throw new BadRequestException('Invalid assessment ID');
    const config = await this.blueprint.getBlueprint(id);
    if (!config) throw new NotFoundException(`No blueprint found for assessment ${id}`);
    return { success: true, blueprint: config };
  }

  // ── Block generation ──────────────────────────────────────────────────────

  /**
   * POST /api/adaptive/v2/block/generate
   * Generate the next block for a candidate.
   * Block 1 always uses 'easy' difficulty.
   * Subsequent blocks use the difficulty decided by the previous block's snapshot.
   */
  @Post('block/generate')
  async generateBlock(@Body() dto: GenerateBlockDto) {
    if (!dto.assessmentId || !dto.blockNumber || !dto.userId || !dto.attemptToken) {
      throw new BadRequestException('assessmentId, blockNumber, userId, and attemptToken are required');
    }

    // Determine target difficulty
    let targetDifficulty: Difficulty = 'easy';
    if (dto.blockNumber > 1) {
      // Read from previous block's snapshot
      const prevSnap = await this.dataSource.query(
        `SELECT next_block_difficulty FROM block_snapshots
         WHERE attempt_token=$1 AND block_number=$2`,
        [dto.attemptToken, dto.blockNumber - 1],
      );
      if (prevSnap.length) {
        targetDifficulty = prevSnap[0].next_block_difficulty as Difficulty;
      } else {
        // Fallback: read from block_attempts
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

    const block = await this.generator.generateBlock({
      assessmentId: dto.assessmentId,
      blockNumber: dto.blockNumber,
      userId: dto.userId,
      mode: dto.mode ?? 'main',
      attemptToken: dto.attemptToken,
      targetDifficulty,
    });

    return { success: true, block };
  }

  // ── Complete block (write snapshot) ──────────────────────────────────────

  /**
   * POST /api/adaptive/v2/block/complete
   * Called when candidate clicks "Next Block" for the first time.
   * Writes the immutable snapshot. Adaptive decision is made here.
   * If snapshot already exists (user clicked Next Block again), returns existing decision.
   */
  @Post('block/complete')
  async completeBlock(@Body() dto: CompleteBlockDto) {
    if (!dto.attemptToken || !dto.blockNumber) {
      throw new BadRequestException('attemptToken and blockNumber are required');
    }

    // Load blueprint for secondsPerMark
    const bpRows = await this.dataSource.query(
      `SELECT ab.seconds_per_mark
       FROM adaptive_blueprint ab
       JOIN block_attempts ba ON ba.attempt_token=$1
       JOIN adaptive_blocks abl ON abl.block_id=ba.block_id AND ba.block_number=$2
       WHERE abl.assessment_id=ab.assessment_id
       LIMIT 1`,
      [dto.attemptToken, dto.blockNumber],
    );
    const secondsPerMark = Number(bpRows[0]?.seconds_per_mark ?? 45);

    const result = await this.snapshot.writeSnapshot(
      dto.attemptToken,
      dto.blockNumber,
      dto.answers ?? {},
      dto.questionTiming ?? {},
      secondsPerMark,
    );

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
   * Final marks will use these updated answers.
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
   * Returns questions for a block with current saved answers (for navigation back).
   */
  @Get('block/:attemptToken/:blockNumber')
  async getBlockQuestions(
    @Param('attemptToken') attemptToken: string,
    @Param('blockNumber') blockNumber: string,
  ) {
    const bn = parseInt(blockNumber);
    if (isNaN(bn)) throw new BadRequestException('Invalid block number');

    const questions = await this.snapshot.loadBlockQuestions(attemptToken, bn);
    const baRows = await this.dataSource.query(
      `SELECT difficulty_achieved, status, snapshot_taken,
              marks_score, block_readiness_score, next_block_difficulty
       FROM block_attempts WHERE attempt_token=$1 AND block_number=$2`,
      [attemptToken, bn],
    );
    if (!baRows.length) throw new NotFoundException(`Block ${bn} not found`);

    return {
      success: true,
      blockNumber: bn,
      difficulty: baRows[0].difficulty_achieved,
      status: baRows[0].status,
      snapshotTaken: baRows[0].snapshot_taken ?? false,
      marksScore: baRows[0].marks_score,
      blockReadinessScore: baRows[0].block_readiness_score,
      nextBlockDifficulty: baRows[0].next_block_difficulty,
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
    if (!dto.attemptToken || !dto.assessmentId || !dto.userId) {
      throw new BadRequestException('attemptToken, assessmentId, and userId are required');
    }

    const report = await this.analytics.computeAndPersistFinalReport(
      dto.attemptToken,
      dto.assessmentId,
      dto.userId,
    );

    return { success: true, report };
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

  // ── Snapshot (for debugging / admin) ─────────────────────────────────────

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
