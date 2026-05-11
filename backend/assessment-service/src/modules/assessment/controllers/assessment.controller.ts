import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { AssessmentService } from '../services/assessment.service';

@Controller('assessment')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post(':module/attempts')
  async startAttempt(@Param('module') module: string, @Body() body: any) {
    // Note: module might be 'aptitude', 'mnc', 'grammar', or 'role'
    const data = await this.assessmentService.startAttempt(module, body);
    return data;
  }

  @Get(':module/attempts/:token/questions')
  async getAttemptQuestions(@Param('token') token: string) {
    // Currently getAttemptQuestions is still a bit aptitude-specific, 
    // but startAttempt already returns questions which is what the frontend needs.
    const data = await this.assessmentService.getAttemptQuestions(token);
    return data;
  }

  @Post(':module/attempts/:token/submit')
  async submitAttempt(
    @Param('module') module: string,
    @Param('token') token: string,
    @Body() body: { answers: Record<string, string> }
  ) {
    const data = await this.assessmentService.submitAttempt(module, token, body.answers);
    return data;
  }

  @Post(':module/attempts/block-based')
  async startBlockBasedAttempt(@Param('module') module: string, @Body() body: any) {
    const data = await this.assessmentService.startBlockBasedAttempt(module, body);
    return data;
  }

  @Post(':module/attempts/:token/blocks/:blockNumber/next')
  async getNextBlock(
    @Param('token') token: string,
    @Param('blockNumber') blockNumber: string,
    @Body() performance: { accuracy: number; timeTaken: number; answers: Record<string, string> }
  ) {
    const blockNumberNum = parseInt(blockNumber);
    const data = await this.assessmentService.getNextBlock(token, blockNumberNum, performance);
    return data;
  }

  @Post(':module/attempts/:token/submit-block-based')
  async submitBlockBasedAttempt(
    @Param('module') module: string,
    @Param('token') token: string,
    @Body() body: { answers: Record<string, string> }
  ) {
    const data = await this.assessmentService.submitBlockBasedAttempt(module, token, body);
    return data;
  }

}
