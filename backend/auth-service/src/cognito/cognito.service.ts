import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  AdminListGroupsForUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  ForgotPasswordCommand,
  GetUserCommand,
  GlobalSignOutCommand,
} from '@aws-sdk/client-cognito-identity-provider';

/**
 * Every call this platform makes to Cognito. Ported from the sibling
 * originbi auth-service; the differences are deliberate:
 *
 *  - COGNITO_ENDPOINT support, so local-dev's cognito-local simulator can
 *    stand in for AWS without a second code path. It is unset in every real
 *    deployment — leaving it unset is what makes AWS the default.
 *  - fails fast on missing configuration rather than authenticating nobody.
 */
@Injectable()
export class CognitoService {
  private readonly logger = new Logger(CognitoService.name);
  private readonly client: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly clientId: string;

  constructor() {
    const region = process.env.COGNITO_REGION;
    this.userPoolId = process.env.COGNITO_USER_POOL_ID as string;
    this.clientId = process.env.COGNITO_CLIENT_ID as string;

    if (!region) throw new Error('COGNITO_REGION is not set');
    if (!this.userPoolId) throw new Error('COGNITO_USER_POOL_ID is not set');
    if (!this.clientId) throw new Error('COGNITO_CLIENT_ID is not set');

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const endpoint = process.env.COGNITO_ENDPOINT;

    // The Admin* commands are IAM-signed, so credentials are required even for
    // login. The local simulator accepts any value.
    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'AWS credentials missing. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.',
      );
    }
    if (endpoint) {
      this.logger.warn(
        `COGNITO_ENDPOINT is set (${endpoint}) - talking to a Cognito simulator, not AWS. This must never be set in production.`,
      );
    }

    this.client = new CognitoIdentityProviderClient({
      region,
      ...(endpoint ? { endpoint } : {}),
      credentials: {
        accessKeyId,
        secretAccessKey,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      },
    });
  }

  /** Retries only AWS throttling; every other failure surfaces immediately. */
  private async withRetry<T>(
    op: () => Promise<T>,
    maxRetries = 5,
    baseDelay = 500,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await op();
      } catch (error: any) {
        lastError = error;
        const throttled =
          error?.name === 'TooManyRequestsException' ||
          error?.name === 'ThrottlingException';
        if (!throttled || attempt === maxRetries) throw error;
        const delay = baseDelay * 2 ** attempt;
        this.logger.warn(
          `Cognito throttled; retrying in ${delay}ms (${attempt + 1}/${maxRetries})`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastError;
  }

  /** Creates (or repairs) a user with a permanent password and group. */
  async createUserWithPermanentPassword(
    email: string,
    password: string,
    groupName = 'STUDENT',
  ) {
    let username = email;
    let sub: string | null = null;

    try {
      const created = await this.withRetry(() =>
        this.client.send(
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
      username = created.User?.Username || email;
      sub =
        created.User?.Attributes?.find((a) => a.Name === 'sub')?.Value ?? null;
    } catch (error: any) {
      if (error?.name !== 'UsernameExistsException') throw this.toHttp(error);
      username = email;
    }

    try {
      await this.withRetry(() =>
        this.client.send(
          new AdminSetUserPasswordCommand({
            UserPoolId: this.userPoolId,
            Username: username,
            Password: password,
            Permanent: true,
          }),
        ),
      );
    } catch (error: any) {
      throw this.toHttp(error);
    }

    // Group membership is optional and best-effort on this platform.
    // Authorization is decided by `users.role` in this database, not by a
    // Cognito group (see AuthService.login), so a pool without the group
    // configured must not cost a candidate their registration. Set
    // COGNITO_DEFAULT_GROUP only if something outside this repo reads groups.
    if (groupName) {
      try {
        await this.withRetry(() =>
          this.client.send(
            new AdminAddUserToGroupCommand({
              UserPoolId: this.userPoolId,
              Username: username,
              GroupName: groupName,
            }),
          ),
        );
      } catch (error: any) {
        this.logger.warn(
          `Could not add ${email} to Cognito group ${groupName} (${error?.name}). The account is usable; role comes from the users table.`,
        );
      }
    }

    if (!sub) {
      try {
        const got = await this.withRetry(() =>
          this.client.send(
            new AdminGetUserCommand({
              UserPoolId: this.userPoolId,
              Username: username,
            }),
          ),
        );
        sub = got.UserAttributes?.find((a) => a.Name === 'sub')?.Value ?? null;
      } catch {
        // sub falls back to the username below
      }
    }

    return { sub: sub ?? username, email, group: groupName };
  }

  /**
   * Authenticates and, when requiredGroup is given, refuses a user outside it.
   * Group membership is Cognito's answer; the caller's *role* on this platform
   * is a separate question answered by the users table.
   */
  async login(email: string, password: string, requiredGroup?: string) {
    try {
      const response = await this.client.send(
        new AdminInitiateAuthCommand({
          UserPoolId: this.userPoolId,
          ClientId: this.clientId,
          // ADMIN_USER_PASSWORD_AUTH, not the legacy ADMIN_NO_SRP_AUTH alias
          // the sibling used: AWS documents this name, and the local Cognito
          // simulator implements only this one. The app client must have
          // ALLOW_ADMIN_USER_PASSWORD_AUTH enabled.
          AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
          AuthParameters: { USERNAME: email, PASSWORD: password },
        }),
      );

      if (response.ChallengeName) {
        // e.g. NEW_PASSWORD_REQUIRED. The frontend has no challenge UI, and
        // registration sets permanent passwords, so this means a hand-made user.
        throw new HttpException(
          `Sign-in challenge ${response.ChallengeName} is not supported. Reset the password for this account.`,
          HttpStatus.CONFLICT,
        );
      }

      if (requiredGroup) {
        const groupsRes = await this.client.send(
          new AdminListGroupsForUserCommand({
            UserPoolId: this.userPoolId,
            Username: email,
          }),
        );
        const groups = (groupsRes.Groups ?? []).map((g) => g.GroupName);
        if (!groups.includes(requiredGroup)) {
          throw new HttpException(
            'Access denied. You do not have permission to access this portal.',
            HttpStatus.FORBIDDEN,
          );
        }
      }

      const result = response.AuthenticationResult;
      return {
        accessToken: result?.AccessToken,
        idToken: result?.IdToken,
        refreshToken: result?.RefreshToken,
        expiresIn: result?.ExpiresIn,
        tokenType: result?.TokenType ?? 'Bearer',
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      // All three mean "these credentials are wrong" on this path, and they
      // get one indistinguishable answer: a different status or message per
      // case turns the login form into an account-enumeration oracle.
      // InvalidPasswordException is a password-policy error when creating a
      // user, but here it is only ever a bad password (the local Cognito
      // simulator raises it where AWS raises NotAuthorizedException).
      if (
        error?.name === 'NotAuthorizedException' ||
        error?.name === 'UserNotFoundException' ||
        error?.name === 'InvalidPasswordException'
      ) {
        throw new HttpException(
          'Incorrect username or password.',
          HttpStatus.UNAUTHORIZED,
        );
      }
      this.logger.error(
        `Login failed for ${email}: ${error?.name} ${error?.message}`,
      );
      throw this.toHttp(error);
    }
  }

  async refresh(refreshToken: string) {
    try {
      const response = await this.client.send(
        new AdminInitiateAuthCommand({
          UserPoolId: this.userPoolId,
          ClientId: this.clientId,
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          AuthParameters: { REFRESH_TOKEN: refreshToken },
        }),
      );
      const result = response.AuthenticationResult;
      if (!result?.AccessToken || !result.IdToken) {
        throw new HttpException('Refresh failed.', HttpStatus.UNAUTHORIZED);
      }
      return {
        accessToken: result.AccessToken,
        idToken: result.IdToken,
        expiresIn: result.ExpiresIn,
        tokenType: result.TokenType ?? 'Bearer',
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      // An expired or revoked refresh token is the normal case here, not a fault.
      throw new HttpException('Refresh failed.', HttpStatus.UNAUTHORIZED);
    }
  }

  async logout(accessToken: string) {
    try {
      await this.client.send(
        new GlobalSignOutCommand({ AccessToken: accessToken }),
      );
    } catch (error: any) {
      // Already-expired tokens land here. The caller clears local state anyway.
      this.logger.warn(`Global sign-out ignored: ${error?.name}`);
    }
    return { message: 'Logged out successfully' };
  }

  /** Resolves the email behind a bearer access token. Returns null if invalid. */
  async emailFromAccessToken(accessToken: string): Promise<string | null> {
    try {
      const out = await this.client.send(
        new GetUserCommand({ AccessToken: accessToken }),
      );
      return (
        out.UserAttributes?.find((a) => a.Name === 'email')?.Value ??
        out.Username ??
        null
      );
    } catch {
      return null;
    }
  }

  /** Sends Cognito's reset code. Never reveals whether the account exists. */
  async forgotPassword(email: string) {
    try {
      await this.client.send(
        new ForgotPasswordCommand({ ClientId: this.clientId, Username: email }),
      );
    } catch (error: any) {
      if (error?.name === 'UserNotFoundException') return;
      if (error?.name === 'LimitExceededException') {
        throw new HttpException(
          'Too many reset attempts. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw this.toHttp(error);
    }
  }

  private toHttp(error: any): HttpException {
    if (error instanceof HttpException) return error;
    if (
      error?.name === 'TooManyRequestsException' ||
      error?.name === 'ThrottlingException'
    ) {
      return new HttpException(
        'Too many requests. Please wait a moment and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (error?.name === 'InvalidPasswordException') {
      return new HttpException(
        error?.message ?? 'Password does not meet the policy.',
        HttpStatus.BAD_REQUEST,
      );
    }
    this.logger.error(`Cognito error: ${error?.name} - ${error?.message}`);
    return new InternalServerErrorException('Identity provider error.');
  }
}
