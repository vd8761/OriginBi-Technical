import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface CertificateEmailPayload {
  toEmail: string;
  userName: string;
  assessmentTitle: string;
  assessmentModule: string;
  overallScorePercent: number;
  grade: string;
  certificateId: string;
  completedAt: string;
  verifyUrl?: string;
  subject?: string;
}

/**
 * Delegates certificate email sending to the student-service, which owns
 * the AWS SES v2 transporter and the branded email templates.
 *
 * Endpoint: POST {STUDENT_SERVICE_URL}/student/tech-certificate-email
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private get studentServiceUrl(): string {
    return (
      process.env.STUDENT_SERVICE_URL ||
      process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL ||
      'http://localhost:4004'
    );
  }

  async sendCertificateEmail(payload: CertificateEmailPayload): Promise<void> {
    const url = `${this.studentServiceUrl}/student/tech-certificate-email`;

    try {
      await axios.post(url, payload, {
        timeout: 10_000,
        headers: { 'Content-Type': 'application/json' },
      });
      this.logger.log(
        `Certificate email delegated to student-service for ${payload.toEmail} [${payload.certificateId}]`,
      );
    } catch (err: any) {
      // Log but never throw — email failure must not break the submit response
      const detail =
        err?.response?.data
          ? JSON.stringify(err.response.data)
          : err?.message ?? String(err);
      this.logger.error(
        `Failed to delegate certificate email to student-service: ${detail}`,
      );
    }
  }
}
