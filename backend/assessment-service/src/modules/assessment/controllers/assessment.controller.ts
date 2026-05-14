import { Controller, Post, Get, Patch, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { AssessmentService } from '../services/assessment.service';
import { AdaptiveBlockService } from '../services/adaptive-block.service';

@Controller('assessment')
export class AssessmentController {
  constructor(
    private readonly assessmentService: AssessmentService,
    private readonly adaptiveBlockService: AdaptiveBlockService,
  ) {}

  @Get('attempts-stats')
  async getAttemptsStats(@Query('userId') userId?: string) {
    const data = await this.assessmentService.getAttemptsStats(userId);
    return { data };
  }

  @Post(':module/attempts')
  async startAttempt(@Param('module') module: string, @Body() body: any) {
    return this.assessmentService.startAttempt(module, body);
  }

  @Get(':module/attempts/:token/questions')
  async getAttemptQuestions(@Param('token') token: string) {
    return this.assessmentService.getAttemptQuestions(token);
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
  async startBlockBasedAttempt(@Param('module') module: string, @Body() body: any) {
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
