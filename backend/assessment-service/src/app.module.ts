import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { AdaptiveModule } from './modules/adaptive/adaptive.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS ? String(process.env.DB_PASS) : 'postgres',
      database: process.env.DB_NAME || 'obidatanew',
      autoLoadEntities: true,
      synchronize: false,
    }),
    AuthModule,
    AssessmentModule,
    AdaptiveModule,   // ← Snapshot-Based Marks Blueprint Adaptive Engine v2
  ],
  controllers: [HealthController],
})
export class AppModule {}
