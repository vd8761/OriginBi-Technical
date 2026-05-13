// Shared shapes for the auth flow.

export interface ApiUser {
  id: string;                    // BIGINT serialized as string for safety
  email: string;
  role: string | null;
  cognitoSub: string | null;
  emailVerified: boolean;
  isActive: boolean;
}

export interface ApiRegistration {
  id: string;
  fullName: string | null;
  gender: string | null;
  countryCode: string;
  mobileNumber: string;
  status: string;
  isTechAssessment: boolean;
}

export interface AuthResponse {
  user: ApiUser;
  registration: ApiRegistration | null;
  tokens: {
    accessToken: string;
    idToken: string;
    refreshToken?: string;
    expiresIn?: number;
    tokenType?: string;
  };
}
