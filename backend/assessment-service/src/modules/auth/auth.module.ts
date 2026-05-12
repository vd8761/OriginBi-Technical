import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { CognitoModule } from './cognito.module';

@Module({
  imports: [CognitoModule],
  controllers: [AuthController],
})
export class AuthModule {}
