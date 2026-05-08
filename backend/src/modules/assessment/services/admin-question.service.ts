import { Injectable, Logger, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type ModuleType = 'aptitude' | 'grammar' | 'communication' | 'coding' | 'mnc' | 'role';

interface ModuleConfig {
  readonly questionTable: string;
  readonly idColumn: string;
  readonly optionsTable?: string;
  readonly optionsFk?: string;
  readonly categoryColumn: string;
}

const MODULE_CONFIGS: Record<ModuleType, ModuleConfig> = {
  aptitude: {
    questionTable: 'tech_aptitude_questions',
    idColumn: 'aptitude_question_id',
    optionsTable: 'tech_aptitude_options',
    optionsFk: 'aptitude_question_id',
    categoryColumn: 'subcategory',
  },
  grammar: {
    questionTable: 'tech_grammar_questions',
    idColumn: 'grammar_question_id',
    optionsTable: 'tech_grammar_options',
    optionsFk: 'grammar_question_id',
    categoryColumn: 'task_type',
  },
  coding: {
    questionTable: 'tech_coding_questions',
    idColumn: 'coding_question_id',
    categoryColumn: 'category',
  },
  mnc: {
    questionTable: 'tech_mnc_questions',
    idColumn: 'mnc_question_id',
    optionsTable: 'tech_mnc_options',
    optionsFk: 'mnc_question_id',
    categoryColumn: 'topic_group',
  },
  role: {
    questionTable: 'tech_role_questions',
    idColumn: 'role_question_id',
    optionsTable: 'tech_role_options',
    optionsFk: 'role_question_id',
    categoryColumn: 'domain',
  },
  communication: {
    questionTable: 'tech_grammar_questions',
    idColumn: 'grammar_question_id',
    optionsTable: 'tech_grammar_options',
    optionsFk: 'grammar_question_id',
    categoryColumn: 'task_type',
  },
};

@Injectable()
export class AdminQuestionService {
  private readonly logger = new Logger(AdminQuestionService.name);

  constructor(private dataSource: DataSource) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────────

  private async ensureDefaultAssessment(queryRunner: any, module: ModuleType, createdById: number): Promise<number> {
    const code = `${module.toUpperCase()}_DEFAULT`;
    const name = `Default ${module.charAt(0).toUpperCase() + module.slice(1)} Assessment`;
    
    const dbModule = module === 'communication' ? 'grammar' : module;
    const rows = await queryRunner.query(
      `INSERT INTO tech_assessments
          (assessment_code, assessment_name, module_type, total_time_minutes,
           total_questions, shuffle_questions, shuffle_options,
           negative_mark_enabled, negative_mark_value, status, created_by)
       VALUES ($1, $2, $3, 60, 0, TRUE, TRUE, FALSE, NULL, 'active', $4)
       ON CONFLICT (assessment_code) DO UPDATE SET updated_at = NOW()
       RETURNING assessment_id`,
      [code, name, dbModule, createdById]
    );
    return Number(rows[0].assessment_id);
  }

  private async resolveUserId(queryRunner: any, userId?: number): Promise<number | null> {
    if (userId && Number.isFinite(userId)) return userId;
    const rows = await queryRunner.query('SELECT id FROM users ORDER BY id LIMIT 1');
    return rows[0]?.id ?? null;
  }

  private formatQuestionResponse(module: ModuleType, row: any, options: any[]) {
    const config = MODULE_CONFIGS[module];
    return {
      id: Number(row[config.idColumn]),
      assessmentId: Number(row.assessment_id),
      category: row[config.categoryColumn],
      difficulty: row.difficulty,
      questionText: row.question_text,
      options: options.map((o: any) => ({
        id: Number(o.option_id),
        text: o.option_text,
      })),
      correctOptionId: row.correct_option_id ? Number(row.correct_option_id) : null,
      marks: Number(row.marks),
      negativeMarks: Number(row.negative_marks),
      status: row.status,
      mode: row.mode || 'trial',
      imageUrl: row.image_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ─── Generic CRUD Methods ──────────────────────────────────────────────────────

  async listQuestions(module: ModuleType, query: any) {
    const config = MODULE_CONFIGS[module];
    const { assessmentId, category, status, search, mode } = query;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (assessmentId) {
      conditions.push(`q.assessment_id = $${paramIdx++}`);
      params.push(assessmentId);
    }
    if (category) {
      conditions.push(`q.${config.categoryColumn} = $${paramIdx++}`);
      params.push(category);
    }
    if (status) {
      conditions.push(`q.status = $${paramIdx++}`);
      params.push(status);
    }
    if (mode) {
      conditions.push(`q.mode = $${paramIdx++}`);
      params.push(mode);
    }
    if (search) {
      conditions.push(`LOWER(q.question_text) LIKE $${paramIdx++}`);
      params.push(`%${search.toLowerCase()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const optionsJoin = config.optionsTable 
        ? `LEFT JOIN ${config.optionsTable} o ON o.${config.optionsFk} = q.${config.idColumn}`
        : '';
      
      const optionsAgg = config.optionsTable
        ? `COALESCE(
              json_agg(
                  json_build_object('option_id', o.option_id, 'option_text', o.option_text)
                  ORDER BY o.option_id
              ) FILTER (WHERE o.option_id IS NOT NULL),
              '[]'::json
          ) AS options`
        : "'[]'::json AS options";

      const rows = await this.dataSource.query(
        `SELECT q.*, ${optionsAgg}
         FROM ${config.questionTable} q
         ${optionsJoin}
         ${whereClause}
         GROUP BY q.${config.idColumn}
         ORDER BY q.${config.idColumn} DESC`,
        params,
      );

      return rows.map((row: any) => this.formatQuestionResponse(module, row, row.options));
    } catch (error) {
      this.logger.error(`listQuestions (${module}) error:`, error);
      throw new InternalServerErrorException('Failed to list questions');
    }
  }

  async getQuestion(module: ModuleType, id: number) {
    const config = MODULE_CONFIGS[module];
    try {
      const optionsJoin = config.optionsTable 
        ? `LEFT JOIN ${config.optionsTable} o ON o.${config.optionsFk} = q.${config.idColumn}`
        : '';
      
      const optionsAgg = config.optionsTable
        ? `COALESCE(
              json_agg(
                  json_build_object('option_id', o.option_id, 'option_text', o.option_text)
                  ORDER BY o.option_id
              ) FILTER (WHERE o.option_id IS NOT NULL),
              '[]'::json
          ) AS options`
        : "'[]'::json AS options";

      const rows = await this.dataSource.query(
        `SELECT q.*, ${optionsAgg}
         FROM ${config.questionTable} q
         ${optionsJoin}
         WHERE q.${config.idColumn} = $1
         GROUP BY q.${config.idColumn}`,
        [id],
      );

      if (rows.length === 0) throw new NotFoundException('Question not found');
      return this.formatQuestionResponse(module, rows[0], rows[0].options);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`getQuestion (${module}) error:`, error);
      throw new InternalServerErrorException('Failed to get question');
    }
  }

  async createQuestion(module: ModuleType, data: any) {
    const config = MODULE_CONFIGS[module];
    const {
      assessmentId: reqAssessmentId,
      category,
      difficulty = 'medium',
      questionText,
      options,
      correctOptionIndex = 0,
      marks = 1,
      negativeMarks = 0,
      status = 'active',
      mode = 'trial',
      imageUrl = null,
      userId,
    } = data;

    if (!category || !questionText) throw new BadRequestException('category and questionText are required');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let assessmentId = reqAssessmentId ? Number(reqAssessmentId) : null;
      if (!assessmentId) {
        const resolvedUser = await this.resolveUserId(queryRunner, userId);
        if (!resolvedUser) throw new BadRequestException('No users found. Provide userId.');
        assessmentId = await this.ensureDefaultAssessment(queryRunner, module, resolvedUser);
      }

      const qInsert = await queryRunner.query(
        `INSERT INTO ${config.questionTable}
            (assessment_id, ${config.categoryColumn}, difficulty, question_text, image_url,
             correct_option_id, marks, negative_marks, status, mode)
         VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, $8, $9)
         RETURNING *`,
        [assessmentId, category, difficulty, questionText, imageUrl, marks, negativeMarks, status, mode],
      );
      const questionRow = qInsert[0];
      const questionId = questionRow[config.idColumn];

      let insertedOptions: any[] = [];
      if (config.optionsTable && Array.isArray(options)) {
        for (const opt of options) {
          const optInsert = await queryRunner.query(
            `INSERT INTO ${config.optionsTable} (${config.optionsFk}, option_text)
             VALUES ($1, $2) RETURNING *`,
            [questionId, opt.text],
          );
          insertedOptions.push(optInsert[0]);
        }

        const correctOptionId = insertedOptions[correctOptionIndex].option_id;
        await queryRunner.query(
          `UPDATE ${config.questionTable} SET correct_option_id = $1 WHERE ${config.idColumn} = $2`,
          [correctOptionId, questionId],
        );
        questionRow.correct_option_id = correctOptionId;
      }

      await queryRunner.query(
        `UPDATE tech_assessments
         SET total_questions = (SELECT COUNT(*) FROM ${config.questionTable} WHERE assessment_id = $1), updated_at = NOW()
         WHERE assessment_id = $1`,
        [assessmentId],
      );

      await queryRunner.commitTransaction();
      return this.formatQuestionResponse(module, questionRow, insertedOptions);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`createQuestion (${module}) error:`, error);
      throw error instanceof BadRequestException ? error : new InternalServerErrorException('Failed to create question');
    } finally {
      await queryRunner.release();
    }
  }

  async updateQuestion(module: ModuleType, id: number, data: any) {
    const config = MODULE_CONFIGS[module];
    const { category, difficulty, questionText, options, correctOptionIndex, marks, negativeMarks, status, mode, imageUrl } = data;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.query(`SELECT * FROM ${config.questionTable} WHERE ${config.idColumn} = $1`, [id]);
      if (existing.length === 0) throw new NotFoundException('Question not found');

      if (config.optionsTable) {
        await queryRunner.query(`UPDATE ${config.questionTable} SET correct_option_id = NULL WHERE ${config.idColumn} = $1`, [id]);
      }

      const updates: string[] = [];
      const params: any[] = [];
      let pIdx = 1;

      if (category !== undefined) { updates.push(`${config.categoryColumn} = $${pIdx++}`); params.push(category); }
      if (difficulty !== undefined) { updates.push(`difficulty = $${pIdx++}`); params.push(difficulty); }
      if (questionText !== undefined) { updates.push(`question_text = $${pIdx++}`); params.push(questionText); }
      if (marks !== undefined) { updates.push(`marks = $${pIdx++}`); params.push(marks); }
      if (negativeMarks !== undefined) { updates.push(`negative_marks = $${pIdx++}`); params.push(negativeMarks); }
      if (status !== undefined) { updates.push(`status = $${pIdx++}`); params.push(status); }
      if (mode !== undefined) { updates.push(`mode = $${pIdx++}`); params.push(mode); }
      if (imageUrl !== undefined) { updates.push(`image_url = $${pIdx++}`); params.push(imageUrl); }

      updates.push('updated_at = NOW()');

      if (updates.length > 1) {
        params.push(id);
        await queryRunner.query(`UPDATE ${config.questionTable} SET ${updates.join(', ')} WHERE ${config.idColumn} = $${pIdx}`, params);
      }

      let insertedOptions: any[] = [];
      if (config.optionsTable && Array.isArray(options)) {
        await queryRunner.query(`DELETE FROM ${config.optionsTable} WHERE ${config.optionsFk} = $1`, [id]);
        for (const opt of options) {
          const optInsert = await queryRunner.query(`INSERT INTO ${config.optionsTable} (${config.optionsFk}, option_text) VALUES ($1, $2) RETURNING *`, [id, opt.text]);
          insertedOptions.push(optInsert[0]);
        }
        const cIdx = typeof correctOptionIndex === 'number' ? correctOptionIndex : 0;
        const safeIdx = Math.min(Math.max(0, cIdx), insertedOptions.length - 1);
        await queryRunner.query(`UPDATE ${config.questionTable} SET correct_option_id = $1 WHERE ${config.idColumn} = $2`, [insertedOptions[safeIdx].option_id, id]);
      }

      await queryRunner.commitTransaction();
      return this.getQuestion(module, id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`updateQuestion (${module}) error:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteQuestion(module: ModuleType, id: number) {
    const config = MODULE_CONFIGS[module];
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.query(`SELECT assessment_id FROM ${config.questionTable} WHERE ${config.idColumn} = $1`, [id]);
      if (existing.length === 0) throw new NotFoundException('Question not found');
      const assessmentId = existing[0].assessment_id;

      // 1. Nullify the self-referencing FK (correct_option_id -> options table)
      if (config.optionsTable) {
        await queryRunner.query(`UPDATE ${config.questionTable} SET correct_option_id = NULL WHERE ${config.idColumn} = $1`, [id]);
        
        // Handle attempt-level dependencies
        const attemptOptionsMap: Record<string, string> = {
          aptitude: 'tech_aptitude_attempt_question_options',
          grammar: 'tech_grammar_attempt_question_options',
          mnc: 'tech_mnc_attempt_question_options',
          role: 'tech_role_attempt_question_options'
        };
        const optJunction = attemptOptionsMap[module as string];
        if (optJunction) {
           await queryRunner.query(
             `DELETE FROM ${optJunction} WHERE option_id IN (SELECT option_id FROM ${config.optionsTable} WHERE ${config.optionsFk} = $1)`,
             [id]
           );
        }
      }

      // 2. Delete from attempt junction tables
      const attemptJunctionMap: Record<string, string> = {
        aptitude: 'tech_aptitude_attempt_questions',
        grammar: 'tech_grammar_attempt_questions',
        mnc: 'tech_mnc_attempt_questions',
        role: 'tech_role_attempt_questions',
      };
      const junctionTable = attemptJunctionMap[module];
      if (junctionTable) {
        // Nullify selected_option_id first if applicable
        if (config.optionsTable) {
           await queryRunner.query(`UPDATE ${junctionTable} SET selected_option_id = NULL WHERE ${config.idColumn} = $1`, [id]);
        }
        await queryRunner.query(`DELETE FROM ${junctionTable} WHERE ${config.idColumn} = $1`, [id]);
      }

      // 3. Delete options
      if (config.optionsTable) {
        await queryRunner.query(`DELETE FROM ${config.optionsTable} WHERE ${config.optionsFk} = $1`, [id]);
      }

      // 4. Delete the question itself
      await queryRunner.query(`DELETE FROM ${config.questionTable} WHERE ${config.idColumn} = $1`, [id]);
      
      // 5. Update assessment total count
      await queryRunner.query(
        `UPDATE tech_assessments
         SET total_questions = (SELECT COUNT(*) FROM ${config.questionTable} WHERE assessment_id = $1), updated_at = NOW()
         WHERE assessment_id = $1`,
        [assessmentId],
      );

      await queryRunner.commitTransaction();
      return { message: 'Question deleted' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`deleteQuestion (${module}) error:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }


  async bulkImportQuestions(module: ModuleType, data: any) {
    const config = MODULE_CONFIGS[module];
    const { questions: questionList, assessmentId: reqAssessmentId, userId } = data;
    if (!Array.isArray(questionList) || questionList.length === 0) throw new BadRequestException('questions array is required');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let assessmentId = reqAssessmentId ? Number(reqAssessmentId) : null;
      if (!assessmentId) {
        const resolvedUser = await this.resolveUserId(queryRunner, userId);
        if (!resolvedUser) throw new BadRequestException('No users found.');
        assessmentId = await this.ensureDefaultAssessment(queryRunner, module, resolvedUser);
      }

      let imported = 0;
      for (const q of questionList) {
        try {
          const category = q.category || q.subcategory || q.topic_group || q.task_type || q.taskType || q.domain || 'General';
          const questionText = q.questionText || q.text || q.question_text;
          if (!questionText) continue;

          const qInsert = await queryRunner.query(
            `INSERT INTO ${config.questionTable}
                (assessment_id, ${config.categoryColumn}, difficulty, question_text, correct_option_id, marks, negative_marks, status, mode)
             VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8)
             RETURNING ${config.idColumn}`,
            [assessmentId, category, q.difficulty || 'medium', questionText, q.marks ?? 1, q.negativeMarks ?? 0, q.status || 'active', q.mode || 'trial'],
          );
          const newQId = qInsert[0][config.idColumn];

          if (config.optionsTable && Array.isArray(q.options)) {
            const insertedOpts: any[] = [];
            for (const opt of q.options) {
              const optText = typeof opt === 'string' ? opt : opt.text || opt.option_text;
              const oInsert = await queryRunner.query(`INSERT INTO ${config.optionsTable} (${config.optionsFk}, option_text) VALUES ($1, $2) RETURNING option_id`, [newQId, optText]);
              insertedOpts.push(oInsert[0]);
            }
            const correctIdx = q.correctOptionIndex ?? q.correctOptionId ?? 0;
            const safeIdx = Math.min(Math.max(0, Number(correctIdx)), insertedOpts.length - 1);
            await queryRunner.query(`UPDATE ${config.questionTable} SET correct_option_id = $1 WHERE ${config.idColumn} = $2`, [insertedOpts[safeIdx].option_id, newQId]);
          }
          imported++;
        } catch (e: any) {
          this.logger.error(`Import item failed: ${e.message}`);
          throw e; // Rethrow to trigger transaction rollback
        }
      }

      await queryRunner.query(
        `UPDATE tech_assessments
         SET total_questions = (SELECT COUNT(*) FROM ${config.questionTable} WHERE assessment_id = $1), updated_at = NOW()
         WHERE assessment_id = $1`,
        [assessmentId],
      );

      await queryRunner.commitTransaction();
      return { imported, total: questionList.length };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`bulkImport (${module}) error:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async listAssessments(moduleType?: string) {
    try {
      const params: any[] = [];
      let where = '';
      if (moduleType) {
        where = 'WHERE module_type = $1';
        params.push(moduleType);
      }
      return await this.dataSource.query(
        `SELECT assessment_id, assessment_code, assessment_name, module_type,
                total_time_minutes, total_questions, status, created_at
         FROM tech_assessments ${where} ORDER BY assessment_id DESC`,
        params,
      );
    } catch (error) {
      this.logger.error('listAssessments error:', error);
      throw new InternalServerErrorException('Failed to list assessments');
    }
  }
  async clearQuestions(module: ModuleType, mode?: string) {
    const config = MODULE_CONFIGS[module];
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const conditions: string[] = [];
      const params: any[] = [];
      if (mode) {
        conditions.push(`mode = $1`);
        params.push(mode);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      const assessmentsRows = await queryRunner.query(
        `SELECT DISTINCT assessment_id FROM ${config.questionTable} ${whereClause}`,
        params
      );
      const affectedAssessmentIds = assessmentsRows.map((r: any) => r.assessment_id);

      if (config.optionsTable) {
        // 1. Nullify correct_option_id on questions
        await queryRunner.query(`UPDATE ${config.questionTable} SET correct_option_id = NULL ${whereClause}`, params);
        
        // 2. Handle Attempt-level dependencies
        const attemptOptionsMap: Record<string, string> = {
          aptitude: 'tech_aptitude_attempt_question_options',
          grammar: 'tech_grammar_attempt_question_options',
          mnc: 'tech_mnc_attempt_question_options',
          role: 'tech_role_attempt_question_options'
        };
        const optJunction = attemptOptionsMap[module as string];
        if (optJunction) {
           await queryRunner.query(
             `DELETE FROM ${optJunction} WHERE option_id IN (SELECT option_id FROM ${config.optionsTable} WHERE ${config.optionsFk} IN (SELECT ${config.idColumn} FROM ${config.questionTable} ${whereClause}))`,
             params
           );
        }

        // 3. Nullify selected_option_id in attempt questions
        const attemptJunctions: Record<string, string> = {
          aptitude: 'tech_aptitude_attempt_questions',
          grammar: 'tech_grammar_attempt_questions',
          mnc: 'tech_mnc_attempt_questions',
          role: 'tech_role_attempt_questions'
        };
        const junctionTable = attemptJunctions[module as string];
        if (junctionTable) {
          await queryRunner.query(
            `UPDATE ${junctionTable} SET selected_option_id = NULL WHERE ${config.idColumn} IN (SELECT ${config.idColumn} FROM ${config.questionTable} ${whereClause})`,
            params
          );
        }

        // 4. Delete options
        await queryRunner.query(
          `DELETE FROM ${config.optionsTable} WHERE ${config.optionsFk} IN (SELECT ${config.idColumn} FROM ${config.questionTable} ${whereClause})`,
          params
        );
      }

      // 5. Delete from attempts junction table
      const attemptJunctions: Record<string, string> = {
        aptitude: 'tech_aptitude_attempt_questions',
        grammar: 'tech_grammar_attempt_questions',
        mnc: 'tech_mnc_attempt_questions',
        role: 'tech_role_attempt_questions'
      };
      const junctionTable = attemptJunctions[module as string];
      if (junctionTable) {
        await queryRunner.query(
          `DELETE FROM ${junctionTable} WHERE ${config.idColumn} IN (SELECT ${config.idColumn} FROM ${config.questionTable} ${whereClause})`,
          params
        );
      }

      // 6. Finally delete questions
      await queryRunner.query(`DELETE FROM ${config.questionTable} ${whereClause}`, params);

      for (const aid of affectedAssessmentIds) {
        await queryRunner.query(
          `UPDATE tech_assessments
           SET total_questions = (SELECT COUNT(*) FROM ${config.questionTable} WHERE assessment_id = $1), updated_at = NOW()
           WHERE assessment_id = $1`,
          [aid],
        );
      }

      await queryRunner.commitTransaction();
      return { message: 'Questions cleared' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`clearQuestions (${module}) error:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
