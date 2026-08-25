import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ForgotPasswordService } from './forgot-password.service';
import { EmailDto } from './dto';

@Controller('forgot-password')
export class ForgotPasswordController {
  constructor(private readonly forgotPassword: ForgotPasswordService) {}

  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @Post('initiate')
  initiate(@Body() body: EmailDto) {
    return this.forgotPassword.initiate(body.email);
  }
}
