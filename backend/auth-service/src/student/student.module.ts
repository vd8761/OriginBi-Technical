import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { ForgotPasswordController } from './forgot-password.controller';
import { ForgotPasswordService } from './forgot-password.service';
import { UsersRepository } from '../common/users.repository';

@Module({
  controllers: [StudentController, ForgotPasswordController],
  providers: [StudentService, ForgotPasswordService, UsersRepository],
})
export class StudentModule {}
