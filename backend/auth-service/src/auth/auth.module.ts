import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersRepository } from '../common/users.repository';

@Module({
  controllers: [AuthController],
  providers: [AuthService, UsersRepository],
  exports: [AuthService],
})
export class AuthModule {}
