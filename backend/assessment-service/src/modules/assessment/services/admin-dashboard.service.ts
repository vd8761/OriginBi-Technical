import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface DashboardKPIs {
  activeCandidates: number;
  activeCandidatesOnline: number;
  questionBankTotal: number;
  questionBankPluginCount: number;
  liveSessions: number;
  liveSessionsMonitored: number;
  flaggedToday: number;
  flaggedAwaitingReview: number;
}

export interface DashboardLiveAssessment {
  examVersionId: string;
  name: string;
  module: string;
  status: 'live' | 'scheduled' | 'draft';
  completed: number;
  total: number;
  durationMinutes: number;
  updatedAt: string;
}

export interface DashboardActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  tone: 'green' | 'amber' | 'red' | 'blue' | 'neutral';
  createdAt: string;
}

export interface DashboardDayCount {
  day: string;
  count: number;
}

export interface DashboardSeries {
  submissionsPerDay: DashboardDayCount[];
  proctorIncidentsPerDay: DashboardDayCount[];
  submissionsWeekTotal: number;
  proctorIncidentsWeek: number;
  avgPassRateWeek: number | null;
}

export interface DashboardModuleStats {
  slug: string;
  name: string;
  count: number;
}

export interface DashboardSummaryResponse {
  kpis: DashboardKPIs;
  liveAssessments: DashboardLiveAssessment[];
  recentActivity: DashboardActivityItem[];
  series: DashboardSeries;
  questionBreakdown: DashboardModuleStats[];
}

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(private dataSource: DataSource) {}

  async getSummary(): Promise<DashboardSummaryResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      this.logger.debug('Starting getSummary...');
      const out: DashboardSummaryResponse = {
        kpis: {
          activeCandidates: 0,
          activeCandidatesOnline: 0,
          questionBankTotal: 0,
          questionBankPluginCount: 0,
          liveSessions: 0,
          liveSessionsMonitored: 0,
          flaggedToday: 0,
          flaggedAwaitingReview: 0,
        },
        liveAssessments: [],
        recentActivity: [],
        series: {
          submissionsPerDay: [],
          proctorIncidentsPerDay: [],
          submissionsWeekTotal: 0,
          proctorIncidentsWeek: 0,
          avgPassRateWeek: null,
        },
        questionBreakdown: [],
      };

      // 1. KPIs
      try {
        const qCountResult = await queryRunner.query(`
          SELECT (
            (SELECT COUNT(*) FROM tech_aptitude_questions WHERE status = 'active') +
            (SELECT COUNT(*) FROM tech_grammar_questions WHERE status = 'active') +
            (SELECT COUNT(*) FROM tech_mnc_questions WHERE status = 'active') +
            (SELECT COUNT(*) FROM tech_role_questions WHERE status = 'active')
          ) as total
        `);
        out.kpis.questionBankTotal = Number(qCountResult[0]?.total || 0);
      } catch (e: any) {
        this.logger.error(`KPI question count failed: ${e.message}`);
      }
      // 4 MCQ modules here + coding lives in exam-engine; surface that as a
      // single "coding" plugin slot in the dashboard's bank breakdown.
      out.kpis.questionBankPluginCount = 5;

      try {
        const liveSessionsResult = await queryRunner.query(`
          WITH all_attempts AS (
            SELECT status, updated_at FROM tech_aptitude_attempts
            UNION ALL SELECT status, updated_at FROM tech_grammar_attempts
            UNION ALL SELECT status, updated_at FROM tech_mnc_attempts
            UNION ALL SELECT status, updated_at FROM tech_role_attempts
          )
          SELECT
            COUNT(*) FILTER (WHERE status = 'in_progress')::bigint AS live,
            COUNT(*) FILTER (WHERE status = 'in_progress' AND updated_at > now() - interval '5 minutes')::bigint AS monitored
          FROM all_attempts
        `);
        out.kpis.liveSessions = Number(liveSessionsResult[0]?.live || 0);
        out.kpis.liveSessionsMonitored = Number(liveSessionsResult[0]?.monitored || 0);
      } catch (e: any) {
        this.logger.error(`KPI live sessions failed: ${e.message}`);
      }

      try {
        const activeCandidatesResult = await queryRunner.query(`
          WITH all_candidates AS (
            SELECT user_id, COALESCE(updated_at, started_at, created_at) as activity_at FROM tech_aptitude_attempts
            UNION ALL SELECT user_id, COALESCE(updated_at, started_at, created_at) as activity_at FROM tech_grammar_attempts
            UNION ALL SELECT user_id, COALESCE(updated_at, started_at, created_at) as activity_at FROM tech_mnc_attempts
            UNION ALL SELECT user_id, COALESCE(updated_at, started_at, created_at) as activity_at FROM tech_role_attempts
          )
          SELECT COUNT(DISTINCT user_id)::bigint as count
          FROM all_candidates
          WHERE activity_at > now() - interval '24 hours'
        `);
        out.kpis.activeCandidates = Number(activeCandidatesResult[0]?.count || 0);

        const onlineCandidatesResult = await queryRunner.query(`
          WITH all_online AS (
            SELECT user_id, updated_at FROM tech_aptitude_attempts WHERE status = 'in_progress'
            UNION ALL SELECT user_id, updated_at FROM tech_grammar_attempts WHERE status = 'in_progress'
            UNION ALL SELECT user_id, updated_at FROM tech_mnc_attempts WHERE status = 'in_progress'
            UNION ALL SELECT user_id, updated_at FROM tech_role_attempts WHERE status = 'in_progress'
          )
          SELECT COUNT(DISTINCT user_id)::bigint as count
          FROM all_online
          WHERE updated_at > now() - interval '5 minutes'
        `);
        out.kpis.activeCandidatesOnline = Number(onlineCandidatesResult[0]?.count || 0);
      } catch (e: any) {
        this.logger.error(`KPI active/online candidates failed: ${e.message}`);
      }

      // 2. Live Assessments
      try {
        const liveAssResult = await queryRunner.query(`
          SELECT assessment_id, assessment_name, module_type, status, total_time_minutes, updated_at
          FROM tech_assessments
          WHERE status = 'active'
          ORDER BY updated_at DESC
          LIMIT 8
        `);
        
        for (const row of liveAssResult) {
          const tableMap: any = {
            aptitude: 'tech_aptitude_attempts',
            grammar: 'tech_grammar_attempts',
            mnc: 'tech_mnc_attempts',
            role: 'tech_role_attempts',
            communication: 'tech_grammar_attempts'
          };
          const table = tableMap[row.module_type] || 'tech_aptitude_attempts';
          
          const counts = await queryRunner.query(`
            SELECT 
              COUNT(*)::bigint as total,
              COUNT(*) FILTER (WHERE status IN ('submitted', 'evaluated'))::bigint as completed
            FROM ${table}
            WHERE assessment_id = $1::bigint
          `, [row.assessment_id]);

          out.liveAssessments.push({
            examVersionId: row.assessment_id.toString(),
            name: row.assessment_name,
            module: row.module_type.charAt(0).toUpperCase() + row.module_type.slice(1),
            status: 'live',
            completed: Number(counts[0]?.completed || 0),
            total: Number(counts[0]?.total || 0),
            durationMinutes: row.total_time_minutes || 0,
            updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
          });
        }
      } catch (e: any) {
        this.logger.error(`Live assessments failed: ${e.message}`);
      }

      // 3. Recent Activity (Placeholder)
      out.recentActivity = [];

      // 4. Series
      try {
        const seriesResult = await queryRunner.query(`
          WITH days AS (
            SELECT generate_series(current_date - 6, current_date, interval '1 day')::date AS d
          ),
          all_submissions AS (
            SELECT submitted_at::date as d FROM tech_aptitude_attempts WHERE status IN ('submitted', 'evaluated')
            UNION ALL SELECT submitted_at::date as d FROM tech_grammar_attempts WHERE status IN ('submitted', 'evaluated')
            UNION ALL SELECT submitted_at::date as d FROM tech_mnc_attempts WHERE status IN ('submitted', 'evaluated')
            UNION ALL SELECT submitted_at::date as d FROM tech_role_attempts WHERE status IN ('submitted', 'evaluated')
          )
          SELECT days.d, COUNT(all_submissions.d)::bigint as count
          FROM days
          LEFT JOIN all_submissions ON all_submissions.d = days.d
          GROUP BY days.d
          ORDER BY days.d
        `);

        for (const row of seriesResult) {
          const label = new Date(row.d).toLocaleDateString('en-US', { weekday: 'short' });
          out.series.submissionsPerDay.push({ day: label, count: Number(row.count) });
          out.series.submissionsWeekTotal += Number(row.count);
        }
        out.series.proctorIncidentsPerDay = out.series.submissionsPerDay.map(d => ({ day: d.day, count: 0 }));
      } catch (e: any) {
        this.logger.error(`Series failed: ${e.message}`);
      }

      // 5. Question Breakdown
      try {
        const breakdown = [
          { slug: 'aptitude', name: 'Aptitude' },
          { slug: 'grammar', name: 'Grammar' },
          { slug: 'mnc', name: 'MNC' },
          { slug: 'role', name: 'Role-based' }
        ];

        for (const b of breakdown) {
          const countRes = await queryRunner.query(`SELECT COUNT(*) as count FROM tech_${b.slug}_questions WHERE status = 'active'`);
          out.questionBreakdown.push({
            slug: b.slug,
            name: b.name,
            count: Number(countRes[0]?.count || 0)
          });
        }
      } catch (e: any) {
        this.logger.error(`Question breakdown failed: ${e.message}`);
      }

      return out;
    } catch (e: any) {
      this.logger.error(`getSummary CRITICAL error: ${e.message}`);
      throw e;
    } finally {
      await queryRunner.release();
    }
  }
}
