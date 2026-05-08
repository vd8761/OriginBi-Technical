import { Controller, Post, Get, Body, Param } from '@nestjs/common';
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

}
