import { Controller, Get, Inject } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Pool } from 'pg';
import { PG_POOL } from './db/pool.module';

@Controller()
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Liveness plus a database round trip, so a monitor sees a service that is
   * up but cannot reach Postgres as unhealthy rather than fine.
   */
  @SkipThrottle()
  @Get('health')
  async health() {
    try {
      await this.pool.query('SELECT 1');
      return { status: 'ok', database: 'ok' };
    } catch {
      return { status: 'degraded', database: 'unreachable' };
    }
  }
}
