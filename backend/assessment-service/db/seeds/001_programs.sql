-- Program catalogue.
--
-- `programs.code` is structural, not content: the signup form hardcodes these
-- three values (frontend/components/auth/SignupForm.tsx) and auth-service's
-- registerTech looks the row up by code to set `registrations.program_id`.
-- Without them every registration lands with a NULL program, and any later
-- report or filter that groups by programme sees nothing.
--
-- Migration 014 creates this table deliberately empty because it is a
-- catalogue, not schema. This seed fills in the part the application itself
-- depends on. Departments and degree types are genuinely content and are not
-- seeded here — see docs/DEPLOYMENT.md.
--
-- Idempotent: safe to re-run.
--   psql "$DATABASE_URL" -f backend/assessment-service/db/seeds/001_programs.sql

INSERT INTO programs (code, name, description, assessment_title, is_active)
VALUES
    ('SCHOOL_STUDENT', 'School Student',
     'School-level candidate taking the technical assessment.',
     'OriginBI Technical Assessment', true),
    ('COLLEGE_STUDENT', 'College Student',
     'Undergraduate or postgraduate candidate taking the technical assessment.',
     'OriginBI Technical Assessment', true),
    ('EMPLOYEE', 'Working Professional',
     'Employed candidate taking the technical assessment.',
     'OriginBI Technical Assessment', true)
ON CONFLICT (code) DO NOTHING;
