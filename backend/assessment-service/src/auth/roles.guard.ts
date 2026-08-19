import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import type { Request } from 'express';

import { IS_PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY, type AppRole } from './roles.decorator';

/** The caller's row in `users`, resolved from the verified Cognito token. */
export interface DbUser {
  id: number;
  email: string;
  role: string;
  roleGroup: AppRole;
  isAdmin: boolean;
}

export type AuthedRequest = Request & {
  /** Raw Cognito access-token claims, set by CognitoAuthGuard. */
  user?: { sub?: string; username?: string; email?: string };
  /** Server-resolved identity. Never trust a client-supplied user id over this. */
  dbUser?: DbUser;
};

/** Role names that grant administrative access, matching AdminUsersService. */
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'STAFF'];

/**
 * Development-only identity hint. Reads the `X-User-Context` header the
 * frontend sends so local work against `ASSESSMENT_AUTH=off` still resolves a
 * user. Never consulted when authentication is enabled.
 */
function devClaimsFromHeader(req: AuthedRequest): { email?: string } {
  const raw = req.headers['x-user-context'];
  if (!raw) return {};
  try {
    const parsed = JSON.parse(Array.isArray(raw) ? raw[0] : raw);
    return { email: typeof parsed?.email === 'string' ? parsed.email : undefined };
  } catch {
    return {};
  }
}

/**
 * Global authorization guard. Runs after `CognitoAuthGuard` has verified the
 * bearer token, and does two things on every authenticated request:
 *
 *  1. Resolves the caller's row in `users` (by `cognito_sub`, falling back to
 *     email) and attaches it as `req.dbUser`. Handlers must derive identity
 *     from this rather than from a client-supplied `userId` — a query
 *     parameter is an assertion by the caller, not a fact.
 *  2. Enforces `@Roles(...)` when a handler or controller declares it.
 *
 * Identity resolution anchors on the Cognito `sub` because `users.id` is
 * per-database and is NOT shared with the sibling originbi platform (see
 * docs/RUNBOOK.md, "Users are per-database"). The `sub` is stable across both.
 *
 * Gated by the same `ASSESSMENT_AUTH` flag as the authentication guard: with
 * auth explicitly disabled for local development there is no verified token to
 * resolve an identity from, so authorization is skipped too. That combination
 * is already refused when `NODE_ENV=production`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  private readonly enabled: boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
    config: ConfigService,
  ) {
    const mode = (config.get<string>('ASSESSMENT_AUTH') ?? '').trim().toLowerCase();
    this.enabled = !(mode === 'off' || mode === 'false' || mode === '0');

    if (!this.enabled) {
      this.logger.warn(
        'ASSESSMENT_AUTH is disabled — role checks are skipped. Admin endpoints are UNPROTECTED. Local development only.',
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();

    if (!this.enabled) {
      // Passthrough (local dev). There is no verified token, so identity is
      // taken from the X-User-Context header the frontend sends and NOTHING is
      // enforced — the header is client-controlled and worth exactly what the
      // caller says it is. This branch cannot run in production: the auth guard
      // refuses to construct with ASSESSMENT_AUTH disabled and NODE_ENV=production.
      try {
        req.dbUser = (await this.resolveUser(devClaimsFromHeader(req))) ?? undefined;
      } catch {
        req.dbUser = undefined;
      }
      return true;
    }

    const claims = req.user;
    if (!claims) {
      // CognitoAuthGuard runs first and rejects tokenless requests, so this is
      // only reachable if guard ordering is ever changed. Fail closed.
      throw new UnauthorizedException('Missing verified token');
    }

    const dbUser = await this.resolveUser(claims);
    if (!dbUser) {
      // A valid Cognito token from a user with no row in THIS database. It used
      // to be treated as an admin; it is now simply not a user here.
      throw new ForbiddenException('No account on this platform for the authenticated user');
    }
    req.dbUser = dbUser;

    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    if (!required.includes(dbUser.roleGroup)) {
      this.logger.warn(
        `authorization refused: user ${dbUser.id} (${dbUser.roleGroup}) requested ${req.method} ${req.originalUrl}, needs one of [${required.join(', ')}]`,
      );
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }

  private async resolveUser(claims: {
    sub?: string;
    username?: string;
    email?: string;
  }): Promise<DbUser | null> {
    const sub = claims.sub ?? claims.username;
    // Cognito access tokens do not carry `email` by default; treat it as a
    // best-effort fallback for pools configured to include it.
    const email = claims.email ?? (claims.username?.includes('@') ? claims.username : undefined);
    if (!sub && !email) return null;

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      const rows = await qr.query(
        `SELECT id, COALESCE(email, '') AS email, COALESCE(role, '') AS role,
                is_active, is_blocked
         FROM users
         WHERE ($1::text IS NOT NULL AND cognito_sub = $1)
            OR ($2::text IS NOT NULL AND LOWER(email) = LOWER($2))
         ORDER BY (cognito_sub = $1) DESC
         LIMIT 1`,
        [sub ?? null, email ?? null],
      );
      if (!rows?.length) return null;

      const row = rows[0];
      if (row.is_active === false || row.is_blocked === true) {
        throw new ForbiddenException('Account is inactive or blocked');
      }

      const role = String(row.role || '').toUpperCase();
      const isAdmin = ADMIN_ROLES.includes(role);
      return {
        id: Number(row.id),
        email: row.email,
        role: row.role,
        roleGroup: isAdmin ? 'ADMIN' : role === 'PROCTOR' ? 'PROCTOR' : 'STUDENT',
        isAdmin,
      };
    } finally {
      await qr.release();
    }
  }
}
