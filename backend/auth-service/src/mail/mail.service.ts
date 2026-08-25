import { Injectable, Logger } from '@nestjs/common';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { getTechWelcomeEmailTemplate } from './templates/tech-welcome.template';
import { getTechAssessmentCertificateTemplate } from './templates/tech-assessment-certificate.template';

const MODULE_LABELS: Record<string, string> = {
  aptitude: 'Aptitude',
  communication: 'Communication',
  coding: 'Coding',
  mnc: 'MNC Readiness',
  role: 'Role Readiness',
};

const GRADE_LABELS: Record<string, string> = {
  A: 'Excellent',
  B: 'Very Good',
  C: 'Good',
  D: 'Satisfactory',
  E: 'Needs Improvement',
  F: 'Not Qualified',
};

/**
 * Outbound email for this platform, sent through SES v2 directly.
 *
 * Previously assessment-service posted certificate mail to the sibling
 * platform's student-service, which owned the SES transporter — one more
 * cross-repo dependency for what is two templates and one API call. The
 * templates are copied from there unchanged so the branding stays identical.
 *
 * Every method is best-effort: a mail failure is logged, never thrown. Losing
 * an email must not fail a registration or a submitted assessment.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private client: SESv2Client | null = null;

  private get frontendUrl(): string {
    return (process.env.TECH_FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  }

  private get fromAddress(): string | null {
    const address = process.env.EMAIL_FROM;
    if (!address) return null;
    const name = process.env.EMAIL_SEND_FROM_NAME || 'Origin BI Mind Works';
    return `"${name.replace(/"/g, '')}" <${address}>`;
  }

  /** Null when SES is not configured — the caller then skips sending. */
  private getClient(): SESv2Client | null {
    if (this.client) return this.client;
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!region || !accessKeyId || !secretAccessKey || !process.env.EMAIL_FROM) {
      return null;
    }
    this.client = new SESv2Client({ region, credentials: { accessKeyId, secretAccessKey } });
    return this.client;
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const client = this.getClient();
    const from = this.fromAddress;
    if (!client || !from) {
      this.logger.warn(
        `Email to ${to} not sent: SES is not configured (needs AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, EMAIL_FROM).`,
      );
      return;
    }
    try {
      await client.send(
        new SendEmailCommand({
          FromEmailAddress: from,
          Destination: { ToAddresses: [to] },
          Content: {
            Simple: {
              Subject: { Data: subject, Charset: 'UTF-8' },
              Body: { Html: { Data: html, Charset: 'UTF-8' } },
            },
          },
        }),
      );
      this.logger.log(`Sent "${subject}" to ${to}`);
    } catch (error: any) {
      this.logger.error(`SES send failed for ${to}: ${error?.name} - ${error?.message}`);
    }
  }

  async sendWelcomeEmail(input: {
    toEmail: string;
    userName: string;
    password: string;
    isTemporary?: boolean;
  }): Promise<void> {
    const assets = this.assets();
    const html = getTechWelcomeEmailTemplate(
      input.userName,
      input.toEmail,
      input.password,
      this.frontendUrl,
      assets,
      input.isTemporary,
    );
    await this.send(
      input.toEmail,
      'Welcome to OriginBI Technical Assessment - Your Access is Ready!',
      html,
    );
  }

  async sendCertificateEmail(input: {
    toEmail: string;
    userName: string;
    assessmentTitle: string;
    assessmentModule: string;
    overallScorePercent?: number;
    grade?: string;
    certificateId: string;
    completedAt?: string;
    verifyUrl?: string;
    subject?: string;
  }): Promise<void> {
    const rawDate = input.completedAt ? new Date(input.completedAt) : new Date();
    const date = Number.isNaN(rawDate.getTime()) ? new Date() : rawDate;
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const grade = input.grade ?? '';
    const score = Number(input.overallScorePercent ?? 0);
    const module = String(input.assessmentModule ?? '').toLowerCase();

    const html = getTechAssessmentCertificateTemplate(
      input.userName,
      input.assessmentTitle,
      MODULE_LABELS[module] ?? input.assessmentModule,
      score,
      grade,
      GRADE_LABELS[grade.toUpperCase()] ?? grade,
      input.certificateId,
      formattedDate,
      input.verifyUrl || `${this.frontendUrl}/verify/${input.certificateId}`,
      this.frontendUrl,
      this.assets(),
    );

    const subject =
      input.subject ||
      `You have successfully completed the ${input.assessmentTitle} - Your Certificate is Ready \u{1F393}`;
    await this.send(input.toEmail, subject, html);
  }

  /**
   * Both templates expect absolute image URLs. They are served from the
   * frontend's `public/` directory, so they resolve wherever the app is
   * deployed without a second asset host.
   */
  private assets() {
    return {
      logo: `${this.frontendUrl}/Origin-BI-Logo-01.png`,
      footer: `${this.frontendUrl}/Email_Vector.png`,
      popper: `${this.frontendUrl}/Popper.png`,
      pattern: `${this.frontendUrl}/Pattern_mask.png`,
    };
  }
}
