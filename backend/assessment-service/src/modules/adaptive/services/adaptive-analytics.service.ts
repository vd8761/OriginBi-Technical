import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdaptiveEngineService } from './adaptive-engine.service';
import { AdaptiveSnapshotService } from './adaptive-snapshot.service';
import {
  Difficulty,
  AnswerStatus,
  AdaptiveFinalReport,
  TopicMastery,
  ReliabilityResult,
  QuestionAnswerState,
} from '../interfaces/adaptive.interfaces';

/**
 * AdaptiveAnalyticsService
 *
 * Computes and persists the final adaptive report on assessment submission.
 * Uses:
 *  - Latest answers (from junction table) for final marks
 *  - Block snapshots for adaptive path and reliability comparison
 */
@Injectable()
export class AdaptiveAnalyticsService {
  private readonly logger = new Logger(AdaptiveAnalyticsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly engine: AdaptiveEngineService,
    private readonly snapshotService: AdaptiveSnapshotService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Compute and persist final report
  // ─────────────────────────────────────────────────────────────────────────

  async computeAndPersistFinalReport(
    attemptToken: string,
    assessmentId: number,
    userId: number,
  ): Promise<AdaptiveFinalReport> {
    try {
      // 1. Load blueprint for secondsPerMark
      const bpRows = await this.dataSource.query(
        `SELECT total_marks, seconds_per_mark FROM adaptive_blueprint WHERE assessment_id=$1`,
        [assessmentId],
      );
      const totalBlueprintMarks = Number(bpRows[0]?.total_marks ?? 100);
      const secondsPerMark = Number(bpRows[0]?.seconds_per_mark ?? 45);

      // 2. Load all block attempts (for adaptive path)
      const blockAttempts = await this.dataSource.query(
        `SELECT block_number, difficulty_achieved, marks_score, adaptive_accuracy,
                skip_impact, skip_confidence, difficulty_handling, speed_efficiency,
                block_readiness_score, next_block_difficulty, time_taken_seconds,
                correct_count, total_count, obtained_marks, total_block_marks,
                skipped_count, skipped_marks, wrong_count, attempt_accuracy
         FROM block_attempts WHERE attempt_token=$1 ORDER BY block_number`,
        [attemptToken],
      );

      // 3. Load all latest answers across all blocks
      const allQuestions = await this.loadAllLatestAnswers(attemptToken, assessmentId);

      // 4. Load all snapshots for reliability comparison
      const allSnapshots = await this.snapshotService.readAllSnapshots(attemptToken);
      const snapshotAnswerMap: Record<string, QuestionAnswerState> = {};
      for (const snap of allSnapshots) {
        Object.assign(snapshotAnswerMap, snap.questionAnswers);
      }

      // 5. Build latest answer map
      const latestAnswerMap: Record<string, QuestionAnswerState> = {};
      for (const q of allQuestions) {
        latestAnswerMap[q.questionId] = {
          selectedOptionId: q.selectedOptionId,
          submittedAnswer: q.submittedAnswer,
          isCorrect: q.isCorrect,
          marksAwarded: q.marksAwarded,
          timeTakenSeconds: q.timeTakenSeconds,
          status: q.status,
        };
      }

      // 6. Compute final marks from latest answers
      const totalQuestions = allQuestions.length;
      const correctCount   = allQuestions.filter(q => q.status === 'correct').length;
      const wrongCount     = allQuestions.filter(q => q.status === 'wrong').length;
      const skippedCount   = allQuestions.filter(q => q.status === 'skipped').length;
      const attemptedCount = correctCount + wrongCount;
      const obtainedMarks  = allQuestions.reduce((s, q) => s + q.marksAwarded, 0);
      const totalMarks     = allQuestions.reduce((s, q) => s + q.marks, 0) || totalBlueprintMarks;
      const skippedMarks   = allQuestions.filter(q => q.status === 'skipped').reduce((s, q) => s + q.marks, 0);
      const timeTakenSeconds = allQuestions.reduce((s, q) => s + q.timeTakenSeconds, 0);

      const marksPercentage = totalMarks > 0
        ? parseFloat(((obtainedMarks / totalMarks) * 100).toFixed(2))
        : 0;

      // 7. Compute overall metrics from latest answers
      const overallMetrics = this.engine.computeBlockMetrics(
        allQuestions.map(q => ({
          difficulty: q.difficulty,
          marks: q.marks,
          status: q.status,
          marksAwarded: q.marksAwarded,
          timeTakenSeconds: q.timeTakenSeconds,
          expectedTimeSecs: q.expectedTimeSecs,
        })),
        'easy', // overall difficulty doesn't matter for final metrics
        secondsPerMark,
      );

      // 8. Topic mastery
      const topicMastery: TopicMastery[] = this.engine.computeTopicMastery(
        allQuestions.map(q => ({
          category: q.category,
          subcategory: q.subcategory,
          difficulty: q.difficulty,
          marks: q.marks,
          status: q.status,
          marksAwarded: q.marksAwarded,
          timeTakenSeconds: q.timeTakenSeconds,
          expectedTimeSecs: q.expectedTimeSecs,
        })),
      );

      const avgTopicMastery = topicMastery.length > 0
        ? parseFloat((topicMastery.reduce((s, t) => s + t.topicMasteryScore, 0) / topicMastery.length).toFixed(2))
        : 0;

      // 9. Reliability score
      const reliabilityResult: ReliabilityResult = this.engine.computeReliabilityScore(
        snapshotAnswerMap,
        latestAnswerMap,
      );

      // 10. Final evaluation score
      const finalEvaluationScore = this.engine.computeFinalEvaluationScore({
        finalMarksScore:   marksPercentage,
        topicMasteryScore: avgTopicMastery,
        difficultyHandling: overallMetrics.difficultyHandling,
        skipConfidence:    overallMetrics.skipConfidence,
        speedEfficiency:   overallMetrics.speedEfficiency,
        reliabilityScore:  reliabilityResult.reliabilityScore,
      });

      const performanceLevel = this.engine.getPerformanceLevel(finalEvaluationScore);

      // 11. Adaptive path from block attempts
      const adaptivePath: Difficulty[] = blockAttempts.map((b: any) => b.difficulty_achieved as Difficulty);

      // 12. Category performance
      const categoryPerformance: Record<string, any> = {};
      for (const q of allQuestions) {
        if (!categoryPerformance[q.category]) {
          categoryPerformance[q.category] = {
            totalQuestions: 0, correctCount: 0, wrongCount: 0, skippedCount: 0,
            totalMarks: 0, obtainedMarks: 0,
          };
        }
        const cp = categoryPerformance[q.category];
        cp.totalQuestions++;
        cp.totalMarks += q.marks;
        cp.obtainedMarks += q.marksAwarded;
        if (q.status === 'correct') cp.correctCount++;
        else if (q.status === 'wrong') cp.wrongCount++;
        else cp.skippedCount++;
      }
      for (const cat of Object.keys(categoryPerformance)) {
        const cp = categoryPerformance[cat];
        cp.accuracy = cp.totalQuestions > 0
          ? parseFloat(((cp.correctCount / cp.totalQuestions) * 100).toFixed(2))
          : 0;
        cp.marksScore = cp.totalMarks > 0
          ? parseFloat(((cp.obtainedMarks / cp.totalMarks) * 100).toFixed(2))
          : 0;
      }

      // 13. Topic classification
      const strongTopics  = topicMastery.filter(t => t.masteryLevel === 'Strong').map(t => t.subcategory);
      const weakTopics    = topicMastery.filter(t => t.masteryLevel === 'Weak').map(t => t.subcategory);
      const skippedTopics = topicMastery.filter(t => t.skippedCount === t.totalQuestions).map(t => t.subcategory);
      const slowTopics    = topicMastery
        .filter(t => t.topicSpeedEfficiency < 40 && t.totalQuestions > 0)
        .map(t => t.subcategory);
      const recommendedTopics = [...new Set([...weakTopics, ...slowTopics, ...skippedTopics])];

      // 14. Block performance array
      const blockPerformance = blockAttempts.map((b: any) => ({
        blockNumber:        b.block_number,
        difficulty:         b.difficulty_achieved,
        marksScore:         Number(b.marks_score),
        adaptiveAccuracy:   Number(b.adaptive_accuracy),
        skipImpact:         Number(b.skip_impact),
        skipConfidence:     Number(b.skip_confidence),
        difficultyHandling: Number(b.difficulty_handling),
        speedEfficiency:    Number(b.speed_efficiency),
        blockReadinessScore: Number(b.block_readiness_score),
        nextBlockDifficulty: b.next_block_difficulty,
        timeTakenSeconds:   Number(b.time_taken_seconds),
        correctCount:       Number(b.correct_count),
        totalCount:         Number(b.total_count),
        obtainedMarks:      Number(b.obtained_marks),
        totalBlockMarks:    Number(b.total_block_marks),
        skippedCount:       Number(b.skipped_count),
        wrongCount:         Number(b.wrong_count),
      }));

      const avgTimePerQuestion = totalQuestions > 0
        ? parseFloat((timeTakenSeconds / totalQuestions).toFixed(2))
        : 0;
      const avgTimePerMark = totalMarks > 0
        ? parseFloat((timeTakenSeconds / totalMarks).toFixed(2))
        : 0;

      const report: AdaptiveFinalReport = {
        attemptToken,
        assessmentId,
        userId,
        totalMarks,
        obtainedMarks,
        marksPercentage,
        finalEvaluationScore,
        performanceLevel,
        totalQuestions,
        attemptedQuestions: attemptedCount,
        skippedQuestions: skippedCount,
        correctAnswers: correctCount,
        wrongAnswers: wrongCount,
        skipImpact: overallMetrics.skipImpact,
        skipConfidence: overallMetrics.skipConfidence,
        difficultyHandling: overallMetrics.difficultyHandling,
        topicMasteryScore: avgTopicMastery,
        speedEfficiency: overallMetrics.speedEfficiency,
        reliabilityScore: reliabilityResult.reliabilityScore,
        reliabilityLevel: reliabilityResult.reliabilityLevel,
        timeTakenSeconds,
        avgTimePerQuestion,
        avgTimePerMark,
        adaptivePath,
        blockPerformance,
        categoryPerformance,
        topicMastery,
        strongTopics,
        weakTopics,
        slowTopics,
        skippedTopics,
        recommendedTopics,
        reliabilityDetail: reliabilityResult,
      };

      // 15. Persist to adaptive_performance_analytics
      await this.persistReport(report);

      return report;
    } catch (e) {
      this.logger.error('computeAndPersistFinalReport error:', e);
      throw e;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Load all latest answers across all blocks
  // ─────────────────────────────────────────────────────────────────────────

  private async loadAllLatestAnswers(
    attemptToken: string,
    assessmentId: number,
  ): Promise<Array<{
    questionId: string;
    difficulty: Difficulty;
    category: string;
    subcategory: string;
    marks: number;
    marksAwarded: number;
    timeTakenSeconds: number;
    expectedTimeSecs: number;
    status: AnswerStatus;
    selectedOptionId: string | string[] | null;
    submittedAnswer: string | null;
    isCorrect: boolean | null;
  }>> {
    // Determine module type from assessment
    const asmRows = await this.dataSource.query(
      `SELECT module_type FROM tech_assessments WHERE assessment_id=$1`,
      [assessmentId],
    );
    const moduleType = asmRows[0]?.module_type ?? 'aptitude';

    const tableMap: Record<string, {
      attempts: string; junction: string; questions: string;
      idCol: string; attemptIdCol: string;
      categoryCol: string; subcategoryCol: string;
    }> = {
      aptitude: {
        attempts: 'tech_aptitude_attempts',
        junction: 'tech_aptitude_attempt_questions',
        questions: 'tech_aptitude_questions',
        idCol: 'aptitude_question_id',
        attemptIdCol: 'aptitude_attempt_id',
        categoryCol: 'category',
        subcategoryCol: 'subcategory',
      },
      grammar: {
        attempts: 'tech_grammar_attempts',
        junction: 'tech_grammar_attempt_questions',
        questions: 'tech_grammar_questions',
        idCol: 'grammar_question_id',
        attemptIdCol: 'grammar_attempt_id',
        categoryCol: 'task_type',
        subcategoryCol: 'task_type',
      },
      mnc: {
        attempts: 'tech_mnc_attempts',
        junction: 'tech_mnc_attempt_questions',
        questions: 'tech_mnc_questions',
        idCol: 'mnc_question_id',
        attemptIdCol: 'mnc_attempt_id',
        categoryCol: 'category',
        subcategoryCol: 'subcategory',
      },
      role: {
        attempts: 'tech_role_attempts',
        junction: 'tech_role_attempt_questions',
        questions: 'tech_role_questions',
        idCol: 'role_question_id',
        attemptIdCol: 'role_attempt_id',
        categoryCol: 'domain',
        subcategoryCol: 'domain',
      },
      // 'communication' assessments are stored as module_type='grammar' in the DB enum.
      communication: {
        attempts: 'tech_grammar_attempts',
        junction: 'tech_grammar_attempt_questions',
        questions: 'tech_grammar_questions',
        idCol: 'grammar_question_id',
        attemptIdCol: 'grammar_attempt_id',
        categoryCol: 'task_type',
        subcategoryCol: 'task_type',
      },
    };

    const t = tableMap[moduleType];
    if (!t) return [];

    const ar = await this.dataSource.query(
      `SELECT ${t.attemptIdCol} AS aid FROM ${t.attempts} WHERE attempt_token=$1`,
      [attemptToken],
    );
    if (!ar.length) return [];
    const attemptId = Number(ar[0].aid);

    const rows = await this.dataSource.query(
      `SELECT aq.${t.idCol} AS question_id,
              aq.selected_option_id, aq.metadata AS attempt_meta,
              aq.is_correct, aq.score_awarded, aq.time_taken_seconds,
              aq.expected_time_seconds,
              q.difficulty, q.marks, q.negative_marks,
              q.metadata AS question_meta, q.correct_option_id,
              COALESCE(q.${t.categoryCol}::text, 'General') AS category,
              COALESCE(q.${t.subcategoryCol}::text, 'General') AS subcategory
       FROM ${t.junction} aq
       JOIN ${t.questions} q ON q.${t.idCol}=aq.${t.idCol}
       WHERE aq.${t.attemptIdCol}=$1 AND aq.block_number IS NOT NULL
       ORDER BY aq.block_number, aq.block_sequence_order`,
      [attemptId],
    );

    return rows.map((r: any) => {
      const qMeta = typeof r.question_meta === 'object' ? r.question_meta : {};
      const aMeta = typeof r.attempt_meta === 'object' ? r.attempt_meta : {};
      const kind = this.engine.normalizeKind(qMeta?.kind);

      const selectedOptionId =
        (kind === 'msq' || kind === 'numerical')
          ? (aMeta?.submittedAnswer ?? null)
          : (r.selected_option_id ? String(r.selected_option_id) : null);

      const status = this.engine.getAnswerStatus(
        selectedOptionId,
        kind === 'numerical' ? (aMeta?.submittedAnswer ?? null) : null,
        r.is_correct,
      );

      return {
        questionId: String(r.question_id),
        difficulty: (r.difficulty as Difficulty) ?? 'easy',
        category: r.category ?? 'General',
        subcategory: r.subcategory ?? 'General',
        marks: Number(r.marks ?? 1),
        marksAwarded: Number(r.score_awarded ?? 0),
        timeTakenSeconds: Number(r.time_taken_seconds ?? 0),
        expectedTimeSecs: Number(r.expected_time_seconds ?? 0),
        status,
        selectedOptionId,
        submittedAnswer: kind === 'numerical' ? (aMeta?.submittedAnswer ?? null) : null,
        isCorrect: r.is_correct,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Persist report to adaptive_performance_analytics
  // ─────────────────────────────────────────────────────────────────────────

  private async persistReport(report: AdaptiveFinalReport): Promise<void> {
    // Compute skipped_marks from the report's topic mastery data (sum of marks for skipped questions)
    const skippedMarks = report.topicMastery.reduce((s, t) => s + t.skippedMarks, 0);

    await this.dataSource.query(
      `DELETE FROM adaptive_performance_analytics WHERE attempt_token=$1`,
      [report.attemptToken]
    );

    await this.dataSource.query(
      `INSERT INTO adaptive_performance_analytics (
         attempt_token, assessment_id, user_id,
         obtained_marks, total_marks, marks_percentage, final_evaluation_score,
         performance_level, skipped_count, skipped_marks, wrong_count,
         skip_impact, skip_confidence, difficulty_handling, speed_efficiency,
         topic_mastery_score, reliability_score, reliability_level,
         topic_mastery, block_performance, category_performance,
         strong_topics, weak_topics, slow_topics, skipped_topics, recommended_topics,
         metadata
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
         $19,$20,$21,$22,$23,$24,$25,$26,$27
       )`,
      [
        report.attemptToken, report.assessmentId, report.userId,
        report.obtainedMarks, report.totalMarks, report.marksPercentage, report.finalEvaluationScore,
        report.performanceLevel, report.skippedQuestions, skippedMarks,
        report.wrongAnswers, report.skipImpact, report.skipConfidence, report.difficultyHandling,
        report.speedEfficiency, report.topicMasteryScore, report.reliabilityScore, report.reliabilityLevel,
        JSON.stringify(report.topicMastery), JSON.stringify(report.blockPerformance), JSON.stringify(report.categoryPerformance),
        JSON.stringify(report.strongTopics), JSON.stringify(report.weakTopics), JSON.stringify(report.slowTopics),
        JSON.stringify(report.skippedTopics), JSON.stringify(report.recommendedTopics), JSON.stringify(report.reliabilityDetail)
      ],
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Get existing report
  // ─────────────────────────────────────────────────────────────────────────

  async getReport(attemptToken: string): Promise<any | null> {
    const rows = await this.dataSource.query(
      `SELECT * FROM adaptive_performance_analytics WHERE attempt_token=$1`,
      [attemptToken],
    );
    return rows[0] ?? null;
  }
}
