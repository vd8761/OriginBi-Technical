import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pool.module';

/** Roles that count as staff on this platform. Mirrors assessment-service's RolesGuard. */
export const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'STAFF'];

export interface DbUserRow {
  id: string;
  email: string | null;
  role: string | null;
  cognito_sub: string | null;
  is_active: boolean;
  is_blocked: boolean;
  metadata: Record<string, any> | null;
  full_name: string | null;
  mobile_number: string | null;
  country_code: string | null;
  gender: string | null;
  status: string | null;
  is_tech_assessment: number | null;
  first_login_at: Date | null;
}

/**
 * Reads and writes the identity half of `originbi_technical`. Kept as raw SQL
 * so this service does not need entity definitions that would then have to be
 * kept in step with assessment-service's copies of the same tables.
 */
@Injectable()
export class UsersRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * The display fields live on `registrations`, not `users`, so every read
   * joins them. A user can have several registrations; the newest wins.
   */
  private readonly selectUser = `
    SELECT u.id, u.email, COALESCE(u.role, 'STUDENT') AS role, u.cognito_sub,
           u.is_active, u.is_blocked, u.metadata, u.first_login_at,
           r.full_name, r.mobile_number, r.country_code, r.gender,
           r.status, r.is_tech_assessment
      FROM users u
      LEFT JOIN LATERAL (
        SELECT * FROM registrations r2
         WHERE r2.user_id = u.id AND r2.is_deleted = false
         ORDER BY r2.created_at DESC
         LIMIT 1
      ) r ON true
  `;

  async findByEmail(email: string): Promise<DbUserRow | null> {
    const { rows } = await this.pool.query<DbUserRow>(
      `${this.selectUser} WHERE LOWER(u.email) = LOWER($1) LIMIT 1`,
      [email],
    );
    return rows[0] ?? null;
  }

  async findByCognitoSub(sub: string): Promise<DbUserRow | null> {
    const { rows } = await this.pool.query<DbUserRow>(
      `${this.selectUser} WHERE u.cognito_sub = $1 LIMIT 1`,
      [sub],
    );
    return rows[0] ?? null;
  }

  /**
   * Records a successful sign-in. `first_login_at` is set once and only once —
   * `checkLoginStatus` reads it to decide whether to force a password change.
   */
  async recordLogin(userId: string, ip: string | null): Promise<void> {
    await this.pool.query(
      `UPDATE users
          SET last_login_at = now(),
              last_login_ip = COALESCE($2, last_login_ip),
              login_count   = login_count + 1,
              updated_at    = now()
        WHERE id = $1`,
      [userId, ip],
    );
  }

  async markFirstLoginComplete(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE users
          SET first_login_at = COALESCE(first_login_at, now()),
              metadata       = jsonb_set(
                                 COALESCE(metadata, '{}'::jsonb),
                                 '{hasChangedPassword}',
                                 'true'::jsonb,
                                 true
                               ),
              updated_at     = now()
        WHERE id = $1`,
      [userId],
    );
  }

  /**
   * Backfills `cognito_sub` when a row was created without one (an import, or
   * an account made directly in the Cognito console). Identity is resolved by
   * `sub` everywhere else, so a null here means a valid token with no account.
   */
  async attachCognitoSub(userId: string, sub: string): Promise<void> {
    await this.pool.query(
      `UPDATE users SET cognito_sub = $2, updated_at = now()
        WHERE id = $1 AND (cognito_sub IS NULL OR cognito_sub = '')`,
      [userId, sub],
    );
  }
}
