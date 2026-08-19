import { Controller, Post, Get, Patch, Body, Param, Query, Req, BadRequestException } from '@nestjs/common';
import { AssessmentService } from '../services/assessment.service';
import { AdaptiveBlockService } from '../services/adaptive-block.service';
import { AdminResultsService } from '../services/admin-results.service';
import type { AuthedRequest } from '../../../auth/roles.guard';

@Controller('assessment')
export class AssessmentController {
  constructor(
    private readonly assessmentService: AssessmentService,
    private readonly adaptiveBlockService: AdaptiveBlockService,
    private readonly adminResultsService: AdminResultsService,
  ) {}

  /**
   * The user whose data this request may touch.
   *
   * Identity comes from the verified token (`req.dbUser`), not from the
   * request — a `userId` parameter is something the caller asserted. Admins
   * keep the ability to pass one explicitly so the admin results views can
   * read another candidate's attempts.
   *
   * Returns `undefined` only under `ASSESSMENT_AUTH=off`, where no identity can
   * be resolved; the requested value is then used so local development works.
   */
  private effectiveUserId(req: AuthedRequest, requested?: string): string | undefined {
    if (req.dbUser) {
      if (req.dbUser.isAdmin && requested) return requested;
      return String(req.dbUser.id);
    }
    return requested;
  }

  /**
   * The id an attempt must belong to for this caller to read it, or null when
   * the caller may read anyone's (admins, and local dev with auth disabled).
   */
  private ownerScope(req: AuthedRequest): number | null {
    if (!req.dbUser || req.dbUser.isAdmin) return null;
    return req.dbUser.id;
  }

  @Get('attempts-stats')
  async getAttemptsStats(@Req() req: AuthedRequest, @Query('userId') userId?: string) {
    const data = await this.assessmentService.getAttemptsStats(
      this.effectiveUserId(req, userId),
    );
    return { data };
  }

  @Post('validate-certificate')
  async validateCertificate(
    @Req() req: AuthedRequest,
    @Body() body: { userId: number; examId: string; mode: 'trial' | 'main' },
  ) {
    // Both trial and main assessments can generate certificates

    const module = body.examId === 'communication' ? 'grammar' : body.examId;
    const result = await this.assessmentService.getLatestSubmittedResult(
      module,
      this.effectiveUserId(req, body.userId?.toString()),
      undefined,
      this.ownerScope(req),
    );

    if (!result || result.status !== 'completed') {
      throw new BadRequestException('Assessment not completed or no valid result found');
    }

    return { valid: true, result: result };
  }

  @Post('validate-eligibility')
  async validateEligibility(
    @Req() req: AuthedRequest,
    @Body() body: { userId: number; assessmentCode: string; mode: 'trial' | 'main' },
  ) {
    const userId = this.effectiveUserId(req, body.userId?.toString());
    if (!userId) {
      throw new BadRequestException('Unable to determine the candidate for this request');
    }

    const validation = await this.assessmentService.validateAttemptEligibility(
      userId,
      body.assessmentCode,
      body.mode
    );
    
    if (!validation.canStart) {
      throw new BadRequestException(validation.reason);
    }
    
    return { canStart: true, currentCount: validation.currentCount, limit: validation.limit };
  }

  @Get('in-progress')
  async getInProgressAttempts(@Req() req: AuthedRequest, @Query('userId') userId?: string) {
    const data = await this.assessmentService.getInProgressAttempts(
      this.effectiveUserId(req, userId),
    );
    return { data };
  }

  /**
   * GET /api/assessment/me/results
   *
   * The caller's own submitted attempts across the MCQ modules, shaped like the
   * exam-engine `/v1/me/results` payload so the frontend can concatenate the
   * two.
   *
   * This exists because "My Performance" reads exam-engine's `attempts` table,
   * which only ever holds coding attempts — MCQ results live in the tech_*
   * tables, so the page was empty for every candidate who had only taken MCQ
   * assessments. Declared above `:module/latest-result` to keep the literal
   * path ahead of the parameterised one.
   */
  @Get('me/results')
  async getMyResults(@Req() req: AuthedRequest) {
    const userId = req.dbUser?.id;
    if (!userId) return { passPercent: 90, results: [] };

    const roster = await this.adminResultsService.listResults({ userId, limit: 200 });
    return {
      passPercent: roster.passPercent,
      results: roster.results.map((r) => ({
        attemptId: r.attemptToken,
        assignmentRef: `${r.module}:${r.assessmentCode}`,
        module: r.module,
        title: r.assessmentName || r.moduleLabel,
        language: r.moduleLabel,
        status: r.status,
        score: r.totalScore,
        maxScore: r.maxScore,
        percentage: r.percentage,
        passed: r.passed,
        submittedAt: r.submittedAt ?? undefined,
        // Per-question review is served by `:module/latest-result`; the roster
        // deliberately stays a summary so this page loads in one query.
        questions: [],
      })),
    };
  }

  @Get(':module/latest-result')
  async getLatestSubmittedResult(
    @Req() req: AuthedRequest,
    @Param('module') module: string,
    @Query('userId') userId?: string,
    @Query('attemptToken') attemptToken?: string,
  ) {
    return this.assessmentService.getLatestSubmittedResult(
      module,
      this.effectiveUserId(req, userId),
      attemptToken,
      this.ownerScope(req),
    );
  }

  @Post(':module/attempts')
  async startAttempt(@Req() req: AuthedRequest, @Param('module') module: string, @Body() body: any) {
    // The attempt is always started for the authenticated caller. Taking the
    // id from the body let anyone sit an exam as, or burn the attempt quota of,
    // another candidate.
    body = { ...body, userId: this.effectiveUserId(req, body?.userId) };

    // SECURITY: Validate attempt eligibility before starting
    if (body.assessmentCode && body.userId && body.mode) {
      const validation = await this.assessmentService.validateAttemptEligibility(
        body.userId,
        body.assessmentCode,
        body.mode
      );

      if (!validation.canStart) {
        throw new BadRequestException(validation.reason);
      }
    }

    return this.assessmentService.startAttempt(module, body);
  }

  @Get(':module/attempts/:token/questions')
  async getAttemptQuestions(@Param('token') token: string) {
    return this.assessmentService.getAttemptQuestions(token);
  }

  @Patch(':module/attempts/:token/answers')
  async saveAttemptAnswers(
    @Param('module') module: string,
    @Param('token') token: string,
    @Body() body: { answers?: Record<string, any> },
  ) {
    const answers = body?.answers ?? body ?? {};
    if (!answers || typeof answers !== 'object') {
      throw new BadRequestException('answers is required');
    }
    return this.assessmentService.saveAttemptAnswers(module, token, answers as Record<string, any>);
  }

  @Post(':module/attempts/:token/submit')
  async submitAttempt(
    @Param('module') module: string,
    @Param('token') token: string,
    @Body() body: { answers: Record<string, string> },
  ) {
    return this.assessmentService.submitAttempt(module, token, body.answers);
  }

  // ── Block-based routes ────────────────────────────────────────────────────

  /**
   * Start a block-based attempt. Returns block 1 questions.
   * POST /api/assessment/aptitude/attempts/block-based
   */
  @Post(':module/attempts/block-based')
  async startBlockBasedAttempt(
    @Req() req: AuthedRequest,
    @Param('module') module: string,
    @Body() body: any,
  ) {
    // Same rule as the non-block path: the attempt belongs to the caller.
    body = { ...body, userId: this.effectiveUserId(req, body?.userId) };

    // SECURITY: Validate attempt eligibility before starting
    if (body.assessmentCode && body.userId && body.mode) {
      const validation = await this.assessmentService.validateAttemptEligibility(
        body.userId, 
        body.assessmentCode, 
        body.mode
      );
      
      if (!validation.canStart) {
        throw new BadRequestException(validation.reason);
      }
    }
    
    return this.assessmentService.startBlockBasedAttempt(module, body);
  }

  /**
   * Get the current active (highest unlocked) block's questions.
   * GET /api/assessment/aptitude/attempts/:token/current-block
   */
  @Get(':module/attempts/:token/current-block')
  async getCurrentBlock(@Param('token') token: string) {
    return this.assessmentService.getCurrentBlock(token);
  }

  /**
   * Get questions + saved answers for ANY unlocked block.
   * Used when user navigates back to a previous block.
   * GET /api/assessment/aptitude/attempts/:token/blocks/:blockNumber/questions
   *
   * Returns questions with selectedOptionId so the UI can restore the user's answers.
   * Only works for blocks that have been generated (unlocked). Future blocks return 400.
   */
  @Get(':module/attempts/:token/blocks/:blockNumber/questions')
  async getBlockQuestions(
    @Param('token') token: string,
    @Param('blockNumber') blockNumber: string,
  ) {
    const blockNum = parseInt(blockNumber);
    if (isNaN(blockNum)) throw new BadRequestException('Invalid block number');
    return this.adaptiveBlockService.getBlockQuestions(token, blockNum);
  }

  /**
   * Save answers for any unlocked block without advancing.
   * Used when user navigates back to block 1 from block 3 and changes an answer.
   * PATCH /api/assessment/aptitude/attempts/:token/blocks/:blockNumber/answers
   * Body: { answers: { [questionId]: optionId } }
   *
   * Does NOT affect adaptive difficulty — that was already decided when the block was completed.
   * The new answers will be used in the final evaluation at submit-block-based.
   */
  @Patch(':module/attempts/:token/blocks/:blockNumber/answers')
  async saveBlockAnswers(
    @Param('token') token: string,
    @Param('blockNumber') blockNumber: string,
    @Body() body: { answers: Record<string, string> },
  ) {
    const blockNum = parseInt(blockNumber);
    if (isNaN(blockNum)) throw new BadRequestException('Invalid block number');
    if (!body?.answers) throw new BadRequestException('answers is required');
    return this.adaptiveBlockService.saveBlockAnswers(token, blockNum, body.answers);
  }

  /**
   * Submit current block answers and unlock the next block.
   * POST /api/assessment/aptitude/attempts/:token/blocks/:blockNumber/next
   * Body: { timeTaken: number, answers: { [questionId]: optionId } }
   *
   * - Saves draft answers for this block
   * - Computes accuracy to decide next block difficulty
   * - Generates and returns the next block's questions
   * - Returns canProceed=false when all blocks are done
   */
  @Post(':module/attempts/:token/blocks/:blockNumber/next')
  async getNextBlock(
    @Param('token') token: string,
    @Param('blockNumber') blockNumber: string,
    @Body() performance: { timeTaken: number; answers: Record<string, string> },
  ) {
    const blockNum = parseInt(blockNumber);
    if (isNaN(blockNum)) throw new BadRequestException('Invalid block number');
    return this.assessmentService.getNextBlock(token, blockNum, performance);
  }

  /**
   * Get progress across all unlocked blocks.
   * GET /api/assessment/aptitude/attempts/:token/blocks/status
   */
  @Get(':module/attempts/:token/blocks/status')
  async getBlockStatus(@Param('token') token: string) {
    const blocks = await this.adaptiveBlockService.getBlockStatus(token);
    return { success: true, attemptToken: token, blocks };
  }

  /**
   * Final submit — re-evaluates ALL questions from scratch using latest answers.
   * POST /api/assessment/aptitude/attempts/:token/submit-block-based
   *
   * This is the ONLY place where final scores are computed.
   * Any answer changes made by navigating back are reflected here.
   */
  @Post(':module/attempts/:token/submit-block-based')
  async submitBlockBasedAttempt(
    @Param('module') module: string,
    @Param('token') token: string,
    @Body() body: any,
  ) {
    return this.assessmentService.submitBlockBasedAttempt(module, token, body);
  }
}
