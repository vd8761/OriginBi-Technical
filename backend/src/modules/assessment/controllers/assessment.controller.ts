import { Controller, Post, Get, Body, Query, Param, NotFoundException } from '@nestjs/common';
import { AssessmentService } from '../services/assessment.service';

@Controller('assessment')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post('aptitude/attempts')
  async startAptitudeAttempt(@Body() body: any) {
    const data = await this.assessmentService.startAptitudeAttempt(body);
    return data;
  }

  @Get('aptitude/attempts/:token/questions')
  async getAttemptQuestions(@Param('token') token: string) {
    const data = await this.assessmentService.getAttemptQuestions(token);
    return data;
  }
}
