import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AssessmentService } from './assessment.service';

export interface AdminResultRow {
  module: string;
  moduleLabel: string;
  attemptToken: string;
  userId: number;
  candidateName: string;
  candidateEmail: string;
  assessmentCode: string;
  assessmentName: string;
  mode: string;
  status: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  timeTakenSeconds: number;
  submittedAt: string | null;
}

export interface AdminResultsResponse {
  results: AdminResultRow[];
  total: number;
  limit: number;
  offset: number;
  passPercent: number;
  counts: {
    total: number;
    passed: number;
    failed: number;
    byModule: Record<string, number>;
  };
}

export interface ListAdminResultsParams {
  q?: string;
  module?: string;
  mode?: 'trial' | 'main';
  outcome?: 'passed' | 'failed';
  userId?: number;
  limit?: number;
  offset?: number;
}

const MODULE_LABELS: Record<string, string> = {
  aptitude: 'Aptitude',
  grammar: 'Communication',
  mnc: 'MNC',
  role: 'Role',
};

const DEFAULT_PASS_PERCENT = 90;

/**
 * Read model behind the admin Results screens.
 *
 * Until this existed an administrator could see *that* a candidate had taken an
 * assessment (the users roster computes `assessmentsTaken`) but never what they
 * scored, which left the exam loop open: candidates could sit exams nobody
 * could grade.
 *
 * Scores are read from the attempt rows, which `AssessmentService.submitAttempt`
 * writes inside its submit transaction — this service never re-computes a score,
 * so the roster and the candidate's own result page cannot disagree.
 */
@Injectable()
export class AdminResultsService {
  private readonly logger = new Logger(AdminResultsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly assessmentService: AssessmentService,
  ) {}

  /**
   * Pass mark. Reads the same `CERT_PASS_PERCENT` env var exam-engine uses in
   * `certPassPercent()` (internal/server/coding_lifecycle.go) so a candidate
   * cannot be shown as passed on one screen and failed on another.
   */
  private passPercent(): number {
    const parsed = Number((process.env.CERT_PASS_PERCENT ?? '').trim());
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 100) return parsed;
    return DEFAULT_PASS_PERCENT;
  }

  /**
   * One SELECT per module UNIONed together. The four tech_* families are
   * near-identical by design (see docs/RUNBOOK.md), so the shape is templated
   * from `getTableMap()` rather than written out four times.
   */
  async listResults(params: ListAdminResultsParams = {}): Promise<AdminResultsResponse> {
    const limit = Math.min(Math.max(Number(params.limit) || 50, 1), 200);
    const offset = Math.max(Number(params.offset) || 0, 0);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      const passPercent = this.passPercent();
      const tableMap = this.assessmentService.getTableMap();
      const modules = Object.keys(tableMap).filter(
        (m) => !params.module || m === params.module,
      );

      if (modules.length === 0) {
        return {
          results: [], total: 0, limit, offset, passPercent,
          counts: { total: 0, passed: 0, failed: 0, byModule: {} },
        };
      }

      // Every fragment uses the same positional parameters, so the parameter
      // list is built once and shared across the UNION.
      const args: any[] = [params.userId ?? null, params.q ? `%${params.q}%` : null, params.mode ?? null];

      const fragments = modules.map((moduleName) => {
        const cfg = tableMap[moduleName];
        return `
          SELECT '${moduleName}'::text                      AS module,
                 a.attempt_token                            AS attempt_token,
                 a.user_id                                  AS user_id,
                 COALESCE(a.mode, 'main')                   AS mode,
                 a.status                                   AS status,
                 COALESCE(a.total_score, 0)::float8         AS total_score,
                 COALESCE(a.time_taken_seconds, 0)::int     AS time_taken_seconds,
                 a.submitted_at                             AS submitted_at,
                 t.assessment_code                          AS assessment_code,
                 t.assessment_name                          AS assessment_name,
                 u.email                                    AS candidate_email,
                 COALESCE(r.full_name, '')                  AS candidate_name,
                 (
                   SELECT COALESCE(SUM(COALESCE(q.marks, 0)), 0)::float8
                   FROM ${cfg.junction} aq
                   JOIN ${cfg.questions} q ON q.${cfg.idCol} = aq.${cfg.idCol}
                   WHERE aq.${cfg.attemptIdCol} = a.${cfg.attemptIdCol}
                 )                                          AS max_score
          FROM ${cfg.attempts} a
          JOIN tech_assessments t ON t.assessment_id = a.assessment_id
          JOIN users u            ON u.id = a.user_id
          LEFT JOIN registrations r ON r.user_id = u.id
          WHERE a.status IN ('submitted', 'evaluated')
            AND ($1::bigint IS NULL OR a.user_id = $1::bigint)
            AND ($2::text IS NULL OR u.email ILIKE $2::text OR COALESCE(r.full_name, '') ILIKE $2::text)
            AND ($3::text IS NULL OR COALESCE(a.mode, 'main') = $3::text)
        `;
      });

      const unioned = fragments.join('\n UNION ALL \n');
      const rows = await qr.query(
        `SELECT * FROM (${unioned}) x ORDER BY x.submitted_at DESC NULLS LAST`,
        args,
      );

      const all: AdminResultRow[] = rows.map((row: any) => {
        const totalScore = Number(row.total_score || 0);
        const maxScore = Number(row.max_score || 0);
        const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        return {
          module: row.module,
          moduleLabel: MODULE_LABELS[row.module] ?? row.module,
          attemptToken: row.attempt_token,
          userId: Number(row.user_id),
          candidateName: row.candidate_name || 'Candidate',
          candidateEmail: row.candidate_email || '',
          assessmentCode: row.assessment_code || '',
          assessmentName: row.assessment_name || '',
          mode: row.mode || 'main',
          status: row.status,
          totalScore,
          maxScore,
          percentage,
          passed: percentage >= passPercent,
          timeTakenSeconds: Number(row.time_taken_seconds || 0),
          submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
        };
      });

      // Pass/fail depends on percentage, which is computed above rather than
      // stored, so this filter is applied after mapping rather than in SQL.
      const filtered = params.outcome
        ? all.filter((r) => (params.outcome === 'passed' ? r.passed : !r.passed))
        : all;

      const byModule: Record<string, number> = {};
      for (const r of filtered) byModule[r.module] = (byModule[r.module] ?? 0) + 1;

      return {
        results: filtered.slice(offset, offset + limit),
        total: filtered.length,
        limit,
        offset,
        passPercent,
        counts: {
          total: filtered.length,
          passed: filtered.filter((r) => r.passed).length,
          failed: filtered.filter((r) => !r.passed).length,
          byModule,
        },
      };
    } finally {
      await qr.release();
    }
  }

  /**
   * Full detail for one attempt: section breakdown and per-question review.
   *
   * Delegates to the candidate-facing reader so an administrator sees exactly
   * the same numbers the candidate does. `ownerUserId: null` lifts the
   * ownership restriction — the caller has already been checked for ADMIN.
   */
  async getAttemptDetail(module: string, attemptToken: string) {
    return this.assessmentService.getLatestSubmittedResult(
      module,
      undefined,
      attemptToken,
      null,
    );
  }
}
