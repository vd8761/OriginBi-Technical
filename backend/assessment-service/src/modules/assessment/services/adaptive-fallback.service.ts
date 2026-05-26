import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * AdaptiveFallbackService
 *
 * Provides health-check and prerequisite-validation utilities for the
 * adaptive block system.  The actual fallback to a static attempt is
 * handled directly in AssessmentService to avoid circular dependencies.
 */
@Injectable()
export class AdaptiveFallbackService {
  private readonly logger = new Logger(AdaptiveFallbackService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Lightweight check: do the required adaptive tables exist?
   * Returns true when the system can proceed; false when tables are missing.
   */
  async tablesExist(): Promise<boolean> {
    try {
      const rows = await this.dataSource.query(`
        SELECT
          EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'adaptive_blocks'
          ) AS blocks_exist,
          EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'block_attempts'
          ) AS attempts_exist
      `);
      return rows[0].blocks_exist && rows[0].attempts_exist;
    } catch {
      return false;
    }
  }

  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'failed';
    adaptiveTables: boolean;
    recommendations: string[];
  }> {
    const adaptiveTables = await this.tablesExist();
    const recommendations: string[] = [];

    if (!adaptiveTables) {
      recommendations.push(
        'Run the block-adaptive-schema.sql migration to create adaptive tables',
      );
    }

    return {
      status: adaptiveTables ? 'healthy' : 'failed',
      adaptiveTables,
      recommendations,
    };
  }
}
