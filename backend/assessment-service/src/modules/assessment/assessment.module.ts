import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminQuestionController } from './controllers/admin-question.controller';
import { AssessmentController } from './controllers/assessment.controller';
import { AdminQuestionService } from './services/admin-question.service';
import { AssessmentService } from './services/assessment.service';
import { CodeExecutionService } from './services/code-execution.service';
import { EvaluationService } from './services/evaluation.service';
import * as Entities from '../../entities';

const entities = Object.values(Entities).filter(e => typeof e === 'function');

@Module({
  imports: [
    TypeOrmModule.forFeature(entities),
  ],
  controllers: [
    AdminQuestionController,
    AssessmentController,
  ],
  providers: [
    AdminQuestionService,
    AssessmentService,
    CodeExecutionService,
    EvaluationService,
  ],
  exports: [
    AdminQuestionService,
    AssessmentService,
    CodeExecutionService,
    EvaluationService,
  ],
})
export class AssessmentModule {}
