import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  /** 'ADMIN' when the request comes from the admin portal. */
  @IsString()
  @IsOptional()
  group?: string;
}

class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

class LogoutDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** 10 attempts a minute per IP: enough for a fumbled password, not for a list. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(@Body() body: LoginDto, @Ip() ip: string) {
    return this.auth.login(body.email, body.password, body.group, ip);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  logout(@Body() body: LogoutDto) {
    return this.auth.logout(body.accessToken);
  }

  @Get('session')
  async session(@Headers('authorization') authorization?: string) {
    const session = await this.auth.session(authorization);
    if (!session) throw new UnauthorizedException('Not authenticated.');
    return session;
  }
}
