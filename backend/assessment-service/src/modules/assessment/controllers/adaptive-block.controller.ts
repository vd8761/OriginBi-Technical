import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Body, 
  Param, 
  Query,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException
} from '@nestjs/common';
import { AdaptiveBlockService, BlockGenerationRequest, BlockResponse } from '../services/adaptive-block.service';
import { DataSource } from 'typeorm';

@Controller('assessment/adaptive')
export class AdaptiveBlockController {
  constructor(
    private readonly adaptiveBlockService: AdaptiveBlockService,
    private readonly dataSource: DataSource
  ) {}

  @Post('blocks/initialize/:assessmentId')
  async initializeBlocks(@Param('assessmentId') assessmentId: string) {
    try {
      const assessmentIdNum = parseInt(assessmentId);
      if (isNaN(assessmentIdNum)) {
        throw new BadRequestException('Invalid assessment ID');
      }

      await this.adaptiveBlockService.initializeAdaptiveBlocks(assessmentIdNum);
      
      return {
        success: true,
        message: 'Adaptive blocks initialized successfully',
        assessmentId: assessmentIdNum
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to initialize adaptive blocks');
    }
  }

  @Post('blocks/generate')
  async generateBlock(@Body() request: BlockGenerationRequest): Promise<BlockResponse> {
    try {
      // Validate request
      if (!request.assessmentId || !request.blockNumber || !request.userId) {
        throw new BadRequestException('Missing required fields: assessmentId, blockNumber, userId');
      }

      if (request.blockNumber < 1) {
        throw new BadRequestException('Block number must be greater than 0');
      }

      return await this.adaptiveBlockService.generateBlock(request);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to generate block');
    }
  }

  @Put('blocks/:attemptToken/:blockNumber/complete')
  async completeBlock(
    @Param('attemptToken') attemptToken: string,
    @Param('blockNumber') blockNumber: string,
    @Body() performance: { accuracy: number; timeTaken: number; answers: Record<string, string> }
  ) {
    try {
      const blockNumberNum = parseInt(blockNumber);
      if (isNaN(blockNumberNum)) {
        throw new BadRequestException('Invalid block number');
      }

      if (!performance.accuracy && performance.accuracy !== 0) {
        throw new BadRequestException('Accuracy is required');
      }

      if (!performance.timeTaken && performance.timeTaken !== 0) {
        throw new BadRequestException('Time taken is required');
      }

      return await this.adaptiveBlockService.completeBlock(
        attemptToken, 
        blockNumberNum, 
        performance
      );
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to complete block');
    }
  }

  @Get('blocks/:attemptToken/status')
  async getBlockStatus(@Param('attemptToken') attemptToken: string) {
    try {
      if (!attemptToken) {
        throw new BadRequestException('Attempt token is required');
      }

      const status = await this.adaptiveBlockService.getBlockStatus(attemptToken);
      
      return {
        success: true,
        attemptToken,
        blocks: status
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get block status');
    }
  }

  @Get('assessments/:assessmentId/overview')
  async getAssessmentOverview(@Param('assessmentId') assessmentId: string) {
    try {
      const assessmentIdNum = parseInt(assessmentId);
      if (isNaN(assessmentIdNum)) {
        throw new BadRequestException('Invalid assessment ID');
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const overview = await queryRunner.query(
        `SELECT * FROM adaptive_assessment_overview WHERE assessment_id = $1`,
        [assessmentIdNum]
      );

      await queryRunner.release();

      if (!overview.length) {
        throw new NotFoundException('Assessment overview not found');
      }

      return {
        success: true,
        assessmentId: assessmentIdNum,
        overview: overview[0]
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get assessment overview');
    }
  }

  @Get('paths/:assessmentId')
  async getAdaptivePaths(@Param('assessmentId') assessmentId: string) {
    try {
      const assessmentIdNum = parseInt(assessmentId);
      if (isNaN(assessmentIdNum)) {
        throw new BadRequestException('Invalid assessment ID');
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const paths = await queryRunner.query(
        `SELECT path_id, path_name, path_description, difficulty_progression, 
                category_specialization, time_adaptation_factor, is_active
         FROM adaptive_paths 
         WHERE assessment_id = $1 AND is_active = true
         ORDER BY path_name`,
        [assessmentIdNum]
      );

      await queryRunner.release();

      return {
        success: true,
        assessmentId: assessmentIdNum,
        paths
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get adaptive paths');
    }
  }

  @Get('question-pool/:assessmentId')
  async getQuestionPoolStatus(@Param('assessmentId') assessmentId: string) {
    try {
      const assessmentIdNum = parseInt(assessmentId);
      if (isNaN(assessmentIdNum)) {
        throw new BadRequestException('Invalid assessment ID');
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const poolStatus = await queryRunner.query(
        `SELECT category, difficulty, total_questions, available_questions, 
                usage_count, pool_efficiency, last_used
         FROM question_pool_metadata 
         WHERE assessment_id = $1
         ORDER BY category, difficulty`,
        [assessmentIdNum]
      );

      await queryRunner.release();

      return {
        success: true,
        assessmentId: assessmentIdNum,
        questionPool: poolStatus
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get question pool status');
    }
  }

  @Post('cache/clear/:assessmentId')
  async clearBlockCache(@Param('assessmentId') assessmentId: string) {
    try {
      const assessmentIdNum = parseInt(assessmentId);
      if (isNaN(assessmentIdNum)) {
        throw new BadRequestException('Invalid assessment ID');
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const result = await queryRunner.query(
        `DELETE FROM block_generation_cache WHERE assessment_id = $1`,
        [assessmentIdNum]
      );

      await queryRunner.release();

      return {
        success: true,
        assessmentId: assessmentIdNum,
        clearedCacheEntries: result.rowCount || 0
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to clear block cache');
    }
  }

  @Get('analytics/:assessmentId')
  async getPerformanceAnalytics(@Param('assessmentId') assessmentId: string) {
    try {
      const assessmentIdNum = parseInt(assessmentId);
      if (isNaN(assessmentIdNum)) {
        throw new BadRequestException('Invalid assessment ID');
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const analytics = await queryRunner.query(
        `SELECT 
           COUNT(*) as total_attempts,
           AVG(final_score) as average_score,
           AVG(completion_time_seconds) as average_completion_time,
           AVG(adaptation_success_score) as average_adaptation_success,
           COUNT(CASE WHEN final_score > 80 THEN 1 END) as high_performers,
           COUNT(CASE WHEN final_score < 40 THEN 1 END) as low_performers
         FROM adaptive_performance_analytics 
         WHERE assessment_id = $1`,
        [assessmentIdNum]
      );

      const difficultyProgression = await queryRunner.query(
        `SELECT 
           block_number,
           AVG(accuracy_score) as average_accuracy,
           MODE() WITHIN GROUP (ORDER BY difficulty_achieved) as most_common_difficulty
         FROM block_attempts ba
         JOIN adaptive_blocks ab ON ba.block_id = ab.block_id
         WHERE ab.assessment_id = $1 AND ba.status = 'completed'
         GROUP BY block_number
         ORDER BY block_number`,
        [assessmentIdNum]
      );

      await queryRunner.release();

      return {
        success: true,
        assessmentId: assessmentIdNum,
        summary: analytics[0],
        difficultyProgression
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get performance analytics');
    }
  }
}
