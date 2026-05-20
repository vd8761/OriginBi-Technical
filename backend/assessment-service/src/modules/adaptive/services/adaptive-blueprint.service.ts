import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdaptiveEngineService } from './adaptive-engine.service';
import { BlueprintConfig } from '../interfaces/adaptive.interfaces';
import { SetupBlueprintDto } from '../dto/adaptive.dto';

/**
 * AdaptiveBlueprintService
 *
 * Handles creation and retrieval of the marks blueprint for an assessment.
 * Also initializes adaptive_blocks rows when a blueprint is set up.
 */
@Injectable()
export class AdaptiveBlueprintService {
  private readonly logger = new Logger(AdaptiveBlueprintService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly engine: AdaptiveEngineService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Setup blueprint for an assessment
  // ─────────────────────────────────────────────────────────────────────────

  async setupBlueprint(dto: SetupBlueprintDto): Promise<BlueprintConfig> {
    const { assessmentId, totalMarks, totalBlocks, secondsPerMark = 45 } = dto;

    // Load assessment to get module type and available categories
    const asmRows = await this.dataSource.query(
      `SELECT assessment_id, module_type, categories FROM tech_assessments WHERE assessment_id=$1`,
      [assessmentId],
    );
    if (!asmRows.length) {
      throw new BadRequestException(`Assessment ${assessmentId} not found`);
    }

    const moduleType = asmRows[0].module_type;

    // Discover categories and subcategories from the question bank
    const { categories, subcategoriesByCategory } = await this.discoverCategories(
      assessmentId,
      moduleType,
    );

    if (!categories.length) {
      throw new BadRequestException(
        `No active questions found for assessment ${assessmentId}. Add questions first.`,
      );
    }

    // Build blueprint
    const blueprint = this.engine.buildDefaultBlueprint(
      totalMarks,
      totalBlocks,
      categories,
      subcategoriesByCategory,
      secondsPerMark,
      dto.categoryWeightage,
      dto.subcategoryWeightage,
    );

    // Persist blueprint
    await this.dataSource.query(
      `INSERT INTO adaptive_blueprint (
         assessment_id, total_marks, total_blocks, marks_per_block,
         seconds_per_mark, category_blueprint, subcategory_blueprint, difficulty_profiles
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (assessment_id) DO UPDATE SET
         total_marks=$2, total_blocks=$3, marks_per_block=$4,
         seconds_per_mark=$5, category_blueprint=$6,
         subcategory_blueprint=$7, difficulty_profiles=$8,
         updated_at=NOW()`,
      [
        assessmentId, blueprint.totalMarks, blueprint.totalBlocks,
        blueprint.marksPerBlock, blueprint.secondsPerMark,
        JSON.stringify(blueprint.categoryBlueprint),
        JSON.stringify(blueprint.subcategoryBlueprint),
        JSON.stringify(blueprint.difficultyProfiles),
      ],
    );

    // Initialize adaptive_blocks rows (one per block)
    await this.initializeBlocks(assessmentId, totalBlocks);

    // Update tech_assessments block_config
    await this.dataSource.query(
      `UPDATE tech_assessments
       SET block_config = $1, adaptive_enabled = true, updated_at = NOW()
       WHERE assessment_id = $2`,
      [
        JSON.stringify({
          enabled: true,
          blocksPerAssessment: totalBlocks,
          questionsPerBlock: Math.ceil(totalMarks / totalBlocks / 2), // rough estimate
          totalMarks,
        }),
        assessmentId,
      ],
    );

    this.logger.log(
      `Blueprint set up for assessment ${assessmentId}: ` +
      `${totalMarks} marks, ${totalBlocks} blocks, ${categories.length} categories`,
    );

    return blueprint;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Initialize adaptive_blocks rows
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
  // Discover categories and subcategories from question bank
  // ─────────────────────────────────────────────────────────────────────────

  private async discoverCategories(
    assessmentId: number,
    moduleType: string,
  ): Promise<{
    categories: string[];
    subcategoriesByCategory: Record<string, string[]>;
  }> {
    const tableMap: Record<string, { table: string; catCol: string; subCol: string }> = {
      aptitude: {
        table: 'tech_aptitude_questions',
        catCol: 'category',
        subCol: 'subcategory',
      },
      grammar: {
        table: 'tech_grammar_questions',
        catCol: 'task_type',
        subCol: 'task_type',
      },
      mnc: {
        table: 'tech_mnc_questions',
        catCol: 'topic_group',
        subCol: 'topic_group',
      },
    };

    const t = tableMap[moduleType];
    if (!t) return { categories: [], subcategoriesByCategory: {} };

    const rows = await this.dataSource.query(
      `SELECT DISTINCT
         COALESCE(${t.catCol}, 'General') AS category,
         COALESCE(${t.subCol}, 'General') AS subcategory
       FROM ${t.table}
       WHERE assessment_id=$1 AND status='active'
       ORDER BY category, subcategory`,
      [assessmentId],
    );

    const subcategoriesByCategory: Record<string, string[]> = {};
    for (const r of rows) {
      const cat = r.category ?? 'General';
      const sub = r.subcategory ?? 'General';
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
  // Get blueprint
  // ─────────────────────────────────────────────────────────────────────────

  async getBlueprint(assessmentId: number): Promise<BlueprintConfig | null> {
    const rows = await this.dataSource.query(
      `SELECT total_marks, total_blocks, marks_per_block, seconds_per_mark,
              category_blueprint, subcategory_blueprint, difficulty_profiles
       FROM adaptive_blueprint WHERE assessment_id=$1`,
      [assessmentId],
    );
    if (!rows.length) return null;
    const r = rows[0];
    return {
      totalMarks: Number(r.total_marks),
      totalBlocks: Number(r.total_blocks),
      marksPerBlock: Number(r.marks_per_block),
      secondsPerMark: Number(r.seconds_per_mark),
      categoryBlueprint: r.category_blueprint ?? {},
      subcategoryBlueprint: r.subcategory_blueprint ?? {},
      difficultyProfiles: r.difficulty_profiles ?? this.engine.DEFAULT_DIFFICULTY_PROFILES,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Get block status for an attempt
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
      blockNumber:          r.block_number,
      status:               r.status,
      difficulty:           r.difficulty_achieved,
      snapshotTaken:        r.snapshot_taken ?? false,
      marksScore:           r.marks_score !== null ? Number(r.marks_score) : null,
      blockReadinessScore:  r.block_readiness_score !== null ? Number(r.block_readiness_score) : null,
      nextBlockDifficulty:  r.next_block_difficulty,
    }));
  }
}
