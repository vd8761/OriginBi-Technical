import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import type { AuthedRequest } from '../../../auth/roles.guard';

/**
 * GET /api/admin/me
 *
 * Returns the authenticated caller's profile and role so the admin login page
 * can decide whether to admit them.
 *
 * Identity comes from `req.dbUser`, which the global `RolesGuard` resolved from
 * the verified Cognito token against the `users` table. This endpoint is
 * deliberately NOT annotated `@Roles('ADMIN')`: a non-admin must get a truthful
 * `isAdmin: false` so the login page can show "not an admin account" rather
 * than a bare 403.
 *
 * Two things this used to do, both removed because both granted admin to
 * people who had not been granted it:
 *   - falling back to a client-supplied `X-User-Context` header for identity,
 *     which let any caller assert any email;
 *   - returning `role: 'ADMIN'` for a Cognito user with no row in `users`,
 *     which made every account in the pool an admin of this platform.
 */
@Controller('admin/me')
export class AdminMeController {
  @Get()
  async getMe(@Req() req: AuthedRequest): Promise<{ user: Record<string, unknown> }> {
    const dbUser = req.dbUser;

    if (!dbUser) {
      // Only reachable with ASSESSMENT_AUTH disabled (local development), where
      // there is no verified token to resolve an identity from.
      throw new UnauthorizedException('Unable to determine user identity');
    }

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        isAdmin: dbUser.isAdmin,
        isActive: true,
        isBlocked: false,
      },
    };
  }
}
