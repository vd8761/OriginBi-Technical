import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CognitoService } from './cognito.service';
import { JwtVerifier } from './jwt.verifier';

@Module({
  imports: [ConfigModule],
  providers: [CognitoService, JwtVerifier],
  exports: [CognitoService, JwtVerifier],
})
export class CognitoModule {}
