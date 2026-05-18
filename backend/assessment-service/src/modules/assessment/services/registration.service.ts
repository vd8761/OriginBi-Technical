import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import axios from 'axios';

export interface RegisterUserDto {
  email: string;
  password: string;
  fullName: string;
  gender?: string;
  mobileNumber?: string;
  countryCode?: string;
  sendEmail?: boolean;
  programCode?: string;
  schoolLevel?: string;
  schoolStream?: string;
  studentBoard?: string;
  departmentDegreeId?: string;
  currentYear?: string;
  currentRole?: string;
  roleDescription?: string;
}

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);
  private readonly authServiceUrl: string;

  constructor(private dataSource: DataSource) {
    this.authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4002';
  }

  async registerUser(dto: RegisterUserDto) {
    const email = dto.email.trim().toLowerCase();

    // 1. Check if user already exists in our DB
    const existing = await this.dataSource.query(
      `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [email],
    );
    if (existing.length > 0) {
      throw new BadRequestException('Email address is already registered.');
    }

    // 2. Create user in Cognito via auth-service (STUDENT group only)
    let cognitoSub = '';
    try {
      const cognitoRes = await axios.post(`${this.authServiceUrl}/internal/cognito/users`, {
        email,
        password: dto.password,
        groupName: 'STUDENT',
      });
      cognitoSub = cognitoRes.data?.sub || '';
    } catch (err: any) {
      this.logger.error('Cognito user creation failed', err.response?.data || err.message);
      if (err.response?.data?.message?.includes('already exists') || err.response?.status === 409) {
        throw new BadRequestException('Email address is already registered.');
      }
      throw new BadRequestException('Failed to create authentication credentials. Please try again.');
    }

    // 3. Create user record in DB (users table only — no registration/session/attempt)
    const result = await this.dataSource.query(
      `INSERT INTO users (email, role, metadata, created_at, is_active)
       VALUES ($1, 'STUDENT', $2, NOW(), true)
       RETURNING id`,
      [
        email,
        JSON.stringify({
          fullName: dto.fullName,
          mobileNumber: dto.mobileNumber || '',
          countryCode: dto.countryCode || '+91',
          gender: dto.gender || 'MALE',
          hasChangedPassword: true,
          cognitoSub,
          registrationSource: 'originbi-technical',
        }),
      ],
    );

    const userId = result[0]?.id;

    // Look up program ID if programCode is supplied
    let programId: number | null = null;
    if (dto.programCode) {
      const programRows = await this.dataSource.query(
        `SELECT id FROM programs WHERE code = $1 LIMIT 1`,
        [dto.programCode],
      );
      if (programRows.length > 0) {
        programId = programRows[0].id;
      }
    }

    // 4. Create a registration record marked as tech assessment (so the user shows up in admin panel)
    //    but with NO session/attempt/schedule created (so no behavioral assessment is assigned)
    await this.dataSource.query(
      `INSERT INTO registrations (
        user_id, registration_source, full_name, mobile_number, country_code, gender, 
        status, payment_status, payment_amount, payment_provider, paid_at, 
        is_tech_assessment, school_level, school_stream, student_board, 
        department_degree_id, program_id, metadata, created_at, updated_at
      )
       VALUES (
        $1, 'ADMIN', $2, $3, $4, $5, 'COMPLETED', 'PAID', '0.00', 'FREE', NOW(), 1, 
        $6, $7, $8, $9, $10, $11, NOW(), NOW()
      )`,
      [
        userId,
        dto.fullName,
        dto.mobileNumber || '',
        dto.countryCode || '+91',
        dto.gender || 'MALE',
        dto.schoolLevel || null,
        dto.schoolStream || null,
        dto.studentBoard || null,
        dto.departmentDegreeId ? parseInt(dto.departmentDegreeId, 10) : null,
        programId,
        JSON.stringify({
          sendEmail: dto.sendEmail !== false,
          registrationSource: 'originbi-technical',
          currentYear: dto.currentYear || null,
          currentRole: dto.currentRole || null,
          roleDescription: dto.roleDescription || null,
        }),
      ],
    );

    this.logger.log(`Tech assessment user created: ${email} (userId: ${userId})`);

    return {
      success: true,
      userId,
      email,
    };
  }
}
