import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pool.module';
import { CognitoService } from '../cognito/cognito.service';
import { UsersRepository } from '../common/users.repository';

/** Reset codes a single account may request per calendar day. */
const DAILY_RESET_LIMIT = 3;

/**
 * The single answer this endpoint ever gives. Registered, unknown and
 * rate-limited addresses are indistinguishable to the caller.
 */
function uniformResponse() {
  return {
    success: true,
    message: 'If this email is registered, a reset code has been sent.',
  };
}

@Injectable()
export class ForgotPasswordService {
  private readonly logger = new Logger(ForgotPasswordService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly users: UsersRepository,
    private readonly cognito: CognitoService,
  ) {}

  /**
   * Starts Cognito's forgot-password flow.
   *
   * The response is identical whether or not the account exists — the reply is
   * an enumeration oracle otherwise. The per-account daily cap is on top of the
   * per-IP throttle on the controller: the throttle stops one client hammering
   * the endpoint, the cap stops a distributed attempt mailbombing one person.
   */
  async initiate(email: string) {
    const normalized = email.trim().toLowerCase();
    const row = await this.users.findByEmail(normalized);

    if (row) {
      const attempts = await this.countTodaysAttempts(row.id);
      if (attempts >= DAILY_RESET_LIMIT) {
        // Answered exactly like the success and unknown-address cases. Saying
        // "limit reached" would confirm the address is registered, which is
        // what the uniform response above exists to hide — four requests would
        // be enough to test any address.
        this.logger.warn(`Reset limit reached for user ${row.id} - no mail sent.`);
        return uniformResponse();
      }

      await this.cognito.forgotPassword(normalized);

      // Recorded only after Cognito accepted, so a provider failure does not
      // burn one of the user's three attempts.
      await this.recordAttempt(row.id).catch((err) =>
        this.logger.error(`Could not record reset attempt: ${err?.message}`),
      );
    } else {
      this.logger.log(`Reset requested for unknown address ${normalized} - no mail sent.`);
    }

    return uniformResponse();
  }

  private async countTodaysAttempts(userId: string): Promise<number> {
    const { rows } = await this.pool.query<{ attempt_count: number }>(
      `SELECT attempt_count FROM user_action_logs
        WHERE user_id = $1 AND action_type = 'RESET_PASSWORD' AND action_date = CURRENT_DATE`,
      [userId],
    );
    return rows[0]?.attempt_count ?? 0;
  }

  private async recordAttempt(userId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_action_logs (user_id, action_type, action_date, attempt_count)
       VALUES ($1, 'RESET_PASSWORD', CURRENT_DATE, 1)
       ON CONFLICT (user_id, action_type, action_date)
       DO UPDATE SET attempt_count = user_action_logs.attempt_count + 1,
                     updated_at    = now()`,
      [userId],
    );
  }
}
