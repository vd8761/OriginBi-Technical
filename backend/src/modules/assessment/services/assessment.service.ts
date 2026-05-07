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

  // ─── Generic Assessment logic ──────────────────────────────────────────────────

  async startAttempt(module: string, data: any) {
    const { assessmentId, assessmentCode, userId, mode = 'main' } = data;
    this.logger.log(`startAttempt: module=${module}, code=${assessmentCode}, mode=${mode}`);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let assessment;
      if (assessmentId) {
        const assessments = await queryRunner.query(
          `SELECT * FROM tech_assessments WHERE assessment_id = $1 AND module_type = $2`,
          [assessmentId, module]
        );
        assessment = assessments[0];
      } else if (assessmentCode) {
        const assessments = await queryRunner.query(
          `SELECT * FROM tech_assessments WHERE assessment_code = $1 AND module_type = $2`,
          [assessmentCode, module]
        );
        assessment = assessments[0];
      } else {
        // Fallback: Get the latest active assessment for this module
        const assessments = await queryRunner.query(
          `SELECT * FROM tech_assessments WHERE module_type = $1 AND status = 'active' ORDER BY assessment_id DESC LIMIT 1`,
          [module]
        );
        assessment = assessments[0];
      }

      if (!assessment) throw new NotFoundException(`${module} assessment not found`);

      const resolvedUserId = await this.resolveUserId(queryRunner, userId);
      if (!resolvedUserId) throw new BadRequestException('No users found.');

      const now = new Date();
      const durationMinutes = Number(assessment.total_time_minutes || 60);
      const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
      const attemptToken = `${module.substring(0, 3).toUpperCase()}-${crypto.randomUUID()}`;
      const shuffleSeed = crypto.randomBytes(8).toString('hex');

      // Table mapping
      const tableMap: Record<string, { attempts: string; questions: string; junction: string; idCol: string; options: string; attemptIdCol: string }> = {
        aptitude: { 
            attempts: 'tech_aptitude_attempts', 
            questions: 'tech_aptitude_questions', 
            junction: 'tech_aptitude_attempt_questions', 
            idCol: 'aptitude_question_id',
            options: 'tech_aptitude_options',
            attemptIdCol: 'aptitude_attempt_id'
        },
        grammar: { 
            attempts: 'tech_grammar_attempts', 
            questions: 'tech_grammar_questions', 
            junction: 'tech_grammar_attempt_questions', 
            idCol: 'grammar_question_id',
            options: 'tech_grammar_options',
            attemptIdCol: 'grammar_attempt_id'
        },
        mnc: { 
            attempts: 'tech_mnc_attempts', 
            questions: 'tech_mnc_questions', 
            junction: 'tech_mnc_attempt_questions', 
            idCol: 'mnc_question_id',
            options: 'tech_mnc_options',
            attemptIdCol: 'mnc_attempt_id'
        },
        role: { 
            attempts: 'tech_role_attempts', 
            questions: 'tech_role_questions', 
            junction: 'tech_role_attempt_questions', 
            idCol: 'role_question_id',
            options: 'tech_role_options',
            attemptIdCol: 'role_attempt_id'
        }
      };

      const config = tableMap[module];
      if (!config) throw new BadRequestException(`Module ${module} not supported yet`);

      const attemptResult = await queryRunner.query(
        `INSERT INTO ${config.attempts}
            (assessment_id, user_id, attempt_token, shuffle_seed, status, started_at, expires_at, created_at, updated_at, mode)
         VALUES ($1, $2, $3, $4, 'in_progress', $5, $6, NOW(), NOW(), $7)
         RETURNING *`,
        [assessment.assessment_id, resolvedUserId, attemptToken, shuffleSeed, now, expiresAt, mode],
      );
      const attemptId = attemptResult[0][config.attemptIdCol];

      const requestedMode = mode === 'trial' ? 'trial' : 'main';
      const questions = await queryRunner.query(
        `SELECT ${config.idCol} FROM ${config.questions} WHERE assessment_id = $1 AND status = 'active' AND mode = $2`,
        [assessment.assessment_id, requestedMode],
      );

      if (questions.length === 0) {
        throw new BadRequestException(`No active ${requestedMode} questions found for this assessment.`);
      }

      const shuffled = assessment.shuffle_questions 
        ? this.shuffleWithSeed(questions, shuffleSeed) 
        : questions;

      for (let i = 0; i < shuffled.length; i++) {
        await queryRunner.query(
          `INSERT INTO ${config.junction} (${config.attemptIdCol}, ${config.idCol}, display_order)
           VALUES ($1, $2, $3)`,
          [attemptId, shuffled[i][config.idCol], i + 1],
        );
      }

      await queryRunner.commitTransaction();

      // Get full questions for the response
      const fullQuestions = await this.getAttemptQuestionsByConfig(attemptId, config, assessment.shuffle_options, shuffleSeed);

      return {
        attemptToken,
        expiresAt,
        durationSeconds: durationMinutes * 60,
        mode: requestedMode,
        questions: fullQuestions,
        totalQuestions: fullQuestions.length,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      this.logger.error(`startAttempt (${module}) error:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async getAttemptQuestionsByConfig(attemptId: number, config: any, shuffleOptions: boolean, seed: string) {
    const questionRows = await this.dataSource.query(
      `SELECT aq.display_order, q.${config.idCol} as question_id, q.question_text, q.image_url, q.difficulty,
              COALESCE(
                json_agg(
                  json_build_object('id', o.option_id::text, 'text', o.option_text)
                ) FILTER (WHERE o.option_id IS NOT NULL),
                '[]'::json
              ) as options
       FROM ${config.junction} aq
       JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
       LEFT JOIN ${config.options} o ON o.${config.idCol} = q.${config.idCol}
       WHERE aq.${config.attemptIdCol} = $1
       GROUP BY aq.display_order, q.${config.idCol}, q.question_text, q.image_url, q.difficulty
       ORDER BY aq.display_order ASC`,
      [attemptId],
    );

    return questionRows.map((q: any) => {
        let finalOptions = q.options;
        if (shuffleOptions) {
          finalOptions = this.shuffleWithSeed(q.options, `${seed}_${q.question_id}`);
        }
        return {
          id: q.question_id,
          text: q.question_text,
          imageUrl: q.image_url,
          difficulty: q.difficulty,
          options: finalOptions,
        };
      });
  }

  async startAptitudeAttempt(data: any) {
    return this.startAttempt('aptitude', data);
  }

  async getAttemptQuestions(token: string) {
    try {
      // Table mapping
      const tableMap: Record<string, any> = {
        aptitude: { 
            attempts: 'tech_aptitude_attempts',
            questions: 'tech_aptitude_questions', 
            junction: 'tech_aptitude_attempt_questions', 
            idCol: 'aptitude_question_id',
            options: 'tech_aptitude_options',
            attemptIdCol: 'aptitude_attempt_id'
        },
        grammar: { 
            attempts: 'tech_grammar_attempts',
            questions: 'tech_grammar_questions', 
            junction: 'tech_grammar_attempt_questions', 
            idCol: 'grammar_question_id',
            options: 'tech_grammar_options',
            attemptIdCol: 'grammar_attempt_id'
        },
        mnc: { 
            attempts: 'tech_mnc_attempts',
            questions: 'tech_mnc_questions', 
            junction: 'tech_mnc_attempt_questions', 
            idCol: 'mnc_question_id',
            options: 'tech_mnc_options',
            attemptIdCol: 'mnc_attempt_id'
        },
        role: { 
            attempts: 'tech_role_attempts',
            questions: 'tech_role_questions', 
            junction: 'tech_role_attempt_questions', 
            idCol: 'role_question_id',
            options: 'tech_role_options',
            attemptIdCol: 'role_attempt_id'
        }
      };

      const moduleType = (token.startsWith('APT-') ? 'aptitude' : 
                         token.startsWith('GRA-') ? 'grammar' :
                         token.startsWith('MNC-') ? 'mnc' :
                         token.startsWith('ROL-') ? 'role' : 'aptitude');

      const config = tableMap[moduleType];
      if (!config) throw new BadRequestException(`Token ${token} has invalid module prefix`);

      const attemptRows = await this.dataSource.query(
        `SELECT a.*, ass.shuffle_options, ass.module_type
         FROM ${config.attempts} a
         JOIN tech_assessments ass ON ass.assessment_id = a.assessment_id
         WHERE a.attempt_token = $1`,
        [token],
      );
      
      const attempt = attemptRows[0];
      if (!attempt) throw new NotFoundException('Attempt not found');
      const attemptId = attempt[config.attemptIdCol];
      
      const questions = await this.getAttemptQuestionsByConfig(attemptId, config, attempt.shuffle_options, attempt.shuffle_seed);

      return {
        questions,
        expiresAt: attempt.expires_at,
        status: attempt.status,
      };
    } catch (error) {
      this.logger.error('getAttemptQuestions error:', error);
      throw error;
    }
  }

  async submitAptitudeAttempt(token: string, body: any) {
    const { answers } = body;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get attempt with questions
      const attemptRows = await queryRunner.query(
        `SELECT a.* FROM tech_aptitude_attempts a WHERE a.attempt_token = $1`,
        [token],
      );
      const attempt = attemptRows[0];
      if (!attempt) throw new NotFoundException('Attempt not found');
      if (attempt.status === 'submitted') throw new BadRequestException('Attempt already submitted');

      // Get all questions with correct answers
      const questionRows = await queryRunner.query(
        `SELECT aq.attempt_question_id, aq.aptitude_question_id, q.correct_option_id, q.marks, q.negative_marks
         FROM tech_aptitude_attempt_questions aq
         JOIN tech_aptitude_questions q ON q.aptitude_question_id = aq.aptitude_question_id
         WHERE aq.aptitude_attempt_id = $1`,
        [attempt.aptitude_attempt_id],
      );

      let totalScore = 0;
      let correctCount = 0;
      let wrongCount = 0;
      const answerEntries = Object.entries(answers || {});

      for (const question of questionRows) {
        const selectedOptionId = answers[question.attempt_question_id] || answers[question.aptitude_question_id];
        
        if (selectedOptionId) {
          const isCorrect = Number(selectedOptionId) === Number(question.correct_option_id);
          await queryRunner.query(
            `UPDATE tech_aptitude_attempt_questions 
             SET selected_option_id = $1, is_correct = $2
             WHERE attempt_question_id = $3`,
            [selectedOptionId, isCorrect, question.attempt_question_id],
          );
          
          if (isCorrect) {
            totalScore += Number(question.marks);
            correctCount++;
          } else {
            totalScore -= Number(question.negative_marks || 0);
            wrongCount++;
          }
        }
      }

      // Calculate time taken
      const timeTakenSeconds = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);

      // Update attempt
      await queryRunner.query(
        `UPDATE tech_aptitude_attempts 
         SET status = 'submitted', submitted_at = NOW(), total_score = $1, 
             positive_score = $2, negative_score = $3, time_taken_seconds = $4
         WHERE aptitude_attempt_id = $5`,
        [totalScore, correctCount * 10, wrongCount * (attempt.negative_mark_value || 0), timeTakenSeconds, attempt.aptitude_attempt_id],
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        token,
        totalScore,
        correctCount,
        wrongCount,
        timeTakenSeconds,
        status: 'completed',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('submitAptitudeAttempt error:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
