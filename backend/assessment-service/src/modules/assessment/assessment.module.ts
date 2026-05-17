import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminQuestionController } from './controllers/admin-question.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AssessmentController } from './controllers/assessment.controller';
import { AdaptiveBlockController } from './controllers/adaptive-block.controller';
import { PurchaseController } from './controllers/purchase.controller';
import { AdminQuestionService } from './services/admin-question.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminUsersService } from './services/admin-users.service';
import { AssessmentService } from './services/assessment.service';
import { AdaptiveBlockService } from './services/adaptive-block.service';
import { AdaptiveFallbackService } from './services/adaptive-fallback.service';
import { CodeExecutionService } from './services/code-execution.service';
import { EvaluationService } from './services/evaluation.service';
import { PurchaseService } from './services/purchase.service';
import { BulkAdminUsersService } from './services/bulk-admin-users.service';
import * as Entities from '../../entities';

import { R2Module } from '../r2/r2.module';

const entities = Object.values(Entities).filter(e => typeof e === 'function');

@Module({
  imports: [
    TypeOrmModule.forFeature(entities),
    R2Module,
  ],
  controllers: [
    AdminQuestionController,
    AdminDashboardController,
    AdminUsersController,
    AssessmentController,
    AdaptiveBlockController,
    PurchaseController,
  ],
  providers: [
    AdminQuestionService,
    AdminDashboardService,
    AdminUsersService,
    AssessmentService,
    AdaptiveBlockService,
    AdaptiveFallbackService,
    CodeExecutionService,
    EvaluationService,
    PurchaseService,
    BulkAdminUsersService,
  ],
  exports: [
    AdminQuestionService,
    AssessmentService,
    AdaptiveBlockService,
    AdaptiveFallbackService,
    CodeExecutionService,
    EvaluationService,
    PurchaseService,
    BulkAdminUsersService,
  ],
})
export class AssessmentModule {}
