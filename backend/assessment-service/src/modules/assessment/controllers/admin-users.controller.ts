import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CognitoAuthGuard } from '../../../auth/cognito-auth.guard';
import { AdminUsersService, AdminUsersResponse } from '../services/admin-users.service';

@Controller('admin/users')
@UseGuards(CognitoAuthGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  async listAdminUsers(
    @Query('q') q?: string,
    @Query('role') role?: 'admin' | 'proctor' | 'student',
    @Query('status') status?: 'active' | 'blocked' | 'pending',
    @Query('tech') tech?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<AdminUsersResponse> {
    return this.adminUsersService.listAdminUsers({
      q,
      role,
      status,
      tech: tech === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
