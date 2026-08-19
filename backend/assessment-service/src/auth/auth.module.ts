import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { CognitoAuthGuard } from './cognito-auth.guard';
import { RolesGuard } from './roles.guard';

/**
 * Provides the global guard chain as APP_GUARDs. Importing this module from
 * `AppModule` is enough to enforce both layers on every route (subject to the
 * `ASSESSMENT_AUTH` env feature flag and the `@Public()` opt-out decorator):
 *
 *   1. `CognitoAuthGuard` — authentication. Verifies the bearer token and
 *      attaches the raw claims as `req.user`.
 *   2. `RolesGuard`       — authorization. Resolves the caller's `users` row
 *      into `req.dbUser` and enforces `@Roles(...)`.
 *
 * Order matters and is the registration order below: the roles guard needs the
 * verified claims the auth guard produces.
 */
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: CognitoAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AuthModule {}
