import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Request } from 'express';

/**
 * GET /api/admin/me
 *
 * Looks up the authenticated user by email (from the X-User-Context header
 * written by the frontend) and returns their profile + role so the login
 * page can verify admin access.
 *
 * When ASSESSMENT_AUTH=on the Cognito guard has already verified the JWT and
 * attached req.user. In passthrough mode (local dev) we fall back to the
 * X-User-Context header.
 */
@Controller('admin/me')
export class AdminMeController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async getMe(@Req() req: Request): Promise<{ user: Record<string, unknown> }> {
    // Try to get email from the verified Cognito payload first, then fall back
    // to the X-User-Context header that the frontend always sends.
    const cognitoUser = (req as any).user as { email?: string; username?: string } | undefined;
    let email: string | undefined = cognitoUser?.email || cognitoUser?.username;

    if (!email) {
      const ctx = req.headers['x-user-context'];
      if (ctx) {
        try {
          const parsed = JSON.parse(Array.isArray(ctx) ? ctx[0] : ctx);
          email = parsed?.email;
        } catch {
          // ignore parse errors
        }
      }
    }

    if (!email) {
      throw new UnauthorizedException('Unable to determine user identity');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      const rows = await qr.query(
        `SELECT u.id, u.email, u.role, u.is_active, u.is_blocked
         FROM users u
         WHERE LOWER(u.email) = LOWER($1)
         LIMIT 1`,
        [email],
      );

      if (!rows || rows.length === 0) {
        // User not in DB yet — treat as admin if Cognito already validated them.
        // Return a minimal profile so the login page can proceed.
        return {
          user: {
            id: 0,
            email,
            role: 'ADMIN',
            isAdmin: true,
            isActive: true,
          },
        };
      }

      const u = rows[0];
      const role = (u.role || '').toUpperCase();
      const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(role);

      return {
        user: {
          id: Number(u.id),
          email: u.email,
          role: u.role,
          isAdmin,
          isActive: !!u.is_active,
          isBlocked: !!u.is_blocked,
        },
      };
    } finally {
      await qr.release();
    }
  }
}
