import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';

@Injectable()
export class AssessmentService {
  private readonly logger = new Logger(AssessmentService.name);

  constructor(private dataSource: DataSource) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────────

  private hashSeed(seed: string) {
    const hash = crypto.createHash('sha256').update(seed).digest();
    return hash.readUInt32LE(0);
  }

  private mulberry32(seed: number) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  private shuffleWithSeed<T>(items: T[], seed: string) {
    const rng = this.mulberry32(this.hashSeed(seed));
    const array = [...items];
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private async resolveUserId(queryRunner: any, userId: any): Promise<number | null> {
    const parsed = userId !== undefined && userId !== null ? Number(userId) : NaN;
    if (Number.isFinite(parsed)) return parsed;
    const rows = await queryRunner.query('SELECT id FROM users ORDER BY id LIMIT 1');
    return rows[0]?.id ?? null;
  }

  // ─── Aptitude Assessment logic ──────────────────────────────────────────────────

  async startAptitudeAttempt(data: any) {
    const { assessmentId, assessmentCode, userId } = data;
    if (!assessmentId && !assessmentCode) throw new BadRequestException('assessmentId or assessmentCode is required');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const assessmentQuery = assessmentId
        ? "SELECT * FROM tech_assessments WHERE assessment_id = $1 AND module_type = 'aptitude'"
        : "SELECT * FROM tech_assessments WHERE assessment_code = $1 AND module_type = 'aptitude'";
      
      const assessments = await queryRunner.query(assessmentQuery, [assessmentId || assessmentCode]);
      const assessment = assessments[0];
      if (!assessment) throw new NotFoundException('Aptitude assessment not found');

      const resolvedUserId = await this.resolveUserId(queryRunner, userId);
      if (!resolvedUserId) throw new BadRequestException('No users found.');

      const now = new Date();
      const durationMinutes = Number(assessment.total_time_minutes || 60);
      const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
      const attemptToken = crypto.randomUUID();
      const shuffleSeed = crypto.randomBytes(8).toString('hex');

      const attemptResult = await queryRunner.query(
        `INSERT INTO tech_aptitude_attempts
            (assessment_id, user_id, attempt_token, shuffle_seed, status, started_at, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'in_progress', $5, $6, NOW(), NOW())
         RETURNING aptitude_attempt_id`,
        [assessment.assessment_id, resolvedUserId, attemptToken, shuffleSeed, now, expiresAt],
      );
      const attemptId = attemptResult[0].aptitude_attempt_id;

      const questions = await queryRunner.query(
        `SELECT aptitude_question_id FROM tech_aptitude_questions WHERE assessment_id = $1 AND status = 'active'`,
        [assessment.assessment_id],
      );

      const shuffled = this.shuffleWithSeed(questions, shuffleSeed) as any[];

      for (let i = 0; i < shuffled.length; i++) {
        await queryRunner.query(
          `INSERT INTO tech_aptitude_attempt_questions (aptitude_attempt_id, aptitude_question_id, display_order)
           VALUES ($1, $2, $3)`,
          [attemptId, shuffled[i].aptitude_question_id, i + 1],
        );
      }

      await queryRunner.commitTransaction();
      return {
        token: attemptToken,
        expiresAt,
        totalQuestions: shuffled.length,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('startAptitudeAttempt error:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getAttemptQuestions(token: string) {
    try {
      const attemptRows = await this.dataSource.query(
        `SELECT a.*, ass.shuffle_options
         FROM tech_aptitude_attempts a
         JOIN tech_assessments ass ON ass.assessment_id = a.assessment_id
         WHERE a.attempt_token = $1`,
        [token],
      );
      const attempt = attemptRows[0];
      if (!attempt) throw new NotFoundException('Attempt not found');

      const questionRows = await this.dataSource.query(
        `SELECT aq.attempt_question_id, q.aptitude_question_id, q.question_text, q.image_url, q.subcategory as category,
                COALESCE(
                  json_agg(
                    json_build_object('id', o.option_id, 'text', o.option_text)
                  ) FILTER (WHERE o.option_id IS NOT NULL),
                  '[]'::json
                ) as options
         FROM tech_aptitude_attempt_questions aq
         JOIN tech_aptitude_questions q ON q.aptitude_question_id = aq.aptitude_question_id
         LEFT JOIN tech_aptitude_options o ON o.aptitude_question_id = q.aptitude_question_id
         WHERE aq.aptitude_attempt_id = $1
         GROUP BY aq.attempt_question_id, q.aptitude_question_id
         ORDER BY aq.display_order ASC`,
        [attempt.aptitude_attempt_id],
      );

      const results = questionRows.map((q: any) => {
        let finalOptions = q.options;
        if (attempt.shuffle_options) {
          finalOptions = this.shuffleWithSeed(q.options, `${attempt.shuffle_seed}_${q.aptitude_question_id}`);
        }
        return {
          id: q.attempt_question_id,
          questionId: q.aptitude_question_id,
          text: q.question_text,
          imageUrl: q.image_url,
          category: q.category,
          options: finalOptions,
        };
      });

      return {
        questions: results,
        expiresAt: attempt.expires_at,
        status: attempt.status,
      };
    } catch (error) {
      this.logger.error('getAttemptQuestions error:', error);
      throw error;
    }
  }
}
