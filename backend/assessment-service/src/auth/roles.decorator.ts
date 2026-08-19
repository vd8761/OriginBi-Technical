import { SetMetadata } from '@nestjs/common';

/**
 * Role names as stored in `users.role`. `ADMIN` is the group label used by the
 * rest of the service (see AdminUsersService), and covers SUPER_ADMIN/STAFF —
 * the same widening `admin-users.service.ts` applies when it buckets a user
 * into the "Admin" role group.
 */
export type AppRole = 'ADMIN' | 'PROCTOR' | 'STUDENT';

export const ROLES_KEY = 'requiredRoles';

/**
 * Restricts a controller class or handler method to the listed roles. Enforced
 * by the global `RolesGuard`, which resolves the caller's row in `users` from
 * the verified Cognito token and refuses anyone who does not match.
 *
 * Routes with no `@Roles()` are still authenticated (by `CognitoAuthGuard`) —
 * this decorator only adds the authorization layer on top.
 */
export const Roles = (...roles: AppRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
