import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { AdaptiveBlockService } from './adaptive-block.service';

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
        const rows = await queryRunner.query('SELECT id FROM users WHERE email = $1', [emailStr]);
        if (rows.length > 0) {
          return rows[0].id;
        }
      }
    }
    const rows = await queryRunner.query('SELECT id FROM users ORDER BY id LIMIT 1');
    return rows[0]?.id ?? null;
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
        catCol: 'topic_group',
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
      const config = tableMap[module];
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

      const resolvedUserId = await this.resolveUserId(queryRunner, userId);
      if (!resolvedUserId) throw new BadRequestException('No users found.');

      const now = new Date();
      const durationMinutes = Number(assessment.total_time_minutes || 60);
      const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
      const attemptToken = `${module.substring(0, 3).toUpperCase()}-${crypto.randomUUID()}`;
      const shuffleSeed = crypto.randomBytes(8).toString('hex');


      let attemptResult: any[];
      if (module === 'coding') {
        attemptResult = await queryRunner.query(
          `INSERT INTO ${config.attempts}
              (assessment_id, user_id, attempt_token, status, started_at, expires_at, created_at, updated_at)
           VALUES ($1, $2, $3, 'in_progress', $4, $5, NOW(), NOW())
           RETURNING *`,
          [assessment.assessment_id, resolvedUserId, attemptToken, now, expiresAt],
        );
      } else {
        attemptResult = await queryRunner.query(
          `INSERT INTO ${config.attempts}
              (assessment_id, user_id, attempt_token, shuffle_seed, status, started_at, expires_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'in_progress', $5, $6, NOW(), NOW())
           RETURNING *`,
          [assessment.assessment_id, resolvedUserId, attemptToken, shuffleSeed, now, expiresAt],
        );
      }
      const attemptId = attemptResult[0][config.attemptIdCol];

      let requestedMode = mode === 'trial' ? 'trial' : 'main';
      let questions: any[] = [];

      if (!config.hasMode) {
        // role and coding have no mode column
        questions = await queryRunner.query(
          `SELECT ${config.idCol} FROM ${config.questions} WHERE assessment_id = $1 AND status = 'active'`,
          [assessment.assessment_id],
        );
      } else {
        questions = await queryRunner.query(
          `SELECT ${config.idCol} FROM ${config.questions} WHERE assessment_id = $1 AND status = 'active' AND mode = $2`,
          [assessment.assessment_id, requestedMode],
        );
        if (questions.length === 0 && requestedMode === 'trial') {
          this.logger.warn(`No trial questions found for ${module}, falling back to main mode`);
          requestedMode = 'main';
          questions = await queryRunner.query(
            `SELECT ${config.idCol} FROM ${config.questions} WHERE assessment_id = $1 AND status = 'active' AND mode = 'main'`,
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
      const questionLimit = Number(assessment.question_limit || 0);
      if (questionLimit > 0 && shuffled.length > questionLimit) {
        finalQuestions = shuffled.slice(0, questionLimit);
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
      );

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

  private async getAttemptQuestionsByConfig(
    attemptId: number,
    config: any,
    shuffleOptions: boolean,
    seed: string,
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
      extraSelect = ', q.topic_group, q.marks, q.negative_marks';
    }

    const difficultySelect = config.hasDifficulty ? ', q.difficulty' : '';
    const textColumn = isCoding ? 'q.problem_statement' : 'q.question_text';

    const questionRows = await this.dataSource.query(
      `SELECT aq.display_order, q.${config.idCol} as question_id,
              ${textColumn} as question_text${difficultySelect}${extraSelect}
       FROM ${config.junction} aq
       JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
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

      const base: any = {
        id: q.question_id,
        text: q.question_text,
        options: finalOptions,
        marks: q.marks ? Number(q.marks) : undefined,
        negativeMarks: q.negative_marks ? Number(q.negative_marks) : undefined,
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

    // Fetch only the current block's questions — filter by block_number, NOT is_locked.
    // Previous blocks are locked in DB but the UI only ever sees the current block.
    const questionRows = await this.dataSource.query(
      `SELECT aq.display_order, aq.block_sequence_order, aq.block_number,
              q.${config.idCol} AS question_id, q.question_text, q.difficulty,
              q.${config.catCol} AS category, q.marks, q.negative_marks, q.image_url
       FROM ${config.junction} aq
       JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
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
      questions.push({
        id: q.question_id,
        text: q.question_text,
        difficulty: q.difficulty,
        category: q.category,
        marks: Number(q.marks),
        negativeMarks: Number(q.negative_marks),
        imageUrl: q.image_url ?? undefined,
        options,
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
        `SELECT a.*, ass.shuffle_options, ass.module_type
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
      );

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

  async submitAttempt(module: string, token: string, body: any) {
    const answers: Record<string, string> = body?.answers ?? body ?? {};
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
    const isRole    = dbModule === 'role';
    const isGrammar = dbModule === 'grammar';
    const isCoding  = dbModule === 'coding';

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // role has no difficulty column; coding has no correct_option_id
      const difficultyCol = config.hasDifficulty ? `q.difficulty` : `'medium' as difficulty`;
      const correctOptCol = isCoding ? `NULL as correct_option_id` : `q.correct_option_id`;
      const taskTypeCol   = isGrammar ? `q.task_type` : `NULL as task_type`;

      const attemptQuestions = await queryRunner.query(
        `SELECT aq.*, ${correctOptCol}, q.marks, q.negative_marks,
                q.${config.catCol} as category, ${difficultyCol},
                ass.negative_mark_enabled, ass.negative_mark_value, ${taskTypeCol},
                ass.categories as assessment_categories
         FROM ${config.junction} aq
         JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
         JOIN tech_assessments ass ON ass.assessment_id = q.assessment_id
         WHERE aq.${config.attemptIdCol} = $1`,
        [attemptId],
      );

      let totalPositive = 0;
      let totalNegative = 0;
      let correctCount  = 0;
      const totalCount  = attemptQuestions.length;

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
        name: string; score: number; maxScore: number; answeredCount: number; totalCount: number;
      }> = {};

      for (const aq of attemptQuestions) {
        const questionIdStr    = String(aq[config.idCol]);
        const selectedOptionId = answers
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
          sectionMap[category] = { name: categoryName, score: 0, maxScore: 0, answeredCount: 0, totalCount: 0 };
        }

        const questionMarks    = Number(aq.marks || 1);
        let questionNegMarks   = 0;
        if (aq.negative_mark_enabled) {
          questionNegMarks = Number(aq.negative_marks || aq.negative_mark_value || 0);
        }

        sectionMap[category].totalCount += 1;
        sectionMap[category].maxScore   += questionMarks;

        if (isCoding) {
          const rawAnswer = selectedOptionId;
          if (rawAnswer !== undefined && rawAnswer !== null && rawAnswer !== '') {
            const answerPayload = typeof rawAnswer === 'object' ? rawAnswer : { code: String(rawAnswer) };
            const submittedCode = (answerPayload as any).code ?? (answerPayload as any).submittedCode ?? null;
            const language      = (answerPayload as any).language ?? (answerPayload as any).lang ?? null;
            if (submittedCode) {
              await queryRunner.query(
                `UPDATE ${config.junction}
                 SET submitted_code = $1, language = COALESCE($2, language), submitted_at = NOW()
                 WHERE attempt_question_id = $3`,
                [submittedCode, language, aq.attempt_question_id],
              );
            }
          }
          continue;
        }

        if (isGrammar) {
          const taskType  = String(aq.task_type || '').toLowerCase();
          const rawAnswer = selectedOptionId;
          if (rawAnswer !== undefined && rawAnswer !== null && rawAnswer !== '') {
            sectionMap[category].answeredCount++;
            if (taskType === 'listening_mcq' || taskType === 'reading_mcq') {
              const optId = typeof rawAnswer === 'object'
                ? (rawAnswer as any).selectedOptionId ?? (rawAnswer as any).optionId ?? (rawAnswer as any).value
                : rawAnswer;
              if (optId) {
                const isCorrect = Number(optId) === Number(aq.correct_option_id);
                await queryRunner.query(
                  `UPDATE ${config.junction}
                   SET selected_option_id = $1, is_correct = $2, answered_at = NOW()
                   WHERE attempt_question_id = $3`,
                  [optId, isCorrect, aq.attempt_question_id],
                );
                if (isCorrect) {
                  totalPositive += questionMarks;
                  sectionMap[category].score += questionMarks;
                  correctCount++;
                } else {
                  totalNegative += questionNegMarks;
                  sectionMap[category].score -= questionNegMarks;
                }
              }
            } else if (taskType === 'writing') {
              const answerText = typeof rawAnswer === 'string'
                ? rawAnswer
                : (rawAnswer as any).text ?? (rawAnswer as any).answerText ?? null;
              if (answerText) {
                await queryRunner.query(
                  `UPDATE ${config.junction} SET answer_text = $1, answered_at = NOW() WHERE attempt_question_id = $2`,
                  [answerText, aq.attempt_question_id],
                );
              }
            } else if (taskType === 'speaking') {
              const audioPayload = typeof rawAnswer === 'string'
                ? rawAnswer
                : (rawAnswer as any).audio ?? (rawAnswer as any).audioBase64 ?? (rawAnswer as any).audioUrl ?? null;
              const answerText = typeof rawAnswer === 'object'
                ? (rawAnswer as any).text ?? (rawAnswer as any).answerText ?? null
                : null;
              if (audioPayload || answerText) {
                await queryRunner.query(
                  `UPDATE ${config.junction}
                   SET answer_audio_url = $1, answer_text = COALESCE($2, answer_text), answered_at = NOW()
                   WHERE attempt_question_id = $3`,
                  [audioPayload, answerText, aq.attempt_question_id],
                );
              }
            } else {
              const answerText = typeof rawAnswer === 'string'
                ? rawAnswer
                : (rawAnswer as any).text ?? (rawAnswer as any).answerText ?? null;
              if (answerText) {
                await queryRunner.query(
                  `UPDATE ${config.junction} SET answer_text = $1, answered_at = NOW() WHERE attempt_question_id = $2`,
                  [answerText, aq.attempt_question_id],
                );
              }
            }
          }
          continue;
        }

        // MCQ modules: aptitude, mnc, role
        if (selectedOptionId !== undefined && selectedOptionId !== null && selectedOptionId !== '') {
          sectionMap[category].answeredCount++;
          const isCorrectAnswer = String(selectedOptionId) === String(aq.correct_option_id);
          const scoreAwarded    = isCorrectAnswer ? questionMarks : 0;
          const negativeApplied = isCorrectAnswer ? 0 : questionNegMarks;

          if (isCorrectAnswer) {
            totalPositive += scoreAwarded;
            correctCount++;
            sectionMap[category].score += scoreAwarded;
          } else {
            totalNegative += negativeApplied;
            sectionMap[category].score -= negativeApplied;
          }

          await queryRunner.query(
            `UPDATE ${config.junction}
             SET selected_option_id = $1, is_correct = $2, score_awarded = $3, negative_applied = $4, answered_at = NOW()
             WHERE attempt_question_id = $5`,
            [selectedOptionId, isCorrectAnswer, scoreAwarded, negativeApplied, aq.attempt_question_id],
          );
        } else {
          await queryRunner.query(
            `UPDATE ${config.junction}
             SET selected_option_id = NULL, is_correct = NULL, score_awarded = 0, negative_applied = 0, answered_at = NULL
             WHERE attempt_question_id = $1`,
            [aq.attempt_question_id],
          );
        }
      }

      const rawTotalScore    = totalPositive - totalNegative;
      const totalScore       = rawTotalScore < 0 ? 0 : rawTotalScore;
      const accuracy         = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
      const now              = new Date();
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

      const sections = Object.values(sectionMap).map(sec => ({
        name: sec.name,
        score: sec.score < 0 ? 0 : sec.score,
        weight: `${sec.score < 0 ? 0 : sec.score}/${sec.maxScore}`,
      }));

      return {
        success: true,
        token,
        overallScore: totalScore,
        totalScore,
        positiveScore: totalPositive,
        negativeScore: totalNegative,
        correctCount,
        totalQuestions: totalCount,
        accuracy,
        timeTakenSeconds,
        sections,
        status: 'completed',
      };
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

      // 6. Create attempt record
      const now = new Date();
      const durationMinutes = Number(assessment.total_time_minutes || 60);
      const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
      const attemptToken = `${dbModule.substring(0, 3).toUpperCase()}-BLOCK-${crypto.randomUUID()}`;
      const shuffleSeed = crypto.randomBytes(8).toString('hex');

      await queryRunner.query(
        `INSERT INTO ${config.attempts}
           (assessment_id, user_id, attempt_token, shuffle_seed, status, started_at, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'in_progress', $5, $6, NOW(), NOW())`,
        [assessment.assessment_id, resolvedUserId, attemptToken, shuffleSeed, now, expiresAt],
      );

      // 7. Commit so generateBlock can read the attempt row
      await queryRunner.commitTransaction();

      // 8. Initialize adaptive_blocks rows (idempotent)
      await this.adaptiveBlockService.initializeAdaptiveBlocks(assessment.assessment_id, {
        blocksPerAssessment: totalBlocks,
        questionsPerBlock,
      });

      // 9. Generate block 1
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

    // 2. Load attempt details for next-block generation
    const attemptRows = await this.dataSource.query(
      `SELECT assessment_id, user_id FROM tech_aptitude_attempts WHERE attempt_token = $1`,
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
                aq.${config.idCol} AS question_id,
                aq.selected_option_id,
                aq.block_number,
                q.correct_option_id,
                q.marks,
                q.negative_marks,
                q.${config.catCol} AS category,
                ass.negative_mark_enabled,
                ass.negative_mark_value
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
      const totalCount = allQuestions.length;

      // Per-category breakdown
      const categoryMap: Record<string, { correct: number; total: number; score: number; maxScore: number }> = {};
      // Per-block breakdown
      const blockMap: Record<number, { correct: number; total: number; positive: number; negative: number }> = {};

      for (const aq of allQuestions) {
        const cat = aq.category ?? 'General';
        const blk = Number(aq.block_number ?? 0);

        if (!categoryMap[cat]) categoryMap[cat] = { correct: 0, total: 0, score: 0, maxScore: 0 };
        if (!blockMap[blk]) blockMap[blk] = { correct: 0, total: 0, positive: 0, negative: 0 };

        const qMarks = Number(aq.marks || 1);
        const negMarks = aq.negative_mark_enabled
          ? Number(aq.negative_marks || aq.negative_mark_value || 0)
          : 0;

        categoryMap[cat].total++;
        categoryMap[cat].maxScore += qMarks;
        blockMap[blk].total++;

        const sel = aq.selected_option_id;

        if (sel !== null && sel !== undefined && String(sel) !== '') {
          const isCorrect = String(sel) === String(aq.correct_option_id);
          const scoreAwarded = isCorrect ? qMarks : 0;
          const negApplied = isCorrect ? 0 : negMarks;

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

          // Write final authoritative scores
          await queryRunner.query(
            `UPDATE ${config.junction}
             SET is_correct=$1, score_awarded=$2, negative_applied=$3
             WHERE attempt_question_id=$4`,
            [isCorrect, scoreAwarded, negApplied, aq.attempt_question_id],
          );
        } else {
          // Unanswered — zero score
          await queryRunner.query(
            `UPDATE ${config.junction}
             SET is_correct=NULL, score_awarded=0, negative_applied=0
             WHERE attempt_question_id=$1`,
            [aq.attempt_question_id],
          );
        }
      }

      const rawTotal = totalPositive - totalNegative;
      const totalScore = rawTotal < 0 ? 0 : rawTotal;
      const accuracyPct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
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
      const sections = Object.entries(categoryMap).map(([cat, v]) => ({
        name: cat,
        correct: v.correct,
        total: v.total,
        score: Math.max(0, parseFloat(v.score.toFixed(2))),
        maxScore: parseFloat(v.maxScore.toFixed(2)),
        accuracyPct: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
      }));

      const weakCategories = sections.filter(s => s.accuracyPct < 50).map(s => s.name);
      const strongCategories = sections.filter(s => s.accuracyPct >= 80).map(s => s.name);

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

      return {
        success: true,
        token,
        totalScore,
        positiveScore: totalPositive,
        negativeScore: totalNegative,
        correctCount,
        totalQuestions: totalCount,
        accuracyPct,
        timeTakenSeconds,
        status: 'completed',
        // Dashboard data
        sections,
        weakCategories,
        strongCategories,
        blockSummaries,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      this.logger.error(`submitBlockBasedAttempt (${module}) error:`, error);
      throw error;
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
