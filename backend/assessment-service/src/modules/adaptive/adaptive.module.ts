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
 * Blueprint is fully automatic — computed from the question bank
 * whenever a candidate starts an adaptive attempt. No manual admin
 * setup step required.
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
    AdaptiveBlueprintService,
    AdaptiveBlockGeneratorService,
    AdaptiveSnapshotService,
    AdaptiveAnalyticsService,
  ],
  exports: [
    AdaptiveEngineService,
    AdaptiveBlueprintService,
    AdaptiveBlockGeneratorService,
    AdaptiveSnapshotService,
    AdaptiveAnalyticsService,
  ],
})
export class AdaptiveModule {}
