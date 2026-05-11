import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AssessmentService } from './assessment.service';

@Injectable()
export class AdaptiveFallbackService {
  private readonly logger = new Logger(AdaptiveFallbackService.name);
  private fallbackCache = new Map<string, any>();

  constructor(
    private dataSource: DataSource,
    private assessmentService: AssessmentService
  ) {}

  async handleAdaptiveFailure(
    module: string,
    data: any,
    error: Error,
    attemptToken?: string
  ): Promise<any> {
    this.logger.warn(`Adaptive system failed for ${module}, falling back to static assessment: ${error.message}`);

    try {
      // Log the failure for monitoring
      await this.logAdaptiveFailure(module, data, error, attemptToken);

      // Check if we have a cached static assessment
      const cacheKey = `${module}-${data.assessmentId || data.assessmentCode}-${data.mode}`;
      if (this.fallbackCache.has(cacheKey)) {
        this.logger.log(`Using cached static assessment for ${module}`);
        return this.fallbackCache.get(cacheKey);
      }

      // Generate static assessment as fallback
      const staticResult = await this.generateStaticFallback(module, data);
      
      // Cache the result for future use
      this.fallbackCache.set(cacheKey, staticResult);
      
      return staticResult;
    } catch (fallbackError) {
      this.logger.error(`Fallback assessment also failed for ${module}:`, fallbackError);
      throw fallbackError;
    }
  }

  async generateStaticFallback(module: string, data: any): Promise<any> {
    this.logger.log(`Generating static fallback assessment for ${module}`);

    try {
      // Use the regular assessment service
      const result = await this.assessmentService.startAttempt(module, data);
      
      // Add fallback metadata
      return {
        ...result,
        isFallback: true,
        fallbackReason: 'adaptive_system_failure',
        originalAdaptiveConfig: data.adaptiveConfig,
        message: 'Using standard assessment due to adaptive system temporary unavailability'
      };
    } catch (error) {
      this.logger.error(`Failed to generate static fallback for ${module}:`, error);
      throw error;
    }
  }

  async validateAdaptivePrerequisites(assessmentId: number): Promise<{
    isValid: boolean;
    issues: string[];
    canProceed: boolean;
  }> {
    const issues: string[] = [];
    let canProceed = true;

    try {
      // Check if adaptive tables exist
      const tableCheck = await this.dataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'adaptive_blocks'
        ) as blocks_exist,
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'block_attempts'
        ) as attempts_exist
      `);

      if (!tableCheck[0].blocks_exist) {
        issues.push('Adaptive blocks table does not exist');
        canProceed = false;
      }

      if (!tableCheck[0].attempts_exist) {
        issues.push('Block attempts table does not exist');
        canProceed = false;
      }

      // Check question pool availability
      const questionCheck = await this.dataSource.query(`
        SELECT 
          COUNT(*) as total_questions,
          COUNT(CASE WHEN difficulty = 'easy' THEN 1 END) as easy_questions,
          COUNT(CASE WHEN difficulty = 'medium' THEN 1 END) as medium_questions,
          COUNT(CASE WHEN difficulty = 'hard' THEN 1 END) as hard_questions
        FROM tech_aptitude_questions 
        WHERE assessment_id = $1 AND status = 'active'
      `, [assessmentId]);

      const questions = questionCheck[0];
      if (questions.total_questions < 20) {
        issues.push(`Insufficient questions: ${questions.total_questions} (minimum 20 required)`);
        canProceed = false;
      }

      if (questions.easy_questions < 5) {
        issues.push(`Insufficient easy questions: ${questions.easy_questions} (minimum 5 required)`);
      }

      if (questions.medium_questions < 5) {
        issues.push(`Insufficient medium questions: ${questions.medium_questions} (minimum 5 required)`);
      }

      if (questions.hard_questions < 5) {
        issues.push(`Insufficient hard questions: ${questions.hard_questions} (minimum 5 required)`);
      }

      // Check block configuration
      const configCheck = await this.dataSource.query(`
        SELECT block_config, adaptive_config 
        FROM tech_assessments 
        WHERE assessment_id = $1
      `, [assessmentId]);

      if (configCheck.length > 0) {
        const blockConfig = configCheck[0].block_config;
        const adaptiveConfig = configCheck[0].adaptive_config;

        if (!blockConfig?.enabled) {
          issues.push('Block configuration is not enabled');
          canProceed = false;
        }

        if (!adaptiveConfig?.enabled) {
          issues.push('Adaptive configuration is not enabled');
        }

        if (blockConfig?.blocksPerAssessment > 6) {
          issues.push(`Too many blocks: ${blockConfig.blocksPerAssessment} (maximum 6 recommended)`);
        }

        if (blockConfig?.questionsPerBlock < 3) {
          issues.push(`Too few questions per block: ${blockConfig.questionsPerBlock} (minimum 3 recommended)`);
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        canProceed
      };
    } catch (error) {
      this.logger.error('Error validating adaptive prerequisites:', error);
      return {
        isValid: false,
        issues: ['Failed to validate adaptive system'],
        canProceed: false
      };
    }
  }

  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'failed';
    adaptiveTables: boolean;
    questionPools: boolean;
    recentFailures: number;
    lastFailureTime?: Date;
    recommendations: string[];
  }> {
    try {
      // Check adaptive tables
      const tableCheck = await this.dataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('adaptive_blocks', 'block_attempts', 'adaptive_paths')
        ) as tables_exist
      `);

      const adaptiveTables = tableCheck[0].tables_exist;

      // Check question pools
      const poolCheck = await this.dataSource.query(`
        SELECT COUNT(*) as pool_count
        FROM question_pool_metadata 
        WHERE available_questions >= 5
      `);

      const questionPools = poolCheck[0].pool_count > 0;

      // Check recent failures
      const failureCheck = await this.dataSource.query(`
        SELECT COUNT(*) as failure_count, MAX(created_at) as last_failure
        FROM adaptive_performance_analytics 
        WHERE adaptation_success_score < 0.5 
        AND created_at > NOW() - INTERVAL '1 hour'
      `);

      const recentFailures = parseInt(failureCheck[0].failure_count);
      const lastFailureTime = failureCheck[0].last_failure;

      // Generate recommendations
      const recommendations: string[] = [];
      if (!adaptiveTables) {
        recommendations.push('Run database migration to create adaptive tables');
      }
      if (!questionPools) {
        recommendations.push('Populate question pools with sufficient questions');
      }
      if (recentFailures > 5) {
        recommendations.push('High failure rate detected - review adaptive algorithms');
      }

      // Determine overall status
      let status: 'healthy' | 'degraded' | 'failed' = 'healthy';
      if (!adaptiveTables || !questionPools) {
        status = 'failed';
      } else if (recentFailures > 3) {
        status = 'degraded';
      }

      return {
        status,
        adaptiveTables,
        questionPools,
        recentFailures,
        lastFailureTime,
        recommendations
      };
    } catch (error) {
      this.logger.error('Error checking system health:', error);
      return {
        status: 'failed',
        adaptiveTables: false,
        questionPools: false,
        recentFailures: 999,
        recommendations: ['System health check failed - investigate immediately']
      };
    }
  }

  private async logAdaptiveFailure(
    module: string,
    data: any,
    error: Error,
    attemptToken?: string
  ): Promise<void> {
    try {
      await this.dataSource.query(`
        INSERT INTO adaptive_performance_analytics 
        (assessment_id, user_id, attempt_token, adaptation_events, final_score, adaptation_success_score)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        data.assessmentId,
        data.userId,
        attemptToken || 'unknown',
        JSON.stringify([{
          type: 'fallback_triggered',
          timestamp: new Date().toISOString(),
          error: error.message,
          module,
          data
        }]),
        0,
        0.0 // Low success score indicating failure
      ]);
    } catch (logError) {
      this.logger.error('Failed to log adaptive failure:', logError);
    }
  }

  async clearFallbackCache(): Promise<void> {
    this.fallbackCache.clear();
    this.logger.log('Fallback cache cleared');
  }

  async preloadFallbackAssessments(): Promise<void> {
    this.logger.log('Preloading fallback assessments...');
    
    try {
      const assessments = await this.dataSource.query(`
        SELECT assessment_id, module_type, assessment_code
        FROM tech_assessments 
        WHERE status = 'active' 
        AND (block_config->>'enabled')::boolean = true
      `);

      for (const assessment of assessments) {
        try {
          const cacheKey = `${assessment.module_type}-${assessment.assessment_id}-main`;
          const staticResult = await this.generateStaticFallback(assessment.module_type, {
            assessmentId: assessment.assessment_id,
            mode: 'main'
          });
          
          this.fallbackCache.set(cacheKey, staticResult);
        } catch (error) {
          this.logger.warn(`Failed to preload fallback for assessment ${assessment.assessment_id}:`, error);
        }
      }

      this.logger.log(`Preloaded ${this.fallbackCache.size} fallback assessments`);
    } catch (error) {
      this.logger.error('Failed to preload fallback assessments:', error);
    }
  }
}
