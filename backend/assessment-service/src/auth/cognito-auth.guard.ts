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
 * Behavior is gated by `ASSESSMENT_AUTH`:
 *   - `on`  → strict verification; missing/invalid token → 401.
 *   - any other value (default) → guard is a no-op so local dev keeps
 *     working without Cognito wiring. The startup log makes the active
 *     mode obvious.
 *
 * Required env when `ASSESSMENT_AUTH=on`:
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
    const mode = (config.get<string>('ASSESSMENT_AUTH') ?? '').toLowerCase();
    this.enabled = mode === 'on' || mode === 'true' || mode === '1';

    if (!this.enabled) {
      this.verifier = null;
      this.logger.warn(
        'ASSESSMENT_AUTH is not "on" — Cognito auth guard is in passthrough mode. Set ASSESSMENT_AUTH=on to require JWTs.',
      );
      return;
    }

    const userPoolId = config.get<string>('COGNITO_USER_POOL_ID');
    const clientId = config.get<string>('COGNITO_APP_CLIENT_ID');
    if (!userPoolId || !clientId) {
      throw new Error(
        'ASSESSMENT_AUTH=on but COGNITO_USER_POOL_ID / COGNITO_APP_CLIENT_ID are not configured.',
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
