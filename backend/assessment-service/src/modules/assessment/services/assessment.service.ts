import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';

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

  private async hasColumn(tableName: string, columnName: string): Promise<boolean> {
    const cacheKey = `${tableName}.${columnName}`;
    const cached = this.columnExistsCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const rows = await this.dataSource.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1`,
      [tableName, columnName],
    );
    const exists = rows.length > 0;
    this.columnExistsCache.set(cacheKey, exists);
    return exists;
  }

  // ─── Generic Assessment logic ──────────────────────────────────────────────────

  async startAttempt(module: string, data: any) {
    const { assessmentId, assessmentCode, userId, mode = 'main' } = data;
    this.logger.log(`startAttempt: module=${module}, code=${assessmentCode}, mode=${mode}`);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`[DEBUG ${module}] Step 1: Connected to DB, transaction started`);
      const dbModule = module === 'communication' ? 'grammar' : module;
      let assessment;
      if (assessmentId) {
        const assessments = await queryRunner.query(
          `SELECT * FROM tech_assessments WHERE assessment_id = $1 AND module_type = $2`,
          [assessmentId, dbModule]
        );
        assessment = assessments[0];
      } else if (assessmentCode) {
        const assessments = await queryRunner.query(
          `SELECT * FROM tech_assessments WHERE assessment_code = $1 AND module_type = $2`,
          [assessmentCode, dbModule]
        );
        assessment = assessments[0];
        
        // Fallback: If code not found, use any active assessment
        if (!assessment) {
          this.logger.warn(`Code ${assessmentCode} not found, using active ${module} assessment`);
          const fallback = await queryRunner.query(
            `SELECT * FROM tech_assessments WHERE module_type = $1 AND status = 'active' ORDER BY assessment_id DESC LIMIT 1`,
            [module]
          );
          assessment = fallback[0];
        }
      } else {
        // Fallback: Get the latest active assessment for this module
        const assessments = await queryRunner.query(
          `SELECT * FROM tech_assessments WHERE module_type = $1 AND status = 'active' ORDER BY assessment_id DESC LIMIT 1`,
          [dbModule]
        );
        assessment = assessments[0];
      }

      if (!assessment) throw new NotFoundException(`${module} assessment not found`);
      this.logger.log(`[DEBUG ${module}] Step 2: Assessment found: ${assessment.assessment_id}`);

      const resolvedUserId = await this.resolveUserId(queryRunner, userId);
      this.logger.log(`[DEBUG ${module}] Step 3: User resolved: ${resolvedUserId}`);
      if (!resolvedUserId) throw new BadRequestException('No users found.');

      const now = new Date();
      const durationMinutes = Number(assessment.total_time_minutes || 60);
      const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
      const attemptToken = `${module.substring(0, 3).toUpperCase()}-${crypto.randomUUID()}`;
      const shuffleSeed = crypto.randomBytes(8).toString('hex');

      // Table mapping
      const tableMap: Record<string, { attempts: string; questions: string; junction: string; idCol: string; options: string | null; attemptIdCol: string }> = {
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
        },
        coding: {
            attempts: 'tech_coding_attempts',
            questions: 'tech_coding_questions',
            junction: 'tech_coding_attempt_questions',
            idCol: 'coding_question_id',
            options: null,
            attemptIdCol: 'coding_attempt_id'
        }
      };

      const config = tableMap[module];
      if (!config) throw new BadRequestException(`Module ${module} not supported yet`);

      // Coding module doesn't have shuffle_seed column
      let attemptResult;
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
      this.logger.log(`[DEBUG ${module}] Step 6: Attempt created with ID: ${attemptId}`);

      let requestedMode = mode === 'trial' ? 'trial' : 'main';
      let questions = [];

      const isCoding = module === 'coding';

      if (isCoding) {
        questions = await queryRunner.query(
          `SELECT ${config.idCol} FROM ${config.questions} WHERE assessment_id = $1 AND status = 'active'`,
          [assessment.assessment_id],
        );
      } else {
        questions = await queryRunner.query(
          `SELECT ${config.idCol} FROM ${config.questions} WHERE assessment_id = $1 AND status = 'active' AND mode = $2`,
          [assessment.assessment_id, requestedMode],
        );
        
        // Fallback to main mode if trial mode has no questions
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
      this.logger.log(`[DEBUG ${module}] Step 9: Transaction committed`);

      // Get full questions for the response
      this.logger.log(`[DEBUG ${module}] Step 10: Fetching full questions from ${config.junction}`);
      const fullQuestions = await this.getAttemptQuestionsByConfig(attemptId, config, assessment.shuffle_options, shuffleSeed);
      this.logger.log(`[DEBUG ${module}] Step 11: Full questions fetched: ${fullQuestions.length}`);

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
    // Determine which extra columns to select based on the module table
    const isAptitude = config.questions === 'tech_aptitude_questions';
    const isGrammar  = config.questions === 'tech_grammar_questions';
    const isRole     = config.questions === 'tech_role_questions';
    const isMnc      = config.questions === 'tech_mnc_questions';

    // Build extra SELECT columns
    let extraSelect = '';
    let extraGroup  = '';
    if (isAptitude) {
      extraSelect = ', q.image_url, q.marks, q.negative_marks';
      extraGroup  = ', q.image_url, q.marks, q.negative_marks';
    } else if (isGrammar) {
      extraSelect = ', q.task_type, q.audio_url, q.passage_text, q.reference_answer, q.marks, q.negative_marks';
      extraGroup  = ', q.task_type, q.audio_url, q.passage_text, q.reference_answer, q.marks, q.negative_marks';
    } else if (isRole) {
      extraSelect = ', q.domain, q.question_type, q.scenario_context, q.marks, q.negative_marks';
      extraGroup  = ', q.domain, q.question_type, q.scenario_context, q.marks, q.negative_marks';
    } else if (isMnc) {
      extraSelect = ', q.topic_group, q.marks, q.negative_marks';
      extraGroup  = ', q.topic_group, q.marks, q.negative_marks';
    }

    const difficultySelect = !isRole ? ', q.difficulty' : '';
    const difficultyGroup = !isRole ? ', q.difficulty' : '';

    const textColumn = config.questions === 'tech_coding_questions' ? 'q.problem_statement' : 'q.question_text';

    const questionRows = await this.dataSource.query(
      `SELECT aq.display_order, q.${config.idCol} as question_id, ass.difficulty_marks, ass.difficulty_negative_marks,
              ${textColumn} as question_text${difficultySelect}${extraSelect},
              COALESCE(
                json_agg(
                  json_build_object('id', o.option_id::text, 'text', o.option_text)
                  ORDER BY o.option_id
                ) FILTER (WHERE o.option_id IS NOT NULL),
                '[]'::json
              ) as options
       FROM ${config.junction} aq
       JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
       WHERE aq.${config.attemptIdCol} = $1
       GROUP BY aq.display_order, q.${config.idCol}, ${textColumn}${difficultyGroup}${extraGroup}
       ORDER BY aq.display_order ASC`,
      [attemptId],
    );

    // Fetch options separately to avoid massive duplication in join or complex aggregations for simple mapping
    const questions = [];
    for (const q of questionRows) {
        const options = await this.dataSource.query(
            `SELECT option_id::text as id, option_text as text 
             FROM ${config.options} 
             WHERE ${config.idCol} = $1 
             ORDER BY option_id ASC`,
            [q[config.idCol]]
        );

        let finalOptions = options;
        if (shuffleOptions) {
            finalOptions = this.shuffleWithSeed(options, seed + q[config.idCol]);
        }

      const base: any = {
        id: q.question_id,
        text: q.question_text,
        difficulty: q.difficulty,
        options: finalOptions,
        marks: q.marks ? Number(q.marks) : undefined,
        negativeMarks: q.negative_marks ? Number(q.negative_marks) : undefined,
      };

      if (isAptitude && q.image_url)    base.imageUrl = q.image_url;
      if (isGrammar) {
        base.taskType      = q.task_type;
        base.audioUrl      = q.audio_url;
        base.passageText   = q.passage_text;
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

      return base;
    });
  }

  async startAptitudeAttempt(data: any) {
    return this.startAttempt('aptitude', data);
  }

  async getAttemptQuestions(token: string) {
    try {
      const moduleType = (token.startsWith('APT-') ? 'aptitude' : 
                         (token.startsWith('GRA-') || token.startsWith('COM-')) ? 'grammar' :
                         token.startsWith('MNC-') ? 'mnc' :
                         token.startsWith('ROL-') ? 'role' : 'aptitude');

      const config = this.getModuleConfig(moduleType);

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

  async submitAttempt(module: string, token: string, body: any) {
    const { answers } = body;
    const config = this.getModuleConfig(module);
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get attempt
      const attemptRows = await queryRunner.query(
        `SELECT a.* FROM ${config.attempts} a WHERE a.attempt_token = $1`,
        [token],
      );
      const attempt = attemptRows[0];
      if (!attempt) throw new NotFoundException('Attempt not found');
      if (attempt.status === 'submitted') throw new BadRequestException('Attempt already submitted');

      const attemptId = attempt[config.attemptIdCol];

      // Get all questions with correct answers
      const correctOptionCol = module === 'coding' ? 'NULL as correct_option_id' : 'q.correct_option_id';
      const questionRows = await queryRunner.query(
        `SELECT aq.attempt_question_id, aq.${config.idCol} as question_id,
                ${correctOptionCol}, q.marks, q.negative_marks,
                ${module === 'grammar' ? 'q.task_type' : 'NULL as task_type'}
         FROM ${config.junction} aq
         JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
         WHERE aq.${config.attemptIdCol} = $1`,
        [attemptId],
      );

      let totalScore = 0;
      let positiveScore = 0;
      let negativeScore = 0;
      let correctCount = 0;
      let wrongCount = 0;
      let answeredCount = 0;

      const resolveAnswer = (question: any) => {
        if (!answers) return undefined;
        return answers[question.attempt_question_id] ?? answers[question.question_id];
      };

      for (const question of questionRows) {
        const rawAnswer = resolveAnswer(question);
        if (rawAnswer === undefined || rawAnswer === null || rawAnswer === '') {
          continue;
        }

        answeredCount++;

        if (module === 'coding') {
          const answerPayload = typeof rawAnswer === 'object' ? rawAnswer : { code: String(rawAnswer) };
          const submittedCode = answerPayload.code ?? answerPayload.submittedCode ?? null;
          const language = answerPayload.language ?? answerPayload.lang ?? null;
          if (submittedCode) {
            await queryRunner.query(
              `UPDATE ${config.junction}
               SET submitted_code = $1, language = COALESCE($2, language), submitted_at = NOW()
               WHERE attempt_question_id = $3`,
              [submittedCode, language, question.attempt_question_id],
            );
          }
          continue;
        }

        if (module === 'grammar') {
          const taskType = String(question.task_type || '').toLowerCase();
          if (taskType === 'listening_mcq' || taskType === 'reading_mcq') {
            const selectedOptionId = typeof rawAnswer === 'object'
              ? rawAnswer.selectedOptionId ?? rawAnswer.optionId ?? rawAnswer.value
              : rawAnswer;
            if (selectedOptionId) {
              const isCorrect = Number(selectedOptionId) === Number(question.correct_option_id);
              await queryRunner.query(
                `UPDATE ${config.junction}
                 SET selected_option_id = $1, is_correct = $2, answered_at = NOW()
                 WHERE attempt_question_id = $3`,
                [selectedOptionId, isCorrect, question.attempt_question_id],
              );
              if (isCorrect) {
                totalScore += Number(question.marks);
                positiveScore += Number(question.marks);
                correctCount++;
              } else {
                totalScore -= Number(question.negative_marks || 0);
                negativeScore += Number(question.negative_marks || 0);
                wrongCount++;
              }
            }
          } else if (taskType === 'writing') {
            const answerText = typeof rawAnswer === 'string'
              ? rawAnswer
              : rawAnswer.text ?? rawAnswer.answerText ?? null;
            if (answerText) {
              await queryRunner.query(
                `UPDATE ${config.junction}
                 SET answer_text = $1, answered_at = NOW()
                 WHERE attempt_question_id = $2`,
                [answerText, question.attempt_question_id],
              );
            }
          } else if (taskType === 'speaking') {
            const audioPayload = typeof rawAnswer === 'string'
              ? rawAnswer
              : rawAnswer.audio ?? rawAnswer.audioBase64 ?? rawAnswer.audioUrl ?? rawAnswer.audioBlobUrl ?? null;
            const answerText = typeof rawAnswer === 'object'
              ? rawAnswer.text ?? rawAnswer.answerText ?? null
              : null;
            if (audioPayload || answerText) {
              await queryRunner.query(
                `UPDATE ${config.junction}
                 SET answer_audio_url = $1, answer_text = COALESCE($2, answer_text), answered_at = NOW()
                 WHERE attempt_question_id = $3`,
                [audioPayload, answerText, question.attempt_question_id],
              );
            }
          } else {
            const answerText = typeof rawAnswer === 'string'
              ? rawAnswer
              : rawAnswer.text ?? rawAnswer.answerText ?? null;
            if (answerText) {
              await queryRunner.query(
                `UPDATE ${config.junction}
                 SET answer_text = $1, answered_at = NOW()
                 WHERE attempt_question_id = $2`,
                [answerText, question.attempt_question_id],
              );
            }
          }
          continue;
        }

        const selectedOptionId = typeof rawAnswer === 'object'
          ? rawAnswer.selectedOptionId ?? rawAnswer.optionId ?? rawAnswer.value
          : rawAnswer;

        if (selectedOptionId) {
          const isCorrect = Number(selectedOptionId) === Number(question.correct_option_id);
          await queryRunner.query(
            `UPDATE ${config.junction}
             SET selected_option_id = $1, is_correct = $2, answered_at = NOW()
             WHERE attempt_question_id = $3`,
            [selectedOptionId, isCorrect, question.attempt_question_id],
          );

          if (isCorrect) {
            totalScore += Number(question.marks);
            positiveScore += Number(question.marks);
            correctCount++;
          } else {
            totalScore -= Number(question.negative_marks || 0);
            negativeScore += Number(question.negative_marks || 0);
            wrongCount++;
          }
        }
      }

      // Calculate time taken
      const timeTakenSeconds = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);

      // Update attempt
      await queryRunner.query(
        `UPDATE ${config.attempts}
         SET status = 'submitted', submitted_at = NOW(), total_score = $1,
             positive_score = $2, negative_score = $3, time_taken_seconds = $4
         WHERE ${config.attemptIdCol} = $5`,
        [totalScore, positiveScore, negativeScore, timeTakenSeconds, attemptId],
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        token,
        totalScore,
        positiveScore,
        negativeScore,
        correctCount,
        wrongCount,
        answeredCount,
        totalQuestions: questionRows.length,
        timeTakenSeconds,
        status: 'completed',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`submitAttempt (${module}) error:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private getModuleConfig(module: string) {
    const configs: Record<string, ModuleConfig> = {
      aptitude: {
        attempts: 'tech_aptitude_attempts',
        questions: 'tech_aptitude_questions',
        junction: 'tech_aptitude_attempt_questions',
        idCol: 'aptitude_question_id',
        options: 'tech_aptitude_options',
        attemptIdCol: 'aptitude_attempt_id',
        selectColumns: [
          'q.image_url',
          'q.subcategory as category',
          'q.marks',
          'q.negative_marks',
          'q.explanation',
        ],
        groupByColumns: [
          'q.image_url',
          'q.subcategory',
          'q.marks',
          'q.negative_marks',
          'q.explanation',
        ],
      },
      grammar: {
        attempts: 'tech_grammar_attempts',
        questions: 'tech_grammar_questions',
        junction: 'tech_grammar_attempt_questions',
        idCol: 'grammar_question_id',
        options: 'tech_grammar_options',
        attemptIdCol: 'grammar_attempt_id',
        selectColumns: [
          'q.task_type',
          'q.audio_url',
          'q.passage_text',
          'q.reference_answer',
          'q.rubric_json',
          'q.marks',
          'q.negative_marks',
        ],
        groupByColumns: [
          'q.task_type',
          'q.audio_url',
          'q.passage_text',
          'q.reference_answer',
          'q.rubric_json::text',
          'q.marks',
          'q.negative_marks',
        ],
      },
      mnc: {
        attempts: 'tech_mnc_attempts',
        questions: 'tech_mnc_questions',
        junction: 'tech_mnc_attempt_questions',
        idCol: 'mnc_question_id',
        options: 'tech_mnc_options',
        attemptIdCol: 'mnc_attempt_id',
        selectColumns: [
          'q.topic_group as category',
          'q.marks',
          'q.negative_marks',
        ],
        groupByColumns: [
          'q.topic_group',
          'q.marks',
          'q.negative_marks',
        ],
      },
      role: {
        attempts: 'tech_role_attempts',
        questions: 'tech_role_questions',
        junction: 'tech_role_attempt_questions',
        idCol: 'role_question_id',
        options: 'tech_role_options',
        attemptIdCol: 'role_attempt_id',
        selectColumns: [
          'q.domain as category',
          'q.question_type',
          'q.scenario_context',
          'q.marks',
          'q.negative_marks',
        ],
        groupByColumns: [
          'q.domain',
          'q.question_type',
          'q.scenario_context',
          'q.question_text',
          'q.marks',
          'q.negative_marks',
        ],
      },
      coding: {
        attempts: 'tech_coding_attempts',
        questions: 'tech_coding_questions',
        junction: 'tech_coding_attempt_questions',
        idCol: 'coding_question_id',
        options: null,
        attemptIdCol: 'coding_attempt_id',
        selectColumns: [
          'q.problem_title as title',
          'q.difficulty',
          'q.marks',
          'q.starter_code_json as starterCode',
          'q.starter_files_json as starterFiles',
          'q.entry_file_json as entryFile',
          'q.limits_json as limits',
          'q.sample_io_json as sampleIo',
          'q.allowed_languages_json as allowedLanguages',
          'q.input_format as inputFormat',
          'q.output_format as outputFormat',
          'q.constraints',
        ],
        groupByColumns: [
          'q.problem_title',
          'q.difficulty',
          'q.marks',
          'q.starter_code_json::text',
          'q.starter_files_json::text',
          'q.entry_file_json::text',
          'q.limits_json::text',
          'q.sample_io_json::text',
          'q.allowed_languages_json::text',
          'q.input_format',
          'q.output_format',
          'q.constraints',
        ],
      },
    };
    const config = configs[module];
    if (!config) throw new BadRequestException(`Unknown module: ${module}`);
    return config;
  }

  async submitAttempt(module: string, token: string, answers: Record<string, string>) {
    const dbModule = module === 'communication' ? 'grammar' : module;
    const tableMap: Record<string, { attempts: string; questions: string; junction: string; idCol: string; options: string; attemptIdCol: string; catCol: string }> = {
      aptitude: { 
          attempts: 'tech_aptitude_attempts', 
          questions: 'tech_aptitude_questions', 
          junction: 'tech_aptitude_attempt_questions', 
          idCol: 'aptitude_question_id',
          options: 'tech_aptitude_options',
          attemptIdCol: 'aptitude_attempt_id',
          catCol: 'subcategory'
      },
      grammar: { 
          attempts: 'tech_grammar_attempts', 
          questions: 'tech_grammar_questions', 
          junction: 'tech_grammar_attempt_questions', 
          idCol: 'grammar_question_id',
          options: 'tech_grammar_options',
          attemptIdCol: 'grammar_attempt_id',
          catCol: 'task_type'
      },
      mnc: { 
          attempts: 'tech_mnc_attempts', 
          questions: 'tech_mnc_questions', 
          junction: 'tech_mnc_attempt_questions', 
          idCol: 'mnc_question_id',
          options: 'tech_mnc_options',
          attemptIdCol: 'mnc_attempt_id',
          catCol: 'topic_group'
      },
      role: { 
          attempts: 'tech_role_attempts', 
          questions: 'tech_role_questions', 
          junction: 'tech_role_attempt_questions', 
          idCol: 'role_question_id',
          options: 'tech_role_options',
          attemptIdCol: 'role_attempt_id',
          catCol: 'domain'
      }
    };

    const config = tableMap[dbModule];
    if (!config) throw new BadRequestException(`Module ${module} not supported`);

    const attemptRows = await this.dataSource.query(
      `SELECT * FROM ${config.attempts} WHERE attempt_token = $1`,
      [token]
    );
    const attempt = attemptRows[0];
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.status !== 'in_progress') {
      throw new BadRequestException('Attempt is already submitted or closed');
    }

    const attemptId = attempt[config.attemptIdCol];
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Fetch all questions in this attempt with correct option id and marks
      const attemptQuestions = await queryRunner.query(
        `SELECT aq.*, q.correct_option_id, q.marks, q.negative_marks, q.${config.catCol} as category, q.difficulty, ass.difficulty_marks, ass.difficulty_negative_marks, ass.negative_mark_enabled, ass.negative_mark_value
         FROM ${config.junction} aq
         JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
         JOIN tech_assessments ass ON ass.assessment_id = q.assessment_id
         WHERE aq.${config.attemptIdCol} = $1`,
        [attemptId]
      );

      let totalPositive = 0;
      let totalNegative = 0;
      let correctCount = 0;
      const totalCount = attemptQuestions.length;

      const sectionMap: Record<string, { name: string; score: number; maxScore: number; answeredCount: number; totalCount: number }> = {};

      for (const aq of attemptQuestions) {
        const questionIdStr = String(aq[config.idCol]);
        const selectedOptionId = answers ? answers[questionIdStr] : undefined;
        const category = aq.category || 'General';

        if (!sectionMap[category]) {
          sectionMap[category] = {
            name: category,
            score: 0,
            maxScore: 0,
            answeredCount: 0,
            totalCount: 0,
          };
        }

        const diffMarks = aq.difficulty_marks ? (typeof aq.difficulty_marks === 'string' ? JSON.parse(aq.difficulty_marks) : aq.difficulty_marks) : {};
        const diffNegMarks = aq.difficulty_negative_marks ? (typeof aq.difficulty_negative_marks === 'string' ? JSON.parse(aq.difficulty_negative_marks) : aq.difficulty_negative_marks) : {};

        const difficulty = aq.difficulty || 'medium';
        const questionMarks = Number(diffMarks[difficulty] !== undefined ? diffMarks[difficulty] : (aq.marks || 1));
        
        let questionNegMarks = 0;
        if (aq.negative_mark_enabled) {
          questionNegMarks = Number(diffNegMarks[difficulty] !== undefined ? diffNegMarks[difficulty] : (aq.negative_marks || aq.negative_mark_value || 0));
        }

        sectionMap[category].totalCount += 1;
        sectionMap[category].maxScore += questionMarks;

        let isCorrect: boolean | null = null;
        let scoreAwarded = 0;
        let negativeApplied = 0;

        if (selectedOptionId !== undefined && selectedOptionId !== null && selectedOptionId !== '') {
          sectionMap[category].answeredCount += 1;
          const isCorrectAnswer = String(selectedOptionId) === String(aq.correct_option_id);

          if (isCorrectAnswer) {
            isCorrect = true;
            scoreAwarded = questionMarks;
            negativeApplied = 0;
            totalPositive += scoreAwarded;
            correctCount += 1;
            sectionMap[category].score += scoreAwarded;
          } else {
            isCorrect = false;
            scoreAwarded = 0;
            negativeApplied = questionNegMarks;
            totalNegative += negativeApplied;
            sectionMap[category].score -= negativeApplied;
          }

          await queryRunner.query(
            `UPDATE ${config.junction}
             SET selected_option_id = $1, is_correct = $2, score_awarded = $3, negative_applied = $4, answered_at = NOW()
             WHERE attempt_question_id = $5`,
            [selectedOptionId, isCorrect, scoreAwarded, negativeApplied, aq.attempt_question_id]
          );
        } else {
          // If no answer selected, clear the fields
          await queryRunner.query(
            `UPDATE ${config.junction}
             SET selected_option_id = NULL, is_correct = NULL, score_awarded = 0, negative_applied = 0, answered_at = NULL
             WHERE attempt_question_id = $1`,
            [aq.attempt_question_id]
          );
        }
      }

      const rawTotalScore = totalPositive - totalNegative;
      const totalScore = rawTotalScore < 0 ? 0 : rawTotalScore; // Keep total non-negative
      const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

      const now = new Date();
      const startedAt = new Date(attempt.started_at);
      const timeTakenSeconds = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000));

      // 2. Update the main attempt table
      await queryRunner.query(
        `UPDATE ${config.attempts}
         SET status = 'submitted', submitted_at = $1, positive_score = $2, negative_score = $3, total_score = $4, time_taken_seconds = $5, updated_at = NOW()
         WHERE ${config.attemptIdCol} = $6`,
        [now, totalPositive, totalNegative, totalScore, timeTakenSeconds, attemptId]
      );

      await queryRunner.commitTransaction();

      const sections = Object.values(sectionMap).map(sec => ({
        name: sec.name,
        score: sec.score < 0 ? 0 : sec.score,
        weight: `${sec.score}/${sec.maxScore}`,
      }));

      return {
        overallScore: totalScore,
        accuracy,
        timeTakenSeconds,
        sections,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      this.logger.error(`submitAttempt (${module}) error:`, error);
      throw new InternalServerErrorException('Failed to submit assessment attempt');
    } finally {
      await queryRunner.release();
    }
  }
}
