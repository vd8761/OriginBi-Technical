export type InProgressAttempt = {
  module: string;
  attemptToken: string;
  assessmentCode: string;
  assessmentName?: string;
  startedAt?: string;
  expiresAt: string;
  timeLeftSeconds?: number;
  mode?: "trial" | "main";
  isBlockBased?: boolean;
};
