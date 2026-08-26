-- The first admin.
--
-- Admin access on this platform is decided by `users.role` in THIS database,
-- not by a Cognito group (auth-service's login and assessment-service's
-- RolesGuard both read this table). So an account can exist in the Cognito
-- pool and still not reach /admin without a row here — which is the intended
-- behaviour, and why a fresh database needs this seed before anyone can
-- administer it.
--
-- `cognito_sub` is left NULL on purpose. Login resolves the caller by email
-- when no sub is recorded, and auth-service backfills the sub on the first
-- successful sign-in (AuthService.login → attachCognitoSub). Setting it here
-- would mean guessing a value that only exists once the pool account is made;
-- a wrong guess is a valid token with no account behind it.
--
-- Prerequisite: an account with this same email must exist in the production
-- Cognito user pool. This row grants the role; Cognito proves the identity.
--
-- Idempotent: safe to re-run. Change the address before first use.
--   psql "$DATABASE_URL" -f backend/assessment-service/db/seeds/002_admin_user.sql

INSERT INTO users (email, role, email_verified, is_active, is_blocked, metadata)
VALUES (
    'info@touchmarkdes.com',
    'ADMIN',
    true,
    true,
    false,
    '{"fullName": "OriginBI Admin", "hasChangedPassword": true, "seededBy": "002_admin_user.sql"}'::jsonb
)
ON CONFLICT DO NOTHING;

-- registrations carries the display name the admin header reads; users does
-- not. mobile_number is NOT NULL, hence the placeholder.
INSERT INTO registrations (
    user_id, registration_source, full_name, mobile_number, country_code,
    status, payment_status, is_tech_assessment, metadata
)
SELECT u.id, 'ADMIN', 'OriginBI Admin', '0000000000', '+91',
       'COMPLETED', 'NOT_REQUIRED', 0,
       '{"seededBy": "002_admin_user.sql"}'::jsonb
  FROM users u
 WHERE lower(u.email) = 'info@touchmarkdes.com'
   AND NOT EXISTS (
       SELECT 1 FROM registrations r WHERE r.user_id = u.id AND r.is_deleted = false
   );
