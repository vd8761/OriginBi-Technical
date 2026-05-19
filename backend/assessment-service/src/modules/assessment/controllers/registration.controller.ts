import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { Public } from '../../../auth/public.decorator';
import { RegistrationService, RegisterUserDto } from '../services/registration.service';
import { IsString, IsEmail, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

class RegisterBodyDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  mobileNumber?: string;

  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean;

  @IsString()
  @IsOptional()
  programCode?: string;

  @IsString()
  @IsOptional()
  schoolLevel?: string;

  @IsString()
  @IsOptional()
  schoolStream?: string;

  @IsString()
  @IsOptional()
  studentBoard?: string;

  @IsString()
  @IsOptional()
  departmentDegreeId?: string;

  @IsString()
  @IsOptional()
  currentYear?: string;

  @IsString()
  @IsOptional()
  currentRole?: string;

  @IsString()
  @IsOptional()
  roleDescription?: string;

  @IsString()
  @IsOptional()
  groupCode?: string;

  @IsString()
  @IsOptional()
  groupName?: string;

  @IsString()
  @IsOptional()
  pricingPolicy?: string;
}

@Controller('auth')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Public()
  @Post('register')
  async register(@Body() body: RegisterBodyDto) {
    if (!body.email?.trim()) {
      throw new BadRequestException('Email is required');
    }
    if (!body.password?.trim()) {
      throw new BadRequestException('Password is required');
    }
    if (!body.fullName?.trim()) {
      throw new BadRequestException('Full name is required');
    }

    return this.registrationService.registerUser({
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      gender: body.gender,
      mobileNumber: body.mobileNumber,
      countryCode: body.countryCode,
      sendEmail: body.sendEmail,
      programCode: body.programCode,
      schoolLevel: body.schoolLevel,
      schoolStream: body.schoolStream,
      studentBoard: body.studentBoard,
      departmentDegreeId: body.departmentDegreeId,
      currentYear: body.currentYear,
      currentRole: body.currentRole,
      roleDescription: body.roleDescription,
      groupName: body.groupName || body.groupCode,
      pricingPolicy: body.pricingPolicy,
    });
  }
}
