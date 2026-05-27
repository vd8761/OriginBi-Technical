import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { AdaptiveBlockService } from './adaptive-block.service';
import { EmailService } from './email.service';

interface ModuleConfig {
  attempts: string;
  questions: string;
  junction: string;
  idCol: string;
  options: string | null;
  attemptIdCol: string;
  selectColumns: string[];
  groupByColumns: string[];
}

@Injectable()
export class AssessmentService {
  private readonly logger = new Logger(AssessmentService.name);
  private readonly columnExistsCache = new Map<string, boolean>();

  constructor(
    private dataSource: DataSource,
    private adaptiveBlockService: AdaptiveBlockService,
    private emailService: EmailService,
  ) {}

  async getAttemptsStats(userIdParam?: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const resolvedUserId = await this.resolveUserId(queryRunner, userIdParam);
      if (!resolvedUserId) return {};

      const tableMap = this.getTableMap();
      const stats: Record<string, { trial: number; main: number }> = {};

      for (const [module, config] of Object.entries(tableMap)) {
        stats[module] = { trial: 0, main: 0 };
        
        try {
          if (!config.hasMode) {
            const rows = await queryRunner.query(
              `SELECT COUNT(*) as count FROM ${config.attempts} WHERE user_id = $1`,
              [resolvedUserId]
            );
            const count = Number(rows[0]?.count || 0);
            stats[module] = { trial: count, main: count };
          } else {
            const trialRows = await queryRunner.query(
              `SELECT COUNT(DISTINCT a.${config.attemptIdCol}) as count
               FROM ${config.attempts} a
               JOIN ${config.junction} aq ON aq.${config.attemptIdCol} = a.${config.attemptIdCol}
               JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
               WHERE a.user_id = $1 AND q.mode = 'trial'`,
              [resolvedUserId]
            );
            const mainRows = await queryRunner.query(
              `SELECT COUNT(DISTINCT a.${config.attemptIdCol}) as count
               FROM ${config.attempts} a
               JOIN ${config.junction} aq ON aq.${config.attemptIdCol} = a.${config.attemptIdCol}
               JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
               WHERE a.user_id = $1 AND q.mode = 'main'`,
              [resolvedUserId]
            );
            stats[module] = {
              trial: Number(trialRows[0]?.count || 0),
              main: Number(mainRows[0]?.count || 0)
            };
          }
        } catch (err: any) {
          this.logger.error(`Error querying attempts count for ${module}: ${err.message}`);
        }
      }

      return stats;
    } finally {
      await queryRunner.release();
    }
  }

  async getInProgressAttempts(userIdParam?: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const resolvedUserId = await this.resolveUserId(queryRunner, userIdParam);
      if (!resolvedUserId) return [];

      const tableMap = this.getTableMap();
      const results: Array<{
        module: string;
        attemptToken: string;
        assessmentCode: string;
        assessmentName: string;
        startedAt: string;
        expiresAt: string;
        timeLeftSeconds: number;
        mode: 'trial' | 'main';
        isBlockBased: boolean;
      }> = [];

      const now = new Date();

      for (const [module, config] of Object.entries(tableMap)) {
        const rows = await queryRunner.query(
          `SELECT a.*, ass.assessment_code, ass.assessment_name
           FROM ${config.attempts} a
           JOIN tech_assessments ass ON ass.assessment_id = a.assessment_id
           WHERE a.user_id = $1 AND a.status = 'in_progress'
           ORDER BY a.started_at DESC LIMIT 1`,
          [resolvedUserId],
        );

        if (!rows.length) continue;
        const row = rows[0];
        const expiresAt = new Date(row.expires_at);

        if (expiresAt <= now) {
          await queryRunner.query(
            `UPDATE ${config.attempts} SET status = 'expired', updated_at = NOW()
             WHERE ${config.attemptIdCol} = $1`,
            [row[config.attemptIdCol]],
          );
          continue;
        }

        let mode: 'trial' | 'main' = 'main';
        if (config.hasMode) {
          const modeColExists = await this.columnExistsSafe(queryRunner, config.questions, 'mode');
          if (modeColExists) {
            const modeRows = await queryRunner.query(
              `SELECT q.mode
               FROM ${config.junction} aq
               JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
               WHERE aq.${config.attemptIdCol} = $1 AND q.mode IS NOT NULL
               LIMIT 1`,
              [row[config.attemptIdCol]],
            );
            if (modeRows.length && String(modeRows[0].mode).toLowerCase() === 'trial') {
              mode = 'trial';
            }
          }
        }

        results.push({
          module,
          attemptToken: row.attempt_token,
          assessmentCode: row.assessment_code,
          assessmentName: row.assessment_name,
          startedAt: row.started_at,
          expiresAt: row.expires_at,
          timeLeftSeconds: Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / 1000)),
          mode,
          isBlockBased: String(row.attempt_token).includes('BLOCK'),
        });
      }

      results.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      return results;
    } finally {
      await queryRunner.release();
    }
  }

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
    if (userId !== undefined && userId !== null) {
      const parsed = Number(userId);
      if (Number.isFinite(parsed)) return parsed;

      const emailStr = String(userId).trim();
      if (emailStr.length > 0 && emailStr.includes('@')) {
        const rows = await queryRunner.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [emailStr]);
        if (rows.length > 0) {
          return rows[0].id;
        }
      }
    }
    return null;
  }


  private getTableMap() {
    return {
      aptitude: {
        attempts: 'tech_aptitude_attempts',
        questions: 'tech_aptitude_questions',
        junction: 'tech_aptitude_attempt_questions',
        idCol: 'aptitude_question_id',
        options: 'tech_aptitude_options',
        attemptIdCol: 'aptitude_attempt_id',
        catCol: 'subcategory',
        hasDifficulty: true,
        hasMode: true,
        hasImageUrl: true,
      },
      grammar: {
        attempts: 'tech_grammar_attempts',
        questions: 'tech_grammar_questions',
        junction: 'tech_grammar_attempt_questions',
        idCol: 'grammar_question_id',
        options: 'tech_grammar_options',
        attemptIdCol: 'grammar_attempt_id',
        catCol: 'task_type',
        hasDifficulty: true,
        hasMode: true,
      },
      mnc: {
        attempts: 'tech_mnc_attempts',
        questions: 'tech_mnc_questions',
        junction: 'tech_mnc_attempt_questions',
        idCol: 'mnc_question_id',
        options: 'tech_mnc_options',
        attemptIdCol: 'mnc_attempt_id',
        catCol: 'category',
        hasDifficulty: true,
        hasMode: true,
      },
      role: {
        attempts: 'tech_role_attempts',
        questions: 'tech_role_questions',
        junction: 'tech_role_attempt_questions',
        idCol: 'role_question_id',
        options: 'tech_role_options',
        attemptIdCol: 'role_attempt_id',
        catCol: 'domain',
        hasDifficulty: false,  // tech_role_questions has NO difficulty column
        hasMode: false,        // tech_role_questions has NO mode column
      },
      coding: {
        attempts: 'tech_coding_attempts',
        questions: 'tech_coding_questions',
        junction: 'tech_coding_attempt_questions',
        idCol: 'coding_question_id',
        options: null,
        attemptIdCol: 'coding_attempt_id',
        catCol: 'difficulty',
        hasDifficulty: true,
        hasMode: false,
      },
    } as Record<string, any>;
  }

  async startAttempt(module: string, data: any) {
    const { assessmentId, assessmentCode, userId, mode = 'main' } = data;
    this.logger.log(`startAttempt: module=${module}, code=${assessmentCode}, mode=${mode}`);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const dbModule = module === 'communication' ? 'grammar' : module;
      const tableMap = this.getTableMap();
      const config = tableMap[dbModule];
      if (!config) throw new BadRequestException(`Module ${module} not supported yet`);

      let assessment: any;

      const hasQuestions = async (assessmentIdVal: number): Promise<boolean> => {
        try {
          const rows = await queryRunner.query(
            `SELECT COUNT(*) as count FROM ${config.questions} WHERE assessment_id = $1 AND status = 'active'`,
            [assessmentIdVal],
          );
          return Number(rows[0]?.count || 0) > 0;
        } catch (err: any) {
          this.logger.error(`Error checking questions count for assessment ${assessmentIdVal}: ${err.message}`);
          return false;
        }
      };

      if (assessmentId) {
        const rows = await queryRunner.query(
          `SELECT * FROM tech_assessments WHERE assessment_id = $1 AND module_type = $2`,
          [assessmentId, dbModule],
        );
        assessment = rows[0];
      } else if (assessmentCode) {
        const rows = await queryRunner.query(
          `SELECT * FROM tech_assessments WHERE assessment_code = $1 AND module_type = $2`,
          [assessmentCode, dbModule],
        );
        assessment = rows[0];
        if (assessment) {
          const ok = await hasQuestions(assessment.assessment_id);
          if (!ok) {
            this.logger.warn(`Assessment ${assessmentCode} (ID: ${assessment.assessment_id}) has 0 questions. Falling back.`);
            assessment = null;
          }
        }
        if (!assessment) {
          this.logger.warn(`Code ${assessmentCode} not found or has no active questions, using fallback active ${module} assessment with questions`);
          const fallbacks = await queryRunner.query(
            `SELECT * FROM tech_assessments WHERE module_type = $1 AND status = 'active' ORDER BY assessment_id DESC`,
            [dbModule],
          );
          for (const fb of fallbacks) {
            if (await hasQuestions(fb.assessment_id)) {
              assessment = fb;
              break;
            }
          }
          if (!assessment && fallbacks.length > 0) {
            assessment = fallbacks[0];
          }
        }
      } else {
        const fallbacks = await queryRunner.query(
          `SELECT * FROM tech_assessments WHERE module_type = $1 AND status = 'active' ORDER BY assessment_id DESC`,
          [dbModule],
        );
        for (const fb of fallbacks) {
          if (await hasQuestions(fb.assessment_id)) {
            assessment = fb;
            break;
          }
        }
        if (!assessment && fallbacks.length > 0) {
          assessment = fallbacks[0];
        }
      }

      if (!assessment) throw new NotFoundException(`${module} assessment not found`);

      // ── Adaptive routing ──────────────────────────────────────────────────
      // If adaptive_enabled is true on the assessment (and it's not coding),
      // delegate to the block-based flow transparently.
      const ADAPTIVE_SUPPORTED = ['aptitude', 'grammar', 'mnc', 'role'];
      if (
        Boolean(assessment.adaptive_enabled) &&
        ADAPTIVE_SUPPORTED.includes(dbModule) &&
        module !== 'coding'
      ) {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        return this.startBlockBasedAttempt(module, data);
      }
      // ─────────────────────────────────────────────────────────────────────

      const resolvedUserId = await this.resolveUserId(queryRunner, userId);
      if (!resolvedUserId) throw new BadRequestException('No users found.');

      const durationMinutes = Number(assessment.total_time_minutes || 60);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
      const requestedMode = mode === 'trial' ? 'trial' : 'main';

      // If there is an active in-progress attempt for this user+assessment, resume it.
      const existingRows = await queryRunner.query(
        `SELECT * FROM ${config.attempts}
         WHERE assessment_id = $1 AND user_id = $2 AND status = 'in_progress'
         ORDER BY started_at DESC LIMIT 1`,
        [assessment.assessment_id, resolvedUserId],
      );

      if (existingRows.length > 0) {
        const existing = existingRows[0];
        const existingExpires = new Date(existing.expires_at);
        if (existingExpires > now) {
          const attemptId = existing[config.attemptIdCol];
          const shuffleSeed = existing.shuffle_seed ?? '';
          const questions = await this.getAttemptQuestionsByConfig(
            attemptId, config, assessment.shuffle_options, shuffleSeed,
          );
          const answers = await this.getAttemptAnswersByConfig(attemptId, config, dbModule);
          const timeLeftSeconds = Math.max(
            0,
            Math.round((existingExpires.getTime() - Date.now()) / 1000),
          );
          await queryRunner.commitTransaction();
          return {
            attemptToken: existing.attempt_token,
            expiresAt: existing.expires_at,
            durationSeconds: durationMinutes * 60,
            timeLeftSeconds,
            mode: requestedMode,
            questions,
            totalQuestions: questions.length,
            answers,
            resumed: true,
          };
        }

        // Expired in-progress attempt; mark as expired and start a new one.
        await queryRunner.query(
          `UPDATE ${config.attempts} SET status = 'expired', updated_at = NOW()
           WHERE ${config.attemptIdCol} = $1`,
          [existing[config.attemptIdCol]],
        );
      }

      // Check if user has already completed the assessment (submitted or evaluated)
      // and enforce attempt limits to prevent re-taking
      const completedAttemptsQuery = config.hasMode
        ? `
          SELECT COUNT(DISTINCT a.${config.attemptIdCol}) as count
          FROM ${config.attempts} a
          JOIN ${config.junction} aq ON aq.${config.attemptIdCol} = a.${config.attemptIdCol}
          JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
          WHERE a.user_id = $1 AND a.assessment_id = $2 
            AND a.status IN ('submitted', 'evaluated')
            AND q.mode = $3
        `
        : `
          SELECT COUNT(*) as count
          FROM ${config.attempts}
          WHERE user_id = $1 AND assessment_id = $2 
            AND status IN ('submitted', 'evaluated')
        `;

      const completedAttemptsParams = config.hasMode
        ? [resolvedUserId, assessment.assessment_id, requestedMode]
        : [resolvedUserId, assessment.assessment_id];

      const completedAttemptsResult = await queryRunner.query(
        completedAttemptsQuery,
        completedAttemptsParams,
      );

      const completedCount = Number(completedAttemptsResult[0]?.count || 0);
      const attemptLimit = requestedMode === 'trial'
        ? Number(assessment.trial_attempts_limit || 5)
        : Number(assessment.main_attempts_limit || 2);

      if (completedCount >= attemptLimit) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException(
          `You have already completed this assessment ${attemptLimit} time(s) in ${requestedMode} mode. No more attempts allowed.`
        );
      }

      const attemptToken = `${module.substring(0, 3).toUpperCase()}-${crypto.randomUUID()}`;
      const shuffleSeed = crypto.randomBytes(8).toString('hex');


      let attemptResult: any[];
      if (module === 'coding') {
        attemptResult = await queryRunner.query(
          `INSERT INTO ${config.attempts}
              (assessment_id, user_id, attempt_token, status, started_at, expires_at, created_at, updated_at, mode)
           VALUES ($1, $2, $3, 'in_progress', $4, $5, NOW(), NOW(), $6)
           RETURNING *`,
          [assessment.assessment_id, resolvedUserId, attemptToken, now, expiresAt, requestedMode],
        );
      } else {
        attemptResult = await queryRunner.query(
          `INSERT INTO ${config.attempts}
              (assessment_id, user_id, attempt_token, shuffle_seed, status, started_at, expires_at, created_at, updated_at, mode)
           VALUES ($1, $2, $3, $4, 'in_progress', $5, $6, NOW(), NOW(), $7)
           RETURNING *`,
          [assessment.assessment_id, resolvedUserId, attemptToken, shuffleSeed, now, expiresAt, requestedMode],
        );
      }
      const attemptId = attemptResult[0][config.attemptIdCol];

      let questions: any[] = [];

      const enabledTypes = assessment.enabled_question_types || {};
      const showMcq = enabledTypes.mcq !== false;
      const showMsq = enabledTypes.msq !== false;
      const showTf = enabledTypes.true_false !== false;

      const typeFilter = `AND (
        ( (q.metadata->>'kind' IS NULL OR q.metadata->>'kind' = '' OR q.metadata->>'kind' = 'mcq') AND (ass.enabled_question_types->>'mcq')::boolean IS NOT FALSE ) OR
        ( q.metadata->>'kind' = 'msq' AND (ass.enabled_question_types->>'msq')::boolean IS NOT FALSE ) OR
        ( q.metadata->>'kind' = 'tf' AND (ass.enabled_question_types->>'true_false')::boolean IS NOT FALSE ) OR
        ( q.metadata->>'kind' = 'numerical' AND (ass.enabled_question_types->>'numerical')::boolean IS NOT FALSE )
      )`;

      if (!config.hasMode) {
        // role and coding have no mode column
        questions = await queryRunner.query(
          `SELECT q.${config.idCol} FROM ${config.questions} q
           JOIN tech_assessments ass ON ass.assessment_id = q.assessment_id
           WHERE q.assessment_id = $1 AND q.status = 'active' ${typeFilter}`,
          [assessment.assessment_id],
        );
      } else {
        questions = await queryRunner.query(
          `SELECT q.${config.idCol} FROM ${config.questions} q
           JOIN tech_assessments ass ON ass.assessment_id = q.assessment_id
           WHERE q.assessment_id = $1 AND q.status = 'active' AND q.mode = $2 ${typeFilter}`,
          [assessment.assessment_id, requestedMode],
        );
        if (questions.length === 0 && requestedMode === 'trial') {
          this.logger.warn(`No trial questions found for ${module}, falling back to main mode`);
          questions = await queryRunner.query(
            `SELECT q.${config.idCol} FROM ${config.questions} q
             JOIN tech_assessments ass ON ass.assessment_id = q.assessment_id
             WHERE q.assessment_id = $1 AND q.status = 'active' AND q.mode = 'main' ${typeFilter}`,
            [assessment.assessment_id],
          );
        }
      }

      if (questions.length === 0) {
        throw new BadRequestException(`No active questions found for this assessment.`);
      }

      const shuffled = assessment.shuffle_questions
        ? this.shuffleWithSeed(questions, shuffleSeed)
        : questions;

      let finalQuestions = shuffled;
      if (requestedMode === 'trial') {
        if (shuffled.length > 5) {
          finalQuestions = shuffled.slice(0, 5);
        }
      } else {
        const questionLimit = Number(assessment.question_limit || 0);
        if (questionLimit > 0 && shuffled.length > questionLimit) {
          finalQuestions = shuffled.slice(0, questionLimit);
        }
      }

      for (let i = 0; i < finalQuestions.length; i++) {
        await queryRunner.query(
          `INSERT INTO ${config.junction} (${config.attemptIdCol}, ${config.idCol}, display_order)
           VALUES ($1, $2, $3)`,
          [attemptId, finalQuestions[i][config.idCol], i + 1],
        );
      }

      await queryRunner.commitTransaction();

      const fullQuestions = await this.getAttemptQuestionsByConfig(
        attemptId, config, assessment.shuffle_options, shuffleSeed,
        assessment.enabled_question_types,
      );

      return {
        attemptToken,
        expiresAt,
        durationSeconds: durationMinutes * 60,
        timeLeftSeconds: durationMinutes * 60,
        mode: requestedMode,
        questions: fullQuestions,
        totalQuestions: fullQuestions.length,
        answers: {},
        resumed: false,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      this.logger.error(`startAttempt (${module}) error:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Determine the effective question kind for questions that don't have an explicit kind set.
   * If the assessment has only one question type enabled, use that as the kind.
   * Otherwise default to 'mcq'.
   */
  private inferQuestionKind(enabledTypes?: any): string | null {
    if (!enabledTypes) return null;
    const mcq = enabledTypes.mcq !== false;
    const msq = enabledTypes.msq === true;
    const tf = enabledTypes.true_false === true;
    const num = enabledTypes.numerical === true;

    // If only one type is enabled, infer that as the kind
    if (msq && !mcq && !tf && !num) return 'msq';
    if (tf && !mcq && !msq && !num) return 'tf';
    if (num && !mcq && !msq && !tf) return 'numerical';
    // If MCQ is the only enabled type or multiple types are enabled, return null (default mcq)
    return null;
  }

  private async getAttemptQuestionsByConfig(
    attemptId: number,
    config: any,
    shuffleOptions: boolean,
    seed: string,
    enabledQuestionTypes?: any,
  ) {
    const isAptitude = config.questions === 'tech_aptitude_questions';
    const isGrammar  = config.questions === 'tech_grammar_questions';
    const isRole     = config.questions === 'tech_role_questions';
    const isMnc      = config.questions === 'tech_mnc_questions';
    const isCoding   = config.questions === 'tech_coding_questions';

    let extraSelect = '';
    if (isAptitude) {
      extraSelect = ', q.image_url, q.marks, q.negative_marks';
    } else if (isGrammar) {
      extraSelect = ', q.task_type, q.audio_url, q.passage_text, q.reference_answer, q.marks, q.negative_marks';
    } else if (isRole) {
      // tech_role_questions has NO difficulty column
      extraSelect = ', q.domain, q.question_type, q.scenario_context, q.marks, q.negative_marks';
    } else if (isMnc) {
      extraSelect = ', q.topic_group, q.category, q.subcategory, q.marks, q.negative_marks';
    }
    extraSelect += ', q.metadata';

    const difficultySelect = config.hasDifficulty ? ', q.difficulty' : '';
    const textColumn = isCoding ? 'q.problem_statement' : 'q.question_text';

    const questionRows = await this.dataSource.query(
      `SELECT aq.display_order, q.${config.idCol} as question_id,
              ${textColumn} as question_text${difficultySelect}${extraSelect},
              ass.negative_mark_enabled, ass.negative_mark_value, ass.difficulty_negative_marks
       FROM ${config.junction} aq
       JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
       JOIN tech_assessments ass ON ass.assessment_id = q.assessment_id
       WHERE aq.${config.attemptIdCol} = $1
       ORDER BY aq.display_order ASC`,
      [attemptId],
    );

    const questions: any[] = [];
    for (const q of questionRows) {
      let finalOptions: any[] = [];

      if (config.options) {
        const options = await this.dataSource.query(
          `SELECT option_id::text as id, option_text as text
           FROM ${config.options}
           WHERE ${config.idCol} = $1
           ORDER BY option_id ASC`,
          [q.question_id],
        );
        finalOptions = shuffleOptions
          ? this.shuffleWithSeed(options, seed + q.question_id)
          : options;
      }

      // Infer question kind for untyped questions based on assessment config
      let questionMetadata = q.metadata || {};
      if (!questionMetadata.kind || questionMetadata.kind === '') {
        const inferredKind = this.inferQuestionKind(enabledQuestionTypes);
        if (inferredKind) {
          questionMetadata = { ...questionMetadata, kind: inferredKind };
        }
      }

      let qNegMarks = q.negative_marks ? Number(q.negative_marks) : undefined;
      if (q.negative_mark_enabled) {
        if (q.difficulty_negative_marks) {
          const diffMap = typeof q.difficulty_negative_marks === 'object'
            ? q.difficulty_negative_marks
            : (() => { try { return JSON.parse(q.difficulty_negative_marks); } catch { return {}; } })();
          const diffKey = String(q.difficulty || 'medium').toLowerCase();
          if (diffMap && diffMap[diffKey] !== undefined && diffMap[diffKey] !== null) {
            qNegMarks = Number(diffMap[diffKey]);
          } else {
            qNegMarks = q.negative_marks ? Number(q.negative_marks) : (q.negative_mark_value ? Number(q.negative_mark_value) : 0);
          }
        } else {
          qNegMarks = q.negative_marks ? Number(q.negative_marks) : (q.negative_mark_value ? Number(q.negative_mark_value) : 0);
        }
      } else {
        qNegMarks = 0;
      }

      const base: any = {
        id: q.question_id,
        text: q.question_text,
        options: finalOptions,
        marks: q.marks ? Number(q.marks) : undefined,
        negativeMarks: qNegMarks,
        metadata: questionMetadata,
      };

      if (config.hasDifficulty && q.difficulty !== undefined) {
        base.difficulty = q.difficulty;
      }

      if (isAptitude && q.image_url) base.imageUrl = q.image_url;
      if (isGrammar) {
        base.taskType        = q.task_type;
        base.audioUrl        = q.audio_url;
        base.passageText     = q.passage_text;
        base.referenceAnswer = q.reference_answer;
      }
      if (isRole) {
        base.type            = q.question_type === 'scenario' ? 'scenario' : 'conceptual';
        base.category        = q.domain;
        base.scenarioContext = q.scenario_context;
      }
      if (isMnc) {
        base.topic = q.topic_group;
        base.category = q.category || q.topic_group;
        base.subcategory = q.subcategory || q.topic_group;
      }

      questions.push(base);
    }

    return questions;
  }

  async startAptitudeAttempt(data: any) {
    return this.startAttempt('aptitude', data);
  }

  /**
   * Returns only the current (unlocked) block's questions.
   * The UI uses this to know exactly which 5 questions to show.
   */
  async getCurrentBlock(token: string) {
    // Detect module from token prefix
    const moduleType =
      token.includes('BLOCK') && token.startsWith('APT') ? 'aptitude' :
      token.includes('BLOCK') && token.startsWith('GRA') ? 'grammar' :
      token.includes('BLOCK') && token.startsWith('MNC') ? 'mnc' :
      token.startsWith('APT-') ? 'aptitude' :
      token.startsWith('GRA-') || token.startsWith('COM-') ? 'grammar' :
      token.startsWith('MNC-') ? 'mnc' : 'aptitude';

    const tableMap = this.getTableMap();
    const config = tableMap[moduleType];
    if (!config) throw new BadRequestException(`Unknown module for token: ${token}`);

    const attemptRows = await this.dataSource.query(
      `SELECT a.*, ass.shuffle_options, ass.block_config
       FROM ${config.attempts} a
       JOIN tech_assessments ass ON ass.assessment_id = a.assessment_id
       WHERE a.attempt_token = $1`,
      [token],
    );
    const attempt = attemptRows[0];
    if (!attempt) throw new NotFoundException('Attempt not found');
    const attemptId = attempt[config.attemptIdCol];

    // Find the current active block number (highest in_progress or last generated)
    const blockRow = await this.dataSource.query(
      `SELECT block_number, difficulty_achieved
       FROM block_attempts
       WHERE attempt_token = $1 AND status = 'in_progress'
       ORDER BY block_number DESC LIMIT 1`,
      [token],
    );
    if (!blockRow.length) throw new BadRequestException('No active block found');
    const currentBlockNumber = blockRow[0].block_number;
    const currentDifficulty = blockRow[0].difficulty_achieved;

    const imgCol = config.hasImageUrl ? ', q.image_url' : '';

    // Fetch only the current block's questions — filter by block_number, NOT is_locked.
    // Previous blocks are locked in DB but the UI only ever sees the current block.
    const questionRows = await this.dataSource.query(
      `SELECT aq.display_order, aq.block_sequence_order, aq.block_number,
              q.${config.idCol} AS question_id, q.question_text, q.difficulty,
              q.${config.catCol} AS category, q.marks, q.negative_marks${imgCol},
              ass.negative_mark_enabled, ass.negative_mark_value, ass.difficulty_negative_marks
       FROM ${config.junction} aq
       JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
       JOIN tech_assessments ass ON ass.assessment_id = q.assessment_id
       WHERE aq.${config.attemptIdCol} = $1
         AND aq.block_number = $2
       ORDER BY aq.block_sequence_order ASC`,
      [attemptId, currentBlockNumber],
    );

    const questions: any[] = [];
    for (const q of questionRows) {
      const options = await this.dataSource.query(
        `SELECT option_id::text AS id, option_text AS text
         FROM ${config.options}
         WHERE ${config.idCol} = $1
         ORDER BY option_id ASC`,
        [q.question_id],
      );
      
      let finalOptions = options;
      if (attempt.shuffle_options) {
        finalOptions = this.shuffleWithSeed(options, (attempt.shuffle_seed || '') + q.question_id);
      }
      
      let qNegMarks = Number(q.negative_marks);
      if (q.negative_mark_enabled) {
        if (q.difficulty_negative_marks) {
          const diffMap = typeof q.difficulty_negative_marks === 'object'
            ? q.difficulty_negative_marks
            : (() => { try { return JSON.parse(q.difficulty_negative_marks); } catch { return {}; } })();
          const diffKey = String(q.difficulty || 'medium').toLowerCase();
          if (diffMap && diffMap[diffKey] !== undefined && diffMap[diffKey] !== null) {
            qNegMarks = Number(diffMap[diffKey]);
          } else {
            qNegMarks = q.negative_marks ? Number(q.negative_marks) : (q.negative_mark_value ? Number(q.negative_mark_value) : 0);
          }
        } else {
          qNegMarks = q.negative_marks ? Number(q.negative_marks) : (q.negative_mark_value ? Number(q.negative_mark_value) : 0);
        }
      } else {
        qNegMarks = 0;
      }

      questions.push({
        id: q.question_id,
        text: q.question_text,
        difficulty: q.difficulty,
        category: q.category,
        marks: Number(q.marks),
        negativeMarks: qNegMarks,
        imageUrl: config.hasImageUrl ? (q.image_url ?? undefined) : undefined,
        options: finalOptions,
        blockNumber: q.block_number,
        blockSequenceOrder: q.block_sequence_order,
        displayOrder: q.display_order,
      });
    }

    const rawBC = attempt.block_config ?? {};
    const totalBlocks = Number(rawBC.blocksPerAssessment ?? rawBC.blocks_per_assessment ?? 1);

    return {
      attemptToken: token,
      currentBlockNumber,
      totalBlocks,
      difficulty: currentDifficulty,
      isLastBlock: currentBlockNumber === totalBlocks,
      questions,
      totalQuestionsInBlock: questions.length,
    };
  }

  async getAttemptQuestions(token: string) {
    try {
      const moduleType =
        token.startsWith('APT-') ? 'aptitude' :
        token.startsWith('GRA-') || token.startsWith('COM-') ? 'grammar' :
        token.startsWith('MNC-') ? 'mnc' :
        token.startsWith('ROL-') ? 'role' : 'aptitude';

      const tableMap = this.getTableMap();
      const config = tableMap[moduleType];
      if (!config) throw new BadRequestException(`Unknown module for token: ${token}`);

      const attemptRows = await this.dataSource.query(
        `SELECT a.*, ass.shuffle_options, ass.module_type, ass.enabled_question_types
         FROM ${config.attempts} a
         JOIN tech_assessments ass ON ass.assessment_id = a.assessment_id
         WHERE a.attempt_token = $1`,
        [token],
      );

      const attempt = attemptRows[0];
      if (!attempt) throw new NotFoundException('Attempt not found');
      const attemptId = attempt[config.attemptIdCol];

      const questions = await this.getAttemptQuestionsByConfig(
        attemptId, config, attempt.shuffle_options, attempt.shuffle_seed,
        attempt.enabled_question_types,
      );

      const answers = await this.getAttemptAnswersByConfig(attemptId, config, moduleType);

      return {
        questions,
        answers,
        expiresAt: attempt.expires_at,
        status: attempt.status,
      };
    } catch (error) {
      this.logger.error('getAttemptQuestions error:', error);
      throw error;
    }
  }

  async getLatestSubmittedResult(module: string, userIdParam?: any, attemptTokenParam?: string) {
    const dbModule = module === 'communication' ? 'grammar' : module;
    const tableMap = this.getTableMap();
    const config = tableMap[dbModule];
    if (!config) throw new BadRequestException(`Module ${module} not supported`);

    let queryRunner: any;
    try {
      queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const resolvedUserId = await this.resolveUserId(queryRunner, userIdParam);
      if (!resolvedUserId) return null;

      let attemptRows: any[] = [];
      const sanitizedToken = String(attemptTokenParam ?? '').trim();

      if (sanitizedToken.length > 0) {
        attemptRows = await queryRunner.query(
          `SELECT *
           FROM ${config.attempts}
           WHERE attempt_token = $1 AND user_id = $2 AND status IN ('submitted', 'evaluated')
           ORDER BY submitted_at DESC NULLS LAST, updated_at DESC
           LIMIT 1`,
          [sanitizedToken, resolvedUserId],
        );
      }

      if (attemptRows.length === 0) {
        attemptRows = await queryRunner.query(
          `SELECT *
           FROM ${config.attempts}
           WHERE user_id = $1 AND status IN ('submitted', 'evaluated')
           ORDER BY submitted_at DESC NULLS LAST, updated_at DESC
           LIMIT 1`,
          [resolvedUserId],
        );
      }

      const attempt = attemptRows[0];
      if (!attempt) return null;

      const snapshot = await this.evaluateAttemptFromStoredAnswers(
        queryRunner,
        dbModule,
        config,
        attempt,
      );

      return snapshot;
    } catch (error) {
      this.logger.error(`getLatestSubmittedResult (${module}) error:`, error);
      throw error;
    } finally {
      if (queryRunner) {
        await queryRunner.release();
      }
    }
  }

  private async evaluateAttemptFromStoredAnswers(
    queryRunner: any,
    moduleType: string,
    config: any,
    attempt: any,
  ) {
    const isCoding = moduleType === 'coding';
    const isGrammar = moduleType === 'grammar';
    const isRole = moduleType === 'role';
    const attemptId = attempt[config.attemptIdCol];
    const correctOptCol = isCoding ? `NULL as correct_option_id` : `q.correct_option_id`;
    const selectedOptionIdCol = isCoding ? `NULL::bigint as selected_option_id` : `aq.selected_option_id`;
    const taskTypeCol = isGrammar ? `q.task_type` : `NULL as task_type`;
    const roleTypeCol = isRole ? `q.question_type` : `NULL as question_type`;
    const questionMetadataCol = (!isCoding && !isGrammar)
      ? `q.metadata as question_metadata`
      : `NULL::jsonb as question_metadata`;
    const attemptMetadataCol = (!isCoding && !isGrammar)
      ? `aq.metadata as attempt_metadata`
      : `NULL::jsonb as attempt_metadata`;
    // Only aptitude (block-based) junction tables have block_number
    const blockNumberCol = moduleType === 'aptitude' ? `aq.block_number` : `NULL as block_number`;
    // Grammar-only columns
    const answerTextCol = isGrammar ? `aq.answer_text` : `NULL::text as answer_text`;
    const answerAudioCol = isGrammar ? `aq.answer_audio_url` : `NULL::text as answer_audio_url`;
    // Coding-only columns
    const submittedCodeCol = isCoding ? `aq.submitted_code` : `NULL::text as submitted_code`;
    const languageCol = isCoding ? `aq.language` : `NULL::text as language`;
    const difficultyCol = config.hasDifficulty ? `q.difficulty` : `'medium'::text as difficulty`;

    const attemptQuestions = await queryRunner.query(
      `SELECT aq.attempt_question_id,
              aq.display_order,
              ${blockNumberCol},
              aq.${config.idCol} AS question_id,
              ${selectedOptionIdCol},
              ${answerTextCol},
              ${answerAudioCol},
              ${submittedCodeCol},
              ${languageCol},
              aq.score_awarded,
              aq.negative_applied,
              ${correctOptCol},
              q.question_text,
              q.marks,
              q.negative_marks,
              ${difficultyCol},
              q.${config.catCol} as category,
              ${taskTypeCol},
              ${roleTypeCol},
              ${questionMetadataCol},
              ${attemptMetadataCol},
              ass.negative_mark_enabled,
              ass.negative_mark_value,
              ass.difficulty_negative_marks,
              ass.categories as assessment_categories
       FROM ${config.junction} aq
       JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
       JOIN tech_assessments ass ON ass.assessment_id = q.assessment_id
       WHERE aq.${config.attemptIdCol} = $1
       ORDER BY aq.display_order ASC`,
      [attemptId],
    );

    let totalPositive = 0;
    let totalNegative = 0;
    let maxScore = 0;
    let correctCount = 0;
    let answeredCount = 0;
    let objectiveAnsweredCount = 0;
    let subjectiveAnsweredCount = 0;
    const totalCount = attemptQuestions.length;
    const questionReviews: any[] = [];

    let assessmentCategories: any[] = [];
    if (attemptQuestions.length > 0 && attemptQuestions[0].assessment_categories) {
      const rawCats = attemptQuestions[0].assessment_categories;
      if (Array.isArray(rawCats)) {
        assessmentCategories = rawCats;
      } else if (typeof rawCats === 'string') {
        try {
          assessmentCategories = JSON.parse(rawCats);
        } catch {
          assessmentCategories = [];
        }
      }
    }

    const sectionMap: Record<string, {
      name: string;
      score: number;
      maxScore: number;
      answeredCount: number;
      totalCount: number;
      correctCount: number;
      objectiveAnsweredCount: number;
    }> = {};

    const normalizeQuestionKind = (rawKind: any): 'mcq' | 'msq' | 'tf' | 'numerical' => {
      const kind = String(rawKind || 'mcq').toLowerCase();
      if (kind === 'true_false') return 'tf';
      if (kind === 'msq' || kind === 'tf' || kind === 'numerical') return kind;
      return 'mcq';
    };

    const asObject = (value: any): Record<string, any> => {
      if (!value) return {};
      if (typeof value === 'object' && !Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
        } catch {
          return {};
        }
      }
      return {};
    };

    for (const aq of attemptQuestions) {
      const category = aq.category || 'General';

      let categoryName = category;
      if (Array.isArray(assessmentCategories)) {
        const matched = assessmentCategories.find((c: any) => {
          if (typeof c === 'string') return c === category;
          return c.id === category || c.name === category;
        });
        if (matched) {
          categoryName = typeof matched === 'string' ? matched : (matched.name || matched.id);
        }
      }

      if (!sectionMap[category]) {
        sectionMap[category] = {
          name: categoryName,
          score: 0,
          maxScore: 0,
          answeredCount: 0,
          totalCount: 0,
          correctCount: 0,
          objectiveAnsweredCount: 0,
        };
      }

      const questionMarks = Number(aq.marks || 1);
      let questionNegMarks = 0;
      if (aq.negative_mark_enabled) {
        let diffNeg = 0;
        if (aq.difficulty_negative_marks) {
          const diffMap = typeof aq.difficulty_negative_marks === 'object'
            ? aq.difficulty_negative_marks
            : (() => { try { return JSON.parse(aq.difficulty_negative_marks); } catch { return {}; } })();
          const diffKey = String(aq.difficulty || 'medium').toLowerCase();
          if (diffMap && diffMap[diffKey] !== undefined && diffMap[diffKey] !== null) {
            diffNeg = Number(diffMap[diffKey]);
          } else {
            diffNeg = Number(aq.negative_marks || aq.negative_mark_value || 0);
          }
        } else {
          diffNeg = Number(aq.negative_marks || aq.negative_mark_value || 0);
        }
        questionNegMarks = diffNeg;
      }

      sectionMap[category].totalCount += 1;
      sectionMap[category].maxScore += questionMarks;
      maxScore += questionMarks;

      const optionTextById = new Map<string, string>();
      let optionsForReview: Array<{ id: string; text: string }> = [];
      if (config.options) {
        const optionRows = await queryRunner.query(
          `SELECT option_id::text as id, option_text as text
           FROM ${config.options}
           WHERE ${config.idCol} = $1
           ORDER BY option_id ASC`,
          [aq.question_id],
        );
        optionsForReview = optionRows.map((row: any) => ({
          id: String(row.id),
          text: String(row.text ?? ''),
        }));
        for (const option of optionsForReview) {
          optionTextById.set(option.id, option.text);
        }
      }

      const taskType = String(aq.task_type || '').toLowerCase();
      const questionMetadata = asObject(aq.question_metadata);
      const attemptMetadata = asObject(aq.attempt_metadata);
      const isObjectiveGrammar = isGrammar && (taskType === 'listening_mcq' || taskType === 'reading_mcq');
      const questionKind = (!isCoding && (!isGrammar || isObjectiveGrammar))
        ? normalizeQuestionKind((questionMetadata as any).kind)
        : null;
      const metadataSubmittedAnswer = (attemptMetadata as any).submittedAnswer;
      const selectedAnswerValue =
        (!isCoding &&
          (!isGrammar || isObjectiveGrammar) &&
          (questionKind === 'msq' || questionKind === 'numerical') &&
          metadataSubmittedAnswer !== undefined &&
          metadataSubmittedAnswer !== null &&
          metadataSubmittedAnswer !== '')
          ? metadataSubmittedAnswer
          : aq.selected_option_id;

      const review: any = {
        questionId: String(aq.question_id),
        displayOrder: Number(aq.display_order || 0),
        category: categoryName,
        type: isCoding
          ? 'coding'
          : isGrammar
            ? String(aq.task_type || 'mcq').toLowerCase()
            : isRole
              ? String(aq.question_type || 'conceptual').toLowerCase()
              : (questionKind || 'mcq'),
        questionText: String(aq.question_text || ''),
        options: optionsForReview,
        selectedOptionId: null,
        selectedAnswerText: null,
        correctOptionId:
          questionKind === 'msq'
            ? (Array.isArray((questionMetadata as any).correctOptionIds)
                ? (questionMetadata as any).correctOptionIds.map((id: any) => String(id))
                : [])
            : (aq.correct_option_id !== null && aq.correct_option_id !== undefined
                ? String(aq.correct_option_id)
                : null),
        correctAnswerText: null,
        isCorrect: null,
        status: 'unanswered',
      };

      if (questionKind === 'msq') {
        const correctChoices = Array.isArray(review.correctOptionId) ? review.correctOptionId : [];
        review.correctAnswerText = correctChoices
          .map((id: string) => optionTextById.get(id) ?? id)
          .join(', ');
      } else if (questionKind === 'numerical') {
        review.correctAnswerText = String((questionMetadata as any).correctAnswer ?? '');
      } else {
        if (review.correctOptionId && optionTextById.has(review.correctOptionId)) {
          review.correctAnswerText = optionTextById.get(review.correctOptionId);
        }
      }

      if (isCoding) {
        const submittedCode = aq.submitted_code !== null && aq.submitted_code !== undefined
          ? String(aq.submitted_code).trim()
          : '';
        if (submittedCode.length > 0) {
          answeredCount++;
          subjectiveAnsweredCount++;
          sectionMap[category].answeredCount++;
          review.selectedAnswerText = submittedCode;
          review.status = 'subjective';
        }
        questionReviews.push(review);
        continue;
      }

      if (isGrammar && taskType !== 'listening_mcq' && taskType !== 'reading_mcq') {
        const taskType = String(aq.task_type || '').toLowerCase();
        const selectedOptionId = aq.selected_option_id !== null && aq.selected_option_id !== undefined
          ? String(aq.selected_option_id)
          : '';
        const answerText = aq.answer_text !== null && aq.answer_text !== undefined
          ? String(aq.answer_text).trim()
          : '';
        const answerAudio = aq.answer_audio_url !== null && aq.answer_audio_url !== undefined
          ? String(aq.answer_audio_url).trim()
          : '';
        const isObjectiveTask = taskType === 'listening_mcq' || taskType === 'reading_mcq' || taskType === 'mcq';

        if (isObjectiveTask && selectedOptionId) {
          answeredCount++;
          objectiveAnsweredCount++;
          sectionMap[category].answeredCount++;
          sectionMap[category].objectiveAnsweredCount++;
          review.selectedOptionId = selectedOptionId;
          review.selectedAnswerText = optionTextById.get(selectedOptionId) ?? selectedOptionId;
          const isCorrect = selectedOptionId === String(aq.correct_option_id);
          review.isCorrect = isCorrect;
          review.status = isCorrect ? 'correct' : 'incorrect';

          if (isCorrect) {
            totalPositive += questionMarks;
            correctCount++;
            sectionMap[category].score += questionMarks;
            sectionMap[category].correctCount++;
          } else {
            totalNegative += questionNegMarks;
            sectionMap[category].score -= questionNegMarks;
          }
        } else if (answerText.length > 0 || answerAudio.length > 0) {
          answeredCount++;
          subjectiveAnsweredCount++;
          sectionMap[category].answeredCount++;
          review.selectedAnswerText = answerText.length > 0 ? answerText : '[Audio response submitted]';
          review.status = 'subjective';
        }

        questionReviews.push(review);
        continue;
      }

      const hasObjectiveAnswer = Array.isArray(selectedAnswerValue)
        ? selectedAnswerValue.length > 0
        : !(selectedAnswerValue === undefined || selectedAnswerValue === null || selectedAnswerValue === '');
      if (hasObjectiveAnswer) {
        answeredCount++;
        objectiveAnsweredCount++;
        sectionMap[category].answeredCount++;
        sectionMap[category].objectiveAnsweredCount++;
        const kind = questionKind || 'mcq';
        let isCorrectAnswer = false;

        if (kind === 'msq') {
          const studentChoices: string[] = Array.isArray(selectedAnswerValue)
            ? selectedAnswerValue.map((id: any) => String(id))
            : (selectedAnswerValue ? [String(selectedAnswerValue)] : []);
          const correctChoices = Array.isArray((questionMetadata as any).correctOptionIds)
            ? (questionMetadata as any).correctOptionIds.map((id: any) => String(id))
            : [];
          review.selectedOptionId = studentChoices;
          review.selectedAnswerText = studentChoices
            .map((id) => optionTextById.get(id) ?? id)
            .join(', ');
          isCorrectAnswer = studentChoices.length > 0 &&
            studentChoices.length === correctChoices.length &&
            studentChoices.every((id: string) => correctChoices.includes(id));
        } else if (kind === 'numerical') {
          const studentAnswer = String(selectedAnswerValue ?? '').trim();
          const correctAnswer = String((questionMetadata as any).correctAnswer ?? '').trim();
          review.selectedOptionId = studentAnswer;
          review.selectedAnswerText = studentAnswer;
          isCorrectAnswer =
            studentAnswer.length > 0 &&
            studentAnswer.toLowerCase() === correctAnswer.toLowerCase();
        } else {
          const selectedOptionId = String(selectedAnswerValue);
          review.selectedOptionId = selectedOptionId;
          review.selectedAnswerText = optionTextById.get(selectedOptionId) ?? selectedOptionId;
          isCorrectAnswer = selectedOptionId === String(aq.correct_option_id);
        }

        review.isCorrect = isCorrectAnswer;
        review.status = isCorrectAnswer ? 'correct' : 'incorrect';

        if (isCorrectAnswer) {
          totalPositive += questionMarks;
          correctCount++;
          sectionMap[category].score += questionMarks;
          sectionMap[category].correctCount++;
        } else {
          totalNegative += questionNegMarks;
          sectionMap[category].score -= questionNegMarks;
        }
      }

      questionReviews.push(review);
    }

    const rawTotalScore = totalPositive - totalNegative;
    const totalScore = rawTotalScore < 0 ? 0 : rawTotalScore;
    const overallScorePercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const wrongCount = Math.max(0, objectiveAnsweredCount - correctCount);
    const skippedCount = Math.max(0, totalCount - answeredCount);
    const accuracyBase = objectiveAnsweredCount > 0 ? objectiveAnsweredCount : totalCount;
    const accuracy = accuracyBase > 0 ? Math.round((correctCount / accuracyBase) * 100) : 0;
    const submittedAt = attempt.submitted_at ? new Date(attempt.submitted_at) : null;
    const startedAt = attempt.started_at ? new Date(attempt.started_at) : null;
    const fallbackDuration = submittedAt && startedAt
      ? Math.max(0, Math.round((submittedAt.getTime() - startedAt.getTime()) / 1000))
      : 0;
    const timeTakenSeconds = Number.isFinite(Number(attempt.time_taken_seconds))
      ? Math.max(0, Math.round(Number(attempt.time_taken_seconds)))
      : fallbackDuration;

    const sections = Object.values(sectionMap).map((sec) => {
      const safeScore = sec.score < 0 ? 0 : sec.score;
      const wrongInSection = Math.max(0, sec.objectiveAnsweredCount - sec.correctCount);
      const accuracyPct = sec.totalCount > 0
        ? Math.round((sec.correctCount / sec.totalCount) * 100)
        : 0;
      const percentage = sec.maxScore > 0
        ? Math.round((safeScore / sec.maxScore) * 100)
        : 0;

      return {
        name: sec.name,
        score: safeScore,
        maxScore: sec.maxScore,
        percentage,
        weight: `${safeScore}/${sec.maxScore}`,
        answeredCount: sec.answeredCount,
        totalCount: sec.totalCount,
        correctCount: sec.correctCount,
        wrongCount: wrongInSection,
        accuracyPct,
      };
    });

    questionReviews.sort((a, b) => {
      const orderA = Number(a.displayOrder || 0);
      const orderB = Number(b.displayOrder || 0);
      return orderA - orderB;
    });

    let attemptMode = attempt.mode || 'main';
    if (!attempt.mode) {
      if (config.hasMode) {
        try {
          const modeRows = await queryRunner.query(
            `SELECT q.mode
             FROM ${config.junction} aq
             JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
             WHERE aq.${config.attemptIdCol} = $1 LIMIT 1`,
            [attemptId]
          );
          if (modeRows.length > 0 && String(modeRows[0].mode).toLowerCase() === 'trial') {
            attemptMode = 'trial';
          }
        } catch (err) {}
      } else {
        if (totalCount <= 5) attemptMode = 'trial';
      }
    }

    return {
      success: true,
      token: attempt.attempt_token,
      attemptToken: attempt.attempt_token,
      module: moduleType,
      mode: attemptMode,
      overallScore: totalScore,
      overallScorePercent,
      totalScore,
      maxScore,
      positiveScore: totalPositive,
      negativeScore: totalNegative,
      correctCount,
      wrongCount,
      answeredCount,
      objectiveAnsweredCount,
      subjectiveAnsweredCount,
      skippedCount,
      totalQuestions: totalCount,
      accuracy,
      accuracyPct: accuracy,
      timeTakenSeconds,
      completedAt: submittedAt ? submittedAt.toISOString() : new Date().toISOString(),
      submittedAt: submittedAt ? submittedAt.toISOString() : undefined,
      sections,
      questionReviews,
      status: 'completed',
    };
  }

  private async getAttemptAnswersByConfig(
    attemptId: number,
    config: any,
    moduleType: string,
  ): Promise<Record<string, any>> {
    const answers: Record<string, any> = {};

    if (moduleType === 'coding') {
      const rows = await this.dataSource.query(
        `SELECT aq.${config.idCol} AS question_id, aq.submitted_code, aq.language
         FROM ${config.junction} aq
         WHERE aq.${config.attemptIdCol} = $1`,
        [attemptId],
      );
      for (const row of rows) {
        const payload: any = {};
        if (row.submitted_code) payload.code = row.submitted_code;
        if (row.language) payload.language = row.language;
        if (Object.keys(payload).length > 0) {
          answers[String(row.question_id)] = payload;
        }
      }
      return answers;
    }

    if (moduleType === 'grammar') {
      const rows = await this.dataSource.query(
        `SELECT aq.${config.idCol} AS question_id,
                aq.selected_option_id, aq.answer_text, aq.answer_audio_url
         FROM ${config.junction} aq
         WHERE aq.${config.attemptIdCol} = $1`,
        [attemptId],
      );
      for (const row of rows) {
        const payload: any = {};
        if (row.selected_option_id !== null && row.selected_option_id !== undefined) {
          payload.optionId = String(row.selected_option_id);
        }
        if (row.answer_text) payload.text = row.answer_text;
        if (row.answer_audio_url) payload.audioUrl = row.answer_audio_url;
        if (Object.keys(payload).length > 0) {
          answers[String(row.question_id)] = payload;
        }
      }
      return answers;
    }

    // MCQ modules: aptitude, mnc, role
    const rows = await this.dataSource.query(
      `SELECT aq.${config.idCol} AS question_id, aq.selected_option_id, aq.metadata
       FROM ${config.junction} aq
       WHERE aq.${config.attemptIdCol} = $1`,
      [attemptId],
    );
    for (const row of rows) {
      const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
      const submittedAnswer = (metadata as any).submittedAnswer;
      if (submittedAnswer !== undefined && submittedAnswer !== null && submittedAnswer !== '') {
        answers[String(row.question_id)] = { optionId: submittedAnswer };
        continue;
      }
      if (row.selected_option_id !== null && row.selected_option_id !== undefined) {
        answers[String(row.question_id)] = { optionId: String(row.selected_option_id) };
      }
    }
    return answers;
  }

  async saveAttemptAnswers(
    module: string,
    token: string,
    answers: Record<string, any>,
  ): Promise<{ saved: number }>
  {
    const dbModule = module === 'communication' ? 'grammar' : module;
    const tableMap = this.getTableMap();
    const config = tableMap[dbModule];
    if (!config) throw new BadRequestException(`Module ${module} not supported`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const attemptRows = await queryRunner.query(
        `SELECT * FROM ${config.attempts} WHERE attempt_token = $1`,
        [token],
      );
      const attempt = attemptRows[0];
      if (!attempt) throw new NotFoundException('Attempt not found');
      if (attempt.status !== 'in_progress') {
        throw new BadRequestException('Attempt is already submitted or closed');
      }
      const attemptId = attempt[config.attemptIdCol];

      const questionRows = await queryRunner.query(
        `SELECT aq.attempt_question_id, aq.${config.idCol} AS question_id
         ${dbModule === 'grammar' ? `, q.task_type` : ''}
         ${dbModule !== 'grammar' && dbModule !== 'coding' ? `, q.metadata` : ''}
         FROM ${config.junction} aq
         ${(dbModule === 'grammar' || (dbModule !== 'grammar' && dbModule !== 'coding')) ? `JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}` : ''}
         WHERE aq.${config.attemptIdCol} = $1`,
        [attemptId],
      );

      const byQuestionId = new Map<string, any>();
      const byAttemptQuestionId = new Map<string, any>();
      for (const row of questionRows) {
        const entry = {
          attemptQuestionId: row.attempt_question_id,
          questionId: row.question_id,
          taskType: row.task_type,
          metadata: row.metadata,
        };
        byQuestionId.set(String(row.question_id), entry);
        byAttemptQuestionId.set(String(row.attempt_question_id), entry);
      }

      const extractOptionId = (value: any) => {
        if (value === undefined || value === null) return null;
        if (typeof value === 'object') {
          return value.optionId ?? value.selectedOptionId ?? value.value ?? null;
        }
        if (value === '') return null;
        return value;
      };

      let saved = 0;
      for (const [key, rawAnswer] of Object.entries(answers ?? {})) {
        const mapping = byQuestionId.get(String(key)) ?? byAttemptQuestionId.get(String(key));
        if (!mapping) continue;

        const attemptQuestionId = mapping.attemptQuestionId;
        const taskType = String(mapping.taskType || '').toLowerCase();

        if (dbModule === 'coding') {
          const code = typeof rawAnswer === 'object'
            ? (rawAnswer as any).code ?? (rawAnswer as any).submittedCode ?? null
            : rawAnswer;
          const language = typeof rawAnswer === 'object'
            ? (rawAnswer as any).language ?? (rawAnswer as any).lang ?? null
            : null;

          if (code || language) {
            await queryRunner.query(
              `UPDATE ${config.junction}
               SET submitted_code = COALESCE($1, submitted_code),
                   language = COALESCE($2, language),
                   submitted_at = NOW()
               WHERE attempt_question_id = $3`,
              [code, language, attemptQuestionId],
            );
            saved++;
          } else {
            await queryRunner.query(
              `UPDATE ${config.junction}
               SET submitted_code = NULL, language = NULL, submitted_at = NULL
               WHERE attempt_question_id = $1`,
              [attemptQuestionId],
            );
          }
          continue;
        }

        if (dbModule === 'grammar') {
          if (taskType === 'listening_mcq' || taskType === 'reading_mcq') {
            const optId = extractOptionId(rawAnswer);
            if (optId) {
              await queryRunner.query(
                `UPDATE ${config.junction}
                 SET selected_option_id = $1, answered_at = NOW()
                 WHERE attempt_question_id = $2`,
                [optId, attemptQuestionId],
              );
              saved++;
            } else {
              await queryRunner.query(
                `UPDATE ${config.junction}
                 SET selected_option_id = NULL, answered_at = NULL
                 WHERE attempt_question_id = $1`,
                [attemptQuestionId],
              );
            }
            continue;
          }

          if (taskType === 'writing') {
            const text = typeof rawAnswer === 'string'
              ? rawAnswer
              : (rawAnswer as any)?.text ?? (rawAnswer as any)?.answerText ?? null;
            if (text) {
              await queryRunner.query(
                `UPDATE ${config.junction}
                 SET answer_text = $1, answered_at = NOW()
                 WHERE attempt_question_id = $2`,
                [text, attemptQuestionId],
              );
              saved++;
            } else {
              await queryRunner.query(
                `UPDATE ${config.junction}
                 SET answer_text = NULL, answered_at = NULL
                 WHERE attempt_question_id = $1`,
                [attemptQuestionId],
              );
            }
            continue;
          }

          if (taskType === 'speaking') {
            const audioPayload = typeof rawAnswer === 'object'
              ? (rawAnswer as any).audio ?? (rawAnswer as any).audioBase64 ?? (rawAnswer as any).audioUrl ?? null
              : null;
            const text = typeof rawAnswer === 'object'
              ? (rawAnswer as any).text ?? (rawAnswer as any).answerText ?? null
              : null;
            if (audioPayload || text) {
              await queryRunner.query(
                `UPDATE ${config.junction}
                 SET answer_audio_url = $1, answer_text = COALESCE($2, answer_text), answered_at = NOW()
                 WHERE attempt_question_id = $3`,
                [audioPayload, text, attemptQuestionId],
              );
              saved++;
            } else {
              await queryRunner.query(
                `UPDATE ${config.junction}
                 SET answer_audio_url = NULL, answer_text = NULL, answered_at = NULL
                 WHERE attempt_question_id = $1`,
                [attemptQuestionId],
              );
            }
            continue;
          }
        }

      const normalizeQuestionKind = (rawKind: any): 'mcq' | 'msq' | 'tf' | 'numerical' => {
        const kind = String(rawKind || 'mcq').toLowerCase();
        if (kind === 'true_false') return 'tf';
        if (kind === 'msq' || kind === 'tf' || kind === 'numerical') return kind;
        return 'mcq';
      };

      // MCQ modules: aptitude, mnc, role
      const selectedOptionId = extractOptionId(rawAnswer);
      const questionMetadata = mapping?.metadata && typeof mapping.metadata === 'object'
        ? mapping.metadata
        : {};
      const kind = normalizeQuestionKind((questionMetadata as any)?.kind);
      const isMsq = kind === 'msq';
      const isNumerical = kind === 'numerical';
      const shouldUseMetadataAnswer = isMsq || isNumerical;

      const hasAnswer = Array.isArray(selectedOptionId)
        ? selectedOptionId.length > 0
        : !(selectedOptionId === null || selectedOptionId === undefined || selectedOptionId === '');

      if (hasAnswer) {
        const metadataUpdate = {
          ...(questionMetadata as Record<string, any>),
          submittedAnswer: shouldUseMetadataAnswer ? selectedOptionId : null,
        };
        await queryRunner.query(
          `UPDATE ${config.junction}
             SET selected_option_id = $1, metadata = $2, answered_at = NOW()
             WHERE attempt_question_id = $3`,
            [shouldUseMetadataAnswer ? null : selectedOptionId, JSON.stringify(metadataUpdate), attemptQuestionId],
        );
        saved++;
      } else {
        await queryRunner.query(
          `UPDATE ${config.junction}
             SET selected_option_id = NULL, metadata = NULL, answered_at = NULL
             WHERE attempt_question_id = $1`,
            [attemptQuestionId],
        );
      }
      }

      await queryRunner.commitTransaction();
      return { saved };
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      this.logger.error(`saveAttemptAnswers (${module}) error:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async submitAttempt(module: string, token: string, body: any) {
    const answers: Record<string, any> = body?.answers ?? body ?? {};
    const dbModule = module === 'communication' ? 'grammar' : module;

    const tableMap = this.getTableMap();
    const config = tableMap[dbModule];
    if (!config) throw new BadRequestException(`Module ${module} not supported`);

    const attemptRows = await this.dataSource.query(
      `SELECT * FROM ${config.attempts} WHERE attempt_token = $1`,
      [token],
    );
    const attempt = attemptRows[0];
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.status !== 'in_progress') {
      throw new BadRequestException('Attempt is already submitted or closed');
    }

    const attemptId = attempt[config.attemptIdCol];
    const isRole = dbModule === 'role';
    const isGrammar = dbModule === 'grammar';
    const isCoding = dbModule === 'coding';

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // role has no difficulty column; coding has no correct_option_id
      const difficultyCol = config.hasDifficulty ? `q.difficulty` : `'medium' as difficulty`;
      const correctOptCol = isCoding ? `NULL as correct_option_id` : `q.correct_option_id`;
      const taskTypeCol = isGrammar ? `q.task_type` : `NULL as task_type`;
      const roleTypeCol = isRole ? `q.question_type` : `NULL as question_type`;

      const attemptQuestions = await queryRunner.query(
        `SELECT aq.*, ${correctOptCol}, q.question_text, q.marks, q.negative_marks, q.mode,
                q.${config.catCol} as category, ${difficultyCol},
                ass.negative_mark_enabled, ass.negative_mark_value, ass.difficulty_negative_marks, ${taskTypeCol},
                ${roleTypeCol}, ass.categories as assessment_categories, q.metadata as question_metadata
         FROM ${config.junction} aq
         JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
         JOIN tech_assessments ass ON ass.assessment_id = q.assessment_id
         WHERE aq.${config.attemptIdCol} = $1
         ORDER BY aq.display_order ASC`,
        [attemptId],
      );

      let totalPositive = 0;
      let totalNegative = 0;
      let correctCount = 0;
      let answeredCount = 0;
      let objectiveAnsweredCount = 0;
      let subjectiveAnsweredCount = 0;
      const totalCount = attemptQuestions.length;
      const questionReviews: any[] = [];

      let assessmentCategories: any[] = [];
      if (attemptQuestions.length > 0 && attemptQuestions[0].assessment_categories) {
        const rawCats = attemptQuestions[0].assessment_categories;
        if (Array.isArray(rawCats)) {
          assessmentCategories = rawCats;
        } else if (typeof rawCats === 'string') {
          try {
            assessmentCategories = JSON.parse(rawCats);
          } catch {}
        }
      }

      const sectionMap: Record<string, {
        name: string;
        score: number;
        maxScore: number;
        answeredCount: number;
        totalCount: number;
        correctCount: number;
        objectiveAnsweredCount: number;
      }> = {};
      const questionIds = attemptQuestions.map((q: any) => q[config.idCol]);
      const allOptions = (config.options && questionIds.length > 0) ? await queryRunner.query(
        `SELECT ${config.idCol} AS question_id, option_id::text AS id, option_text AS text
         FROM ${config.options}
         WHERE ${config.idCol} = ANY($1)
         ORDER BY option_id ASC`,
        [questionIds],
      ) : [];

      const optionsByQuestionId = new Map<string, Array<{ id: string; text: string }>>();
      for (const opt of allOptions) {
        const qId = String(opt.question_id);
        if (!optionsByQuestionId.has(qId)) {
          optionsByQuestionId.set(qId, []);
        }
        optionsByQuestionId.get(qId)!.push({ id: String(opt.id), text: String(opt.text ?? '') });
      }

      const codingUpdates: any[] = [];
      const grammarMcqUpdates: any[] = [];
      const grammarWritingUpdates: any[] = [];
      const grammarSpeakingUpdates: any[] = [];
      const grammarOtherUpdates: any[] = [];
      const standardUpdates: any[] = [];

      for (const aq of attemptQuestions) {
        const questionIdStr = String(aq[config.idCol]);
        const rawSubmittedAnswer = answers
          ? (answers[questionIdStr] ?? answers[String(aq.attempt_question_id)])
          : undefined;
        const category = aq.category || 'General';

        let categoryName = category;
        if (Array.isArray(assessmentCategories)) {
          const matched = assessmentCategories.find((c: any) => {
            if (typeof c === 'string') return c === category;
            return c.id === category || c.name === category;
          });
          if (matched) {
            categoryName = typeof matched === 'string' ? matched : (matched.name || matched.id);
          }
        }

        if (!sectionMap[category]) {
          sectionMap[category] = {
            name: categoryName,
            score: 0,
            maxScore: 0,
            answeredCount: 0,
            totalCount: 0,
            correctCount: 0,
            objectiveAnsweredCount: 0,
          };
        }

        const questionMarks = Number(aq.marks || 1);
        let questionNegMarks = 0;
        if (aq.negative_mark_enabled) {
          let diffNeg = 0;
          if (aq.difficulty_negative_marks) {
            const diffMap = typeof aq.difficulty_negative_marks === 'object'
              ? aq.difficulty_negative_marks
              : (() => { try { return JSON.parse(aq.difficulty_negative_marks); } catch { return {}; } })();
            const diffKey = String(aq.difficulty || 'medium').toLowerCase();
            if (diffMap && diffMap[diffKey] !== undefined && diffMap[diffKey] !== null) {
              diffNeg = Number(diffMap[diffKey]);
            } else {
              diffNeg = Number(aq.negative_marks || aq.negative_mark_value || 0);
            }
          } else {
            diffNeg = Number(aq.negative_marks || aq.negative_mark_value || 0);
          }
          questionNegMarks = diffNeg;
        }

        sectionMap[category].totalCount += 1;
        sectionMap[category].maxScore += questionMarks;

        const optionTextById = new Map<string, string>();
        let optionsForReview: Array<{ id: string; text: string }> = [];
        if (config.options) {
          optionsForReview = optionsByQuestionId.get(String(aq[config.idCol])) ?? [];
          for (const option of optionsForReview) {
            optionTextById.set(option.id, option.text);
          }
        }

        const normalizeQuestionKind = (rawKind: any): 'mcq' | 'msq' | 'tf' | 'numerical' => {
          const kind = String(rawKind || 'mcq').toLowerCase();
          if (kind === 'true_false') return 'tf';
          if (kind === 'msq' || kind === 'tf' || kind === 'numerical') return kind;
          return 'mcq';
        };

        const qMetadataForType = aq.question_metadata || {};
        const reviewKind = (!isCoding && !isGrammar && !isRole) ? normalizeQuestionKind(qMetadataForType.kind) : null;
        const review: any = {
          questionId: questionIdStr,
          displayOrder: Number(aq.display_order || 0),
          category: categoryName,
          type: isCoding
            ? 'coding'
            : isGrammar
              ? String(aq.task_type || 'mcq').toLowerCase()
              : isRole
                ? String(aq.question_type || 'conceptual').toLowerCase()
                : (reviewKind || 'mcq'),
          questionText: String(aq.question_text || ''),
          options: optionsForReview,
          selectedOptionId: null,
          selectedAnswerText: null,
          correctOptionId:
            aq.correct_option_id !== null && aq.correct_option_id !== undefined
              ? String(aq.correct_option_id)
              : null,
          correctAnswerText: null,
          isCorrect: null,
          status: 'unanswered',
        };
        if (review.correctOptionId && optionTextById.has(review.correctOptionId)) {
          review.correctAnswerText = optionTextById.get(review.correctOptionId);
        }

        // Extract selected option ID from raw submitted answer
        let selectedOptionId: any = undefined;
        if (rawSubmittedAnswer !== undefined && rawSubmittedAnswer !== null) {
          if (Array.isArray(rawSubmittedAnswer)) {
            selectedOptionId = rawSubmittedAnswer;
          } else if (typeof rawSubmittedAnswer === 'object') {
            selectedOptionId = (rawSubmittedAnswer as any).optionId
              ?? (rawSubmittedAnswer as any).selectedOptionId
              ?? (rawSubmittedAnswer as any).value;
          } else {
            selectedOptionId = rawSubmittedAnswer;
          }
        }

        if (isCoding) {
          const rawAnswer = rawSubmittedAnswer;
          if (rawAnswer !== undefined && rawAnswer !== null && rawAnswer !== '') {
            const answerPayload = typeof rawAnswer === 'object' ? rawAnswer : { code: String(rawAnswer) };
            const submittedCode = (answerPayload as any).code ?? (answerPayload as any).submittedCode ?? null;
            const language = (answerPayload as any).language ?? (answerPayload as any).lang ?? null;
            if (submittedCode && aq.mode !== 'trial') {
              answeredCount++;
              subjectiveAnsweredCount++;
              sectionMap[category].answeredCount++;
              review.selectedAnswerText = String(submittedCode);
              review.status = 'subjective';
              codingUpdates.push({
                submittedCode,
                language,
                attempt_question_id: aq.attempt_question_id
              });
            }
          }
          questionReviews.push(review);
          continue;
        }

        const taskType = String(aq.task_type || '').toLowerCase();
        if (isGrammar && taskType !== 'listening_mcq' && taskType !== 'reading_mcq') {
          const taskType  = String(aq.task_type || '').toLowerCase();
          const rawAnswer = rawSubmittedAnswer;
          if (rawAnswer !== undefined && rawAnswer !== null && rawAnswer !== '') {
            answeredCount++;
            sectionMap[category].answeredCount++;

            if (taskType === 'listening_mcq' || taskType === 'reading_mcq') {
              const optId = typeof rawAnswer === 'object'
                ? (rawAnswer as any).selectedOptionId ?? (rawAnswer as any).optionId ?? (rawAnswer as any).value
                : rawAnswer;
              if (optId) {
                const isCorrect = Number(optId) === Number(aq.correct_option_id);
                grammarMcqUpdates.push({
                  optId,
                  isCorrect,
                  attempt_question_id: aq.attempt_question_id
                });
                if (isCorrect) {
                  totalPositive += questionMarks;
                  sectionMap[category].score += questionMarks;
                  correctCount++;
                  sectionMap[category].correctCount++;
                } else {
                  totalNegative += questionNegMarks;
                  sectionMap[category].score -= questionNegMarks;
                }
              }
            } else if (taskType === 'writing') {
              const answerText = typeof rawAnswer === 'string'
                ? rawAnswer
                : (rawAnswer as any).text ?? (rawAnswer as any).answerText ?? null;
              if (answerText && aq.mode !== 'trial') {
                subjectiveAnsweredCount++;
                review.selectedAnswerText = String(answerText);
                review.status = 'subjective';
                grammarWritingUpdates.push({
                  answerText,
                  attempt_question_id: aq.attempt_question_id
                });
              }
            } else if (taskType === 'speaking') {
              const audioPayload = typeof rawAnswer === 'string'
                ? rawAnswer
                : (rawAnswer as any).audio ?? (rawAnswer as any).audioBase64 ?? (rawAnswer as any).audioUrl ?? null;
              const answerText = typeof rawAnswer === 'object'
                ? (rawAnswer as any).text ?? (rawAnswer as any).answerText ?? null
                : null;
              if ((audioPayload || answerText) && aq.mode !== 'trial') {
                subjectiveAnsweredCount++;
                review.selectedAnswerText = answerText
                  ? String(answerText)
                  : '[Audio response submitted]';
                review.status = 'subjective';
                grammarSpeakingUpdates.push({
                  audioPayload,
                  answerText,
                  attempt_question_id: aq.attempt_question_id
                });
              }
            } else {
              const answerText = typeof rawAnswer === 'string'
                ? rawAnswer
                : (rawAnswer as any).text ?? (rawAnswer as any).answerText ?? null;
              if (answerText && aq.mode !== 'trial') {
                subjectiveAnsweredCount++;
                review.selectedAnswerText = String(answerText);
                review.status = 'subjective';
                grammarOtherUpdates.push({
                  answerText,
                  attempt_question_id: aq.attempt_question_id
                });
              }
            }
          }
          questionReviews.push(review);
          continue;
        }

        // Scoring Logic: Support MCQ, MSQ, TF, Numerical
        if (aq.mode !== 'trial' && !isCoding && (!isGrammar || taskType === 'listening_mcq' || taskType === 'reading_mcq')) {
          const hasObjectiveAnswer = Array.isArray(selectedOptionId)
            ? selectedOptionId.length > 0
            : !(selectedOptionId === undefined || selectedOptionId === null || selectedOptionId === '');
          if (hasObjectiveAnswer) {
            sectionMap[category].answeredCount++;
            answeredCount++;
            objectiveAnsweredCount++;
            
            const qMetadata = aq.question_metadata || {};
            const kind = normalizeQuestionKind(qMetadata.kind);
            let isCorrectAnswer = false;

            // Update the review type to reflect the actual question kind
            review.type = kind;

            if (kind === 'msq') {
              const studentChoices: string[] = Array.isArray(selectedOptionId) 
                ? selectedOptionId.map(String) 
                : (selectedOptionId ? [String(selectedOptionId)] : []);
              
              const correctChoices = Array.isArray(qMetadata.correctOptionIds)
                ? qMetadata.correctOptionIds.map(String)
                : [];
              
              // Populate review with MSQ selections
              review.selectedOptionId = studentChoices;
              review.selectedAnswerText = studentChoices
                .map((id: string) => optionTextById.get(id) ?? id)
                .join(', ');
              // Populate correct answer text for MSQ
              review.correctAnswerText = correctChoices
                .map((id: string) => optionTextById.get(id) ?? id)
                .join(', ');
              
              // All-or-nothing check for MSQ
              isCorrectAnswer = studentChoices.length > 0 &&
                               studentChoices.length === correctChoices.length &&
                               studentChoices.every((id: string) => correctChoices.includes(id));
            } else if (kind === 'numerical') {
              const studentAnswer = String(selectedOptionId || '').trim().toLowerCase();
              const correctAnswer = String(qMetadata.correctAnswer || '').trim().toLowerCase();
              // Populate review with numerical answer
              review.selectedOptionId = studentAnswer;
              review.selectedAnswerText = studentAnswer;
              review.correctAnswerText = String(qMetadata.correctAnswer || '');
              isCorrectAnswer = studentAnswer !== '' && studentAnswer === correctAnswer;
            } else {
              // Standard MCQ / TF (single choice)
              review.selectedOptionId = String(selectedOptionId);
              review.selectedAnswerText = optionTextById.get(String(selectedOptionId)) ?? String(selectedOptionId);
              isCorrectAnswer = String(selectedOptionId) === String(aq.correct_option_id);
            }

            // Write scoring result into review
            review.isCorrect = isCorrectAnswer;
            review.status = isCorrectAnswer ? 'correct' : 'incorrect';

            const scoreAwarded    = isCorrectAnswer ? questionMarks : 0;
            const negativeApplied = isCorrectAnswer ? 0 : questionNegMarks;

            if (isCorrectAnswer) {
              totalPositive += scoreAwarded;
              correctCount++;
              sectionMap[category].score += scoreAwarded;
              sectionMap[category].correctCount++;
            } else {
              totalNegative += negativeApplied;
              sectionMap[category].score -= negativeApplied;
            }

            const metadataUpdate = { 
              ...(aq.metadata || {}), 
              submittedAnswer: (kind === 'numerical' || kind === 'msq') ? selectedOptionId : null 
            };

            standardUpdates.push({
              selected_option_id: (kind === 'numerical' || kind === 'msq') ? null : selectedOptionId,
              is_correct: isCorrectAnswer,
              score_awarded: scoreAwarded,
              negative_applied: negativeApplied,
              metadata: metadataUpdate,
              answered_at: new Date(),
              attempt_question_id: aq.attempt_question_id
            });
          } else {
            standardUpdates.push({
              selected_option_id: null,
              is_correct: null,
              score_awarded: 0,
              negative_applied: 0,
              metadata: null,
              answered_at: null,
              attempt_question_id: aq.attempt_question_id
            });
          }
        }
        questionReviews.push(review);
      }

      // Perform batch updates
      if (codingUpdates.length > 0) {
        const valueStrings: string[] = [];
        const queryParams: any[] = [];
        let index = 1;
        for (const row of codingUpdates) {
          valueStrings.push(`($${index}, $${index + 1}, $${index + 2}::integer)`);
          queryParams.push(row.submittedCode, row.language, row.attempt_question_id);
          index += 3;
        }
        const batchQuery = `
          UPDATE ${config.junction} AS j
          SET
            submitted_code = v.submitted_code,
            language = COALESCE(v.language, j.language),
            submitted_at = NOW()
          FROM (VALUES ${valueStrings.join(', ')}) AS v(submitted_code, language, attempt_question_id)
          WHERE j.attempt_question_id = v.attempt_question_id
        `;
        await queryRunner.query(batchQuery, queryParams);
      }

      if (grammarMcqUpdates.length > 0) {
        const valueStrings: string[] = [];
        const queryParams: any[] = [];
        let index = 1;
        for (const row of grammarMcqUpdates) {
          valueStrings.push(`($${index}::integer, $${index + 1}::boolean, $${index + 2}::integer)`);
          queryParams.push(row.optId, row.isCorrect, row.attempt_question_id);
          index += 3;
        }
        const batchQuery = `
          UPDATE ${config.junction} AS j
          SET
            selected_option_id = v.selected_option_id,
            is_correct = v.is_correct,
            answered_at = NOW()
          FROM (VALUES ${valueStrings.join(', ')}) AS v(selected_option_id, is_correct, attempt_question_id)
          WHERE j.attempt_question_id = v.attempt_question_id
        `;
        await queryRunner.query(batchQuery, queryParams);
      }

      if (grammarWritingUpdates.length > 0) {
        const valueStrings: string[] = [];
        const queryParams: any[] = [];
        let index = 1;
        for (const row of grammarWritingUpdates) {
          valueStrings.push(`($${index}, $${index + 1}::integer)`);
          queryParams.push(row.answerText, row.attempt_question_id);
          index += 2;
        }
        const batchQuery = `
          UPDATE ${config.junction} AS j
          SET
            answer_text = v.answer_text,
            answered_at = NOW()
          FROM (VALUES ${valueStrings.join(', ')}) AS v(answer_text, attempt_question_id)
          WHERE j.attempt_question_id = v.attempt_question_id
        `;
        await queryRunner.query(batchQuery, queryParams);
      }

      if (grammarSpeakingUpdates.length > 0) {
        const valueStrings: string[] = [];
        const queryParams: any[] = [];
        let index = 1;
        for (const row of grammarSpeakingUpdates) {
          valueStrings.push(`($${index}, $${index + 1}, $${index + 2}::integer)`);
          queryParams.push(row.audioPayload, row.answerText, row.attempt_question_id);
          index += 3;
        }
        const batchQuery = `
          UPDATE ${config.junction} AS j
          SET
            answer_audio_url = v.answer_audio_url,
            answer_text = COALESCE(v.answer_text, j.answer_text),
            answered_at = NOW()
          FROM (VALUES ${valueStrings.join(', ')}) AS v(answer_audio_url, answer_text, attempt_question_id)
          WHERE j.attempt_question_id = v.attempt_question_id
        `;
        await queryRunner.query(batchQuery, queryParams);
      }

      if (grammarOtherUpdates.length > 0) {
        const valueStrings: string[] = [];
        const queryParams: any[] = [];
        let index = 1;
        for (const row of grammarOtherUpdates) {
          valueStrings.push(`($${index}, $${index + 1}::integer)`);
          queryParams.push(row.answerText, row.attempt_question_id);
          index += 2;
        }
        const batchQuery = `
          UPDATE ${config.junction} AS j
          SET
            answer_text = v.answer_text,
            answered_at = NOW()
          FROM (VALUES ${valueStrings.join(', ')}) AS v(answer_text, attempt_question_id)
          WHERE j.attempt_question_id = v.attempt_question_id
        `;
        await queryRunner.query(batchQuery, queryParams);
      }

      if (standardUpdates.length > 0) {
        const valueStrings: string[] = [];
        const queryParams: any[] = [];
        let index = 1;
        for (const row of standardUpdates) {
          valueStrings.push(`($${index}::integer, $${index + 1}::boolean, $${index + 2}::numeric, $${index + 3}::numeric, $${index + 4}::jsonb, $${index + 5}::timestamp, $${index + 6}::integer)`);
          queryParams.push(
            row.selected_option_id,
            row.is_correct,
            row.score_awarded,
            row.negative_applied,
            row.metadata ? JSON.stringify(row.metadata) : null,
            row.answered_at,
            row.attempt_question_id
          );
          index += 7;
        }
        const batchQuery = `
          UPDATE ${config.junction} AS j
          SET
            selected_option_id = v.selected_option_id,
            is_correct = v.is_correct,
            score_awarded = v.score_awarded,
            negative_applied = v.negative_applied,
            answered_at = v.answered_at,
            metadata = v.metadata
          FROM (VALUES ${valueStrings.join(', ')}) AS v(selected_option_id, is_correct, score_awarded, negative_applied, metadata, answered_at, attempt_question_id)
          WHERE j.attempt_question_id = v.attempt_question_id
        `;
        await queryRunner.query(batchQuery, queryParams);
      }

      const maxScore = attemptQuestions.reduce(
        (sum: number, aq: any) => sum + Number(aq.marks || 1),
        0,
      );
      const rawTotalScore = totalPositive - totalNegative;
      const totalScore = rawTotalScore < 0 ? 0 : rawTotalScore;
      const overallScorePercent = maxScore > 0
        ? Math.round((totalScore / maxScore) * 100)
        : 0;
      const wrongCount = Math.max(0, objectiveAnsweredCount - correctCount);
      const skippedCount = Math.max(0, totalCount - answeredCount);
      const accuracyBase = objectiveAnsweredCount > 0 ? objectiveAnsweredCount : totalCount;
      const accuracy = accuracyBase > 0
        ? Math.round((correctCount / accuracyBase) * 100)
        : 0;
      const now = new Date();
      const timeTakenSeconds = Math.max(
        0,
        Math.round((now.getTime() - new Date(attempt.started_at).getTime()) / 1000),
      );

      await queryRunner.query(
        `UPDATE ${config.attempts}
         SET status = 'submitted', submitted_at = $1, positive_score = $2, negative_score = $3,
             total_score = $4, time_taken_seconds = $5, updated_at = NOW()
         WHERE ${config.attemptIdCol} = $6`,
        [now, totalPositive, totalNegative, totalScore, timeTakenSeconds, attemptId],
      );

      await queryRunner.commitTransaction();

      const sections = Object.values(sectionMap).map((sec) => {
        const safeScore = sec.score < 0 ? 0 : sec.score;
        const wrongInSection = Math.max(0, sec.objectiveAnsweredCount - sec.correctCount);
        const accuracyPct = sec.totalCount > 0
          ? Math.round((sec.correctCount / sec.totalCount) * 100)
          : 0;
        const percentage = sec.maxScore > 0
          ? Math.round((safeScore / sec.maxScore) * 100)
          : 0;
        return {
          name: sec.name,
          score: safeScore,
          maxScore: sec.maxScore,
          percentage,
          weight: `${safeScore}/${sec.maxScore}`,
          answeredCount: sec.answeredCount,
          totalCount: sec.totalCount,
          correctCount: sec.correctCount,
          wrongCount: wrongInSection,
          accuracyPct,
        };
      });

      questionReviews.sort((a, b) => {
        const orderA = Number(a.displayOrder || 0);
        const orderB = Number(b.displayOrder || 0);
        return orderA - orderB;
      });

      const result = {
        success: true,
        token,
        attemptToken: token,
        module: dbModule,
        overallScore: totalScore,
        overallScorePercent,
        totalScore,
        maxScore,
        positiveScore: totalPositive,
        negativeScore: totalNegative,
        correctCount,
        wrongCount,
        answeredCount,
        objectiveAnsweredCount,
        subjectiveAnsweredCount,
        skippedCount,
        totalQuestions: totalCount,
        accuracy,
        timeTakenSeconds,
        completedAt: now.toISOString(),
        submittedAt: now.toISOString(),
        sections,
        questionReviews,
        status: 'completed',
      };

      // Fire certificate email asynchronously (non-blocking)
      setImmediate(() => {
        this.sendCertificateEmailForAttempt(
          attempt.user_id,
          attempt.assessment_id,
          module,
          overallScorePercent,
          now.toISOString(),
        ).catch(e => this.logger.error('Certificate email failed (non-fatal):', e));
      });

      return result;
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      this.logger.error(`submitAttempt (${module}) error:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Block-based attempt ────────────────────────────────────────────────────

  async startBlockBasedAttempt(module: string, data: any) {
    const { assessmentId, assessmentCode, userId, mode = 'main' } = data;
    this.logger.log(`startBlockBasedAttempt: module=${module}, code=${assessmentCode}, mode=${mode}`);

    const dbModule = module === 'communication' ? 'grammar' : module;
    const tableMap = this.getTableMap();
    const config = tableMap[dbModule];
    if (!config) throw new BadRequestException(`Module ${module} not supported`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Resolve assessment
      let assessment: any;
      if (assessmentId) {
        const rows = await queryRunner.query(
          `SELECT * FROM tech_assessments WHERE assessment_id = $1 AND module_type = $2`,
          [assessmentId, dbModule],
        );
        assessment = rows[0];
      } else if (assessmentCode) {
        const rows = await queryRunner.query(
          `SELECT * FROM tech_assessments WHERE assessment_code = $1 AND module_type = $2`,
          [assessmentCode, dbModule],
        );
        assessment = rows[0];
      }
      if (!assessment) {
        const fallback = await queryRunner.query(
          `SELECT * FROM tech_assessments WHERE module_type = $1 AND status = 'active' ORDER BY assessment_id DESC LIMIT 1`,
          [dbModule],
        );
        assessment = fallback[0];
      }
      if (!assessment) throw new NotFoundException(`${module} assessment not found`);

      // 2. Count available questions (mode-aware, with safe fallback if mode column absent)
      const modeColExists = await this.columnExistsSafe(queryRunner, config.questions, 'mode');
      const countParams: any[] = [assessment.assessment_id];
      let countWhere = `WHERE assessment_id = $1 AND status = 'active'`;
      if (config.hasMode && modeColExists) {
        countParams.push(mode === 'trial' ? 'trial' : 'main');
        countWhere += ` AND (mode = $${countParams.length} OR mode IS NULL)`;
      }
      const countRows = await queryRunner.query(
        `SELECT COUNT(*)::int AS count FROM ${config.questions} ${countWhere}`,
        countParams,
      );
      let totalQuestions = countRows.length ? Number(countRows[0].count) : 0;
      if (totalQuestions === 0) {
        throw new BadRequestException('No active questions found for this assessment');
      }

      // 3. Compute block layout
      const rawBlockConfig = assessment.block_config ?? {};
      const questionsPerBlock = Math.max(
        1,
        Number(rawBlockConfig.questionsPerBlock ?? rawBlockConfig.questions_per_block ?? 5),
      );
      const qLimit = Number(assessment.question_limit ?? 0);
      if (qLimit > 0) totalQuestions = Math.min(totalQuestions, qLimit);
      const totalBlocks = Math.ceil(totalQuestions / questionsPerBlock);

      // 4. Persist updated block_config so generateBlock can read it
      const newBlockConfig = {
        enabled: true,
        blocksPerAssessment: totalBlocks,
        questionsPerBlock,
      };
      await queryRunner.query(
        `UPDATE tech_assessments SET block_config = $1 WHERE assessment_id = $2`,
        [JSON.stringify(newBlockConfig), assessment.assessment_id],
      );

      // 5. Resolve user
      const resolvedUserId = await this.resolveUserId(queryRunner, userId);
      if (!resolvedUserId) throw new BadRequestException('No users found.');
      const durationMinutes = Number(assessment.total_time_minutes || 60);

      // Resume existing block-based attempt if one is in progress
      const blockPrefix = `${dbModule.substring(0, 3).toUpperCase()}-BLOCK-%`;
      const existingBlockRows = await queryRunner.query(
        `SELECT * FROM ${config.attempts}
         WHERE assessment_id = $1 AND user_id = $2 AND status = 'in_progress'
           AND attempt_token LIKE $3
         ORDER BY started_at DESC LIMIT 1`,
        [assessment.assessment_id, resolvedUserId, blockPrefix],
      );

      if (existingBlockRows.length > 0) {
        const existing = existingBlockRows[0];
        const existingExpires = new Date(existing.expires_at);
        if (existingExpires > new Date()) {
          // If adaptive_enabled, let the v2 engine handle resume — just return the token
          if (Boolean(assessment.adaptive_enabled)) {
            await queryRunner.commitTransaction();
            return {
              attemptToken: existing.attempt_token,
              expiresAt: existing.expires_at,
              durationSeconds: durationMinutes * 60,
              timeLeftSeconds: Math.max(0, Math.round((existingExpires.getTime() - Date.now()) / 1000)),
              mode,
              totalBlocks,
              questionsPerBlock,
              totalQuestions,
              currentBlock: null,
              isBlockBased: true,
              resumed: true,
            };
          }

          const blockRow = await queryRunner.query(
            `SELECT block_number FROM block_attempts
             WHERE attempt_token = $1 AND status = 'in_progress'
             ORDER BY block_number DESC LIMIT 1`,
            [existing.attempt_token],
          );
          const currentBlockNumber = blockRow[0]?.block_number ?? 1;

          try {
            const blockInfo = await this.adaptiveBlockService.getBlockQuestions(
              existing.attempt_token,
              currentBlockNumber,
            );
            const timeLeftSeconds = Math.max(
              0,
              Math.round((existingExpires.getTime() - Date.now()) / 1000),
            );

            await queryRunner.commitTransaction();

            return {
              attemptToken: existing.attempt_token,
              expiresAt: existing.expires_at,
              durationSeconds: durationMinutes * 60,
              timeLeftSeconds,
              mode,
              totalBlocks,
              questionsPerBlock,
              totalQuestions,
              currentBlockNumber,
              currentBlock: {
                blockId: blockInfo.blockNumber,
                blockNumber: blockInfo.blockNumber,
                questions: blockInfo.questions,
                difficulty: blockInfo.difficulty,
                timeLimit: blockInfo.questions.length * 2,
                isAdaptive: true,
              },
              isBlockBased: true,
              resumed: true,
            };
          } catch (e) {
            this.logger.warn(`Stale block attempt detected for token ${existing.attempt_token}: ${(e as any)?.message}`);
          }
        }

        await queryRunner.query(
          `UPDATE ${config.attempts} SET status = 'expired', updated_at = NOW()
           WHERE ${config.attemptIdCol} = $1`,
          [existing[config.attemptIdCol]],
        );
      }

      // 6. Create attempt record
      const now = new Date();
      const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
      const attemptToken = `${dbModule.substring(0, 3).toUpperCase()}-BLOCK-${crypto.randomUUID()}`;
      const shuffleSeed = crypto.randomBytes(8).toString('hex');

      await queryRunner.query(
        `INSERT INTO ${config.attempts}
           (assessment_id, user_id, attempt_token, shuffle_seed, status, started_at, expires_at, created_at, updated_at, mode)
         VALUES ($1, $2, $3, $4, 'in_progress', $5, $6, NOW(), NOW(), $7)`,
        [assessment.assessment_id, resolvedUserId, attemptToken, shuffleSeed, now, expiresAt, mode === 'trial' ? 'trial' : 'main'],
      );

      // 7. Commit so generateBlock can read the attempt row
      await queryRunner.commitTransaction();

      // 8. If adaptive_enabled, skip old block generation — the v2 adaptive engine
      //    (/api/adaptive/v2/block/generate) will handle blueprint + block generation.
      //    Just return the attempt token so the frontend can redirect to the v2 page.
      if (Boolean(assessment.adaptive_enabled)) {
        return {
          attemptToken,
          expiresAt,
          durationSeconds: durationMinutes * 60,
          mode,
          totalBlocks,
          questionsPerBlock,
          totalQuestions,
          currentBlock: null,
          isBlockBased: true,
        };
      }

      // 9. Initialize adaptive_blocks rows (idempotent) — old flow only
      await this.adaptiveBlockService.initializeAdaptiveBlocks(assessment.assessment_id, {
        blocksPerAssessment: totalBlocks,
        questionsPerBlock,
      });

      // 10. Generate block 1 — old flow only
      const firstBlock = await this.adaptiveBlockService.generateBlock({
        assessmentId: assessment.assessment_id,
        blockNumber: 1,
        userId: resolvedUserId,
        mode: mode === 'trial' ? 'trial' : 'main',
        attemptToken,
      });

      return {
        attemptToken,
        expiresAt,
        durationSeconds: durationMinutes * 60,
        mode,
        totalBlocks,
        questionsPerBlock,
        totalQuestions,
        currentBlock: firstBlock,
        isBlockBased: true,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      this.logger.error(`startBlockBasedAttempt (${module}) error:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getNextBlock(
    attemptToken: string,
    blockNumber: number,
    performance: { accuracy?: number; timeTaken?: number; answers?: Record<string, string> },
  ) {
    // 1. Score current block and lock previous ones
    const completionResult = await this.adaptiveBlockService.completeBlock(
      attemptToken,
      blockNumber,
      performance,
    );

    if (!completionResult.canProceed) {
      return {
        canProceed: false,
        message: 'All blocks completed. Call submit-block-based to finalise.',
        blockSummary: {
          blockNumber,
          accuracyScore: completionResult.accuracyScore,
          correctCount: completionResult.correctCount,
          totalCount: completionResult.totalCount,
        },
      };
    }

    // 2. Load attempt details for next-block generation dynamically
    const moduleType =
      attemptToken.includes('BLOCK') && attemptToken.startsWith('APT') ? 'aptitude' :
      attemptToken.includes('BLOCK') && attemptToken.startsWith('GRA') ? 'grammar' :
      attemptToken.includes('BLOCK') && attemptToken.startsWith('MNC') ? 'mnc' :
      attemptToken.startsWith('APT-') ? 'aptitude' :
      attemptToken.startsWith('GRA-') || attemptToken.startsWith('COM-') ? 'grammar' :
      attemptToken.startsWith('MNC-') ? 'mnc' : 'aptitude';
    const tableMap = this.getTableMap();
    const config = tableMap[moduleType];
    if (!config) throw new BadRequestException(`Unknown module for token: ${attemptToken}`);

    const attemptRows = await this.dataSource.query(
      `SELECT assessment_id, user_id FROM ${config.attempts} WHERE attempt_token = $1`,
      [attemptToken],
    );
    if (!attemptRows.length) throw new NotFoundException('Attempt not found');

    const { assessment_id, user_id } = attemptRows[0];

    // 3. Use the difficulty_achieved returned directly from completeBlock
    const difficultyAchieved = completionResult.difficultyAchieved ?? 'medium';

    // 4. Generate next block
    const nextBlock = await this.adaptiveBlockService.generateBlock({
      assessmentId: Number(assessment_id),
      blockNumber: blockNumber + 1,
      previousPerformance: {
        accuracy: completionResult.accuracyScore,
        timeTaken: Number(performance.timeTaken ?? 0),
        difficultyAchieved,
      },
      userId: Number(user_id),
      mode: 'main',
      attemptToken,
    });

    return {
      canProceed: true,
      nextBlock,
      blockSummary: {
        blockNumber,
        accuracyScore: completionResult.accuracyScore,
        correctCount: completionResult.correctCount,
        totalCount: completionResult.totalCount,
        nextBlockDifficulty: completionResult.nextBlockDifficulty,
      },
    };
  }

  async submitBlockBasedAttempt(module: string, token: string, body: any) {
    const dbModule = module === 'communication' ? 'grammar' : module;
    const tableMap = this.getTableMap();
    const config = tableMap[dbModule];
    if (!config) throw new BadRequestException(`Module ${module} not supported`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Load attempt
      const attemptRows = await queryRunner.query(
        `SELECT * FROM ${config.attempts} WHERE attempt_token = $1`,
        [token],
      );
      const attempt = attemptRows[0];
      if (!attempt) throw new NotFoundException('Attempt not found');
      if (attempt.status !== 'in_progress') {
        throw new BadRequestException('Attempt already submitted');
      }
      const attemptId = attempt[config.attemptIdCol];

      // 2. Re-evaluate ALL questions from scratch using the LATEST selected_option_id.
      //    This is the authoritative final evaluation — it reflects any changes the user
      //    made by navigating back to previous blocks.
      const allQuestions = await queryRunner.query(
        `SELECT aq.attempt_question_id,
                aq.display_order,
                aq.${config.idCol} AS question_id,
                aq.selected_option_id,
                aq.metadata as attempt_metadata,
                aq.block_number,
                q.question_text,
                q.correct_option_id,
                q.metadata as question_metadata,
                q.marks,
                q.negative_marks,
                q.difficulty,
                q.${config.catCol} AS category,
                ass.negative_mark_enabled,
                ass.negative_mark_value,
                ass.difficulty_negative_marks
         FROM ${config.junction} aq
         JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
         JOIN tech_assessments ass ON ass.assessment_id = q.assessment_id
         WHERE aq.${config.attemptIdCol} = $1
         ORDER BY aq.display_order ASC`,
        [attemptId],
      );

      let totalPositive = 0;
      let totalNegative = 0;
      let correctCount = 0;
      let answeredCount = 0;
      const totalCount = allQuestions.length;
      const questionReviews: any[] = [];

      // Per-category breakdown
      const categoryMap: Record<string, {
        correct: number;
        total: number;
        answered: number;
        score: number;
        maxScore: number;
      }> = {};
      // Per-block breakdown
      const blockMap: Record<number, { correct: number; total: number; positive: number; negative: number }> = {};

      const normalizeQuestionKind = (rawKind: any): 'mcq' | 'msq' | 'tf' | 'numerical' => {
        const kind = String(rawKind || 'mcq').toLowerCase();
        if (kind === 'true_false') return 'tf';
        if (kind === 'msq' || kind === 'tf' || kind === 'numerical') return kind;
        return 'mcq';
      };
      const asObject = (value: any): Record<string, any> => {
        if (!value) return {};
        if (typeof value === 'object' && !Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
          } catch {
            return {};
          }
        }
        return {};
      };

      // Batch fetch option rows for all questions
      const questionIds = allQuestions.map((q: any) => q.question_id);
      const allOptions = questionIds.length > 0 ? await queryRunner.query(
        `SELECT ${config.idCol} AS question_id, option_id::text AS id, option_text AS text
         FROM ${config.options}
         WHERE ${config.idCol} = ANY($1)
         ORDER BY option_id ASC`,
        [questionIds],
      ) : [];

      const optionsByQuestionId = new Map<string, Array<{ id: string; text: string }>>();
      for (const opt of allOptions) {
        const qId = String(opt.question_id);
        if (!optionsByQuestionId.has(qId)) {
          optionsByQuestionId.set(qId, []);
        }
        optionsByQuestionId.get(qId)!.push({ id: String(opt.id), text: String(opt.text ?? '') });
      }

      const updateRows: any[] = [];

      for (const aq of allQuestions) {
        const cat = aq.category ?? 'General';
        const blk = Number(aq.block_number ?? 0);
        const questionMetadata = asObject(aq.question_metadata);
        const attemptMetadata = asObject(aq.attempt_metadata);
        const kind = normalizeQuestionKind((questionMetadata as any).kind);
        const metadataSubmittedAnswer = (attemptMetadata as any).submittedAnswer;
        const selectedAnswerValue =
          (kind === 'msq' || kind === 'numerical') &&
          metadataSubmittedAnswer !== undefined &&
          metadataSubmittedAnswer !== null &&
          metadataSubmittedAnswer !== ''
            ? metadataSubmittedAnswer
            : aq.selected_option_id;

        if (!categoryMap[cat]) categoryMap[cat] = { correct: 0, total: 0, answered: 0, score: 0, maxScore: 0 };
        if (!blockMap[blk]) blockMap[blk] = { correct: 0, total: 0, positive: 0, negative: 0 };

        const qMarks = Number(aq.marks || 1);
        let negMarks = 0;
        if (aq.negative_mark_enabled) {
          let diffNeg = 0;
          if (aq.difficulty_negative_marks) {
            const diffMap = typeof aq.difficulty_negative_marks === 'object'
              ? aq.difficulty_negative_marks
              : (() => { try { return JSON.parse(aq.difficulty_negative_marks); } catch { return {}; } })();
            const diffKey = String(aq.difficulty || 'medium').toLowerCase();
            if (diffMap && diffMap[diffKey] !== undefined && diffMap[diffKey] !== null) {
              diffNeg = Number(diffMap[diffKey]);
            } else {
              diffNeg = Number(aq.negative_marks || aq.negative_mark_value || 0);
            }
          } else {
            diffNeg = Number(aq.negative_marks || aq.negative_mark_value || 0);
          }
          negMarks = diffNeg;
        }

        const optionsForReview = optionsByQuestionId.get(String(aq.question_id)) ?? [];
        const optionTextById = new Map<string, string>();
        for (const opt of optionsForReview) {
          optionTextById.set(opt.id, opt.text);
        }

        categoryMap[cat].total++;
        categoryMap[cat].maxScore += qMarks;
        blockMap[blk].total++;

        const review: any = {
          questionId: String(aq.question_id),
          displayOrder: Number(aq.display_order || 0),
          category: cat,
          type: kind,
          questionText: String(aq.question_text || ''),
          options: optionsForReview,
          selectedOptionId: null,
          selectedAnswerText: null,
          correctOptionId:
            aq.correct_option_id !== null && aq.correct_option_id !== undefined
              ? String(aq.correct_option_id)
              : null,
          correctAnswerText: null,
          isCorrect: null,
          status: 'unanswered',
        };
        if (review.correctOptionId && optionTextById.has(review.correctOptionId)) {
          review.correctAnswerText = optionTextById.get(review.correctOptionId);
        }

        const hasObjectiveAnswer = Array.isArray(selectedAnswerValue)
          ? selectedAnswerValue.length > 0
          : !(selectedAnswerValue === undefined || selectedAnswerValue === null || String(selectedAnswerValue) === '');

        if (hasObjectiveAnswer) {
          answeredCount++;
          categoryMap[cat].answered++;
          let isCorrect = false;

          if (kind === 'msq') {
            const studentChoices: string[] = Array.isArray(selectedAnswerValue)
              ? selectedAnswerValue.map((id: any) => String(id))
              : (selectedAnswerValue ? [String(selectedAnswerValue)] : []);
            const correctChoices = Array.isArray((questionMetadata as any).correctOptionIds)
              ? (questionMetadata as any).correctOptionIds.map((id: any) => String(id))
              : [];
            review.selectedOptionId = studentChoices;
            review.selectedAnswerText = studentChoices
              .map((id) => optionTextById.get(id) ?? id)
              .join(', ');
            isCorrect = studentChoices.length > 0 &&
              studentChoices.length === correctChoices.length &&
              studentChoices.every((id: string) => correctChoices.includes(id));
          } else if (kind === 'numerical') {
            const studentAnswer = String(selectedAnswerValue ?? '').trim();
            const correctAnswer = String((questionMetadata as any).correctAnswer ?? '').trim();
            review.selectedOptionId = studentAnswer;
            review.selectedAnswerText = studentAnswer;
            isCorrect =
              studentAnswer.length > 0 &&
              studentAnswer.toLowerCase() === correctAnswer.toLowerCase();
          } else {
            const selectedOptionId = String(selectedAnswerValue);
            review.selectedOptionId = selectedOptionId;
            review.selectedAnswerText = optionTextById.get(selectedOptionId) ?? selectedOptionId;
            isCorrect = selectedOptionId === String(aq.correct_option_id);
          }

          const scoreAwarded = isCorrect ? qMarks : 0;
          const negApplied = isCorrect ? 0 : negMarks;
          review.isCorrect = isCorrect;
          review.status = isCorrect ? 'correct' : 'incorrect';

          if (isCorrect) {
            correctCount++;
            totalPositive += scoreAwarded;
            categoryMap[cat].correct++;
            categoryMap[cat].score += scoreAwarded;
            blockMap[blk].correct++;
            blockMap[blk].positive += scoreAwarded;
          } else {
            totalNegative += negApplied;
            categoryMap[cat].score -= negApplied;
            blockMap[blk].negative += negApplied;
          }

          updateRows.push({
            selected_option_id: (kind === 'numerical' || kind === 'msq') ? null : review.selectedOptionId,
            metadata: {
              ...(attemptMetadata || {}),
              submittedAnswer: (kind === 'numerical' || kind === 'msq') ? review.selectedOptionId : null,
            },
            is_correct: isCorrect,
            score_awarded: scoreAwarded,
            negative_applied: negApplied,
            attempt_question_id: aq.attempt_question_id
          });
        } else {
          // Unanswered — zero score
          updateRows.push({
            selected_option_id: null,
            metadata: null,
            is_correct: null,
            score_awarded: 0,
            negative_applied: 0,
            attempt_question_id: aq.attempt_question_id
          });
        }
        questionReviews.push(review);
      }

      // Perform batch update of attempt question answers
      if (updateRows.length > 0) {
        const valueStrings: string[] = [];
        const queryParams: any[] = [];
        let index = 1;
        for (const row of updateRows) {
          valueStrings.push(`($${index}::integer, $${index + 1}::jsonb, $${index + 2}::boolean, $${index + 3}::numeric, $${index + 4}::numeric, $${index + 5}::integer)`);
          queryParams.push(
            row.selected_option_id,
            row.metadata ? JSON.stringify(row.metadata) : null,
            row.is_correct,
            row.score_awarded,
            row.negative_applied,
            row.attempt_question_id
          );
          index += 6;
        }

        const batchQuery = `
          UPDATE ${config.junction} AS j
          SET
            selected_option_id = v.selected_option_id,
            metadata = v.metadata,
            is_correct = v.is_correct,
            score_awarded = v.score_awarded,
            negative_applied = v.negative_applied
          FROM (VALUES ${valueStrings.join(', ')}) AS v(selected_option_id, metadata, is_correct, score_awarded, negative_applied, attempt_question_id)
          WHERE j.attempt_question_id = v.attempt_question_id
        `;
        await queryRunner.query(batchQuery, queryParams);
      }

      const rawTotal = totalPositive - totalNegative;
      const totalScore = rawTotal < 0 ? 0 : rawTotal;
      const accuracyPct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
      const wrongCount = Math.max(0, answeredCount - correctCount);
      const skippedCount = Math.max(0, totalCount - answeredCount);
      const maxScore = allQuestions.reduce((sum: number, aq: any) => sum + Number(aq.marks || 1), 0);
      const overallScorePercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      const now = new Date();
      const timeTakenSeconds = Math.max(
        0,
        Math.round((now.getTime() - new Date(attempt.started_at).getTime()) / 1000),
      );

      // 3. Finalise attempt record
      await queryRunner.query(
        `UPDATE ${config.attempts}
         SET status='submitted', submitted_at=$1,
             positive_score=$2, negative_score=$3,
             total_score=$4, time_taken_seconds=$5, updated_at=NOW()
         WHERE ${config.attemptIdCol}=$6`,
        [now, totalPositive, totalNegative, totalScore, timeTakenSeconds, attemptId],
      );

      // 4. Build per-block summary from blockMap + block_attempts
      const blockAttemptRows = await queryRunner.query(
        `SELECT block_number, difficulty_achieved, time_taken_seconds, accuracy_score
         FROM block_attempts WHERE attempt_token=$1 ORDER BY block_number`,
        [token],
      );

      const blockSummaries = blockAttemptRows.map((ba: any) => {
        const blk = Number(ba.block_number);
        const bm = blockMap[blk] ?? { correct: 0, total: 0, positive: 0, negative: 0 };
        const blkScore = Math.max(0, bm.positive - bm.negative);
        const blkAcc = bm.total > 0 ? Math.round((bm.correct / bm.total) * 100) : 0;
        return {
          blockNumber: blk,
          difficulty: ba.difficulty_achieved,
          timeTakenSeconds: ba.time_taken_seconds,
          totalQuestions: bm.total,
          correctQuestions: bm.correct,
          blockScore: parseFloat(blkScore.toFixed(2)),
          accuracyPct: blkAcc,
        };
      });

      // 5. Build category sections for dashboard
      const sections = Object.entries(categoryMap).map(([cat, v]) => {
        const safeScore = Math.max(0, parseFloat(v.score.toFixed(2)));
        const maxScoreValue = parseFloat(v.maxScore.toFixed(2));
        const wrongInSection = Math.max(0, v.answered - v.correct);
        const percentage = maxScoreValue > 0 ? Math.round((safeScore / maxScoreValue) * 100) : 0;
        const accuracyValue = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0;
        return {
          name: cat,
          score: safeScore,
          maxScore: maxScoreValue,
          percentage,
          weight: `${safeScore}/${maxScoreValue}`,
          answeredCount: v.answered,
          totalCount: v.total,
          correctCount: v.correct,
          wrongCount: wrongInSection,
          accuracyPct: accuracyValue,
          correct: v.correct,
          total: v.total,
        };
      });

      const weakCategories = sections.filter(s => s.accuracyPct < 50).map(s => s.name);
      const strongCategories = sections.filter(s => s.accuracyPct >= 80).map(s => s.name);
      questionReviews.sort((a, b) => {
        const orderA = Number(a.displayOrder || 0);
        const orderB = Number(b.displayOrder || 0);
        return orderA - orderB;
      });

      await queryRunner.commitTransaction();

      // 6. Write analytics asynchronously (non-blocking)
      setImmediate(() => {
        this.adaptiveBlockService.writePerformanceAnalytics(
          token,
          Number(attempt.assessment_id),
          Number(attempt.user_id),
          totalScore,
          totalPositive,
          totalNegative,
          totalCount,
          correctCount,
          timeTakenSeconds,
        ).catch(e => this.logger.error('Analytics write failed (non-fatal):', e));
      });

      // Fire certificate email asynchronously (non-blocking)
      setImmediate(() => {
        this.sendCertificateEmailForAttempt(
          attempt.user_id,
          attempt.assessment_id,
          module,
          overallScorePercent,
          now.toISOString(),
        ).catch(e => this.logger.error('Certificate email failed (non-fatal):', e));
      });

      return {
        success: true,
        token,
        attemptToken: token,
        module: dbModule,
        overallScorePercent,
        totalScore,
        maxScore,
        positiveScore: totalPositive,
        negativeScore: totalNegative,
        correctCount,
        wrongCount,
        answeredCount,
        skippedCount,
        totalQuestions: totalCount,
        accuracyPct,
        accuracy: accuracyPct,
        timeTakenSeconds,
        completedAt: now.toISOString(),
        submittedAt: now.toISOString(),
        status: 'completed',
        // Dashboard data
        sections,
        weakCategories,
        strongCategories,
        blockSummaries,
        questionReviews,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      this.logger.error(`submitBlockBasedAttempt (${module}) error:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Email helper ────────────────────────────────────────────────────────────

  /**
   * Looks up the user's email + name from the DB and fires a certificate email.
   * Called asynchronously after both submitAttempt and submitBlockBasedAttempt.
   */
  private async sendCertificateEmailForAttempt(
    userId: number,
    assessmentId: number,
    module: string,
    overallScorePercent: number,
    completedAt: string,
  ): Promise<void> {
    try {
      // Fetch user details
      const userRows = await this.dataSource.query(
        `SELECT email, name, full_name, first_name, last_name FROM users WHERE id = $1`,
        [userId],
      );
      if (!userRows.length) {
        this.logger.warn(`sendCertificateEmailForAttempt: user ${userId} not found`);
        return;
      }
      const user = userRows[0];
      const toEmail: string = user.email;
      const userName: string =
        user.full_name ||
        user.name ||
        [user.first_name, user.last_name].filter(Boolean).join(' ') ||
        'Candidate';

      // Fetch assessment title
      const assessmentRows = await this.dataSource.query(
        `SELECT assessment_name FROM tech_assessments WHERE assessment_id = $1`,
        [assessmentId],
      );
      const assessmentTitle: string =
        assessmentRows[0]?.assessment_name || this.getModuleLabelForEmail(module);

      // Derive grade
      const grade = this.getGradeFromScore(overallScorePercent);

      // Build a stable certificate ID
      const dateCode = this.getYyMm(new Date(completedAt));
      const assessmentCode = this.assessmentCodeForEmail(module);
      const certificateId = `OBX-${dateCode}-${assessmentCode}-${this.randomCode(4)}`;

      this.logger.log(
        `Sending certificate email to ${toEmail} for ${module} (score=${overallScorePercent}%, cert=${certificateId})`,
      );

      await this.emailService.sendCertificateEmail({
        toEmail,
        userName,
        assessmentTitle,
        assessmentModule: module,
        overallScorePercent,
        grade,
        certificateId,
        completedAt,
      });
    } catch (err: any) {
      this.logger.error(`sendCertificateEmailForAttempt error: ${err.message}`, err.stack);
    }
  }

  private getGradeFromScore(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  private getModuleLabelForEmail(module: string): string {
    const map: Record<string, string> = {
      aptitude: 'Technical Aptitude Assessment',
      grammar: 'Communication Skills Assessment',
      communication: 'Communication Skills Assessment',
      mnc: 'MNC Readiness Assessment',
      role: 'Role-Based Assessment',
      coding: 'Coding Assessment',
    };
    return map[module] || `${module} Assessment`;
  }

  private assessmentCodeForEmail(module: string): string {
    if (module.startsWith('coding:')) {
      const lang = module.slice('coding:'.length).toLowerCase();
      if (lang === 'python') return 'PYT';
      if (lang === 'java') return 'JAV';
      return 'COD';
    }
    const map: Record<string, string> = {
      aptitude: 'APT',
      grammar: 'COM',
      communication: 'COM',
      mnc: 'MNC',
      role: 'RBA',
      coding: 'COD',
    };
    return map[module] || module.slice(0, 3).toUpperCase();
  }

  private getYyMm(d: Date): string {
    const yy = String(d.getFullYear() % 100).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yy}${mm}`;
  }

  private randomCode(length: number): string {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const buf = crypto.randomBytes(length);
    return Array.from(buf).map(b => charset[b % charset.length]).join('');
  }

  /**
   * Validates if user can start a new attempt for given assessment and mode
   * SECURITY: Server-side validation to prevent attempt limit bypass
   */
  async validateAttemptEligibility(
    userId: number | string,
    assessmentCode: string,
    mode: 'trial' | 'main'
  ): Promise<{ canStart: boolean; reason?: string; currentCount: number; limit: number }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // userId may arrive as an email (the frontend sends body.userId) — resolve
      // it to the numeric users.id before counting attempts.
      const resolvedUserId = await this.resolveUserId(queryRunner, userId);
      if (!resolvedUserId) {
        return { canStart: false, reason: 'No users found.', currentCount: 0, limit: 0 };
      }
      // Resolve the assessment from its code — module_type tells us which set
      // of attempt tables to count against.
      const assessment = await queryRunner.query(
        `SELECT assessment_id, module_type, trial_attempts_limit, main_attempts_limit
         FROM tech_assessments WHERE assessment_code = $1`,
        [assessmentCode]
      );

      if (!assessment.length) {
        return { canStart: false, reason: 'Assessment not found', currentCount: 0, limit: 0 };
      }

      const { assessment_id: assessmentId, module_type: moduleType } = assessment[0];
      const limit = mode === 'trial' ? assessment[0].trial_attempts_limit : assessment[0].main_attempts_limit;

      const config = this.getTableMap()[moduleType];
      if (!config) {
        return { canStart: false, reason: `Module ${moduleType} not supported`, currentCount: 0, limit };
      }

      // Only completed attempts (submitted/evaluated) consume the limit — expired
      // or abandoned in-progress attempts must not block a retake. This mirrors
      // the authoritative check inside startAttempt().
      const requestedMode = mode === 'trial' ? 'trial' : 'main';
      const completedQuery = config.hasMode
        ? `SELECT COUNT(DISTINCT a.${config.attemptIdCol}) AS count
           FROM ${config.attempts} a
           JOIN ${config.junction} aq ON aq.${config.attemptIdCol} = a.${config.attemptIdCol}
           JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
           WHERE a.user_id = $1 AND a.assessment_id = $2
             AND a.status IN ('submitted', 'evaluated')
             AND q.mode = $3`
        : `SELECT COUNT(*) AS count
           FROM ${config.attempts}
           WHERE user_id = $1 AND assessment_id = $2
             AND status IN ('submitted', 'evaluated')`;
      const completedParams = config.hasMode
        ? [resolvedUserId, assessmentId, requestedMode]
        : [resolvedUserId, assessmentId];

      const completedResult = await queryRunner.query(completedQuery, completedParams);
      const currentCount = Number(completedResult[0]?.count || 0);

      const canStart = currentCount < limit;

      return {
        canStart,
        reason: canStart ? undefined : `Attempt limit exceeded (${currentCount}/${limit})`,
        currentCount,
        limit
      };
    } finally {
      await queryRunner.release();
    }
  }

  /** Safe column-existence check (used inside transactions) */
  private async columnExistsSafe(
    queryRunner: any,
    table: string,
    column: string,
  ): Promise<boolean> {
    try {
      const rows = await queryRunner.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [table, column],
      );
      return rows.length > 0;
    } catch {
      return false;
    }
  }
}
