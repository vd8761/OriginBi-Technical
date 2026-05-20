import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdaptiveEngineService } from './adaptive-engine.service';
import { AdaptiveBlueprintService } from './adaptive-blueprint.service';
import {
  Difficulty,
  AdaptiveQuestion,
  BlockResponse,
  BlueprintConfig,
  QuestionSlot,
} from '../interfaces/adaptive.interfaces';

/**
 * AdaptiveBlockGeneratorService
 *
 * Responsible for:
 *  - Reading the blueprint from DB
 *  - Building question slots (category × subcategory × difficulty × marks)
 *  - Fetching questions with 8-phase fallback
 *  - Inserting questions into the junction table
 *  - Updating adaptive_blocks, block_attempts, adaptive_paths
 *  - Updating subcategory coverage
 */
@Injectable()
export class AdaptiveBlockGeneratorService {
  private readonly logger = new Logger(AdaptiveBlockGeneratorService.name);
  private readonly _colCache = new Map<string, boolean>();

  constructor(
    private readonly dataSource: DataSource,
    private readonly engine: AdaptiveEngineService,
    private readonly blueprintService: AdaptiveBlueprintService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Column existence check (cached)
  // ─────────────────────────────────────────────────────────────────────────

  private async columnExists(table: string, col: string): Promise<boolean> {
    const key = `${table}.${col}`;
    if (this._colCache.has(key)) return this._colCache.get(key)!;
    try {
      const rows = await this.dataSource.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
        [table, col],
      );
      const exists = rows.length > 0;
      this._colCache.set(key, exists);
      return exists;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Module table config
  // ─────────────────────────────────────────────────────────────────────────

  private getModuleConfig(moduleType: string) {
    const map: Record<string, {
      attempts: string; questions: string; junction: string;
      idCol: string; options: string; attemptIdCol: string;
      categoryCol: string; subcategoryCol: string; hasMode: boolean;
    }> = {
      aptitude: {
        attempts: 'tech_aptitude_attempts',
        questions: 'tech_aptitude_questions',
        junction: 'tech_aptitude_attempt_questions',
        idCol: 'aptitude_question_id',
        options: 'tech_aptitude_options',
        attemptIdCol: 'aptitude_attempt_id',
        categoryCol: 'category',
        subcategoryCol: 'subcategory',
        hasMode: true,
      },
      grammar: {
        attempts: 'tech_grammar_attempts',
        questions: 'tech_grammar_questions',
        junction: 'tech_grammar_attempt_questions',
        idCol: 'grammar_question_id',
        options: 'tech_grammar_options',
        attemptIdCol: 'grammar_attempt_id',
        categoryCol: 'task_type',
        subcategoryCol: 'task_type',
        hasMode: true,
      },
      mnc: {
        attempts: 'tech_mnc_attempts',
        questions: 'tech_mnc_questions',
        junction: 'tech_mnc_attempt_questions',
        idCol: 'mnc_question_id',
        options: 'tech_mnc_options',
        attemptIdCol: 'mnc_attempt_id',
        categoryCol: 'category',
        subcategoryCol: 'subcategory',
        hasMode: true,
      },
      role: {
        attempts: 'tech_role_attempts',
        questions: 'tech_role_questions',
        junction: 'tech_role_attempt_questions',
        idCol: 'role_question_id',
        options: 'tech_role_options',
        attemptIdCol: 'role_attempt_id',
        // category/subcategory columns were added via migration; domain is the fallback
        categoryCol: 'domain',
        subcategoryCol: 'domain',
        hasMode: false,
      },
      // 'communication' assessments are stored with module_type='grammar' in the DB
      // (tech_module_type enum only has 'grammar'), so this entry handles any edge-case
      // where the string 'communication' reaches this service directly.
      communication: {
        attempts: 'tech_grammar_attempts',
        questions: 'tech_grammar_questions',
        junction: 'tech_grammar_attempt_questions',
        idCol: 'grammar_question_id',
        options: 'tech_grammar_options',
        attemptIdCol: 'grammar_attempt_id',
        categoryCol: 'task_type',
        subcategoryCol: 'task_type',
        hasMode: true,
      },
    };
    return map[moduleType] ?? null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Load blueprint from DB — delegates to AdaptiveBlueprintService
  // which auto-builds it from the question bank if missing/stale
  // ─────────────────────────────────────────────────────────────────────────

  async loadBlueprint(assessmentId: number): Promise<BlueprintConfig | null> {
    const rows = await this.dataSource.query(
      `SELECT total_marks, total_blocks, marks_per_block, seconds_per_mark,
              category_blueprint, subcategory_blueprint, difficulty_profiles
       FROM adaptive_blueprint WHERE assessment_id=$1`,
      [assessmentId],
    );
    if (!rows.length) return null;
    const r = rows[0];
    return {
      totalMarks:           Number(r.total_marks),
      totalBlocks:          Number(r.total_blocks),
      marksPerBlock:        Number(r.marks_per_block),
      secondsPerMark:       Number(r.seconds_per_mark),
      categoryBlueprint:    r.category_blueprint ?? {},
      subcategoryBlueprint: r.subcategory_blueprint ?? {},
      difficultyProfiles:   r.difficulty_profiles ?? this.engine.DEFAULT_DIFFICULTY_PROFILES,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Load subcategory coverage for this attempt
  // ─────────────────────────────────────────────────────────────────────────

  private async loadCoverage(
    attemptToken: string,
  ): Promise<Record<string, Record<string, { marksUsed: number; questionsUsed: number }>>> {
    const rows = await this.dataSource.query(
      `SELECT coverage FROM adaptive_subcategory_coverage WHERE attempt_token=$1`,
      [attemptToken],
    );
    return rows[0]?.coverage ?? {};
  }

  private async saveCoverage(
    attemptToken: string,
    assessmentId: number,
    coverage: Record<string, Record<string, { marksUsed: number; questionsUsed: number }>>,
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO adaptive_subcategory_coverage (attempt_token, assessment_id, coverage)
       VALUES ($1, $2, $3)
       ON CONFLICT (attempt_token) DO UPDATE SET coverage=$3, updated_at=NOW()`,
      [attemptToken, assessmentId, JSON.stringify(coverage)],
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Build question slots for a block
  // ─────────────────────────────────────────────────────────────────────────

  private buildQuestionSlots(
    blueprint: BlueprintConfig,
    blockTargetMarks: number,
    targetDifficulty: Difficulty,
    coverage: Record<string, Record<string, { marksUsed: number; questionsUsed: number }>>,
  ): QuestionSlot[] {
    const profile = blueprint.difficultyProfiles[targetDifficulty];
    const slots: QuestionSlot[] = [];

    const categories = Object.keys(blueprint.categoryBlueprint);
    const totalCatWeight = categories.reduce(
      (s, c) => s + blueprint.categoryBlueprint[c].weightPct,
      0,
    );

    for (const category of categories) {
      const catPct = blueprint.categoryBlueprint[category].weightPct;
      const catBlockMarks = parseFloat(((catPct / totalCatWeight) * blockTargetMarks).toFixed(2));
      if (catBlockMarks <= 0) continue;

      const subcatBp = blueprint.subcategoryBlueprint[category] ?? {};
      const subcatCoverage = coverage[category] ?? {};

      const subcatSlots = this.engine.pickSubcategoriesForBlock(
        category,
        subcatBp,
        subcatCoverage,
        catBlockMarks,
      );

      for (const { subcategory, targetMarks } of subcatSlots) {
        if (targetMarks <= 0) continue;

        // Split targetMarks across difficulties using the profile
        const easyMarks   = parseFloat(((profile.easy   / 100) * targetMarks).toFixed(2));
        const mediumMarks = parseFloat(((profile.medium / 100) * targetMarks).toFixed(2));
        const hardMarks   = parseFloat(((profile.hard   / 100) * targetMarks).toFixed(2));

        if (easyMarks > 0)   slots.push({ category, subcategory, difficulty: 'easy',   targetMarks: easyMarks });
        if (mediumMarks > 0) slots.push({ category, subcategory, difficulty: 'medium', targetMarks: mediumMarks });
        if (hardMarks > 0)   slots.push({ category, subcategory, difficulty: 'hard',   targetMarks: hardMarks });
      }
    }

    return slots;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8-phase fallback question fetch
  // ─────────────────────────────────────────────────────────────────────────

  private async fetchQuestionForSlot(
    cfg: ReturnType<typeof this.getModuleConfig>,
    assessmentId: number,
    slot: QuestionSlot,
    usedIds: number[],
    mode: 'trial' | 'main',
    modeExists: boolean,
    difficultyExists: boolean,
  ): Promise<any | null> {
    if (!cfg) return null;

    const nearbyMarks = (m: number) => {
      if (m === 1) return [2];
      if (m === 2) return [1, 3];
      if (m === 3) return [2, 4];
      return [3];
    };

    const nearbyDiff = (d: Difficulty): Difficulty[] => {
      if (d === 'easy')   return ['medium'];
      if (d === 'medium') return ['easy', 'hard'];
      return ['medium'];
    };

    const targetMarksInt = Math.round(slot.targetMarks);
    const excludeClause = usedIds.length
      ? `AND ${cfg.idCol} NOT IN (${usedIds.join(',')})`
      : '';

    const modeClause = cfg.hasMode && modeExists
      ? `AND (mode='${mode === 'trial' ? 'trial' : 'main'}' OR mode IS NULL)`
      : '';

    const baseWhere = `assessment_id=${assessmentId} AND status='active' ${modeClause} ${excludeClause}`;

    // Select difficulty column — fall back to literal 'medium' when column doesn't exist
    const diffSelect = difficultyExists ? 'difficulty' : `'medium' AS difficulty`;

    const tryFetch = async (
      diffList: Difficulty[],
      marksList: number[],
      catFilter: string,
      subFilter: string,
    ): Promise<any | null> => {
      const diffFilter = difficultyExists
        ? `AND difficulty IN (${diffList.map(d => `'${d}'`).join(',')})`
        : ''; // no difficulty column — skip filter, treat all as 'medium'
      const marksIn = marksList.join(',');
      const rows = await this.dataSource.query(
        `SELECT ${cfg.idCol} AS id, question_text, ${diffSelect},
                ${cfg.categoryCol} AS category,
                ${cfg.subcategoryCol} AS subcategory,
                marks, negative_marks, metadata, image_url
         FROM ${cfg.questions}
         WHERE ${baseWhere}
           ${catFilter}
           ${subFilter}
           ${diffFilter}
           AND marks IN (${marksIn})
         ORDER BY RANDOM() LIMIT 1`,
      );
      return rows[0] ?? null;
    };

    const phases: Array<() => Promise<any | null>> = [
      // Phase 1: exact match
      () => tryFetch(
        [slot.difficulty],
        [targetMarksInt],
        `AND ${cfg.categoryCol}='${slot.category}'`,
        `AND ${cfg.subcategoryCol}='${slot.subcategory}'`,
      ),
      // Phase 2: same cat+sub+diff, nearby marks
      () => tryFetch(
        [slot.difficulty],
        nearbyMarks(targetMarksInt),
        `AND ${cfg.categoryCol}='${slot.category}'`,
        `AND ${cfg.subcategoryCol}='${slot.subcategory}'`,
      ),
      // Phase 3: same cat+sub, nearby diff, exact marks
      () => tryFetch(
        nearbyDiff(slot.difficulty),
        [targetMarksInt],
        `AND ${cfg.categoryCol}='${slot.category}'`,
        `AND ${cfg.subcategoryCol}='${slot.subcategory}'`,
      ),
      // Phase 4: same cat+sub, nearby diff+marks
      () => tryFetch(
        nearbyDiff(slot.difficulty),
        nearbyMarks(targetMarksInt),
        `AND ${cfg.categoryCol}='${slot.category}'`,
        `AND ${cfg.subcategoryCol}='${slot.subcategory}'`,
      ),
      // Phase 5: same cat, any sub, exact diff+marks
      () => tryFetch(
        [slot.difficulty],
        [targetMarksInt],
        `AND ${cfg.categoryCol}='${slot.category}'`,
        '',
      ),
      // Phase 6: same cat, any sub, nearby diff
      () => tryFetch(
        nearbyDiff(slot.difficulty),
        [targetMarksInt, ...nearbyMarks(targetMarksInt)],
        `AND ${cfg.categoryCol}='${slot.category}'`,
        '',
      ),
      // Phase 7: any cat, target diff
      () => tryFetch(
        [slot.difficulty],
        [targetMarksInt, ...nearbyMarks(targetMarksInt)],
        '',
        '',
      ),
      // Phase 8: any cat, any diff, any marks
      () => tryFetch(
        ['easy', 'medium', 'hard'],
        [1, 2, 3, 4],
        '',
        '',
      ),
    ];

    for (const phase of phases) {
      const result = await phase();
      if (result) return result;
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main: generate a block
  // ─────────────────────────────────────────────────────────────────────────

  async generateBlock(params: {
    assessmentId: number;
    blockNumber: number;
    userId: number;
    mode: 'trial' | 'main';
    attemptToken: string;
    targetDifficulty: Difficulty;
  }): Promise<BlockResponse> {
    const { assessmentId, blockNumber, userId, mode, attemptToken, targetDifficulty } = params;

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // 1. Load assessment + adaptive_blocks row
      const asmRows = await qr.query(
        `SELECT a.assessment_id, a.module_type, a.block_config, a.question_limit,
                ab.block_id, ab.difficulty_distribution
         FROM tech_assessments a
         JOIN adaptive_blocks ab ON ab.assessment_id=a.assessment_id AND ab.block_number=$2
         WHERE a.assessment_id=$1`,
        [assessmentId, blockNumber],
      );
      if (!asmRows.length) {
        throw new NotFoundException(`Block ${blockNumber} not found for assessment ${assessmentId}`);
      }

      const row = asmRows[0];
      const blockId = Number(row.block_id);
      const cfg = this.getModuleConfig(row.module_type);
      if (!cfg) {
        throw new BadRequestException(`Module ${row.module_type} not supported for adaptive blocks`);
      }

      const rawBC = row.block_config ?? {};
      const totalBlocks = Number(rawBC.blocksPerAssessment ?? rawBC.blocks_per_assessment ?? 4);
      const isLastBlock = blockNumber === totalBlocks;

      // 2. Load blueprint — auto-builds from question bank if missing or stale
      const blueprint = await this.blueprintService.ensureBlueprint(assessmentId);
      if (!blueprint) {
        throw new BadRequestException(
          `Could not build blueprint for assessment ${assessmentId}. Ensure questions are added first.`,
        );
      }

      // 3. Resolve attempt + used question IDs
      const ar = await qr.query(
        `SELECT ${cfg.attemptIdCol} AS aid FROM ${cfg.attempts} WHERE attempt_token=$1`,
        [attemptToken],
      );
      if (!ar.length) throw new NotFoundException('Attempt not found');
      const attemptId = Number(ar[0].aid);

      const ur = await qr.query(
        `SELECT ${cfg.idCol} AS qid FROM ${cfg.junction} WHERE ${cfg.attemptIdCol}=$1`,
        [attemptId],
      );
      const usedIds: number[] = ur.map((r: any) => Number(r.qid));

      // 4. Load subcategory coverage
      const coverage = await this.loadCoverage(attemptToken);

      // 5. Build question slots
      const blockTargetMarks = isLastBlock
        ? blueprint.totalMarks - (blockNumber - 1) * blueprint.marksPerBlock
        : blueprint.marksPerBlock;

      const slots = this.buildQuestionSlots(blueprint, blockTargetMarks, targetDifficulty, coverage);

      // 6. Fetch questions for each slot
      const modeExists = await this.columnExists(cfg.questions, 'mode');
      const difficultyExists = await this.columnExists(cfg.questions, 'difficulty');
      const fetchedQuestions: any[] = [];
      const localUsedIds = new Set(usedIds);

      for (const slot of slots) {
        const q = await this.fetchQuestionForSlot(
          cfg, assessmentId, slot,
          Array.from(localUsedIds), mode, modeExists, difficultyExists,
        );
        if (q) {
          localUsedIds.add(Number(q.id));
          fetchedQuestions.push({ ...q, _slot: slot });
        }
      }

      if (!fetchedQuestions.length) {
        throw new BadRequestException(`No questions available for block ${blockNumber}`);
      }

      // Shuffle
      for (let i = fetchedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fetchedQuestions[i], fetchedQuestions[j]] = [fetchedQuestions[j], fetchedQuestions[i]];
      }

      // 7. Build coverage map for this block
      const blockCoverageMap: Record<string, Record<string, number>> = {};
      for (const q of fetchedQuestions) {
        const cat = q.category ?? q._slot.category;
        const sub = q.subcategory ?? q._slot.subcategory;
        if (!blockCoverageMap[cat]) blockCoverageMap[cat] = {};
        blockCoverageMap[cat][sub] = (blockCoverageMap[cat][sub] ?? 0) + Number(q.marks);
      }

      // 8. Update subcategory coverage
      const updatedCoverage = { ...coverage };
      for (const [cat, subs] of Object.entries(blockCoverageMap)) {
        if (!updatedCoverage[cat]) updatedCoverage[cat] = {};
        for (const [sub, marks] of Object.entries(subs)) {
          if (!updatedCoverage[cat][sub]) updatedCoverage[cat][sub] = { marksUsed: 0, questionsUsed: 0 };
          updatedCoverage[cat][sub].marksUsed += marks;
          updatedCoverage[cat][sub].questionsUsed += 1;
        }
      }
      await this.saveCoverage(attemptToken, assessmentId, updatedCoverage);

      // 9. Insert into junction table
      for (let i = 0; i < fetchedQuestions.length; i++) {
        const q = fetchedQuestions[i];
        const displayOrder = usedIds.length + i + 1;
        const expectedSecs = this.engine.computeExpectedTime(
          Number(q.marks),
          (q.difficulty as Difficulty) ?? 'easy',
          blueprint.secondsPerMark,
        );
        await qr.query(
          `INSERT INTO ${cfg.junction}
             (${cfg.attemptIdCol}, ${cfg.idCol}, display_order, block_number,
              block_sequence_order, is_locked, expected_time_seconds)
           VALUES ($1,$2,$3,$4,$5,false,$6)
           ON CONFLICT (${cfg.attemptIdCol}, ${cfg.idCol}) DO NOTHING`,
          [attemptId, Number(q.id), displayOrder, blockNumber, i + 1, expectedSecs],
        );
      }

      // 10. Update adaptive_blocks
      await qr.query(
        `UPDATE adaptive_blocks
         SET status='generated', generated_questions=$1, updated_at=NOW()
         WHERE block_id=$2`,
        [JSON.stringify(fetchedQuestions.map(q => q.id)), blockId],
      );

      // 11. Upsert block_attempts
      const totalBlockMarks = fetchedQuestions.reduce((s: number, q: any) => s + Number(q.marks), 0);
      await qr.query(
        `INSERT INTO block_attempts
           (attempt_token, block_id, user_id, block_number, status, started_at,
            difficulty_achieved, total_count, total_block_marks)
         VALUES ($1,$2,$3,$4,'in_progress',NOW(),$5,$6,$7)
         ON CONFLICT (attempt_token, block_number)
         DO UPDATE SET status='in_progress', started_at=NOW(),
                       difficulty_achieved=$5, total_count=$6,
                       total_block_marks=$7`,
        [attemptToken, blockId, userId, blockNumber, targetDifficulty,
         fetchedQuestions.length, totalBlockMarks],
      );

      // 12. Update adaptive_paths
      await qr.query(
        `INSERT INTO adaptive_paths
           (attempt_token, assessment_id, user_id, difficulty_path, accuracy_path, time_path, current_block)
         VALUES ($1,$2,$3,$4,'[]'::jsonb,'[]'::jsonb,$5)
         ON CONFLICT (attempt_token) DO UPDATE
           SET difficulty_path = adaptive_paths.difficulty_path || $4::jsonb,
               current_block   = $5,
               updated_at      = NOW()`,
        [attemptToken, assessmentId, userId, JSON.stringify([targetDifficulty]), blockNumber],
      );

      await qr.commitTransaction();

      // 13. Build response
      const questions: AdaptiveQuestion[] = [];
      for (const q of fetchedQuestions) {
        const opts = await this.dataSource.query(
          `SELECT option_id::text AS id, option_text AS text
           FROM ${cfg.options} WHERE ${cfg.idCol}=$1 ORDER BY option_id`,
          [Number(q.id)],
        );
        const meta = typeof q.metadata === 'object' ? q.metadata : {};
        const kind = this.engine.normalizeKind(meta?.kind);
        const expectedSecs = this.engine.computeExpectedTime(
          Number(q.marks),
          (q.difficulty as Difficulty) ?? 'easy',
          blueprint.secondsPerMark,
        );
        questions.push({
          id: String(q.id),
          text: q.question_text,
          options: opts,
          difficulty: (q.difficulty as Difficulty) ?? 'easy',
          category: q.category ?? q._slot.category,
          subcategory: q.subcategory ?? q._slot.subcategory,
          marks: Number(q.marks),
          negativeMarks: Number(q.negative_marks ?? 0),
          kind,
          imageUrl: q.image_url ?? undefined,
          expectedTimeSecs: expectedSecs,
        });
      }

      return {
        blockId,
        blockNumber,
        totalBlocks,
        difficulty: targetDifficulty,
        questions,
        totalBlockMarks,
        timeLimitSeconds: fetchedQuestions.reduce(
          (s: number, q: any) =>
            s + this.engine.computeExpectedTime(Number(q.marks), q.difficulty ?? 'easy', blueprint.secondsPerMark),
          0,
        ),
        isLastBlock,
        coverageMap: blockCoverageMap,
      };
    } catch (e) {
      await qr.rollbackTransaction();
      this.logger.error('generateBlock error:', e);
      throw e;
    } finally {
      await qr.release();
    }
  }
}
