import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString, IsBoolean } from 'class-validator';

export class EmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

/**
 * Mirrors the body assessment-service's RegistrationService already sends
 * (`backend/assessment-service/src/modules/assessment/services/registration.service.ts`),
 * which is snake_case because it was written against the sibling platform's
 * student-service. Kept identical so that service needs no change.
 */
export class RegisterTechDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsString()
  @IsOptional()
  mobile_number?: string;

  @IsString()
  @IsOptional()
  country_code?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  program_code?: string;

  @IsString()
  @IsOptional()
  school_level?: string;

  @IsString()
  @IsOptional()
  school_stream?: string;

  @IsString()
  @IsOptional()
  student_board?: string;

  @IsString()
  @IsOptional()
  department_degree_id?: string;

  @IsString()
  @IsOptional()
  current_year?: string;

  @IsString()
  @IsOptional()
  registration_source?: string;

  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  send_email?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/** Payload assessment-service's EmailService posts after a certificate is issued. */
export class CertificateEmailDto {
  @IsEmail()
  @IsNotEmpty()
  toEmail: string;

  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsString()
  @IsNotEmpty()
  assessmentTitle: string;

  @IsString()
  @IsNotEmpty()
  assessmentModule: string;

  @IsOptional()
  overallScorePercent?: number;

  @IsString()
  @IsOptional()
  grade?: string;

  @IsString()
  @IsNotEmpty()
  certificateId: string;

  @IsString()
  @IsOptional()
  completedAt?: string;

  @IsString()
  @IsOptional()
  verifyUrl?: string;

  @IsString()
  @IsOptional()
  subject?: string;
}
