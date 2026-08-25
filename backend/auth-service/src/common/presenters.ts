import { ADMIN_ROLES, DbUserRow } from './users.repository';

/**
 * The shapes the frontend's `AuthResponse` expects (`frontend/lib/api.ts`).
 * Kept in one place so /auth/session, /auth/login and /student/profile can
 * never disagree about what a user looks like.
 */
export function toApiUser(email: string, row: DbUserRow | null) {
  const role = String(row?.role ?? 'STUDENT').toUpperCase();
  return {
    id: row?.id ? Number(row.id) : 0,
    email: row?.email ?? email,
    role,
    isAdmin: ADMIN_ROLES.includes(role),
    cognitoSub: row?.cognito_sub ?? null,
    emailVerified: true,
    isActive: row?.is_active !== false,
    isBlocked: row?.is_blocked === true,
  };
}

export function toApiRegistration(email: string, row: DbUserRow | null) {
  if (!row) return null;
  return {
    id: Number(row.id),
    fullName: row.full_name ?? email.split('@')[0],
    gender: row.gender ?? null,
    countryCode: row.country_code ?? '+91',
    mobileNumber: row.mobile_number ?? null,
    status: row.status ?? 'ACTIVE',
    isTechAssessment: row.is_tech_assessment ?? 0,
  };
}
