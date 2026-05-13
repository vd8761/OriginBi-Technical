// Verifies Cognito-issued access tokens (signature + expiry + issuer).
// We use the access token (not the id token) for session validation because
// it's what `AdminInitiateAuth` returns to the client for API calls.

import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

export interface VerifiedAccessToken {
  sub: string;
  username: string;
  scope?: string;
  groups?: string[];
  client_id: string;
  exp: number;
  iat: number;
}

@Injectable()
export class JwtVerifier implements OnModuleInit {
  private verifier!: ReturnType<typeof CognitoJwtVerifier.create>;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const userPoolId = this.config.get<string>('COGNITO_USER_POOL_ID');
    const clientId = this.config.get<string>('COGNITO_CLIENT_ID');
    if (!userPoolId || !clientId) {
      throw new Error(
        'JwtVerifier: COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set.',
      );
    }
    this.verifier = CognitoJwtVerifier.create({
      userPoolId,
      clientId,
      tokenUse: 'access',
    });
  }

  async verify(token: string): Promise<VerifiedAccessToken> {
    try {
      const payload = await this.verifier.verify(token);
      return payload as unknown as VerifiedAccessToken;
    } catch (err: any) {
      throw new UnauthorizedException(
        `Invalid or expired token: ${err?.message || 'verify failed'}`,
      );
    }
  }
}
