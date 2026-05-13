// Cognito-backed auth service.
//
// On register: creates the user in Cognito, then UPSERTs into `users`
// (keyed by cognito_sub), then INSERTs a row in `registrations` carrying the
// signup profile (full_name, gender, mobile, etc.). Passwords are NEVER
// stored locally — Cognito owns them.
//
// On login: authenticates with Cognito, then resolves the local users +
// registrations rows so the rest of the app can FK against users.id.

import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  ForgotPasswordCommand,
  GlobalSignOutCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { ApiRegistration, ApiUser, AuthResponse } from './auth.types';
import { JwtVerifier } from './jwt.verifier';

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  gender: string;
  countryCode: string;
  mobileNumber: string;
  role?: string;
  groupName?: string;
}

@Injectable()
export class CognitoService {
  private cognitoClient: CognitoIdentityProviderClient;
  private userPoolId: string;
  private clientId: string;

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly jwtVerifier: JwtVerifier,
  ) {
    const region = this.config.get<string>('COGNITO_REGION');
    this.userPoolId = this.config.get<string>('COGNITO_USER_POOL_ID') as string;
    this.clientId = this.config.get<string>('COGNITO_CLIENT_ID') as string;

    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');
    const sessionToken = this.config.get<string>('AWS_SESSION_TOKEN');

    if (!this.userPoolId) throw new Error('COGNITO_USER_POOL_ID is not set');
    if (!region) throw new Error('COGNITO_REGION is not set');
    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'AWS credentials missing. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local.',
      );
    }

    this.cognitoClient = new CognitoIdentityProviderClient({
      region,
      credentials: { accessKeyId, secretAccessKey, sessionToken },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Register: Cognito → users → registrations → auto-login → return tokens.
  // ─────────────────────────────────────────────────────────────────────────
  async register(input: RegisterInput): Promise<AuthResponse> {
    const groupName = input.groupName || 'STUDENT';

    // 1. Create the Cognito user (idempotent on UsernameExists).
    const { sub: cognitoSub } = await this.createCognitoUser(
      input.email,
      input.password,
      groupName,
    );

    // 2. Upsert local users row + insert registration in one transaction.
    const { user, registration } = await this.dataSource.transaction(
      async (tx) => {
        const existing = await tx.query(
          `SELECT id, email, role, cognito_sub, email_verified, is_active
             FROM users WHERE cognito_sub = $1 OR email = $2 LIMIT 1`,
          [cognitoSub, input.email],
        );

        let userRow: any;
        if (existing.length > 0) {
          // Backfill cognito_sub if a row already existed (e.g. parent app
          // created it without one). Don't overwrite a different sub.
          const r = existing[0];
          if (r.cognito_sub && r.cognito_sub !== cognitoSub) {
            throw new ConflictException(
              'Email already linked to a different Cognito identity.',
            );
          }
          const updated = await tx.query(
            `UPDATE users
                SET cognito_sub = COALESCE(cognito_sub, $1),
                    email = COALESCE(email, $2),
                    email_verified = TRUE,
                    role = COALESCE(role, $3),
                    updated_at = NOW()
              WHERE id = $4
              RETURNING id, email, role, cognito_sub, email_verified, is_active`,
            [cognitoSub, input.email, input.role || 'STUDENT', r.id],
          );
          userRow = updated[0];
        } else {
          const inserted = await tx.query(
            `INSERT INTO users
                (cognito_sub, email, email_verified, role, is_active, is_blocked, login_count, metadata)
             VALUES ($1, $2, TRUE, $3, TRUE, FALSE, 0, '{}'::jsonb)
             RETURNING id, email, role, cognito_sub, email_verified, is_active`,
            [cognitoSub, input.email, input.role || 'STUDENT'],
          );
          userRow = inserted[0];
        }

        // Insert a registrations row scoped to this app (is_tech_assessment).
        // Unique key isn't defined in DB, so we guard against duplicates here.
        const existingReg = await tx.query(
          `SELECT id FROM registrations
            WHERE user_id = $1 AND is_tech_assessment = TRUE AND is_deleted = FALSE
            LIMIT 1`,
          [userRow.id],
        );

        let regRow: any;
        if (existingReg.length > 0) {
          const updated = await tx.query(
            `UPDATE registrations
                SET full_name = $1,
                    gender = $2,
                    country_code = $3,
                    mobile_number = $4,
                    status = 'ACTIVE',
                    updated_at = NOW()
              WHERE id = $5
              RETURNING id, full_name, gender, country_code, mobile_number, status, is_tech_assessment`,
            [
              input.fullName,
              input.gender,
              input.countryCode,
              input.mobileNumber,
              existingReg[0].id,
            ],
          );
          regRow = updated[0];
        } else {
          const inserted = await tx.query(
            `INSERT INTO registrations
                (user_id, registration_source, country_code, mobile_number,
                 gender, full_name, status, is_tech_assessment, metadata)
             VALUES ($1, 'SELF', $2, $3, $4, $5, 'ACTIVE', TRUE, '{}'::jsonb)
             RETURNING id, full_name, gender, country_code, mobile_number, status, is_tech_assessment`,
            [
              userRow.id,
              input.countryCode,
              input.mobileNumber,
              input.gender,
              input.fullName,
            ],
          );
          regRow = inserted[0];
        }

        return { user: userRow, registration: regRow };
      },
    );

    // 3. Auto-login so the frontend gets tokens immediately.
    const tokens = await this.cognitoLogin(input.email, input.password);

    return {
      user: this.toApiUser(user),
      registration: this.toApiRegistration(registration),
      tokens,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Login: Cognito auth → lookup local users + registrations → return.
  // ─────────────────────────────────────────────────────────────────────────
  async login(email: string, password: string): Promise<AuthResponse> {
    const tokens = await this.cognitoLogin(email, password);

    // Find/refresh the local users row. We trust the Cognito sub embedded in
    // the access token over the email-on-form, in case of email changes.
    const verified = await this.jwtVerifier.verify(tokens.accessToken);
    const cognitoSub = verified.sub;

    const userRow = await this.dataSource.transaction(async (tx) => {
      const rows = await tx.query(
        `SELECT id, email, role, cognito_sub, email_verified, is_active, is_blocked
           FROM users WHERE cognito_sub = $1 OR email = $2 LIMIT 1`,
        [cognitoSub, email],
      );

      if (rows.length === 0) {
        // User exists in Cognito but not in our DB — happens if registration
        // happened against the parent app. Create a thin shell row.
        const inserted = await tx.query(
          `INSERT INTO users
              (cognito_sub, email, email_verified, role, is_active, is_blocked, login_count, metadata)
           VALUES ($1, $2, TRUE, 'STUDENT', TRUE, FALSE, 0, '{}'::jsonb)
           RETURNING id, email, role, cognito_sub, email_verified, is_active`,
          [cognitoSub, email],
        );
        return inserted[0];
      }

      const r = rows[0];
      if (r.is_blocked) {
        throw new UnauthorizedException('Account is blocked.');
      }
      const updated = await tx.query(
        `UPDATE users
            SET cognito_sub = COALESCE(cognito_sub, $1),
                last_login_at = NOW(),
                first_login_at = COALESCE(first_login_at, NOW()),
                login_count = login_count + 1,
                updated_at = NOW()
          WHERE id = $2
          RETURNING id, email, role, cognito_sub, email_verified, is_active`,
        [cognitoSub, r.id],
      );
      return updated[0];
    });

    const registration = await this.findTechRegistration(userRow.id);

    return {
      user: this.toApiUser(userRow),
      registration: registration ? this.toApiRegistration(registration) : null,
      tokens,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Session: verify token → lookup user + registration.
  // ─────────────────────────────────────────────────────────────────────────
  async session(accessToken: string): Promise<Omit<AuthResponse, 'tokens'>> {
    const verified = await this.jwtVerifier.verify(accessToken);

    const rows = await this.dataSource.query(
      `SELECT id, email, role, cognito_sub, email_verified, is_active
         FROM users WHERE cognito_sub = $1 LIMIT 1`,
      [verified.sub],
    );
    if (rows.length === 0) {
      throw new UnauthorizedException('User not found in this application.');
    }

    const registration = await this.findTechRegistration(rows[0].id);

    return {
      user: this.toApiUser(rows[0]),
      registration: registration ? this.toApiRegistration(registration) : null,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const response = await this.cognitoClient.send(
        new AdminInitiateAuthCommand({
          UserPoolId: this.userPoolId,
          ClientId: this.clientId,
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          AuthParameters: { REFRESH_TOKEN: refreshToken },
        }),
      );
      return {
        accessToken: response.AuthenticationResult?.AccessToken!,
        idToken: response.AuthenticationResult?.IdToken!,
        expiresIn: response.AuthenticationResult?.ExpiresIn,
        tokenType: response.AuthenticationResult?.TokenType,
      };
    } catch (error: any) {
      throw new UnauthorizedException(
        `Refresh failed: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async logout(accessToken: string) {
    try {
      await this.cognitoClient.send(
        new GlobalSignOutCommand({ AccessToken: accessToken }),
      );
      return { message: 'Logged out successfully' };
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Logout failed: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async forgotPassword(email: string) {
    try {
      return await this.cognitoClient.send(
        new ForgotPasswordCommand({
          ClientId: this.clientId,
          Username: email,
        }),
      );
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Forgot password failed: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internals
  // ─────────────────────────────────────────────────────────────────────────

  private async createCognitoUser(
    email: string,
    password: string,
    groupName: string,
  ): Promise<{ sub: string }> {
    try {
      let username = email;
      let sub: string | null = null;

      try {
        const createRes = await this.withRetry(() =>
          this.cognitoClient.send(
            new AdminCreateUserCommand({
              UserPoolId: this.userPoolId,
              Username: email,
              UserAttributes: [
                { Name: 'email', Value: email },
                { Name: 'email_verified', Value: 'true' },
              ],
              MessageAction: 'SUPPRESS',
            }),
          ),
        );
        username = createRes.User?.Username || email;
        sub =
          createRes.User?.Attributes?.find((a: any) => a.Name === 'sub')?.Value ??
          null;
      } catch (err: any) {
        if (err?.name === 'UsernameExistsException') {
          username = email;
        } else {
          throw err;
        }
      }

      await this.withRetry(() =>
        this.cognitoClient.send(
          new AdminSetUserPasswordCommand({
            UserPoolId: this.userPoolId,
            Username: username,
            Password: password,
            Permanent: true,
          }),
        ),
      );

      if (groupName) {
        try {
          await this.withRetry(() =>
            this.cognitoClient.send(
              new AdminAddUserToGroupCommand({
                UserPoolId: this.userPoolId,
                Username: username,
                GroupName: groupName,
              }),
            ),
          );
        } catch (err: any) {
          // Group may not exist; don't block registration on it.
          console.warn('[CognitoService] addToGroup failed:', err?.name);
        }
      }

      if (!sub) {
        const getRes = await this.withRetry(() =>
          this.cognitoClient.send(
            new AdminGetUserCommand({
              UserPoolId: this.userPoolId,
              Username: username,
            }),
          ),
        );
        sub =
          getRes.UserAttributes?.find((a: any) => a.Name === 'sub')?.Value ?? null;
      }

      if (!sub) {
        throw new InternalServerErrorException(
          'Cognito did not return a sub for the created user.',
        );
      }
      return { sub };
    } catch (error: any) {
      if (
        error?.name === 'TooManyRequestsException' ||
        error?.name === 'ThrottlingException'
      ) {
        throw new HttpException(
          'Too many requests; please try again shortly.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Cognito error: ${error?.name || 'Unknown'} - ${error?.message || ''}`,
      );
    }
  }

  private async cognitoLogin(email: string, password: string) {
    try {
      const response = await this.cognitoClient.send(
        new AdminInitiateAuthCommand({
          UserPoolId: this.userPoolId,
          ClientId: this.clientId,
          AuthFlow: 'ADMIN_NO_SRP_AUTH',
          AuthParameters: { USERNAME: email, PASSWORD: password },
        }),
      );
      const auth = response.AuthenticationResult;
      if (!auth?.AccessToken || !auth?.IdToken) {
        throw new UnauthorizedException('Cognito did not return tokens.');
      }
      return {
        accessToken: auth.AccessToken,
        idToken: auth.IdToken,
        refreshToken: auth.RefreshToken,
        expiresIn: auth.ExpiresIn,
        tokenType: auth.TokenType,
      };
    } catch (error: any) {
      if (
        error?.name === 'NotAuthorizedException' ||
        error?.name === 'UserNotFoundException'
      ) {
        throw new UnauthorizedException('Invalid email or password.');
      }
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Login failed: ${error?.name || 'Unknown'} - ${error?.message || ''}`,
      );
    }
  }

  private async findTechRegistration(userId: string | number) {
    const rows = await this.dataSource.query(
      `SELECT id, full_name, gender, country_code, mobile_number, status, is_tech_assessment
         FROM registrations
        WHERE user_id = $1 AND is_tech_assessment = TRUE AND is_deleted = FALSE
        ORDER BY created_at DESC
        LIMIT 1`,
      [userId],
    );
    return rows[0] ?? null;
  }

  private async withRetry<T>(
    op: () => Promise<T>,
    maxRetries = 5,
    baseDelay = 1000,
  ): Promise<T> {
    let lastErr: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await op();
      } catch (err: any) {
        lastErr = err;
        const throttled =
          err?.name === 'TooManyRequestsException' ||
          err?.name === 'ThrottlingException';
        if (throttled && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, baseDelay * 2 ** attempt));
        } else {
          throw err;
        }
      }
    }
    throw lastErr;
  }

  private toApiUser(r: any): ApiUser {
    return {
      id: String(r.id),
      email: r.email,
      role: r.role ?? null,
      cognitoSub: r.cognito_sub ?? null,
      emailVerified: !!r.email_verified,
      isActive: !!r.is_active,
    };
  }

  private toApiRegistration(r: any): ApiRegistration {
    return {
      id: String(r.id),
      fullName: r.full_name ?? null,
      gender: r.gender ?? null,
      countryCode: r.country_code,
      mobileNumber: r.mobile_number,
      status: r.status,
      isTechAssessment: !!r.is_tech_assessment,
    };
  }
}
