import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';

import { Roles } from '../../../auth/roles.decorator';
import {
  AdminResultsService,
  AdminResultsResponse,
} from '../services/admin-results.service';

/**
 * Admin-facing results API — the half of the exam loop that was missing.
 *
 * Admin-only: these responses carry every candidate's scores, and the detail
 * route additionally exposes the per-question review, which names the correct
 * answer for each question.
 */
@Controller('admin/results')
@Roles('ADMIN')
export class AdminResultsController {
  constructor(private readonly adminResultsService: AdminResultsService) {}

  /** GET /api/admin/results — roster of submitted attempts across all modules. */
  @Get()
  async listResults(
    @Query('q') q?: string,
    @Query('module') module?: string,
    @Query('mode') mode?: 'trial' | 'main',
    @Query('outcome') outcome?: 'passed' | 'failed',
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<AdminResultsResponse> {
    return this.adminResultsService.listResults({
      q: q?.trim() || undefined,
      module: module?.trim() || undefined,
      mode: mode === 'trial' || mode === 'main' ? mode : undefined,
      outcome: outcome === 'passed' || outcome === 'failed' ? outcome : undefined,
      userId: userId && /^\d+$/.test(userId) ? Number(userId) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  /** GET /api/admin/results/:module/:attemptToken — one attempt in full. */
  @Get(':module/:attemptToken')
  async getAttemptDetail(
    @Param('module') module: string,
    @Param('attemptToken') attemptToken: string,
  ) {
    const detail = await this.adminResultsService.getAttemptDetail(module, attemptToken);
    if (!detail) {
      throw new NotFoundException('No submitted attempt found for that token');
    }
    return detail;
  }
}
