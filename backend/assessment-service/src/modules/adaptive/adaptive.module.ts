import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Controllers
import { AdaptiveController } from './controllers/adaptive.controller';

// Services
import { AdaptiveEngineService } from './services/adaptive-engine.service';
import { AdaptiveBlockGeneratorService } from './services/adaptive-block-generator.service';
import { AdaptiveSnapshotService } from './services/adaptive-snapshot.service';
import { AdaptiveAnalyticsService } from './services/adaptive-analytics.service';
import { AdaptiveBlueprintService } from './services/adaptive-blueprint.service';

/**
 * AdaptiveModule
 *
 * Self-contained module for the Snapshot-Based Marks Blueprint
 * Block Adaptive Assessment Engine (v2).
 *
 * Registered in AppModule alongside AssessmentModule.
 * No circular dependencies with AssessmentModule.
 *
 * Routes: /api/adaptive/v2/...
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([]),
  ],
  controllers: [
    AdaptiveController,
  ],
  providers: [
    AdaptiveEngineService,
    AdaptiveBlockGeneratorService,
    AdaptiveSnapshotService,
    AdaptiveAnalyticsService,
    AdaptiveBlueprintService,
  ],
  exports: [
    AdaptiveEngineService,
    AdaptiveBlockGeneratorService,
    AdaptiveSnapshotService,
    AdaptiveAnalyticsService,
    AdaptiveBlueprintService,
  ],
})
export class AdaptiveModule {}
