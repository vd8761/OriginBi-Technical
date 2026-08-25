import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pool.module';
import { CognitoService } from '../cognito/cognito.service';
import { UsersRepository } from '../common/users.repository';
import { toApiUser } from '../common/presenters';
import { MailService } from '../mail/mail.service';
import { RegisterTechDto } from './dto';

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly users: UsersRepository,
    private readonly cognito: CognitoService,
    private readonly mail: MailService,
  ) {}

  /**
   * The profile the student header and profile page read. Deliberately narrow:
   * this platform stores no personality/report data, so none of the sibling's
   * trait resolution is ported.
   */
  async getProfile(email: string) {
    const row = await this.users.findByEmail(email);
    if (!row) throw new NotFoundException('Profile not found.');
    return {
      ...toApiUser(email, row),
      fullName: row.full_name,
      full_name: row.full_name,
      mobileNumber: row.mobile_number,
      countryCode: row.country_code ?? '+91',
      gender: row.gender,
      status: row.status ?? 'ACTIVE',
      isTechAssessment: row.is_tech_assessment ?? 1,
      metadata: { ...(row.metadata ?? {}), cognitoSub: row.cognito_sub, id: Number(row.id) },
    };
  }

  /**
   * Whether the caller must change their password before going anywhere.
   * A user created by an admin gets a temporary password, so the first sign-in
   * is forced through the reset screen. `hasChangedPassword` in metadata is the
   * flag; `login_count` guards accounts that predate it.
   */
  async checkLoginStatus(email: string) {
    const row = await this.users.findByEmail(email);
    if (!row) {
      return {
        redirectUrl: '/dashboard',
        isAssessmentMode: false,
        status: 'USER_NOT_FOUND',
      };
    }

    const hasChangedPassword = row.metadata?.hasChangedPassword === true;
    if (!hasChangedPassword && !row.first_login_at) {
      return {
        redirectUrl: '/student/first-time-reset',
        isAssessmentMode: false,
        status: 'FIRST_LOGIN',
      };
    }

    return {
      redirectUrl: '/dashboard',
      isAssessmentMode: true,
      status: 'OK',
    };
  }

  async completeFirstLogin(email: string) {
    const row = await this.users.findByEmail(email);
    if (!row) throw new NotFoundException('User not found.');
    await this.users.markFirstLoginComplete(row.id);
    return { success: true };
  }

  /**
   * The academic catalogue behind the registration form's department picker.
   * These tables are created empty by assessment-service migration 014; an
   * empty list is a valid answer, not a failure.
   */
  async getDepartments() {
    const { rows } = await this.pool.query(
      `SELECT dd.id,
              d.id            AS department_id,
              d.name          AS department_name,
              d.short_name    AS department_short_name,
              d.category,
              dt.name         AS degree_name,
              dt.level        AS degree_level,
              TRIM(CONCAT(dt.name, ' ', d.name)) AS name,
              dd.course_duration
         FROM department_degrees dd
         JOIN departments  d  ON d.id  = dd.department_id
         JOIN degree_types dt ON dt.id = dd.degree_type_id
        WHERE dd.is_active = true AND dd.is_deleted = false
          AND d.is_active  = true AND d.is_deleted  = false
        ORDER BY d.name, dt.name`,
    );
    return rows;
  }

  /**
   * Self-service registration for the technical platform.
   *
   * Creates the Cognito account first, then the `users` and `registrations`
   * rows in one transaction. If the database work fails the Cognito user is
   * left behind on purpose — deleting it would let a failed request wipe a
   * pre-existing account with the same email. `createUserWithPermanentPassword`
   * is idempotent, so a retry repairs rather than duplicates.
   */
  async registerTech(dto: RegisterTechDto) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.users.findByEmail(email);
    if (existing) throw new ConflictException('User already exists');

    // Only assign a Cognito group when one is asked for. This platform reads
    // role from the users table, so the group is decoration unless something
    // external depends on it.
    const groupName =
      (dto.metadata?.groupName as string) || process.env.COGNITO_DEFAULT_GROUP || '';
    const { sub } = await this.cognito.createUserWithPermanentPassword(
      email,
      dto.password,
      groupName,
    );

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: userRows } = await client.query<{ id: string }>(
        `INSERT INTO users (email, role, cognito_sub, email_verified, metadata, created_at, updated_at)
         VALUES ($1, 'STUDENT', $2, true, $3::jsonb, now(), now())
         RETURNING id`,
        [
          email,
          sub,
          JSON.stringify({
            fullName: dto.full_name,
            mobileNumber: dto.mobile_number ?? '',
            countryCode: dto.country_code ?? '+91',
            gender: dto.gender ?? null,
            // An admin-created account starts with a temporary password and is
            // forced through the reset screen; a self-registration is not.
            hasChangedPassword: dto.registration_source !== 'ADMIN',
            cognitoSub: sub,
            ...(dto.metadata ?? {}),
          }),
        ],
      );
      const userId = userRows[0].id;

      // programs is empty on a fresh technical database (migration 014 creates
      // the catalogue tables but seeds nothing), so a missing program is normal.
      const programCode = dto.program_code || 'SCHOOL_STUDENT';
      const { rows: programRows } = await client.query<{ id: string }>(
        `SELECT id FROM programs WHERE code = $1 AND is_active = true LIMIT 1`,
        [programCode],
      );
      const programId = programRows[0]?.id ?? null;

      await client.query(
        `INSERT INTO registrations (
           user_id, registration_source, full_name, mobile_number, country_code,
           gender, school_level, school_stream, student_board, department_degree_id,
           program_id, status, payment_status, payment_amount, payment_provider,
           paid_at, is_tech_assessment, metadata, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8, $9, $10,
           $11, 'COMPLETED', 'PAID', 0.00, 'FREE',
           now(), 1, $12::jsonb, now(), now()
         )`,
        [
          userId,
          dto.registration_source || 'SELF',
          dto.full_name,
          dto.mobile_number ?? '',
          dto.country_code ?? '+91',
          dto.gender ?? null,
          dto.school_level ?? null,
          dto.school_stream ?? null,
          dto.student_board ?? null,
          dto.department_degree_id ?? null,
          programId,
          JSON.stringify({
            currentYear: dto.current_year ?? null,
            ...(dto.metadata ?? {}),
          }),
        ],
      );

      await client.query('COMMIT');

      const shouldSendEmail = dto.sendEmail !== false && dto.send_email !== false;
      if (shouldSendEmail) {
        // Never let a mail failure fail a completed registration.
        void this.mail
          .sendWelcomeEmail({
            toEmail: email,
            userName: dto.full_name,
            password: dto.password,
            isTemporary: dto.registration_source === 'ADMIN',
          })
          .catch((err) =>
            this.logger.error(`Welcome email failed for ${email}: ${err?.message}`),
          );
      }

      this.logger.log(`Registered technical-platform user ${email} (id ${userId})`);
      return { success: true, userId: Number(userId), email };
    } catch (error: any) {
      await client.query('ROLLBACK').catch(() => undefined);
      this.logger.error(`Registration failed for ${email}: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Registration failed');
    } finally {
      client.release();
    }
  }
}
