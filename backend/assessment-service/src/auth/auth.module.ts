import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { CognitoAuthGuard } from './cognito-auth.guard';

/**
 * Provides the Cognito access-token guard as a global APP_GUARD. Importing
 * this module from `AppModule` is enough to enforce auth on every route
 * (subject to the `ASSESSMENT_AUTH` env feature flag and the `@Public()`
 * opt-out decorator).
 */
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: CognitoAuthGuard,
    },
  ],
})
export class AuthModule {}
