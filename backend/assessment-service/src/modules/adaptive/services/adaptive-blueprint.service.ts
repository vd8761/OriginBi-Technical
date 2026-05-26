import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdaptiveEngineService } from './adaptive-engine.service';
import { BlueprintConfig } from '../interfaces/adaptive.interfaces';

/**
 * AdaptiveBlueprintService
 *
 * Fully automatic — no manual admin setup required.
 *
 * The blueprint is computed from the live question bank whenever:
 *   1. adaptive_enabled is toggled ON for an assessment
 *   2. A new question is added/deleted for an adaptive-enabled assessment
 *   3. A candidate starts an adaptive attempt and no blueprint exists yet
 *   4. Admin explicitly calls refreshBlueprint()
 *
 * Blueprint logic:
 *   - Discovers all active categories + subcategories from the question bank
 *   - Distributes totalMarks EQUALLY across categories (concept-balanced)
 *   - Within each category, distributes equally across subcategories
 *   - Difficulty profiles are fixed: easy→medium→hard based on block performance
 *   - totalMarks / totalBlocks / secondsPerMark come from tech_assessments columns
 */
@Injectable()
export class AdaptiveBlueprintService {
  private readonly logger = new Logger(AdaptiveBlueprintService.name);

  // Full module → table mapping (matches all other services)
  private readonly MODULE_TABLE_MAP: Record<string, {
    table: string;
    catCol: string;
    subCol: string;
  }> = {
    aptitude:      { table: 'tech_aptitude_questions', catCol: 'category',    subCol: 'subcategory' },
    grammar:       { table: 'tech_grammar_questions',  catCol: 'task_type',   subCol: 'task_type' },
    // 'communication' assessments are stored with module_type='grammar' in the DB enum,
    // but this alias handles any edge-case where the string reaches this service directly.
    communication: { table: 'tech_grammar_questions',  catCol: 'task_type',   subCol: 'task_type' },
    mnc:           { table: 'tech_mnc_questions',      catCol: 'category',    subCol: 'subcategory' },
    // role: use COALESCE(category, domain) so questions without an explicit category
    // fall back to domain. The block generator also uses 'domain' as its categoryCol
    // which is consistent — both resolve to the same value when category IS NULL.
    role:          { table: 'tech_role_questions',     catCol: 'domain',      subCol: 'domain' },
    // coding is intentionally absent — coding questions live in exam-engine
    // (`questions` with plugin_slug='assessment.coding') and have their own
    // dedicated bank UI; the adaptive blueprint engine here covers MCQ modules
    // only.
  };

  constructor(
    private readonly dataSource: DataSource,
    private readonly engine: AdaptiveEngineService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC: Ensure blueprint exists and is up-to-date.
  // Called automatically before every block generation.
  // ─────────────────────────────────────────────────────────────────────────

  async ensureBlueprint(assessmentId: number): Promise<BlueprintConfig> {
    // Load assessment settings
    const asmRows = await this.dataSource.query(
      `SELECT assessment_id, module_type,
              adaptive_total_marks, adaptive_total_blocks, adaptive_seconds_per_mark
       FROM tech_assessments WHERE assessment_id=$1`,
      [assessmentId],
    );
    if (!asmRows.length) {
      throw new BadRequestException(`Assessment ${assessmentId} not found`);
    }

    const asm = asmRows[0];
    const totalMarks      = Number(asm.adaptive_total_marks ?? 100);
    const totalBlocks     = Number(asm.adaptive_total_blocks ?? 4);
    const secondsPerMark  = Number(asm.adaptive_seconds_per_mark ?? 45);
    const moduleType: string = asm.module_type;

    // Check if blueprint already exists and question bank hasn't changed
    const existing = await this.loadBlueprint(assessmentId);
    const currentStats = await this.getQuestionStats(assessmentId, moduleType);

    if (existing && this.blueprintIsValid(existing, currentStats, totalMarks, totalBlocks, secondsPerMark)) {
      return existing;
    }

    // (Re)build blueprint from question bank
    return this.buildAndPersistBlueprint(assessmentId, moduleType, totalMarks, totalBlocks, secondsPerMark);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC: Force-refresh blueprint (called when questions are added/removed)
  // ─────────────────────────────────────────────────────────────────────────

  async refreshBlueprint(assessmentId: number): Promise<BlueprintConfig | null> {
    const asmRows = await this.dataSource.query(
      `SELECT assessment_id, module_type, adaptive_enabled,
              adaptive_total_marks, adaptive_total_blocks, adaptive_seconds_per_mark
       FROM tech_assessments WHERE assessment_id=$1`,
      [assessmentId],
    );
    if (!asmRows.length) return null;

    const asm = asmRows[0];
    if (!asm.adaptive_enabled) return null; // Only refresh for adaptive assessments

    const totalMarks     = Number(asm.adaptive_total_marks ?? 100);
    const totalBlocks    = Number(asm.adaptive_total_blocks ?? 4);
    const secondsPerMark = Number(asm.adaptive_seconds_per_mark ?? 45);

    return this.buildAndPersistBlueprint(
      assessmentId, asm.module_type, totalMarks, totalBlocks, secondsPerMark,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC: Get current blueprint (read-only, no auto-build)
  // ─────────────────────────────────────────────────────────────────────────

  async getBlueprint(assessmentId: number): Promise<BlueprintConfig | null> {
    return this.loadBlueprint(assessmentId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC: Get block status for an attempt
  // ─────────────────────────────────────────────────────────────────────────

  async getBlockStatus(attemptToken: string): Promise<Array<{
    blockNumber: number;
    status: string;
    difficulty: string;
    snapshotTaken: boolean;
    marksScore: number | null;
    blockReadinessScore: number | null;
    nextBlockDifficulty: string | null;
  }>> {
    const rows = await this.dataSource.query(
      `SELECT ba.block_number, ba.status, ba.difficulty_achieved,
              ba.snapshot_taken, ba.marks_score, ba.block_readiness_score,
              ba.next_block_difficulty
       FROM block_attempts ba
       WHERE ba.attempt_token=$1
       ORDER BY ba.block_number`,
      [attemptToken],
    );
    return rows.map((r: any) => ({
      blockNumber:         r.block_number,
      status:              r.status,
      difficulty:          r.difficulty_achieved,
      snapshotTaken:       r.snapshot_taken ?? false,
      marksScore:          r.marks_score !== null ? Number(r.marks_score) : null,
      blockReadinessScore: r.block_readiness_score !== null ? Number(r.block_readiness_score) : null,
      nextBlockDifficulty: r.next_block_difficulty,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC: Get categories + stats for an assessment (admin info endpoint)
  // ─────────────────────────────────────────────────────────────────────────

  async getCategoriesForAssessment(assessmentId: number): Promise<{
    categories: string[];
    subcategoriesByCategory: Record<string, string[]>;
    totalActiveQuestions: number;
    questionsByDifficulty: Record<string, number>;
    questionsByCategory: Record<string, number>;
  }> {
    const asmRows = await this.dataSource.query(
      `SELECT assessment_id, module_type FROM tech_assessments WHERE assessment_id=$1`,
      [assessmentId],
    );
    if (!asmRows.length) throw new BadRequestException(`Assessment ${assessmentId} not found`);

    const moduleType = asmRows[0].module_type;
    const { categories, subcategoriesByCategory } = await this.discoverCategories(assessmentId, moduleType);
    const stats = await this.getQuestionStats(assessmentId, moduleType);

    return {
      categories,
      subcategoriesByCategory,
      totalActiveQuestions: stats.totalQuestions,
      questionsByDifficulty: stats.byDifficulty,
      questionsByCategory: stats.byCategory,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CORE: Build blueprint from question bank and persist
  // ─────────────────────────────────────────────────────────────────────────

  private async buildAndPersistBlueprint(
    assessmentId: number,
    moduleType: string,
    totalMarks: number,
    totalBlocks: number,
    secondsPerMark: number,
  ): Promise<BlueprintConfig> {
    const { categories, subcategoriesByCategory } = await this.discoverCategories(assessmentId, moduleType);

    if (!categories.length) {
      throw new BadRequestException(
        `No active questions found for assessment ${assessmentId}. Add questions first before enabling adaptive mode.`,
      );
    }

    const stats = await this.getQuestionStats(assessmentId, moduleType);

    // Build equal-weight blueprint (concept-balanced)
    const blueprint = this.engine.buildDefaultBlueprint(
      totalMarks,
      totalBlocks,
      categories,
      subcategoriesByCategory,
      secondsPerMark,
      // No custom weightage — equal distribution across all categories
    );

    // Persist blueprint
    await this.dataSource.query(
      `INSERT INTO adaptive_blueprint (
         assessment_id, total_marks, total_blocks, marks_per_block,
         seconds_per_mark, category_blueprint, subcategory_blueprint,
         difficulty_profiles, question_stats, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
       ON CONFLICT (assessment_id) DO UPDATE SET
         total_marks=$2, total_blocks=$3, marks_per_block=$4,
         seconds_per_mark=$5, category_blueprint=$6,
         subcategory_blueprint=$7, difficulty_profiles=$8,
         question_stats=$9, updated_at=NOW()`,
      [
        assessmentId,
        blueprint.totalMarks,
        blueprint.totalBlocks,
        blueprint.marksPerBlock,
        blueprint.secondsPerMark,
        JSON.stringify(blueprint.categoryBlueprint),
        JSON.stringify(blueprint.subcategoryBlueprint),
        JSON.stringify(blueprint.difficultyProfiles),
        JSON.stringify(stats),
      ],
    );

    // Initialize adaptive_blocks rows (one per block)
    await this.initializeBlocks(assessmentId, totalBlocks);

    // Update tech_assessments block_config
    await this.dataSource.query(
      `UPDATE tech_assessments
       SET block_config = $1, updated_at = NOW()
       WHERE assessment_id = $2`,
      [
        JSON.stringify({
          enabled: true,
          blocksPerAssessment: totalBlocks,
          questionsPerBlock: Math.max(1, Math.ceil(totalMarks / totalBlocks / 2)),
          totalMarks,
        }),
        assessmentId,
      ],
    );

    this.logger.log(
      `Auto-blueprint built for assessment ${assessmentId}: ` +
      `${totalMarks} marks, ${totalBlocks} blocks, ` +
      `${categories.length} categories, ${stats.totalQuestions} questions`,
    );

    return blueprint;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Initialize adaptive_blocks rows (one per block)
  // ─────────────────────────────────────────────────────────────────────────

  async initializeBlocks(assessmentId: number, totalBlocks: number): Promise<void> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      for (let i = 1; i <= totalBlocks; i++) {
        await qr.query(
          `INSERT INTO adaptive_blocks
             (assessment_id, block_number, difficulty_distribution, is_adaptive, status)
           VALUES ($1,$2,$3,true,'pending')
           ON CONFLICT (assessment_id, block_number) DO NOTHING`,
          [assessmentId, i, JSON.stringify({ easy: 70, medium: 30, hard: 0 })],
        );
      }
      await qr.commitTransaction();
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Discover categories and subcategories from the live question bank
  // ─────────────────────────────────────────────────────────────────────────

  private async discoverCategories(
    assessmentId: number,
    moduleType: string,
  ): Promise<{
    categories: string[];
    subcategoriesByCategory: Record<string, string[]>;
  }> {
    const t = this.MODULE_TABLE_MAP[moduleType];
    if (!t) {
      this.logger.warn(`No table mapping for module type: ${moduleType}`);
      return { categories: [], subcategoriesByCategory: {} };
    }

    // Cast columns to text before COALESCE: catCol/subCol may be a Postgres
    // enum (e.g. tech_grammar_questions.task_type), and the literal 'General'
    // fallback is not a valid enum member — without ::text the query errors.
    const subColSql = t.subCol !== t.catCol
      ? `COALESCE(${t.subCol}::text, ${t.catCol}::text, 'General') AS subcategory`
      : `COALESCE(${t.catCol}::text, 'General') AS subcategory`;

    const rows = await this.dataSource.query(
      `SELECT DISTINCT
         COALESCE(${t.catCol}::text, 'General') AS category,
         ${subColSql}
       FROM ${t.table}
       WHERE assessment_id=$1 AND status='active'
       ORDER BY category, subcategory`,
      [assessmentId],
    );

    const subcategoriesByCategory: Record<string, string[]> = {};
    for (const r of rows) {
      const cat = r.category ?? 'General';
      const sub = r.subcategory ?? cat;
      if (!subcategoriesByCategory[cat]) subcategoriesByCategory[cat] = [];
      if (!subcategoriesByCategory[cat].includes(sub)) {
        subcategoriesByCategory[cat].push(sub);
      }
    }

    return {
      categories: Object.keys(subcategoriesByCategory),
      subcategoriesByCategory,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Get question statistics from the question bank
  // ─────────────────────────────────────────────────────────────────────────

  private async getQuestionStats(
    assessmentId: number,
    moduleType: string,
  ): Promise<{
    totalQuestions: number;
    byDifficulty: Record<string, number>;
    byCategory: Record<string, number>;
    checksum: string;
  }> {
    const t = this.MODULE_TABLE_MAP[moduleType];
    if (!t) return { totalQuestions: 0, byDifficulty: {}, byCategory: {}, checksum: '0' };

    // Check if difficulty column exists
    const hasDifficulty = await this.columnExists(t.table, 'difficulty');

    let rows: any[];
    if (hasDifficulty) {
      rows = await this.dataSource.query(
        `SELECT
           COUNT(*)::int AS total,
           COALESCE(${t.catCol}::text, 'General') AS category,
           COALESCE(difficulty::text, 'medium') AS difficulty
         FROM ${t.table}
         WHERE assessment_id=$1 AND status='active'
         GROUP BY COALESCE(${t.catCol}::text, 'General'), COALESCE(difficulty::text, 'medium')`,
        [assessmentId],
      );
    } else {
      rows = await this.dataSource.query(
        `SELECT
           COUNT(*)::int AS total,
           COALESCE(${t.catCol}::text, 'General') AS category,
           'medium' AS difficulty
         FROM ${t.table}
         WHERE assessment_id=$1 AND status='active'
         GROUP BY COALESCE(${t.catCol}::text, 'General')`,
        [assessmentId],
      );
    }

    let totalQuestions = 0;
    const byDifficulty: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const r of rows) {
      const count = Number(r.total);
      totalQuestions += count;
      byDifficulty[r.difficulty] = (byDifficulty[r.difficulty] ?? 0) + count;
      byCategory[r.category] = (byCategory[r.category] ?? 0) + count;
    }

    // Simple checksum: total + sorted category counts
    const checksum = String(totalQuestions) + '_' +
      Object.entries(byCategory).sort().map(([k, v]) => `${k}:${v}`).join(',');

    return { totalQuestions, byDifficulty, byCategory, checksum };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Load blueprint from DB
  // ─────────────────────────────────────────────────────────────────────────

  async loadBlueprint(assessmentId: number): Promise<BlueprintConfig | null> {
    const rows = await this.dataSource.query(
      `SELECT total_marks, total_blocks, marks_per_block, seconds_per_mark,
              category_blueprint, subcategory_blueprint, difficulty_profiles, question_stats
       FROM adaptive_blueprint WHERE assessment_id=$1`,
      [assessmentId],
    );
    if (!rows.length) return null;
    const r = rows[0];
    const bp: BlueprintConfig & { _questionStats?: any } = {
      totalMarks:           Number(r.total_marks),
      totalBlocks:          Number(r.total_blocks),
      marksPerBlock:        Number(r.marks_per_block),
      secondsPerMark:       Number(r.seconds_per_mark),
      categoryBlueprint:    r.category_blueprint ?? {},
      subcategoryBlueprint: r.subcategory_blueprint ?? {},
      difficultyProfiles:   r.difficulty_profiles ?? this.engine.DEFAULT_DIFFICULTY_PROFILES,
    };
    // Attach stored question_stats so blueprintIsValid can compare checksums
    bp._questionStats = r.question_stats ?? null;
    return bp;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Check if existing blueprint is still valid
  // ─────────────────────────────────────────────────────────────────────────

  private blueprintIsValid(
    existing: BlueprintConfig,
    currentStats: { totalQuestions: number; checksum: string },
    totalMarks: number,
    totalBlocks: number,
    secondsPerMark: number,
  ): boolean {
    if (currentStats.totalQuestions === 0) return false;
    if (existing.totalMarks !== totalMarks) return false;
    if (existing.totalBlocks !== totalBlocks) return false;
    if (existing.secondsPerMark !== secondsPerMark) return false;

    // Check if category count matches
    const existingCatCount = Object.keys(existing.categoryBlueprint).length;
    if (existingCatCount === 0) return false;

    // Check question bank checksum — if questions were added/removed, rebuild
    const storedStats = (existing as any)._questionStats;
    if (storedStats && storedStats.checksum && storedStats.checksum !== currentStats.checksum) {
      return false;
    }

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Column existence check (cached)
  // ─────────────────────────────────────────────────────────────────────────

  private readonly _colCache = new Map<string, boolean>();

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
}
