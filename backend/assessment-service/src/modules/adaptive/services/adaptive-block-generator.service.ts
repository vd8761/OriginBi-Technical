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
      hasImageUrl: boolean;
      extraCols?: string;
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
        hasImageUrl: true,
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
        hasImageUrl: false,
        extraCols: 'audio_url, passage_text, task_type, rubric_json',
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
        hasImageUrl: false,
      },
      role: {
        attempts: 'tech_role_attempts',
        questions: 'tech_role_questions',
        junction: 'tech_role_attempt_questions',
        idCol: 'role_question_id',
        options: 'tech_role_options',
        attemptIdCol: 'role_attempt_id',
        categoryCol: 'domain',
        subcategoryCol: 'domain',
        hasMode: false,
        hasImageUrl: true,
      },
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
        hasImageUrl: false,
        extraCols: 'audio_url, passage_text, task_type, rubric_json',
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
    qr: any,
    attemptToken: string,
    assessmentId: number,
    coverage: Record<string, Record<string, { marksUsed: number; questionsUsed: number }>>,
  ): Promise<void> {
    await qr.query(
      `INSERT INTO adaptive_subcategory_coverage (attempt_token, assessment_id, coverage)
       VALUES ($1, $2, $3)
       ON CONFLICT (attempt_token) DO UPDATE SET coverage=$3, updated_at=NOW()`,
      [attemptToken, assessmentId, JSON.stringify(coverage)],
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Build question slots for a block — COUNT based.
  //
  // The block must contain exactly `questionCount` questions. The count is
  // split across difficulties using the block's difficulty profile, and the
  // category/subcategory of each slot is assigned round-robin so concepts
  // stay balanced regardless of how many marks each question carries.
  // ─────────────────────────────────────────────────────────────────────────

  private buildQuestionSlots(
    blueprint: BlueprintConfig,
    questionCount: number,
    targetDifficulty: Difficulty,
    usedCount = 0,
  ): QuestionSlot[] {
    if (questionCount <= 0) return [];

    const profile = blueprint.difficultyProfiles[targetDifficulty];
    let easyN   = Math.round((profile.easy   / 100) * questionCount);
    let mediumN = Math.round((profile.medium / 100) * questionCount);
    let hardN   = Math.round((profile.hard   / 100) * questionCount);

    // Correct rounding drift so the three counts sum to exactly questionCount.
    const sum = () => easyN + mediumN + hardN;
    while (sum() < questionCount) {
      if (profile.medium > 0) mediumN++;
      else if (profile.easy > 0) easyN++;
      else hardN++;
    }
    while (sum() > questionCount) {
      if (hardN > 0) hardN--;
      else if (mediumN > 0) mediumN--;
      else easyN--;
    }

    // Flat list of (category, subcategory) pairs for round-robin balancing.
    const catSubPairs: Array<{ category: string; subcategory: string }> = [];
    for (const category of Object.keys(blueprint.categoryBlueprint)) {
      const subs = Object.keys(blueprint.subcategoryBlueprint[category] ?? {});
      if (subs.length) {
        for (const sub of subs) catSubPairs.push({ category, subcategory: sub });
      } else {
        catSubPairs.push({ category, subcategory: category });
      }
    }
    if (!catSubPairs.length) {
      catSubPairs.push({ category: 'General', subcategory: 'General' });
    }

    const slots: QuestionSlot[] = [];
    let rr = usedCount;
    const pushSlots = (difficulty: Difficulty, n: number) => {
      for (let i = 0; i < n; i++) {
        const cs = catSubPairs[rr % catSubPairs.length];
        rr++;
        slots.push({ category: cs.category, subcategory: cs.subcategory, difficulty, targetMarks: 1 });
      }
    };
    pushSlots('easy', easyN);
    pushSlots('medium', mediumN);
    pushSlots('hard', hardN);

    return slots;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8-phase fallback question fetch — Kept as legacy for signature compatibility but unused in optimized path
  // ─────────────────────────────────────────────────────────────────────────

  private async fetchQuestionForSlot(
    cfg: ReturnType<typeof this.getModuleConfig>,
    assessmentId: number,
    slot: QuestionSlot,
    usedIds: number[],
    usedTexts: string[],
    mode: 'trial' | 'main',
    modeExists: boolean,
    difficultyExists: boolean,
    metadataExists: boolean,
  ): Promise<any | null> {
    if (!cfg) return null;

    const nearbyDiff = (d: Difficulty): Difficulty[] => {
      if (d === 'easy')   return ['easy', 'medium'];
      if (d === 'medium') return ['medium', 'easy', 'hard'];
      return ['hard', 'medium'];
    };

    const excludeClause = usedIds.length
      ? `AND ${cfg.idCol} NOT IN (${usedIds.join(',')})`
      : '';

    const modeClause = cfg.hasMode && modeExists
      ? `AND (mode='${mode === 'trial' ? 'trial' : 'main'}' OR mode IS NULL)`
      : '';

    const baseWhere = `assessment_id=${assessmentId} AND status='active' ${modeClause} ${excludeClause}`;

    const diffSelect = difficultyExists ? 'difficulty' : `'medium' AS difficulty`;
    const metadataSelect = metadataExists ? 'metadata' : 'NULL AS metadata';
    const extraColsSelect = cfg.extraCols ? `, ${cfg.extraCols}` : '';

    const tryFetch = async (
      diffList: Difficulty[],
      catFilter: string,
      subFilter: string,
    ): Promise<any | null> => {
      const diffFilter = difficultyExists && diffList.length
        ? `AND difficulty IN (${diffList.map(d => `'${d}'`).join(',')})`
        : '';
      const rows = await this.dataSource.query(
        `SELECT ${cfg.idCol} AS id, question_text, ${diffSelect},
          ${cfg.categoryCol} AS category,
          ${cfg.subcategoryCol} AS subcategory,
          marks, negative_marks, ${metadataSelect}${cfg.hasImageUrl ? ', image_url' : ''}${extraColsSelect}
         FROM ${cfg.questions}
         WHERE ${baseWhere}
           AND TRIM(question_text) <> ALL($1::text[])
           ${catFilter}
           ${subFilter}
           ${diffFilter}
         ORDER BY RANDOM() LIMIT 1`,
        [usedTexts],
      );
      return rows[0] ?? null;
    };

    const catFilter = `AND ${cfg.categoryCol}::text='${slot.category}'`;
    const subFilter = `AND ${cfg.subcategoryCol}::text='${slot.subcategory}'`;

    const phases: Array<() => Promise<any | null>> = [
      () => tryFetch([slot.difficulty], catFilter, subFilter),
      () => tryFetch(nearbyDiff(slot.difficulty), catFilter, subFilter),
      () => tryFetch([slot.difficulty], catFilter, ''),
      () => tryFetch(nearbyDiff(slot.difficulty), catFilter, ''),
      () => tryFetch([slot.difficulty], '', ''),
      () => tryFetch([], '', ''),
    ];

    for (const phase of phases) {
      const result = await phase();
      if (result) return result;
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main: generate a block (Highly Optimized with Single Query & In-Memory Fallbacks)
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
      // 1. Ensure blueprint exists (auto-builds from question bank if missing).
      //    This also initializes adaptive_blocks rows.
      const blueprint = await this.blueprintService.ensureBlueprint(assessmentId);
      if (!blueprint) {
        throw new BadRequestException(
          `Could not build blueprint for assessment ${assessmentId}. Ensure questions are added first.`,
        );
      }

      // 2. Load assessment + adaptive_blocks row
      const asmRows = await qr.query(
        `SELECT a.assessment_id, a.module_type, a.block_config, a.question_limit,
                a.adaptive_total_questions,
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
      const totalBlocks = blueprint.totalBlocks || Number(rawBC.blocksPerAssessment ?? rawBC.blocks_per_assessment ?? 4);
      const isLastBlock = blockNumber === totalBlocks;

      const totalQuestions = Math.max(
        totalBlocks,
        Math.round(Number(row.adaptive_total_questions ?? 0)) || totalBlocks * 5,
      );
      const questionsPerBlock = Math.max(1, Math.round(totalQuestions / totalBlocks));
      const questionsThisBlock = isLastBlock
        ? Math.max(1, totalQuestions - (blockNumber - 1) * questionsPerBlock)
        : questionsPerBlock;

      // 3. Resolve attempt + used question IDs and texts
      const ar = await qr.query(
        `SELECT ${cfg.attemptIdCol} AS aid FROM ${cfg.attempts} WHERE attempt_token=$1`,
        [attemptToken],
      );
      if (!ar.length) throw new NotFoundException('Attempt not found');
      const attemptId = Number(ar[0].aid);

      const ur = await qr.query(
        `SELECT aq.${cfg.idCol} AS qid, q.question_text
         FROM ${cfg.junction} aq
         JOIN ${cfg.questions} q ON q.${cfg.idCol} = aq.${cfg.idCol}
         WHERE aq.${cfg.attemptIdCol}=$1`,
        [attemptId],
      );
      const usedIds: number[] = ur.map((r: any) => Number(r.qid));
      const usedTexts: string[] = ur.map((r: any) => String(r.question_text || '').trim());

      // 4. Load subcategory coverage
      const coverage = await this.loadCoverage(attemptToken);

      // 5. Build question slots — exactly `questionsThisBlock` slots. Offsetting round-robin concepts by usedCount!
      const slots = this.buildQuestionSlots(blueprint, questionsThisBlock, targetDifficulty, usedIds.length);

      // 6. Fetch all questions and pre-aggregate options in a single high-performance query
      const modeExists = await this.columnExists(cfg.questions, 'mode');
      const difficultyExists = await this.columnExists(cfg.questions, 'difficulty');
      const metadataExists = await this.columnExists(cfg.questions, 'metadata');

      const imgSelect = cfg.hasImageUrl && (await this.columnExists(cfg.questions, 'image_url')) ? ', q.image_url' : '';
      const diffSelect = difficultyExists ? 'q.difficulty' : `'medium' AS difficulty`;
      const metadataSelect = metadataExists ? 'q.metadata' : 'NULL AS metadata';
      const extraColsSelect = cfg.extraCols
        ? cfg.extraCols.split(',').map(c => `q.${c.trim()}`).join(', ')
        : '';
      const extraColsSql = extraColsSelect ? `, ${extraColsSelect}` : '';

      const modeCondition = cfg.hasMode && modeExists
        ? `AND (q.mode = $2 OR q.mode IS NULL)`
        : '';
      const queryParams: any[] = [assessmentId];
      if (cfg.hasMode && modeExists) {
        queryParams.push(mode === 'trial' ? 'trial' : 'main');
      }

      const allRows = await qr.query(
        `SELECT q.${cfg.idCol} AS id, q.question_text, ${diffSelect},
                q.${cfg.categoryCol} AS category,
                q.${cfg.subcategoryCol} AS subcategory,
                q.marks, q.negative_marks${imgSelect}, ${metadataSelect}${extraColsSql}
         FROM ${cfg.questions} q
         WHERE q.assessment_id = $1 AND q.status = 'active' ${modeCondition}`,
        queryParams,
      );

      const candidates = allRows.map((q: any) => {
        const meta = typeof q.metadata === 'object' ? q.metadata : {};
        const kind = this.engine.normalizeKind(meta?.kind);
        return {
          id: String(q.id),
          question_text: q.question_text,
          difficulty: String(q.difficulty || 'medium').toLowerCase() as Difficulty,
          category: String(q.category || 'General'),
          subcategory: String(q.subcategory || q.category || 'General'),
          marks: Number(q.marks) || 1,
          negative_marks: Number(q.negative_marks) || 0,
          image_url: q.image_url ?? undefined,
          metadata: meta,
          options: [],
          audio_url: q.audio_url ?? undefined,
          passage_text: q.passage_text ?? undefined,
          task_type: q.task_type ?? undefined,
          rubric_json: q.rubric_json ?? undefined,
        };
      });

      const fetchedQuestions: any[] = [];
      const localUsedIds = new Set(usedIds.map(String));
      const localUsedTexts = new Set(usedTexts.map(t => t.toLowerCase()));

      // 7. Perform fallback selection phases purely in-memory
      const fetchQuestionForSlotInMemory = (
        slot: QuestionSlot,
      ): any | null => {
        const nearbyDiff = (d: Difficulty): Difficulty[] => {
          if (d === 'easy')   return ['easy', 'medium'];
          if (d === 'medium') return ['medium', 'easy', 'hard'];
          return ['hard', 'medium'];
        };

        const tryFetch = (
          diffList: Difficulty[],
          catName: string | null,
          subName: string | null,
        ): any | null => {
          const filtered = candidates.filter((q: any) => {
            if (localUsedIds.has(q.id)) return false;
            if (localUsedTexts.has(q.question_text.trim().toLowerCase())) return false;
            if (catName !== null && q.category.trim().toLowerCase() !== catName.trim().toLowerCase()) return false;
            if (subName !== null && q.subcategory.trim().toLowerCase() !== subName.trim().toLowerCase()) return false;
            if (diffList.length && !diffList.includes(q.difficulty)) return false;
            return true;
          });

          if (filtered.length === 0) return null;
          const randIdx = Math.floor(Math.random() * filtered.length);
          return filtered[randIdx];
        };

        const slotCat = slot.category;
        const slotSub = slot.subcategory;
        const slotDiff = slot.difficulty;

        const phases: Array<() => any | null> = [
          // Phase 1: exact category + subcategory + difficulty
          () => tryFetch([slotDiff], slotCat, slotSub),
          // Phase 2: same cat+sub, nearby difficulty
          () => tryFetch(nearbyDiff(slotDiff), slotCat, slotSub),
          // Phase 3: same category, any subcategory, exact difficulty
          () => tryFetch([slotDiff], slotCat, null),
          // Phase 4: same category, any subcategory, nearby difficulty
          () => tryFetch(nearbyDiff(slotDiff), slotCat, null),
          // Phase 5: any category, exact difficulty
          () => tryFetch([slotDiff], null, null),
          // Phase 6: any category, any difficulty
          () => tryFetch([], null, null),
        ];

        for (const phase of phases) {
          const result = phase();
          if (result) return result;
        }
        return null;
      };

      for (const slot of slots) {
        const q = fetchQuestionForSlotInMemory(slot);
        if (q) {
          localUsedIds.add(q.id);
          localUsedTexts.add(q.question_text.trim().toLowerCase());
          fetchedQuestions.push({ ...q, _slot: slot });
        }
      }

      if (!fetchedQuestions.length) {
        throw new BadRequestException(`No questions available for block ${blockNumber}`);
      }

      // Deduplicate unique question IDs
      const seenQIds = new Set<string>();
      const uniqueQuestions = fetchedQuestions.filter(q => {
        const id = q.id;
        if (seenQIds.has(id)) return false;
        seenQIds.add(id);
        return true;
      });

      // Shuffle
      for (let i = uniqueQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniqueQuestions[i], uniqueQuestions[j]] = [uniqueQuestions[j], uniqueQuestions[i]];
      }

      fetchedQuestions.length = 0;
      fetchedQuestions.push(...uniqueQuestions);

      // Fetch options only for selected question IDs in a single query
      if (fetchedQuestions.length > 0) {
        const selectedQIds = fetchedQuestions.map(q => Number(q.id));
        const allOptions = await qr.query(
          `SELECT ${cfg.idCol}::text AS question_id, option_id::text AS id, option_text AS text
           FROM ${cfg.options}
           WHERE ${cfg.idCol} IN (${selectedQIds.join(',')})
           ORDER BY option_id`,
        );

        // Group options by question_id
        const optionsMap = new Map<string, Array<{ id: string; text: string }>>();
        for (const opt of allOptions) {
          const qId = String(opt.question_id);
          if (!optionsMap.has(qId)) optionsMap.set(qId, []);
          optionsMap.get(qId)!.push({
            id: String(opt.id),
            text: opt.text,
          });
        }

        // Map options back to fetchedQuestions
        for (const q of fetchedQuestions) {
          q.options = optionsMap.get(String(q.id)) ?? [];
        }
      }

      // 8. Build coverage map for this block
      const blockCoverageMap: Record<string, Record<string, number>> = {};
      for (const q of fetchedQuestions) {
        const cat = q.category ?? q._slot.category;
        const sub = q.subcategory ?? q._slot.subcategory;
        if (!blockCoverageMap[cat]) blockCoverageMap[cat] = {};
        blockCoverageMap[cat][sub] = (blockCoverageMap[cat][sub] ?? 0) + Number(q.marks);
      }

      // 9. Update subcategory coverage
      const updatedCoverage = { ...coverage };
      for (const [cat, subs] of Object.entries(blockCoverageMap)) {
        if (!updatedCoverage[cat]) updatedCoverage[cat] = {};
        for (const [sub, marks] of Object.entries(subs)) {
          if (!updatedCoverage[cat][sub]) updatedCoverage[cat][sub] = { marksUsed: 0, questionsUsed: 0 };
          updatedCoverage[cat][sub].marksUsed += marks;
          updatedCoverage[cat][sub].questionsUsed += 1;
        }
      }
      await this.saveCoverage(qr, attemptToken, assessmentId, updatedCoverage);

      // 10. Insert into junction table
      if (fetchedQuestions.length > 0) {
        const valuesSql: string[] = [];
        const params: any[] = [];
        let pIdx = 1;

        let blockSeqOrder = 0;
        for (let i = 0; i < fetchedQuestions.length; i++) {
          const q = fetchedQuestions[i];
          const displayOrder = usedIds.length + i + 1;
          const expectedSecs = this.engine.computeExpectedTime(
            Number(q.marks),
            (q.difficulty as Difficulty) ?? 'easy',
            blueprint.secondsPerMark,
          );
          blockSeqOrder++;

          valuesSql.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, false, $${pIdx++})`);
          params.push(attemptId, Number(q.id), displayOrder, blockNumber, blockSeqOrder, expectedSecs);
        }

        await qr.query(
          `INSERT INTO ${cfg.junction}
             (${cfg.attemptIdCol}, ${cfg.idCol}, display_order, block_number,
              block_sequence_order, is_locked, expected_time_seconds)
           VALUES ${valuesSql.join(', ')}
           ON CONFLICT DO NOTHING`,
          params,
        );
      }

      // 11. Update adaptive_blocks
      await qr.query(
        `UPDATE adaptive_blocks
         SET status='generated', generated_questions=$1, updated_at=NOW()
         WHERE block_id=$2`,
        [JSON.stringify(fetchedQuestions.map(q => Number(q.id))), blockId],
      );

      // 12. Upsert block_attempts
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

      // 13. Update adaptive_paths
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

      // 14. Build response using the pre-aggregated options (NO looping DB queries!)
      const questions: AdaptiveQuestion[] = [];
      for (const q of fetchedQuestions) {
        const expectedSecs = this.engine.computeExpectedTime(
          Number(q.marks),
          (q.difficulty as Difficulty) ?? 'easy',
          blueprint.secondsPerMark,
        );
        questions.push({
          id: String(q.id),
          text: q.question_text,
          options: q.options,
          difficulty: (q.difficulty as Difficulty) ?? 'easy',
          category: q.category ?? q._slot.category,
          subcategory: q.subcategory ?? q._slot.subcategory,
          marks: Number(q.marks),
          negativeMarks: Number(q.negative_marks ?? 0),
          kind: this.engine.normalizeKind(q.metadata?.kind),
          imageUrl: cfg.hasImageUrl ? (q.image_url ?? undefined) : undefined,
          expectedTimeSecs: expectedSecs,
          audioUrl: q.audio_url ?? undefined,
          passageText: q.passage_text ?? undefined,
          taskType: q.task_type ?? undefined,
          rubricJson: q.rubric_json ?? undefined,
        });
      }

      return {
        blockId,
        blockNumber,
        totalBlocks,
        totalQuestions,
        questionsPerBlock,
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
