import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { CognitoModule } from './modules/auth/cognito.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local',
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
    CognitoModule,
    AuthModule,
    AssessmentModule,
  ],
})
export class AppModule {}
