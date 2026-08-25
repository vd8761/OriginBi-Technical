import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { StudentService } from './student.service';
import { MailService } from '../mail/mail.service';
import { CertificateEmailDto, EmailDto, RegisterTechDto } from './dto';

/**
 * The endpoints the frontend reaches through its `/student-api` rewrite, and
 * the two assessment-service calls out to. They were served by the sibling
 * platform's student-service until this repo was separated; only the routes
 * this platform actually uses were brought across.
 *
 * All POST, including the reads — that is the shape the existing frontend
 * already calls, and changing it would mean touching every call site.
 */
@Controller('student')
export class StudentController {
  constructor(
    private readonly students: StudentService,
    private readonly mail: MailService,
  ) {}

  @Post('profile')
  profile(@Body() body: EmailDto) {
    return this.students.getProfile(body.email);
  }

  @Post('login-status')
  loginStatus(@Body() body: EmailDto) {
    return this.students.checkLoginStatus(body.email);
  }

  @Post('complete-first-login')
  completeFirstLogin(@Body() body: EmailDto) {
    return this.students.completeFirstLogin(body.email);
  }

  @Post('departments')
  departments() {
    return this.students.getDepartments();
  }

  /** Self-service sign-up. Rate-limited: it creates Cognito users. */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register/tech')
  registerTech(@Body() body: RegisterTechDto) {
    return this.students.registerTech(body);
  }

  /**
   * Called by assessment-service after a certificate is issued. Returns
   * success even when SES is unconfigured: the caller logs and moves on, and a
   * missing email must never fail a submitted assessment.
   */
  @Post('tech-certificate-email')
  async certificateEmail(@Body() body: CertificateEmailDto) {
    await this.mail.sendCertificateEmail(body);
    return { success: true };
  }
}
