import { Injectable, Logger } from '@nestjs/common';
import {
  Difficulty,
  QuestionKind,
  AnswerStatus,
  BlockMetrics,
  DifficultyProfile,
  BlueprintConfig,
  ReliabilityResult,
  TopicMastery,
  TopicMasteryLevel,
  PerformanceLevel,
  ReliabilityLevel,
  QuestionAnswerState,
} from '../interfaces/adaptive.interfaces';

/**
 * AdaptiveEngineService
 *
 * Pure computation — no DB access.
 * Contains all formulas from the Snapshot-Based Marks Blueprint model:
 *   - Difficulty profiles
 *   - Block metrics (marks score, adaptive accuracy, skip impact, etc.)
 *   - Block readiness score
 *   - Next block difficulty decision
 *   - Reliability score
 *   - Topic mastery
 *   - Final evaluation score
 *   - Expected time per question
 */
@Injectable()
export class AdaptiveEngineService {
  private readonly logger = new Logger(AdaptiveEngineService.name);

  // ── Difficulty weights for difficulty handling score ──────────────────────
  private readonly DIFFICULTY_WEIGHTS: Record<Difficulty, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
  };

  // ── Time multipliers per difficulty ───────────────────────────────────────
  private readonly TIME_MULTIPLIERS: Record<Difficulty, number> = {
    easy: 0.90,
    medium: 1.00,
    hard: 1.20,
  };

  // ── Reliability change penalties ──────────────────────────────────────────
  // Simplified 3-tier: skip→correct=3, wrong→correct=2, any other change=1
  private readonly CHANGE_PENALTIES: Record<string, number> = {
    'skipped_to_correct': 3,
    'wrong_to_correct': 2,
    'correct_to_wrong': 1,
    'skipped_to_wrong': 1,
    'correct_to_skipped': 1,
    'wrong_to_skipped': 1,
    'option_changed': 0.5,
  };

  // ── Default difficulty profiles ───────────────────────────────────────────
  readonly DEFAULT_DIFFICULTY_PROFILES: Record<Difficulty, DifficultyProfile> = {
    easy:   { easy: 70, medium: 30, hard: 0 },
    medium: { easy: 20, medium: 60, hard: 20 },
    hard:   { easy: 0,  medium: 30, hard: 70 },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Expected time per question
  // ─────────────────────────────────────────────────────────────────────────

  computeExpectedTime(marks: number, difficulty: Difficulty, secondsPerMark = 45): number {
    return Math.round(marks * secondsPerMark * this.TIME_MULTIPLIERS[difficulty]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Question speed score
  // ─────────────────────────────────────────────────────────────────────────

  computeQuestionSpeedScore(
    expectedSecs: number,
    actualSecs: number,
    status: AnswerStatus,
  ): number {
    if (status === 'skipped' || actualSecs <= 0) return 0;
    const base = Math.min(100, (expectedSecs / actualSecs) * 100);
    if (status === 'wrong') return parseFloat((base * 0.5).toFixed(2));
    return parseFloat(base.toFixed(2));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Block speed efficiency (average of all question speed scores)
  // ─────────────────────────────────────────────────────────────────────────

  computeBlockSpeedEfficiency(speedScores: number[]): number {
    if (!speedScores.length) return 0;
    const avg = speedScores.reduce((a, b) => a + b, 0) / speedScores.length;
    return parseFloat(avg.toFixed(2));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Difficulty handling score
  // ─────────────────────────────────────────────────────────────────────────

  computeDifficultyHandling(
    questions: Array<{ difficulty: Difficulty; status: AnswerStatus }>,
  ): number {
    const totalWeight = questions.reduce(
      (sum, q) => sum + this.DIFFICULTY_WEIGHTS[q.difficulty],
      0,
    );
    if (totalWeight === 0) return 0;
    const correctWeight = questions
      .filter(q => q.status === 'correct')
      .reduce((sum, q) => sum + this.DIFFICULTY_WEIGHTS[q.difficulty], 0);
    return parseFloat(((correctWeight / totalWeight) * 100).toFixed(2));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Full block metrics computation
  // ─────────────────────────────────────────────────────────────────────────

  computeBlockMetrics(
    questions: Array<{
      difficulty: Difficulty;
      marks: number;
      status: AnswerStatus;
      marksAwarded: number;
      timeTakenSeconds: number;
      expectedTimeSecs: number;
    }>,
    currentDifficulty: Difficulty,
    secondsPerMark = 45,
  ): Omit<BlockMetrics, 'nextBlockDifficulty' | 'timeTakenSeconds'> {
    const totalQuestions = questions.length;
    const correctCount   = questions.filter(q => q.status === 'correct').length;
    const wrongCount     = questions.filter(q => q.status === 'wrong').length;
    const skippedCount   = questions.filter(q => q.status === 'skipped').length;
    const attemptedCount = correctCount + wrongCount;

    const totalBlockMarks = questions.reduce((s, q) => s + q.marks, 0);
    const obtainedMarks   = questions.reduce((s, q) => s + q.marksAwarded, 0);
    const skippedMarks    = questions
      .filter(q => q.status === 'skipped')
      .reduce((s, q) => s + q.marks, 0);

    // Marks score
    const marksScore = totalBlockMarks > 0
      ? parseFloat(((obtainedMarks / totalBlockMarks) * 100).toFixed(2))
      : 0;

    // Adaptive accuracy (skipped stays in denominator)
    const adaptiveAccuracy = totalQuestions > 0
      ? parseFloat(((correctCount / totalQuestions) * 100).toFixed(2))
      : 0;

    // Attempt accuracy (only attempted)
    const attemptAccuracy = attemptedCount > 0
      ? parseFloat(((correctCount / attemptedCount) * 100).toFixed(2))
      : 0;

    // Skip rates
    const skipCountRate = totalQuestions > 0
      ? parseFloat(((skippedCount / totalQuestions) * 100).toFixed(2))
      : 0;
    const skippedMarksRate = totalBlockMarks > 0
      ? parseFloat(((skippedMarks / totalBlockMarks) * 100).toFixed(2))
      : 0;

    // Skip impact and confidence
    const skipImpact = parseFloat(
      ((skipCountRate * 0.5) + (skippedMarksRate * 0.5)).toFixed(2),
    );
    const skipConfidence = parseFloat((100 - skipImpact).toFixed(2));

    // Difficulty handling
    const difficultyHandling = this.computeDifficultyHandling(
      questions.map(q => ({ difficulty: q.difficulty, status: q.status })),
    );

    // Speed efficiency
    const speedScores = questions.map(q => {
      const expected = q.expectedTimeSecs > 0
        ? q.expectedTimeSecs
        : this.computeExpectedTime(q.marks, q.difficulty, secondsPerMark);
      return this.computeQuestionSpeedScore(expected, q.timeTakenSeconds, q.status);
    });
    const speedEfficiency = this.computeBlockSpeedEfficiency(speedScores);

    // Block readiness score
    const blockReadinessScore = parseFloat((
      marksScore        * 0.35 +
      adaptiveAccuracy  * 0.25 +
      difficultyHandling * 0.20 +
      skipConfidence    * 0.10 +
      speedEfficiency   * 0.10
    ).toFixed(2));

    return {
      totalQuestions,
      correctCount,
      wrongCount,
      skippedCount,
      attemptedCount,
      totalBlockMarks,
      obtainedMarks,
      skippedMarks,
      marksScore,
      adaptiveAccuracy,
      attemptAccuracy,
      skipCountRate,
      skippedMarksRate,
      skipImpact,
      skipConfidence,
      difficultyHandling,
      speedEfficiency,
      blockReadinessScore,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Next block difficulty decision
  // ─────────────────────────────────────────────────────────────────────────

  computeNextDifficulty(
    current: Difficulty,
    metrics: Pick<BlockMetrics, 'attemptedCount' | 'skipImpact' | 'adaptiveAccuracy' | 'blockReadinessScore' | 'speedEfficiency'>,
  ): Difficulty {
    const order: Difficulty[] = ['easy', 'medium', 'hard'];
    const idx = order.indexOf(current);

    let action: 'upgrade' | 'stay' | 'downgrade';

    if (metrics.attemptedCount === 0) {
      action = 'downgrade';
    } else if (metrics.skipImpact >= 60) {
      action = 'downgrade';
    } else if (metrics.adaptiveAccuracy < 40) {
      action = 'downgrade';
    } else if (
      metrics.blockReadinessScore >= 75 &&
      metrics.skipImpact <= 20 &&
      metrics.speedEfficiency >= 50
    ) {
      action = 'upgrade';
    } else if (metrics.blockReadinessScore >= 50) {
      action = 'stay';
    } else {
      action = 'downgrade';
    }

    if (action === 'upgrade') return order[Math.min(idx + 1, 2)];
    if (action === 'downgrade') return order[Math.max(idx - 1, 0)];
    return order[idx];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Reliability score
  // ─────────────────────────────────────────────────────────────────────────

  computeReliabilityScore(
    snapshotAnswers: Record<string, QuestionAnswerState>,
    latestAnswers: Record<string, QuestionAnswerState>,
  ): ReliabilityResult {
    const changeDetails: ReliabilityResult['changeDetails'] = [];
    let totalPenalty = 0;
    const questionIds = new Set([
      ...Object.keys(snapshotAnswers),
      ...Object.keys(latestAnswers),
    ]);
    const totalQuestions = questionIds.size;

    for (const qId of questionIds) {
      const snap = snapshotAnswers[qId];
      const latest = latestAnswers[qId];
      if (!snap || !latest) continue;

      const snapStatus = snap.status;
      const latestStatus = latest.status;

      let changeType: string | null = null;

      if (snapStatus !== latestStatus) {
        changeType = `${snapStatus}_to_${latestStatus}`;
      } else if (
        snapStatus === 'correct' &&
        latestStatus === 'correct' &&
        snap.selectedOptionId !== latest.selectedOptionId
      ) {
        changeType = 'option_changed';
      } else if (
        snapStatus === 'wrong' &&
        latestStatus === 'wrong' &&
        snap.selectedOptionId !== latest.selectedOptionId
      ) {
        changeType = 'option_changed';
      }

      if (changeType) {
        const penalty = this.CHANGE_PENALTIES[changeType] ?? 0.5;
        totalPenalty += penalty;
        changeDetails.push({ questionId: qId, changeType, penalty });
      }
    }

    const maxPossiblePenalty = totalQuestions * 3;
    const reliabilityScore = maxPossiblePenalty > 0
      ? parseFloat((100 - (totalPenalty / maxPossiblePenalty) * 100).toFixed(2))
      : 100;

    const reliabilityLevel: ReliabilityLevel =
      reliabilityScore >= 85 ? 'High' :
      reliabilityScore >= 65 ? 'Medium' : 'Low';

    return {
      reliabilityScore: Math.max(0, reliabilityScore),
      reliabilityLevel,
      totalPenaltyPoints: parseFloat(totalPenalty.toFixed(2)),
      maxPossiblePenalty,
      changeDetails,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Topic mastery
  // ─────────────────────────────────────────────────────────────────────────

  computeTopicMastery(
    questions: Array<{
      category: string;
      subcategory: string;
      difficulty: Difficulty;
      marks: number;
      status: AnswerStatus;
      marksAwarded: number;
      timeTakenSeconds: number;
      expectedTimeSecs: number;
    }>,
  ): TopicMastery[] {
    // Group by category + subcategory
    const groups = new Map<string, typeof questions>();
    for (const q of questions) {
      const key = `${q.category}|||${q.subcategory}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(q);
    }

    const result: TopicMastery[] = [];
    for (const [key, qs] of groups) {
      const [category, subcategory] = key.split('|||');
      const totalQuestions = qs.length;
      const correctCount   = qs.filter(q => q.status === 'correct').length;
      const wrongCount     = qs.filter(q => q.status === 'wrong').length;
      const skippedCount   = qs.filter(q => q.status === 'skipped').length;
      const totalMarks     = qs.reduce((s, q) => s + q.marks, 0);
      const obtainedMarks  = qs.reduce((s, q) => s + q.marksAwarded, 0);
      const skippedMarks   = qs.filter(q => q.status === 'skipped').reduce((s, q) => s + q.marks, 0);

      const topicMarksScore = totalMarks > 0
        ? parseFloat(((obtainedMarks / totalMarks) * 100).toFixed(2))
        : 0;
      const topicAccuracy = totalQuestions > 0
        ? parseFloat(((correctCount / totalQuestions) * 100).toFixed(2))
        : 0;
      const topicDifficultyHandling = this.computeDifficultyHandling(
        qs.map(q => ({ difficulty: q.difficulty, status: q.status })),
      );

      const speedScores = qs.map(q =>
        this.computeQuestionSpeedScore(q.expectedTimeSecs, q.timeTakenSeconds, q.status),
      );
      const topicSpeedEfficiency = this.computeBlockSpeedEfficiency(speedScores);

      const topicMasteryScore = parseFloat((
        topicMarksScore        * 0.50 +
        topicAccuracy          * 0.30 +
        topicDifficultyHandling * 0.20
      ).toFixed(2));

      const masteryLevel: TopicMasteryLevel =
        topicMasteryScore >= 75 ? 'Strong' :
        topicMasteryScore >= 50 ? 'Moderate' : 'Weak';

      result.push({
        category,
        subcategory,
        totalQuestions,
        correctCount,
        wrongCount,
        skippedCount,
        totalMarks,
        obtainedMarks,
        skippedMarks,
        topicMarksScore,
        topicAccuracy,
        topicDifficultyHandling,
        topicSpeedEfficiency,
        topicMasteryScore,
        masteryLevel,
      });
    }

    return result.sort((a, b) => b.topicMasteryScore - a.topicMasteryScore);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9. Final evaluation score
  // ─────────────────────────────────────────────────────────────────────────

  computeFinalEvaluationScore(params: {
    finalMarksScore: number;
    topicMasteryScore: number;
    difficultyHandling: number;
    skipConfidence: number;
    speedEfficiency: number;
    reliabilityScore: number;
  }): number {
    return parseFloat((
      params.finalMarksScore   * 0.40 +
      params.topicMasteryScore * 0.20 +
      params.difficultyHandling * 0.15 +
      params.skipConfidence    * 0.10 +
      params.speedEfficiency   * 0.10 +
      params.reliabilityScore  * 0.05
    ).toFixed(2));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 10. Performance level band
  // ─────────────────────────────────────────────────────────────────────────

  getPerformanceLevel(score: number): PerformanceLevel {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 55) return 'Average';
    if (score >= 40) return 'Basic';
    return 'Needs Foundation';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 11. Blueprint helpers
  // ─────────────────────────────────────────────────────────────────────────

  buildDefaultBlueprint(
    totalMarks: number,
    totalBlocks: number,
    categories: string[],
    subcategoriesByCategory: Record<string, string[]>,
    secondsPerMark = 45,
    categoryWeightage?: Record<string, number>,
    subcategoryWeightage?: Record<string, Record<string, number>>,
  ): BlueprintConfig {
    const marksPerBlock = parseFloat((totalMarks / totalBlocks).toFixed(2));

    // Category blueprint
    const categoryBlueprint: BlueprintConfig['categoryBlueprint'] = {};
    const totalWeight = categoryWeightage
      ? Object.values(categoryWeightage).reduce((a, b) => a + b, 0)
      : categories.length;

    for (const cat of categories) {
      const weight = categoryWeightage?.[cat] ?? 1;
      const pct = parseFloat(((weight / totalWeight) * 100).toFixed(2));
      const targetMarks = parseFloat(((pct / 100) * totalMarks).toFixed(2));
      categoryBlueprint[cat] = { weightPct: pct, targetMarks };
    }

    // Subcategory blueprint
    const subcategoryBlueprint: BlueprintConfig['subcategoryBlueprint'] = {};
    for (const cat of categories) {
      const subs = subcategoriesByCategory[cat] ?? [];
      if (!subs.length) continue;
      subcategoryBlueprint[cat] = {};
      const catMarks = categoryBlueprint[cat].targetMarks;
      const subWeights = subcategoryWeightage?.[cat];
      const subTotalWeight = subWeights
        ? Object.values(subWeights).reduce((a, b) => a + b, 0)
        : subs.length;

      for (const sub of subs) {
        const subWeight = subWeights?.[sub] ?? 1;
        const subMarks = parseFloat(((subWeight / subTotalWeight) * catMarks).toFixed(2));
        subcategoryBlueprint[cat][sub] = { targetMarks: subMarks };
      }
    }

    return {
      totalMarks,
      totalBlocks,
      marksPerBlock,
      secondsPerMark,
      categoryBlueprint,
      subcategoryBlueprint,
      difficultyProfiles: { ...this.DEFAULT_DIFFICULTY_PROFILES },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 12. Subcategory rotation — pick subcategories with most pending marks
  // ─────────────────────────────────────────────────────────────────────────

  pickSubcategoriesForBlock(
    category: string,
    subcategoryBlueprint: Record<string, { targetMarks: number }>,
    coverage: Record<string, { marksUsed: number }>,
    blockTargetMarks: number,
  ): Array<{ subcategory: string; targetMarks: number }> {
    const subs = Object.entries(subcategoryBlueprint).map(([sub, bp]) => {
      const used = coverage[sub]?.marksUsed ?? 0;
      const pending = Math.max(0, bp.targetMarks - used);
      return { subcategory: sub, targetMarks: bp.targetMarks, pending };
    });

    // Sort by most pending marks first
    subs.sort((a, b) => b.pending - a.pending);

    // Distribute block target marks proportionally among subcategories
    const totalPending = subs.reduce((s, x) => s + x.pending, 0);
    if (totalPending === 0) {
      // All covered — distribute equally
      const each = parseFloat((blockTargetMarks / subs.length).toFixed(2));
      return subs.map(s => ({ subcategory: s.subcategory, targetMarks: each }));
    }

    return subs.map(s => ({
      subcategory: s.subcategory,
      targetMarks: parseFloat(((s.pending / totalPending) * blockTargetMarks).toFixed(2)),
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 13. Normalize question kind
  // ─────────────────────────────────────────────────────────────────────────

  normalizeKind(raw: any): QuestionKind {
    const k = String(raw ?? 'mcq').toLowerCase();
    if (k === 'true_false' || k === 'tf') return 'tf';
    if (k === 'msq') return 'msq';
    if (k === 'numerical') return 'numerical';
    return 'mcq';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 14. Determine answer status
  // ─────────────────────────────────────────────────────────────────────────

  getAnswerStatus(
    selectedOptionId: string | string[] | null,
    submittedAnswer: string | null,
    isCorrect: boolean | null,
  ): AnswerStatus {
    const hasAnswer = Array.isArray(selectedOptionId)
      ? selectedOptionId.length > 0
      : selectedOptionId !== null && selectedOptionId !== undefined && selectedOptionId !== '';
    const hasSubmitted = submittedAnswer !== null && submittedAnswer !== undefined && submittedAnswer !== '';

    if (!hasAnswer && !hasSubmitted) return 'skipped';
    if (isCorrect === true) return 'correct';
    return 'wrong';
  }
}
