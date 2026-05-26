import { Injectable, Logger, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type ModuleType = 'aptitude' | 'grammar' | 'communication' | 'coding' | 'mnc' | 'role';

interface ModuleConfig {
  readonly questionTable: string;
  readonly idColumn: string;
  readonly optionsTable?: string;
  readonly optionsFk?: string;
  readonly categoryColumn: string;
  readonly subcategoryColumn?: string;
}

function norm(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchCategory(qCat: string | undefined, targetCat: string): boolean {
  if (!qCat) return false;
  const nQ = norm(qCat);
  const nT = norm(targetCat);
  if (nQ === nT) return true;

  const shortToLong: Record<string, string[]> = {
    qa: ["quantitativeaptitude", "quantitative"],
    lr: ["logicalreasoning", "logical"],
    di: ["datainterpretation", "data"],
    ar: ["abstractreasoning", "abstract"],
    va: ["verbalability", "verbal"]
  };

  for (const [short, longs] of Object.entries(shortToLong)) {
    if (nT === short || longs.includes(nT)) {
      if (nQ === short || longs.includes(nQ)) {
        return true;
      }
    }
  }
  return false;
}

function matchSubcategory(qSub: string | undefined, targetSub: string): boolean {
  if (!qSub) return false;
  return norm(qSub) === norm(targetSub);
}

const MODULE_CONFIGS: Record<ModuleType, ModuleConfig> = {
  aptitude: {
    questionTable: 'tech_aptitude_questions',
    idColumn: 'aptitude_question_id',
    optionsTable: 'tech_aptitude_options',
    optionsFk: 'aptitude_question_id',
    categoryColumn: 'category',
    subcategoryColumn: 'subcategory',
  },
  grammar: {
    questionTable: 'tech_grammar_questions',
    idColumn: 'grammar_question_id',
    optionsTable: 'tech_grammar_options',
    optionsFk: 'grammar_question_id',
    categoryColumn: 'category',
    subcategoryColumn: 'subcategory',
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
    categoryColumn: 'category',
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
    categoryColumn: 'category',
    subcategoryColumn: 'subcategory',
  },
};

@Injectable()
export class AdminQuestionService {
  private readonly logger = new Logger(AdminQuestionService.name);
  private readonly tableColumnsCache = new Map<string, Set<string>>();

  constructor(private dataSource: DataSource) {}

  private async getTableColumns(tableName: string): Promise<Set<string>> {
    const cached = this.tableColumnsCache.get(tableName);
    if (cached) return cached;

    const rows = await this.dataSource.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1`,
      [tableName],
    );

    const columns = new Set<string>(rows.map((row: { column_name: string }) => row.column_name));
    this.tableColumnsCache.set(tableName, columns);
    return columns;
  }

  private async tableHasColumn(tableName: string, columnName: string): Promise<boolean> {
    const columns = await this.getTableColumns(tableName);
    return columns.has(columnName);
  }

  private async countAssessmentQuestions(
    tableName: string,
    assessmentId: number,
    mode?: 'trial' | 'main',
  ): Promise<number> {
    const columns = await this.getTableColumns(tableName);
    if (columns.size === 0) {
      return 0;
    }

    const clauses = [`assessment_id = $1`];
    const params: any[] = [assessmentId];

    if (columns.has('status')) {
      clauses.push(`status = 'active'`);
    }

    if (mode && columns.has('mode')) {
      params.push(mode);
      clauses.push(`mode = $${params.length}`);
    }

    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count
         FROM ${tableName}
        WHERE ${clauses.join(' AND ')}`,
      params,
    );

    return Number(rows[0]?.count ?? 0);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────────

  private async ensureDefaultAssessment(queryRunner: any, module: ModuleType, createdById: number): Promise<number> {
    const code = `${module.toUpperCase()}_DEFAULT`;
    const name = `Default ${module.charAt(0).toUpperCase() + module.slice(1)} Assessment`;
    
    const dbModule = module === 'communication' ? 'grammar' : module;
    
    let defaultCats = '[]';
    if (dbModule === 'aptitude') defaultCats = '["QA", "LR", "DI", "AR", "VA"]';
    else if (dbModule === 'mnc') defaultCats = '["Data Structures", "Algorithms", "Dynamic Programming", "Graph Theory", "System Design", "OOP", "Databases", "Networking", "OS Concepts", "General"]';
    else if (dbModule === 'grammar') defaultCats = '["audio", "reading", "speaking", "writing", "mcq"]';
    else if (dbModule === 'role') defaultCats = '["conceptual", "scenario"]';

    const rows = await queryRunner.query(
      `INSERT INTO tech_assessments
          (assessment_code, assessment_name, module_type, total_time_minutes,
           total_questions, shuffle_questions, shuffle_options,
           negative_mark_enabled, negative_mark_value, status, created_by,
           categories, difficulty_marks, difficulty_negative_marks, tab_switch_limit, anti_copy_enabled)
       VALUES ($1, $2, $3, 60, 0, TRUE, TRUE, FALSE, NULL, 'active', $4, $5::jsonb, $6::jsonb, $7::jsonb, 0, FALSE)
       ON CONFLICT (assessment_code) DO UPDATE SET updated_at = NOW()
       RETURNING assessment_id`,
      [
        code, 
        name, 
        dbModule, 
        createdById, 
        defaultCats, 
        '{"easy": 1, "medium": 2, "hard": 5}', 
        '{"easy": 0, "medium": 0.25, "hard": 0.25}'
      ]
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
    const response: any = {
      id: Number(row[config.idColumn]),
      assessmentId: Number(row.assessment_id),
      category: module === 'coding'
        ? 'Coding'
        : (module === 'aptitude' && typeof row[config.categoryColumn] === 'string')
          ? (row[config.categoryColumn] === 'QA' ? 'Quantitative Aptitude'
             : row[config.categoryColumn] === 'LR' ? 'Logical Reasoning'
             : row[config.categoryColumn] === 'DI' ? 'Data Interpretation'
             : row[config.categoryColumn] === 'AR' ? 'Abstract Reasoning'
             : row[config.categoryColumn] === 'VA' ? 'Verbal Ability'
             : row[config.categoryColumn])
          : row[config.categoryColumn],
      subcategory: config.subcategoryColumn ? row[config.subcategoryColumn] : undefined,
      difficulty: row.difficulty,
      questionText: module === 'coding' ? (row.problem_title || row.problem_statement || '') : row.question_text,
      explanation: row.explanation,
      options: options.map((o: any) => ({
        id: Number(o.option_id),
        text: o.option_text,
      })),
      correctOptionId: row.correct_option_id ? Number(row.correct_option_id) : null,
      marks: Number(row.marks),
      negativeMarks: Number(row.negative_marks),
      status: row.status,
      mode: row.mode || 'main',
      imageUrl: row.image_url,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    // Include task_type for grammar/communication so frontend can distinguish taskType from category
    if ((module === 'grammar' || module === 'communication') && row.task_type) {
      response.taskType = row.task_type;
    }

    return response;
  }

  // ─── Generic CRUD Methods ──────────────────────────────────────────────────────

  async listQuestions(module: ModuleType, query: any) {
    const config = MODULE_CONFIGS[module];
    const { assessmentId, category, subcategory, status, search, mode } = query;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;
    const hasModeColumn = module === 'coding'
      ? false
      : await this.tableHasColumn(config.questionTable, 'mode');

    if (assessmentId) {
      conditions.push(`q.assessment_id = $${paramIdx++}`);
      params.push(assessmentId);
    }
    if (category && module !== 'coding') {
      conditions.push(`q.${config.categoryColumn} = $${paramIdx++}`);
      params.push(category);
    }
    if (subcategory && config.subcategoryColumn) {
      conditions.push(`q.${config.subcategoryColumn} = $${paramIdx++}`);
      params.push(subcategory);
    }
    if (status) {
      conditions.push(`q.status = $${paramIdx++}`);
      params.push(status);
    }
    if (mode && module !== 'coding' && hasModeColumn) {
      conditions.push(`q.mode = $${paramIdx++}`);
      params.push(mode);
    }
    if (search) {
      if (module === 'coding') {
        conditions.push(`(LOWER(q.problem_title) LIKE $${paramIdx} OR LOWER(q.problem_statement) LIKE $${paramIdx})`);
        paramIdx++;
      } else {
        conditions.push(`LOWER(q.question_text) LIKE $${paramIdx++}`);
      }
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
      subcategory,
      difficulty = 'medium',
      questionText,
      explanation = null,
      options,
      correctOptionIndex = 0,
      marks = 1,
      negativeMarks = 0,
      status = 'active',
      mode = 'trial',
      imageUrl = null,
      userId,
    } = data;

    if ((!category && !subcategory) || !questionText) throw new BadRequestException('category/subcategory and questionText are required');

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

      const columns = ['assessment_id', config.categoryColumn, 'difficulty', 'question_text', 'explanation', 'image_url', 'correct_option_id', 'marks', 'negative_marks', 'status', 'mode', 'metadata'];
      const values = [assessmentId, category, difficulty, questionText, explanation, imageUrl, null, marks, negativeMarks, status, mode, data.metadata ? JSON.stringify(data.metadata) : null];
      let placeholders = ['$1', '$2', '$3', '$4', '$5', '$6', '$7', '$8', '$9', '$10', '$11', '$12'];

      if (module === 'communication' || module === 'grammar') {
        columns.push('task_type');
        values.push(data.taskType || 'mcq');
        placeholders.push(`$${values.length}`);

        const audioUrlVal = data.audioUrl || data.metadata?.audioUrl || null;
        columns.push('audio_url');
        values.push(audioUrlVal);
        placeholders.push(`$${values.length}`);

        const passageTextVal = data.passageText || data.passage || data.metadata?.passage || data.metadata?.passageText || null;
        columns.push('passage_text');
        values.push(passageTextVal);
        placeholders.push(`$${values.length}`);

        const refAnswerVal = data.referenceAnswer || data.metadata?.referenceAnswer || null;
        columns.push('reference_answer');
        values.push(refAnswerVal);
        placeholders.push(`$${values.length}`);
      }

      if (config.subcategoryColumn) {
        columns.push(config.subcategoryColumn);
        values.push(subcategory || 'General');
        placeholders.push(`$${values.length}`);
      }

      const qInsert = await queryRunner.query(
        `INSERT INTO ${config.questionTable} (${columns.join(', ')})
         VALUES (${placeholders.join(', ')})
         RETURNING *`,
        values,
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

        // Resolve temp correctOptionIds in metadata
        if (data.metadata?.kind === 'msq' && Array.isArray(data.metadata.correctOptionIds)) {
          const resolvedIds = data.metadata.correctOptionIds.map((id: any) => {
            if (String(id).startsWith('opt_')) {
              const idx = parseInt(String(id).split('_')[1]);
              return insertedOptions[idx]?.option_id;
            }
            return id;
          }).filter(Boolean);
          
          const updatedMetadata = { ...data.metadata, correctOptionIds: resolvedIds };
          await queryRunner.query(
            `UPDATE ${config.questionTable} SET metadata = $1 WHERE ${config.idColumn} = $2`,
            [JSON.stringify(updatedMetadata), questionId]
          );
          questionRow.metadata = updatedMetadata;
        }
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
    const { category, subcategory, difficulty, questionText, explanation, options, correctOptionIndex, marks, negativeMarks, status, mode, imageUrl } = data;

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
      if (subcategory !== undefined && config.subcategoryColumn) { updates.push(`${config.subcategoryColumn} = $${pIdx++}`); params.push(subcategory); }
      if (difficulty !== undefined) { updates.push(`difficulty = $${pIdx++}`); params.push(difficulty); }
      if (questionText !== undefined) { updates.push(`question_text = $${pIdx++}`); params.push(questionText); }
      if (explanation !== undefined) { updates.push(`explanation = $${pIdx++}`); params.push(explanation); }
      if (marks !== undefined) { updates.push(`marks = $${pIdx++}`); params.push(marks); }
      if (negativeMarks !== undefined) { updates.push(`negative_marks = $${pIdx++}`); params.push(negativeMarks); }
      if (status !== undefined) { updates.push(`status = $${pIdx++}`); params.push(status); }
      if (mode !== undefined) { updates.push(`mode = $${pIdx++}`); params.push(mode); }
      if (imageUrl !== undefined) { updates.push(`image_url = $${pIdx++}`); params.push(imageUrl); }
      if (data.metadata !== undefined) { updates.push(`metadata = $${pIdx++}`); params.push(data.metadata ? JSON.stringify(data.metadata) : null); }
      if (data.taskType !== undefined && (module === 'communication' || module === 'grammar')) {
        updates.push(`task_type = $${pIdx++}`);
        params.push(data.taskType);
      }
      if (module === 'communication' || module === 'grammar') {
        const audioUrlVal = data.audioUrl !== undefined ? data.audioUrl : (data.metadata?.audioUrl !== undefined ? data.metadata.audioUrl : undefined);
        if (audioUrlVal !== undefined) {
          updates.push(`audio_url = $${pIdx++}`);
          params.push(audioUrlVal);
        }
        const passageTextVal = data.passageText !== undefined ? data.passageText : (data.passage !== undefined ? data.passage : (data.metadata?.passage !== undefined ? data.metadata.passage : (data.metadata?.passageText !== undefined ? data.metadata.passageText : undefined)));
        if (passageTextVal !== undefined) {
          updates.push(`passage_text = $${pIdx++}`);
          params.push(passageTextVal);
        }
        const refAnswerVal = data.referenceAnswer !== undefined ? data.referenceAnswer : (data.metadata?.referenceAnswer !== undefined ? data.metadata.referenceAnswer : undefined);
        if (refAnswerVal !== undefined) {
          updates.push(`reference_answer = $${pIdx++}`);
          params.push(refAnswerVal);
        }
      }

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
        const correctOptionId = insertedOptions[safeIdx].option_id;
        await queryRunner.query(`UPDATE ${config.questionTable} SET correct_option_id = $1 WHERE ${config.idColumn} = $2`, [correctOptionId, id]);

        // Resolve temp correctOptionIds in metadata
        if (data.metadata?.kind === 'msq' && Array.isArray(data.metadata.correctOptionIds)) {
          const resolvedIds = data.metadata.correctOptionIds.map((oid: any) => {
            if (String(oid).startsWith('opt_')) {
              const idx = parseInt(String(oid).split('_')[1]);
              return insertedOptions[idx]?.option_id;
            }
            return oid;
          }).filter(Boolean);
          
          const updatedMetadata = { ...data.metadata, correctOptionIds: resolvedIds };
          await queryRunner.query(
            `UPDATE ${config.questionTable} SET metadata = $1 WHERE ${config.idColumn} = $2`,
            [JSON.stringify(updatedMetadata), id]
          );
        }
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
          const category = q.category || 'General';
          const subcategory = q.subcategory || null;
          const questionText = q.questionText || q.text || q.question_text;
          const explanation = q.explanation || null;
          if (!questionText) continue;

          const metadata = q.metadata || {};
          if (q.kind) metadata.kind = q.kind;
          if (q.correctAnswer || q.metadata?.correctAnswer) {
            metadata.correctAnswer = q.correctAnswer || q.metadata?.correctAnswer;
          }
          if (q.correctOptionIds || q.metadata?.correctOptionIds) {
            metadata.correctOptionIds = q.correctOptionIds || q.metadata?.correctOptionIds;
          }

          const columns = ['assessment_id', config.categoryColumn, 'difficulty', 'question_text', 'explanation', 'correct_option_id', 'marks', 'negative_marks', 'status', 'mode', 'metadata'];
          const values = [assessmentId, category, q.difficulty || 'medium', questionText, explanation, q.marks ?? 1, q.negativeMarks ?? 0, q.status || 'active', q.mode || 'trial', JSON.stringify(metadata)];
          let placeholders = ['$1', '$2', '$3', '$4', '$5', 'NULL', '$6', '$7', '$8', '$9', '$10'];

          if (module === 'communication' || module === 'grammar') {
            columns.push('task_type');
            values.push(q.taskType || metadata.taskType || 'mcq');
            placeholders.push(`$${values.length}`);

            const audioUrlVal = q.audioUrl || metadata.audioUrl || null;
            columns.push('audio_url');
            values.push(audioUrlVal);
            placeholders.push(`$${values.length}`);

            const passageTextVal = q.passageText || q.passage || metadata.passage || metadata.passageText || null;
            columns.push('passage_text');
            values.push(passageTextVal);
            placeholders.push(`$${values.length}`);

            const refAnswerVal = q.referenceAnswer || metadata.referenceAnswer || null;
            columns.push('reference_answer');
            values.push(refAnswerVal);
            placeholders.push(`$${values.length}`);
          }

          if (config.subcategoryColumn) {
            columns.push(config.subcategoryColumn);
            const subVal = subcategory || (module === 'communication' || module === 'grammar' ? 'General' : category) || 'General';
            values.push(subVal);
            placeholders.push(`$${values.length}`);
          }

          const qInsert = await queryRunner.query(
            `INSERT INTO ${config.questionTable} (${columns.join(', ')})
             VALUES (${placeholders.join(', ')})
             RETURNING ${config.idColumn}`,
            values,
          );
          const newQId = qInsert[0][config.idColumn];

          if (config.optionsTable && Array.isArray(q.options) && q.options.length > 0) {
            const insertedOpts: any[] = [];
            const optValues: any[] = [];
            const optPlaceholders: string[] = [];

            q.options.forEach((opt: any, idx: number) => {
              const optText = typeof opt === 'string' ? opt : opt.text || opt.option_text;
              optValues.push(newQId, optText);
              optPlaceholders.push(`($${idx * 2 + 1}, $${idx * 2 + 2})`);
            });

            const inserted = await queryRunner.query(
              `INSERT INTO ${config.optionsTable} (${config.optionsFk}, option_text)
               VALUES ${optPlaceholders.join(', ')}
               RETURNING option_id`,
              optValues
            );
            insertedOpts.push(...inserted);

            const correctIdx = q.correctOptionIndex ?? q.correctOptionId ?? 0;
            let correctOptionId: number | null = null;
            if (insertedOpts.length > 0) {
              let idx = Number(correctIdx);
              if (isNaN(idx) && typeof correctIdx === 'string' && correctIdx.startsWith('opt_')) {
                if (correctIdx === 'opt_true') idx = 0;
                else if (correctIdx === 'opt_false') idx = 1;
                else idx = parseInt(correctIdx.split('_')[1], 10);
              }
              const safeIdx = Math.min(Math.max(0, isNaN(idx) ? 0 : idx), insertedOpts.length - 1);
              correctOptionId = insertedOpts[safeIdx]?.option_id ?? null;
            }

            // Resolve temp correctOptionIds in metadata
            if (Array.isArray(metadata.correctOptionIds)) {
              const resolvedIds = metadata.correctOptionIds.map((id: any) => {
                if (String(id).startsWith('opt_')) {
                  if (String(id) === 'opt_true') return insertedOpts[0]?.option_id;
                  if (String(id) === 'opt_false') return insertedOpts[1]?.option_id;
                  const idx = parseInt(String(id).split('_')[1]);
                  return insertedOpts[idx]?.option_id;
                }
                return id;
              }).filter(Boolean);

              metadata.correctOptionIds = resolvedIds;
            }

            await queryRunner.query(
              `UPDATE ${config.questionTable}
               SET correct_option_id = $1, metadata = $2
               WHERE ${config.idColumn} = $3`,
              [correctOptionId, JSON.stringify(metadata), newQId]
            );
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
      const assessmentColumns = await this.getTableColumns('tech_assessments');
      const params: any[] = [];
      let where = '';
      if (moduleType) {
        where = 'WHERE a.module_type = $1';
        params.push(moduleType);
      }
      const selectColumns = [
        'assessment_id',
        'assessment_code',
        'assessment_name',
        'module_type',
        'total_time_minutes',
        'total_questions',
        'question_limit',
        'status',
        'created_at',
        'categories',
        'difficulty_marks',
        'difficulty_negative_marks',
        'tab_switch_limit',
        'anti_copy_enabled',
        'shuffle_questions',
        'shuffle_options',
        'amount',
        'trial_attempts_limit',
        'main_attempts_limit',
        'enabled_question_types',
        'proctoring_require_fullscreen',
        'fullscreen_exit_limit',
        'proctoring_block_devtools',
        'devtools_open_limit',
        'mouse_focus_loss_limit',
        'keypress_log_enabled',
        'require_camera_mic',
        'live_proctoring_enabled',
        'adaptive_enabled',
        'adaptive_total_questions',
        'adaptive_total_marks',
        'adaptive_total_blocks',
        'adaptive_seconds_per_mark',
      ].filter((column) => assessmentColumns.has(column));

      const rows = await this.dataSource.query(
        `SELECT ${selectColumns.map((column) => `a.${column}`).join(', ')}
           FROM tech_assessments a ${where}
          ORDER BY a.assessment_id DESC`,
        params,
      );

      return await Promise.all(
        rows.map(async (row: any) => {
          const moduleConfig = MODULE_CONFIGS[row.module_type as ModuleType];
          const assessmentId = Number(row.assessment_id);
          const totalCount = moduleConfig
            ? await this.countAssessmentQuestions(moduleConfig.questionTable, assessmentId)
            : 0;
          const trialCount = row.module_type === 'coding' || !moduleConfig
            ? totalCount
            : await this.countAssessmentQuestions(moduleConfig.questionTable, assessmentId, 'trial');
          const mainCount = row.module_type === 'coding' || !moduleConfig
            ? totalCount
            : await this.countAssessmentQuestions(moduleConfig.questionTable, assessmentId, 'main');

          return {
            ...row,
            trial_questions_count: trialCount,
            main_questions_count: mainCount,
          };
        }),
      );
    } catch (error) {
      this.logger.error('listAssessments error:', error);
      throw new InternalServerErrorException('Failed to list assessments');
    }
  }

  async updateAssessment(id: number, data: any) {
    const assessmentName = data.assessmentName !== undefined ? data.assessmentName : data.assessment_name;
    const totalTimeMinutes = data.totalTimeMinutes !== undefined ? data.totalTimeMinutes : data.total_time_minutes;
    const questionLimit = data.questionLimit !== undefined ? data.questionLimit : data.question_limit;
    const categories = data.categories;
    const difficultyMarks = data.difficultyMarks !== undefined ? data.difficultyMarks : data.difficulty_marks;
    const difficultyNegativeMarks = data.difficultyNegativeMarks !== undefined ? data.difficultyNegativeMarks : data.difficulty_negative_marks;
    const tabSwitchLimit = data.tabSwitchLimit !== undefined ? data.tabSwitchLimit : data.tab_switch_limit;
    const antiCopyEnabled = data.antiCopyEnabled !== undefined ? data.antiCopyEnabled : data.anti_copy_enabled;
    const shuffleQuestions = data.shuffleQuestions !== undefined ? data.shuffleQuestions : data.shuffle_questions;
    const shuffleOptions = data.shuffleOptions !== undefined ? data.shuffleOptions : data.shuffle_options;
    const amount = data.amount;
    const trialAttemptsLimit = data.trialAttemptsLimit !== undefined ? data.trialAttemptsLimit : data.trial_attempts_limit;
    const mainAttemptsLimit = data.mainAttemptsLimit !== undefined ? data.mainAttemptsLimit : data.main_attempts_limit;
    const enabledQuestionTypes = data.enabledQuestionTypes !== undefined ? data.enabledQuestionTypes : data.enabled_question_types;

    const proctoringRequireFullscreen = data.proctoring_require_fullscreen;
    const fullscreenExitLimit = data.fullscreen_exit_limit;
    const proctoringBlockDevtools = data.proctoring_block_devtools;
    const devtoolsOpenLimit = data.devtools_open_limit;
    const mouseFocusLossLimit = data.mouse_focus_loss_limit;
    const keypressLogEnabled = data.keypress_log_enabled;
    const requireCameraMic = data.require_camera_mic;
    const liveProctoringEnabled = data.live_proctoring_enabled;
    const adaptiveEnabled = data.adaptive_enabled;
    const adaptiveTotalQuestions = data.adaptive_total_questions ?? data.adaptiveTotalQuestions;
    const adaptiveTotalMarks     = data.adaptive_total_marks     ?? data.adaptiveTotalMarks;
    const adaptiveTotalBlocks    = data.adaptive_total_blocks    ?? data.adaptiveTotalBlocks;
    const adaptiveSecondsPerMark = data.adaptive_seconds_per_mark ?? data.adaptiveSecondsPerMark;
    const assessmentColumns = await this.getTableColumns('tech_assessments');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Fetch old assessment categories
      const oldRows = await queryRunner.query(
        `SELECT categories, module_type FROM tech_assessments WHERE assessment_id = $1`,
        [id]
      );
      const oldAssessment = oldRows[0];
      const moduleType = oldAssessment?.module_type as ModuleType;

      if (categories !== undefined && oldAssessment && assessmentColumns.has('categories')) {
        let oldCats: any[] = [];
        try {
          oldCats = typeof oldAssessment.categories === 'string' 
            ? JSON.parse(oldAssessment.categories) 
            : (oldAssessment.categories || []);
        } catch (e) {
          oldCats = [];
        }
        if (!Array.isArray(oldCats)) oldCats = [];

        let newCats: any[] = [];
        try {
          newCats = typeof categories === 'string' 
            ? JSON.parse(categories) 
            : (categories || []);
        } catch (e) {
          newCats = [];
        }
        if (!Array.isArray(newCats)) newCats = [];

        const newCatIds = new Set(newCats.map(c => c.id?.toLowerCase().trim()));
        const deletedCats = oldCats.filter(c => c.id && !newCatIds.has(c.id.toLowerCase().trim()));

        const deletedSubs: { catId: string; subId: string }[] = [];
        for (const oldCat of oldCats) {
          if (!oldCat.id) continue;
          const newCat = newCats.find(c => c.id?.toLowerCase().trim() === oldCat.id.toLowerCase().trim());
          if (newCat) {
            const oldSubs = oldCat.subcategories || [];
            const newSubIds = new Set((newCat.subcategories || []).map((s: any) => s.id?.toLowerCase().trim()));
            for (const oldSub of oldSubs) {
              if (oldSub.id && !newSubIds.has(oldSub.id.toLowerCase().trim())) {
                deletedSubs.push({ catId: oldCat.id, subId: oldSub.id });
              }
            }
          }
        }

        const config = MODULE_CONFIGS[moduleType];
        if (config && (deletedCats.length > 0 || deletedSubs.length > 0)) {
          const questions = await queryRunner.query(
            `SELECT * FROM ${config.questionTable} WHERE assessment_id = $1`,
            [id]
          );

          const questionIdsToDelete: number[] = [];
          for (const q of questions) {
            const qId = q[config.idColumn];
            const qCat = q[config.categoryColumn];
            const qSub = config.subcategoryColumn ? q[config.subcategoryColumn] : undefined;

            const isCatDeleted = deletedCats.some(dc => matchCategory(qCat, dc.id));
            if (isCatDeleted) {
              questionIdsToDelete.push(qId);
              continue;
            }

            const isSubDeleted = deletedSubs.some(ds => matchCategory(qCat, ds.catId) && matchSubcategory(qSub, ds.subId));
            if (isSubDeleted) {
              questionIdsToDelete.push(qId);
            }
          }

          if (questionIdsToDelete.length > 0) {
            throw new BadRequestException(
              `Cannot delete category/subcategory because it has ${questionIdsToDelete.length} allocated question(s). Please delete or reassign them first.`
            );
          }
        }
      }

      const updates: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      const pushUpdate = (column: string, value: any, options?: { json?: boolean }) => {
        if (value === undefined || !assessmentColumns.has(column)) {
          return;
        }

        const cast = options?.json ? '::jsonb' : '';
        updates.push(`${column} = $${paramIdx}${cast}`);
        params.push(value);
        paramIdx += 1;
      };

      pushUpdate('assessment_name', assessmentName);
      pushUpdate('total_time_minutes', totalTimeMinutes !== undefined ? Number(totalTimeMinutes) : undefined);
      pushUpdate('question_limit', questionLimit !== undefined ? Number(questionLimit) : undefined);
      pushUpdate('categories', categories !== undefined ? (typeof categories === 'string' ? categories : JSON.stringify(categories)) : undefined, { json: true });
      pushUpdate('difficulty_marks', difficultyMarks !== undefined ? (typeof difficultyMarks === 'string' ? difficultyMarks : JSON.stringify(difficultyMarks)) : undefined, { json: true });
      pushUpdate('difficulty_negative_marks', difficultyNegativeMarks !== undefined ? (typeof difficultyNegativeMarks === 'string' ? difficultyNegativeMarks : JSON.stringify(difficultyNegativeMarks)) : undefined, { json: true });
      pushUpdate('tab_switch_limit', tabSwitchLimit !== undefined ? Number(tabSwitchLimit) : undefined);
      pushUpdate('anti_copy_enabled', antiCopyEnabled !== undefined ? Boolean(antiCopyEnabled) : undefined);
      pushUpdate('shuffle_questions', shuffleQuestions !== undefined ? Boolean(shuffleQuestions) : undefined);
      pushUpdate('shuffle_options', shuffleOptions !== undefined ? Boolean(shuffleOptions) : undefined);
      pushUpdate('amount', amount !== undefined ? Number(amount) : undefined);
      pushUpdate('trial_attempts_limit', trialAttemptsLimit !== undefined ? Number(trialAttemptsLimit) : undefined);
      pushUpdate('main_attempts_limit', mainAttemptsLimit !== undefined ? Number(mainAttemptsLimit) : undefined);
      pushUpdate('enabled_question_types', enabledQuestionTypes !== undefined ? (typeof enabledQuestionTypes === 'string' ? enabledQuestionTypes : JSON.stringify(enabledQuestionTypes)) : undefined, { json: true });
      pushUpdate('proctoring_require_fullscreen', proctoringRequireFullscreen !== undefined ? Boolean(proctoringRequireFullscreen) : undefined);
      pushUpdate('fullscreen_exit_limit', fullscreenExitLimit !== undefined ? Number(fullscreenExitLimit) : undefined);
      pushUpdate('proctoring_block_devtools', proctoringBlockDevtools !== undefined ? Boolean(proctoringBlockDevtools) : undefined);
      pushUpdate('devtools_open_limit', devtoolsOpenLimit !== undefined ? Number(devtoolsOpenLimit) : undefined);
      pushUpdate('mouse_focus_loss_limit', mouseFocusLossLimit !== undefined ? Number(mouseFocusLossLimit) : undefined);
      pushUpdate('keypress_log_enabled', keypressLogEnabled !== undefined ? Boolean(keypressLogEnabled) : undefined);
      pushUpdate('require_camera_mic', requireCameraMic !== undefined ? Boolean(requireCameraMic) : undefined);
      pushUpdate('live_proctoring_enabled', liveProctoringEnabled !== undefined ? Boolean(liveProctoringEnabled) : undefined);
      pushUpdate('adaptive_enabled', adaptiveEnabled !== undefined ? Boolean(adaptiveEnabled) : undefined);
      pushUpdate('adaptive_total_marks', adaptiveTotalMarks !== undefined ? Number(adaptiveTotalMarks) : undefined);
      pushUpdate('adaptive_total_blocks', adaptiveTotalBlocks !== undefined ? Number(adaptiveTotalBlocks) : undefined);
      pushUpdate('adaptive_seconds_per_mark', adaptiveSecondsPerMark !== undefined ? Number(adaptiveSecondsPerMark) : undefined);
      pushUpdate('adaptive_total_questions', adaptiveTotalQuestions !== undefined ? Number(adaptiveTotalQuestions) : undefined);

      if (updates.length > 0) {
        if (assessmentColumns.has('updated_at')) {
          updates.push(`updated_at = NOW()`);
        }

        params.push(id);
        await queryRunner.query(
          `UPDATE tech_assessments
              SET ${updates.join(', ')}
            WHERE assessment_id = $${paramIdx}`,
          params,
        );
      }

      const rows = await queryRunner.query(
        `SELECT * FROM tech_assessments WHERE assessment_id = $1`,
        [id]
      );

      const updatedAssessment = rows[0];
      if (updatedAssessment?.module_type === 'coding' && amount !== undefined) {
        const pricingTable = await queryRunner.query(
          `SELECT to_regclass('public.pricing_items') AS table_name`,
        );
        if (pricingTable?.[0]?.table_name) {
          await queryRunner.query(
            `UPDATE pricing_items
             SET price_cents = $1,
                 currency = COALESCE(currency, 'INR')
             WHERE item_kind = 'coding_language'
               AND item_ref LIKE 'coding:%'`,
            [Math.round(Number(amount) * 100)],
          );
        }
      }

      await queryRunner.commitTransaction();
      return rows[0];
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`updateAssessment (${id}) error:`, error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update assessment configurations');
    } finally {
      await queryRunner.release();
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
