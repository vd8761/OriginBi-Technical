import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { CognitoAccessTokenPayload } from 'aws-jwt-verify/jwt-model';
import type { Request } from 'express';

import { IS_PUBLIC_KEY } from './public.decorator';

type AssessmentRequest = Request & {
  user?: CognitoAccessTokenPayload;
};

type AccessTokenVerifier = ReturnType<
  typeof CognitoJwtVerifier.create<{ userPoolId: string; tokenUse: 'access'; clientId: string }>
>;

/**
 * Global guard that verifies a Cognito access token on every request unless
 * the handler/controller is annotated `@Public()`. Decoded claims are
 * attached to `req.user` for downstream consumers.
 *
 * Behavior is gated by `ASSESSMENT_AUTH`, which defaults to ON. Authentication
 * has to be switched off deliberately, and never in production:
 *   - unset, `on`, `true`, `1` → strict verification; missing/invalid → 401.
 *   - `off`, `false`, `0`      → passthrough, for local dev without Cognito
 *                                wiring. Refused when NODE_ENV=production.
 *
 * This used to default to passthrough, which meant a missing env var silently
 * disabled authentication for the entire service. Defaults must fail closed:
 * forgetting to set a variable should break a deployment loudly, not quietly
 * publish every endpoint.
 *
 * Required env (unless explicitly disabled):
 *   - `COGNITO_USER_POOL_ID`
 *   - `COGNITO_APP_CLIENT_ID`
 */
@Injectable()
export class CognitoAuthGuard implements CanActivate {
  private readonly logger = new Logger(CognitoAuthGuard.name);
  private readonly enabled: boolean;
  private readonly verifier: AccessTokenVerifier | null;

  constructor(
    private readonly reflector: Reflector,
    config: ConfigService,
  ) {
    const mode = (config.get<string>('ASSESSMENT_AUTH') ?? '').trim().toLowerCase();
    const explicitlyDisabled =
      mode === 'off' || mode === 'false' || mode === '0';
    const isProduction =
      (config.get<string>('NODE_ENV') ?? '').toLowerCase() === 'production';

    if (explicitlyDisabled && isProduction) {
      throw new Error(
        'ASSESSMENT_AUTH is disabled but NODE_ENV=production. Refusing to start an unauthenticated assessment service.',
      );
    }

    this.enabled = !explicitlyDisabled;

    if (!this.enabled) {
      this.verifier = null;
      this.logger.warn(
        'ASSESSMENT_AUTH is explicitly disabled — Cognito auth guard is in passthrough mode. This is only permitted outside production.',
      );
      return;
    }

    const userPoolId = config.get<string>('COGNITO_USER_POOL_ID');
    const clientId = config.get<string>('COGNITO_APP_CLIENT_ID');
    if (!userPoolId || !clientId) {
      throw new Error(
        'Cognito auth is enabled but COGNITO_USER_POOL_ID / COGNITO_APP_CLIENT_ID are not configured. ' +
          'Set them, or set ASSESSMENT_AUTH=off for local development.',
      );
    }

    this.verifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'access',
      clientId,
    });
    this.logger.log(
      `Cognito auth guard active (userPoolId=${userPoolId}, tokenUse=access).`,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.enabled || !this.verifier) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AssessmentRequest>();
    const token = extractBearerToken(req);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }
    try {
      const payload = await this.verifier.verify(token);
      req.user = payload;
      return true;
    } catch (err) {
      this.logger.debug(`token rejected: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers['authorization'];
  if (typeof header !== 'string') return null;
  const parts = header.split(' ');
  if (parts.length !== 2) return null;
  const [scheme, value] = parts;
  if (scheme.toLowerCase() !== 'bearer' || !value) return null;
  return value;
}
