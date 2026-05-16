import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AdaptiveBlockService } from '../services/adaptive-block.service';
import { AdaptiveFallbackService } from '../services/adaptive-fallback.service';
import { DataSource } from 'typeorm';

/**
 * Controller prefix: 'assessment/adaptive'
 * With the global 'api' prefix this resolves to /api/assessment/adaptive/...
 */
@Controller('assessment/adaptive')
export class AdaptiveBlockController {
  constructor(
    private readonly adaptiveBlockService: AdaptiveBlockService,
    private readonly fallbackService: AdaptiveFallbackService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Block status ──────────────────────────────────────────────────────────

  @Get('blocks/:attemptToken/status')
  async getBlockStatus(@Param('attemptToken') attemptToken: string) {
    if (!attemptToken) throw new BadRequestException('Attempt token is required');
    const blocks = await this.adaptiveBlockService.getBlockStatus(attemptToken);
    return { success: true, attemptToken, blocks };
  }

  // ── System health ─────────────────────────────────────────────────────────

  @Get('health')
  async getSystemHealth() {
    return this.fallbackService.getSystemHealth();
  }

  // ── Assessment overview ───────────────────────────────────────────────────

  @Get('assessments/:assessmentId/overview')
  async getAssessmentOverview(@Param('assessmentId') assessmentId: string) {
    const id = parseInt(assessmentId);
    if (isNaN(id)) throw new BadRequestException('Invalid assessment ID');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const rows = await queryRunner.query(
        `SELECT a.assessment_id, a.assessment_code, a.assessment_name,
                a.module_type, a.block_config, a.status,
                COUNT(ab.block_id) AS total_blocks,
                COUNT(CASE WHEN ab.status = 'generated' THEN 1 END) AS generated_blocks
         FROM tech_assessments a
         LEFT JOIN adaptive_blocks ab ON a.assessment_id = ab.assessment_id
         WHERE a.assessment_id = $1
         GROUP BY a.assessment_id`,
        [id],
      );
      if (!rows.length) throw new NotFoundException('Assessment not found');
      return { success: true, assessmentId: id, overview: rows[0] };
    } finally {
      await queryRunner.release();
    }
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  @Get('analytics/:assessmentId')
  async getPerformanceAnalytics(@Param('assessmentId') assessmentId: string) {
    const id = parseInt(assessmentId);
    if (isNaN(id)) throw new BadRequestException('Invalid assessment ID');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const difficultyProgression = await queryRunner.query(
        `SELECT ba.block_number,
                AVG(ba.accuracy_score)    AS average_accuracy,
                ba.difficulty_achieved    AS most_common_difficulty
         FROM block_attempts ba
         JOIN adaptive_blocks ab ON ba.block_id = ab.block_id
         WHERE ab.assessment_id = $1 AND ba.status = 'completed'
         GROUP BY ba.block_number, ba.difficulty_achieved
         ORDER BY ba.block_number`,
        [id],
      );
      return { success: true, assessmentId: id, difficultyProgression };
    } finally {
      await queryRunner.release();
    }
  }
}
