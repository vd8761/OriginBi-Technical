import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { CognitoService } from './cognito.service';

class RegisterDto {
  @IsEmail() @IsNotEmpty() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @IsNotEmpty() fullName!: string;
  @IsString() @IsNotEmpty() gender!: string;
  @IsString() @IsNotEmpty() countryCode!: string;
  @IsString() @IsNotEmpty() mobileNumber!: string;
  @IsString() @IsOptional() groupName?: string;
}

class LoginDto {
  @IsEmail() @IsNotEmpty() email!: string;
  @IsString() @IsNotEmpty() password!: string;
}

class RefreshDto {
  @IsString() @IsNotEmpty() refreshToken!: string;
}

class LogoutDto {
  @IsString() @IsNotEmpty() accessToken!: string;
}

class ForgotDto {
  @IsEmail() @IsNotEmpty() email!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly cognito: CognitoService) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.cognito.register({
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      gender: body.gender,
      countryCode: body.countryCode,
      mobileNumber: body.mobileNumber,
      groupName: body.groupName,
    });
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.cognito.login(body.email, body.password);
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshDto) {
    return this.cognito.refreshToken(body.refreshToken);
  }

  @Post('logout')
  async logout(@Body() body: LogoutDto) {
    return this.cognito.logout(body.accessToken);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotDto) {
    if (!body.email) throw new BadRequestException('email is required');
    return this.cognito.forgotPassword(body.email);
  }

  @Get('session')
  async session(@Headers('authorization') authHeader?: string) {
    const token = extractBearer(authHeader);
    if (!token) throw new UnauthorizedException('Missing Bearer token.');
    return this.cognito.session(token);
  }
}

function extractBearer(h?: string): string | null {
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1] : null;
}
