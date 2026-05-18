import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
  groupName?: string;
}

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);
  private readonly studentServiceUrl: string;

  constructor() {
    this.studentServiceUrl =
      process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL ||
      'http://localhost:4004';
  }

  async registerUser(dto: RegisterUserDto) {
    const email = dto.email.trim().toLowerCase();

    try {
      this.logger.log(`Forwarding tech assessment registration to student-service for: ${email}`);
      const res = await axios.post(`${this.studentServiceUrl}/student/register/tech`, {
        full_name: dto.fullName,
        email,
        mobile_number: dto.mobileNumber || '',
        country_code: dto.countryCode || '+91',
        password: dto.password,
        gender: dto.gender || 'MALE',
        program_code: dto.programCode || 'SCHOOL_STUDENT',
        school_level: dto.schoolLevel || null,
        school_stream: dto.schoolStream || null,
        student_board: dto.studentBoard || null,
        department_degree_id: dto.departmentDegreeId || null,
        current_year: dto.currentYear || null,
        metadata: {
          sendEmail: dto.sendEmail !== false,
          currentRole: dto.currentRole || null,
          roleDescription: dto.roleDescription || null,
          groupName: dto.groupName || null,
        },
      });

      this.logger.log(`Successfully registered tech assessment user: ${email} via student-service`);
      return {
        success: true,
        userId: res.data?.userId,
        email,
      };
    } catch (err: any) {
      this.logger.error(
        `Failed to register tech assessment user in student-service: ${err.message}`,
        err.response?.data,
      );
      const errMsg = err.response?.data?.message || err.message || 'Failed to create registration.';
      throw new BadRequestException(errMsg);
    }
  }

  async validateRegistration(email: string, mobileNumber?: string) {
    try {
      const res = await axios.post(`${this.studentServiceUrl}/student/validate-registration`, {
        email,
        mobile_number: mobileNumber,
      });
      return res.data; // { isValid: boolean; field?: string; message: string }
    } catch (err: any) {
      this.logger.error(`Validation check failed for ${email}: ${err.message}`);
      return { isValid: true, message: 'Skipped validation due to error' };
    }
  }
}
