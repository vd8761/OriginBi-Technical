import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { CognitoService } from '../cognito/cognito.service';
import { ADMIN_ROLES, UsersRepository } from '../common/users.repository';
import { toApiRegistration, toApiUser } from '../common/presenters';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly cognito: CognitoService,
    private readonly users: UsersRepository,
  ) {}

  /**
   * Sign-in for both portals.
   *
   * Authentication is Cognito's answer; **authorization is this database's**.
   * The admin portal passes group='ADMIN', and we check that against
   * `users.role` here rather than against a Cognito group, for the same reason
   * assessment-service's RolesGuard does: an admin with no row in *this*
   * database is not an admin *here*, and the two platforms share a pool.
   */
  async login(email: string, password: string, group?: string, ip?: string | null) {
    const normalized = email.trim().toLowerCase();
    const row = await this.users.findByEmail(normalized);

    // Authenticate first regardless of whether a row exists: answering
    // differently for unknown emails turns this into an account oracle.
    const tokens = await this.cognito.login(normalized, password);

    if (!row) {
      this.logger.warn(
        `Valid Cognito credentials for ${normalized} but no row in users — refusing.`,
      );
      throw new UnauthorizedException('Incorrect username or password.');
    }
    if (row.is_blocked) {
      throw new ForbiddenException(
        'Your account has been blocked. Please contact support.',
      );
    }
    if (row.is_active === false) {
      throw new ForbiddenException('Your account is inactive.');
    }

    const role = String(row.role ?? 'STUDENT').toUpperCase();
    if (String(group ?? '').toUpperCase() === 'ADMIN' && !ADMIN_ROLES.includes(role)) {
      throw new ForbiddenException(
        'Access denied. You do not have permission to access the admin portal.',
      );
    }

    // Best-effort bookkeeping: a failure here must not cost a valid user a login.
    try {
      if (!row.cognito_sub && tokens.accessToken) {
        const sub = await this.subFromAccessToken(tokens.accessToken);
        if (sub) await this.users.attachCognitoSub(row.id, sub);
      }
      await this.users.recordLogin(row.id, ip ?? null);
    } catch (error: any) {
      this.logger.error(`Post-login bookkeeping failed for ${normalized}: ${error?.message}`);
    }

    return tokens;
  }

  async refresh(refreshToken: string) {
    return this.cognito.refresh(refreshToken);
  }

  async logout(accessToken: string) {
    return this.cognito.logout(accessToken);
  }

  /** Resolves the caller from their bearer token. Returns null if unauthenticated. */
  async session(authorizationHeader?: string) {
    const token = bearerToken(authorizationHeader);
    if (!token) return null;

    const email = await this.cognito.emailFromAccessToken(token);
    if (!email) return null;

    const row = await this.users.findByEmail(email);
    if (row?.is_blocked) {
      throw new ForbiddenException('Your account has been blocked.');
    }
    return {
      user: toApiUser(email, row),
      registration: toApiRegistration(email, row),
    };
  }

  /**
   * The `sub` claim from an access token, read without verification — it is
   * used only to backfill a column, immediately after Cognito itself issued
   * the token in this same request, so there is nothing to forge.
   */
  private async subFromAccessToken(accessToken: string): Promise<string | null> {
    try {
      const payload = accessToken.split('.')[1];
      if (!payload) return null;
      const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      return typeof json?.sub === 'string' ? json.sub : null;
    } catch {
      return null;
    }
  }
}

export function bearerToken(header?: string): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (!token || scheme.toLowerCase() !== 'bearer') return null;
  return token;
}
