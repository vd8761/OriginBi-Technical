import { SetMetadata } from '@nestjs/common';

/**
 * Marks a controller class or handler method as publicly accessible — the
 * global `CognitoAuthGuard` will skip JWT verification on requests routed to
 * decorated targets. Use sparingly for health checks, webhooks signed by an
 * upstream secret, and other endpoints that genuinely cannot present a
 * Cognito access token.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
