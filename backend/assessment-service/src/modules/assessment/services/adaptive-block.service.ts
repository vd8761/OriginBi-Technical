import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException, Inject, forwardRef } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { AdaptiveFallbackService } from './adaptive-fallback.service';

export interface BlockConfig {
  enabled: boolean;
  blocksPerAssessment: number;
  questionsPerBlock: number;
}

export interface AdaptiveConfig {
  enabled: boolean;
  difficultyProgression: 'static' | 'linear' | 'exponential';
  adaptationStrategy: 'performance_based' | 'time_based' | 'hybrid';
}

export interface BlockGenerationRequest {
  assessmentId: number;
  blockNumber: number;
  previousPerformance?: {
    accuracy: number;
    timeTaken: number;
    difficultyAchieved: string;
  };
  userId: number;
  mode: 'trial' | 'main';
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
  isAdaptive: boolean;
  nextBlockDifficulty?: string;
}

@Injectable()
export class AdaptiveBlockService {
  private readonly logger = new Logger(AdaptiveBlockService.name);

  constructor(
    private dataSource: DataSource,
    @Inject(forwardRef(() => AdaptiveFallbackService))
    private fallbackService: AdaptiveFallbackService
  ) {}

  async initializeAdaptiveBlocks(assessmentId: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get assessment configuration
      const assessment = await queryRunner.query(
        `SELECT block_config, adaptive_config FROM tech_assessments WHERE assessment_id = $1`,
        [assessmentId]
      );

      if (!assessment.length) {
        throw new NotFoundException('Assessment not found');
      }

      const blockConfig = assessment[0].block_config as BlockConfig;
      const adaptiveConfig = assessment[0].adaptive_config as AdaptiveConfig;
      if (!blockConfig.enabled) {
        return; // Not an adaptive assessment
      }

      // Clear existing blocks
      await queryRunner.query(
        'DELETE FROM adaptive_blocks WHERE assessment_id = $1',
        [assessmentId]
      );

      // Create blocks
      for (let i = 1; i <= blockConfig.blocksPerAssessment; i++) {
        const difficultyDistribution = this.calculateInitialDifficulty(i, blockConfig.blocksPerAssessment);
        
        await queryRunner.query(
          `INSERT INTO adaptive_blocks 
           (assessment_id, block_number, difficulty_distribution, is_adaptive, status)
           VALUES ($1, $2, $3, $4, 'pending')`,
          [
            assessmentId,
            i,
            JSON.stringify(difficultyDistribution),
            adaptiveConfig?.enabled || false
          ]
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('initializeAdaptiveBlocks error:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async generateBlock(request: BlockGenerationRequest): Promise<BlockResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate adaptive prerequisites first
      const validation = await this.fallbackService.validateAdaptivePrerequisites(request.assessmentId);
      if (!validation.canProceed) {
        this.logger.warn(`Adaptive prerequisites failed: ${validation.issues.join(', ')}`);
        throw new Error(`Adaptive system not ready: ${validation.issues.join(', ')}`);
      }

      // Get assessment and block configuration
      const assessment = await queryRunner.query(
        `SELECT a.*, ab.block_id, ab.difficulty_distribution, ab.is_adaptive
         FROM tech_assessments a
         JOIN adaptive_blocks ab ON a.assessment_id = ab.assessment_id
         WHERE a.assessment_id = $1 AND ab.block_number = $2`,
        [request.assessmentId, request.blockNumber]
      );

      if (!assessment.length) {
        throw new NotFoundException('Block configuration not found');
      }

      const assessmentData = assessment[0];
      const blockConfig = assessmentData.block_config as BlockConfig;
      const adaptiveConfig = assessmentData.adaptive_config as AdaptiveConfig;
      const difficultyDistribution = assessmentData.difficulty_distribution;

      // Calculate difficulty for this block
      const targetDifficulty = this.calculateTargetDifficulty(
        request.blockNumber,
        difficultyDistribution,
        request.previousPerformance,
        adaptiveConfig
      );

      // Get questions for this block
      const questions = await this.fetchQuestionsForBlock(
        queryRunner,
        request.assessmentId,
        targetDifficulty,
        request.mode === 'trial' ? 5 : blockConfig.questionsPerBlock,
        request.mode,
        request.previousPerformance
      );

      if (questions.length === 0) {
        throw new BadRequestException(`No questions available for difficulty: ${targetDifficulty}`);
      }

      // Update block status
      await queryRunner.query(
        `UPDATE adaptive_blocks 
         SET status = 'generated', generated_questions = $1, updated_at = NOW()
         WHERE block_id = $2`,
        [JSON.stringify(questions), assessmentData.block_id]
      );

      // Create block attempt record
      await queryRunner.query(
        `INSERT INTO block_attempts 
         (attempt_token, block_id, user_id, block_number, status, started_at, difficulty_achieved)
         VALUES ($1, $2, $3, $4, 'in_progress', NOW(), $5)
         ON CONFLICT (attempt_token, block_number) 
         DO UPDATE SET status = 'in_progress', started_at = NOW()`,
        [
          `${request.assessmentId}-${request.userId}-${Date.now()}`,
          assessmentData.block_id,
          request.userId,
          request.blockNumber,
          targetDifficulty
        ]
      );

      await queryRunner.commitTransaction();

      // Calculate next block difficulty
      const nextBlockDifficulty = adaptiveConfig.enabled 
        ? this.predictNextDifficulty(targetDifficulty, request.previousPerformance)
        : undefined;

      return {
        blockId: assessmentData.block_id,
        blockNumber: request.blockNumber,
        questions,
        difficulty: targetDifficulty,
        timeLimit: blockConfig.questionsPerBlock * 2, // 2 minutes per question
        isAdaptive: adaptiveConfig.enabled,
        nextBlockDifficulty
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('generateBlock error:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async completeBlock(
    attemptToken: string, 
    blockNumber: number, 
    performance: { accuracy: number; timeTaken: number; answers: Record<string, string> }
  ): Promise<{ nextBlockDifficulty: string; canProceed: boolean }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update block attempt
      const result = await queryRunner.query(
        `UPDATE block_attempts 
         SET status = 'completed', completed_at = NOW(), 
             time_taken_seconds = $1, accuracy_score = $2, performance_metrics = $3
         WHERE attempt_token = $4 AND block_number = $5
         RETURNING block_id, difficulty_achieved`,
        [performance.timeTaken, performance.accuracy, JSON.stringify(performance), attemptToken, blockNumber]
      );

      if (!result.length) {
        throw new NotFoundException('Block attempt not found');
      }

      const blockAttempt = result[0];
      
      // Get next block configuration
      const nextBlock = await queryRunner.query(
        `SELECT ab.* FROM adaptive_blocks ab
         JOIN block_attempts ba ON ab.block_id = ba.block_id
         WHERE ba.attempt_token = $1 AND ab.block_number = $2`,
        [attemptToken, blockNumber + 1]
      );

      let nextBlockDifficulty = 'medium';
      let canProceed = true;

      if (nextBlock.length && nextBlock[0].is_adaptive) {
        nextBlockDifficulty = this.calculateNextDifficulty(
          blockAttempt.difficulty_achieved,
          performance.accuracy,
          performance.timeTaken
        );

        // Check if we have enough questions for the next difficulty
        const questionCount = await queryRunner.query(
          `SELECT COUNT(*) as count FROM tech_aptitude_questions 
           WHERE assessment_id = (SELECT assessment_id FROM adaptive_blocks WHERE block_id = $1)
           AND difficulty = $2 AND status = 'active'`,
          [nextBlock[0].block_id, nextBlockDifficulty]
        );

        if (parseInt(questionCount[0].count) < 5) {
          nextBlockDifficulty = 'medium'; // Fallback
          this.logger.warn(`Insufficient questions for ${nextBlockDifficulty}, falling back to medium`);
        }
      }

      // Lock previous blocks
      await queryRunner.query(
        `UPDATE block_attempts 
         SET status = 'locked' 
         WHERE attempt_token = $1 AND block_number < $2`,
        [attemptToken, blockNumber]
      );

      await queryRunner.commitTransaction();

      return {
        nextBlockDifficulty,
        canProceed: nextBlock.length > 0
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('completeBlock error:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getBlockStatus(attemptToken: string): Promise<any> {
    const result = await this.dataSource.query(
      `SELECT ba.*, ab.is_adaptive, ab.difficulty_distribution
       FROM block_attempts ba
       JOIN adaptive_blocks ab ON ba.block_id = ab.block_id
       WHERE ba.attempt_token = $1
       ORDER BY ba.block_number`,
      [attemptToken]
    );

    return result.map((block: any) => ({
      blockNumber: block.block_number,
      status: block.status,
      difficulty: block.difficulty_achieved,
      accuracy: block.accuracy_score,
      timeTaken: block.time_taken_seconds,
      isAdaptive: block.is_adaptive,
      nextBlockDifficulty: block.next_block_difficulty
    }));
  }

  private calculateInitialDifficulty(blockNumber: number, totalBlocks: number): any {
    const progress = blockNumber / totalBlocks;
    
    if (progress <= 0.25) {
      return { easy: 70, medium: 25, hard: 5 };
    } else if (progress <= 0.5) {
      return { easy: 40, medium: 45, hard: 15 };
    } else if (progress <= 0.75) {
      return { easy: 20, medium: 50, hard: 30 };
    } else {
      return { easy: 10, medium: 40, hard: 50 };
    }
  }

  private calculateTargetDifficulty(
    blockNumber: number,
    difficultyDistribution: any,
    previousPerformance?: any,
    adaptiveConfig?: AdaptiveConfig
  ): string {
    if (!adaptiveConfig?.enabled || !previousPerformance) {
      // Static difficulty based on distribution
      const maxWeight = Math.max(
        difficultyDistribution.easy || 0,
        difficultyDistribution.medium || 0,
        difficultyDistribution.hard || 0
      );
      
      if (difficultyDistribution.hard === maxWeight) return 'hard';
      if (difficultyDistribution.medium === maxWeight) return 'medium';
      return 'easy';
    }

    const accuracy = previousPerformance.accuracy || 0;
    const timeEfficiency = this.calculateTimeEfficiency(previousPerformance.timeTaken, previousPerformance.expectedTime);
    const consistencyScore = this.calculateConsistencyScore(previousPerformance.answerPattern);
    const adaptiveScore = this.calculateAdaptiveScore(accuracy, timeEfficiency, consistencyScore);

    // Apply different strategies based on configuration
    switch (adaptiveConfig.adaptationStrategy) {
      case 'performance_based':
        return this.getPerformanceBasedDifficulty(adaptiveScore);
      case 'time_based':
        return this.getTimeBasedDifficulty(timeEfficiency, accuracy);
      case 'hybrid':
        return this.getHybridDifficulty(adaptiveScore, blockNumber, difficultyDistribution);
      default:
        return this.getPerformanceBasedDifficulty(adaptiveScore);
    }
  }

  private calculateTimeEfficiency(timeTaken: number, expectedTime: number): number {
    if (!timeTaken || !expectedTime) return 0.8;
    
    const efficiency = expectedTime / timeTaken;
    return Math.max(0, Math.min(1, efficiency));
  }

  private calculateConsistencyScore(answerPattern: any[]): number {
    if (!answerPattern || answerPattern.length < 3) return 0.5;
    
    // Calculate consistency based on answer timing and correctness patterns
    let consistency = 0.5;
    
    // Check if user is consistently fast or slow
    const timeVariance = this.calculateVariance(answerPattern.map(a => a.timeTaken || 0));
    if (timeVariance < 0.3) consistency += 0.2;
    
    // Check if user maintains accuracy across questions
    const accuracyVariance = this.calculateVariance(answerPattern.map(a => a.correct ? 1 : 0));
    if (accuracyVariance < 0.3) consistency += 0.3;
    
    return Math.min(1, consistency);
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return variance;
  }

  private calculateAdaptiveScore(accuracy: number, timeEfficiency: number, consistencyScore: number): number {
    // Weighted combination of factors
    const weights = {
      accuracy: 0.6,
      timeEfficiency: 0.25,
      consistency: 0.15
    };
    
    return (accuracy * weights.accuracy) + 
           (timeEfficiency * weights.timeEfficiency) + 
           (consistencyScore * weights.consistency);
  }

  private getPerformanceBasedDifficulty(adaptiveScore: number): string {
    if (adaptiveScore > 0.85) return 'hard';
    if (adaptiveScore > 0.65) return 'medium';
    return 'easy';
  }

  private getTimeBasedDifficulty(timeEfficiency: number, accuracy: number): string {
    if (timeEfficiency > 0.9 && accuracy > 0.8) return 'hard';
    if (timeEfficiency > 0.7 && accuracy > 0.6) return 'medium';
    return 'easy';
  }

  private getHybridDifficulty(adaptiveScore: number, blockNumber: number, difficultyDistribution: any): string {
    // Start with performance-based difficulty
    let targetDifficulty = this.getPerformanceBasedDifficulty(adaptiveScore);
    
    // Apply difficulty progression based on block number
    const progressionFactor = Math.min(1.2, 1 + (blockNumber - 1) * 0.1);
    
    // Adjust based on distribution constraints
    const maxWeight = Math.max(
      difficultyDistribution.easy || 0,
      difficultyDistribution.medium || 0,
      difficultyDistribution.hard || 0
    );
    
    // If target difficulty is not available in distribution, adjust
    if (targetDifficulty === 'hard' && difficultyDistribution.hard < maxWeight * 0.3) {
      targetDifficulty = 'medium';
    } else if (targetDifficulty === 'easy' && difficultyDistribution.easy < maxWeight * 0.3) {
      targetDifficulty = 'medium';
    }
    
    return targetDifficulty;
  }

  private async fetchQuestionsForBlock(
    queryRunner: any,
    assessmentId: number,
    difficulty: string,
    questionCount: number,
    mode: string,
    previousPerformance?: any
  ): Promise<BlockQuestion[]> {
    const tableMap = {
      aptitude: {
        questions: 'tech_aptitude_questions',
        options: 'tech_aptitude_options',
        idCol: 'aptitude_question_id',
        categoryCol: 'subcategory'
      },
      grammar: {
        questions: 'tech_grammar_questions',
        options: 'tech_grammar_options',
        idCol: 'grammar_question_id',
        categoryCol: 'task_type'
      },
      mnc: {
        questions: 'tech_mnc_questions',
        options: 'tech_mnc_options',
        idCol: 'mnc_question_id',
        categoryCol: 'topic_group'
      }
    };

    const moduleType = await queryRunner.query(
      'SELECT module_type FROM tech_assessments WHERE assessment_id = $1',
      [assessmentId]
    );

    if (!moduleType.length) return [];

    const config = tableMap[moduleType[0].module_type as keyof typeof tableMap];
    if (!config) return [];

    // Fetch questions with adaptive category selection
    let categoryFilter = '';
    if (previousPerformance && previousPerformance.weakAreas) {
      const weakCategories = previousPerformance.weakAreas.slice(0, 2);
      categoryFilter = `AND q.${config.categoryCol} IN (${weakCategories.map(() => '?').join(',')})`;
    }

    const typeFilter = `AND (
      ( q.metadata->>'kind' IS NULL OR q.metadata->>'kind' = '' OR q.metadata->>'kind' = 'mcq' ) AND (ass.enabled_question_types->>'mcq')::boolean IS NOT FALSE OR
      ( q.metadata->>'kind' = 'msq' AND (ass.enabled_question_types->>'msq')::boolean IS NOT FALSE ) OR
      ( q.metadata->>'kind' = 'tf' AND (ass.enabled_question_types->>'true_false')::boolean IS NOT FALSE ) OR
      ( q.metadata->>'kind' = 'numerical' AND (ass.enabled_question_types->>'numerical')::boolean IS NOT FALSE )
    )`;

    const questions = await queryRunner.query(
      `SELECT q.${config.idCol}, q.question_text, q.difficulty, q.${config.categoryCol}, 
              q.marks, q.negative_marks, q.image_url, q.metadata,
              json_agg(
                json_build_object('option_id', o.option_id, 'option_text', o.option_text)
                ORDER BY o.option_id
              ) as options
       FROM ${config.questions} q
       LEFT JOIN ${config.options} o ON o.${config.idCol} = q.${config.idCol}
       JOIN tech_assessments ass ON ass.assessment_id = q.assessment_id
       WHERE q.assessment_id = $1 AND q.difficulty = $2 AND q.status = 'active' 
       AND (q.mode = $3 OR q.mode IS NULL)
       ${categoryFilter} ${typeFilter}
       GROUP BY q.${config.idCol}, ass.enabled_question_types
       ORDER BY RANDOM()
       LIMIT $4`,
      [assessmentId, difficulty, mode, questionCount]
    );

    return questions.map((q: any) => ({
      id: String(q[config.idCol]),
      text: q.question_text,
      options: (q.options || []).map((opt: any) => ({
        id: String(opt.option_id),
        text: opt.option_text
      })),
      difficulty: q.difficulty,
      category: q[config.categoryCol],
      marks: Number(q.marks) || 1,
      negativeMarks: Number(q.negative_marks) || 0,
      imageUrl: q.image_url,
      metadata: q.metadata || {}
    }));
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
