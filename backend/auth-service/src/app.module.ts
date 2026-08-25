import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PoolModule } from './db/pool.module';
import { CognitoModule } from './cognito/cognito.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { StudentModule } from './student/student.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    // Baseline ceiling for every route. Sensitive routes tighten it with
    // @Throttle: login, registration and password reset each set their own.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PoolModule,
    CognitoModule,
    MailModule,
    AuthModule,
    StudentModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
