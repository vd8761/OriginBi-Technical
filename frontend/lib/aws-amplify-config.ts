'use client';

import { Amplify } from 'aws-amplify';

let isConfigured = false;

export function configureAmplify() {
  // Prevent multiple configurations (Next.js strict mode safe)
  if (isConfigured) return;

  const region = process.env.NEXT_PUBLIC_COGNITO_REGION;
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID;
  const identityPoolId = process.env.NEXT_PUBLIC_AWS_IDENTITY_POOL_ID;

  // Helpful warning during local dev
  if (!region || !userPoolId || !userPoolClientId) {
    console.warn(
      '[Amplify] Missing Cognito environment variables. ' +
      'Check NEXT_PUBLIC_COGNITO_REGION, ' +
      'NEXT_PUBLIC_COGNITO_USER_POOL_ID, ' +
      'NEXT_PUBLIC_COGNITO_APP_CLIENT_ID'
    );
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: userPoolId as string,
        userPoolClientId: userPoolClientId as string,
        ...(identityPoolId ? { identityPoolId: identityPoolId as string } : {}),

        /**
         * EMAIL-ONLY LOGIN
         * Admin / Student / Corporate
         * (email is passed as "username" in signIn)
         */
        loginWith: {
          email: true,
        },
      } as any,
    },
  });

  isConfigured = true;
}
