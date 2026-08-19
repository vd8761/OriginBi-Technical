import { Controller, Get, UseGuards } from '@nestjs/common';
import { CognitoAuthGuard } from '../../../auth/cognito-auth.guard';
import { Roles } from '../../../auth/roles.decorator';
import { AdminDashboardService, DashboardSummaryResponse } from '../services/admin-dashboard.service';

@Controller('admin/dashboard-summary')
@Roles('ADMIN')
@UseGuards(CognitoAuthGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  async getSummary(): Promise<DashboardSummaryResponse> {
    return this.adminDashboardService.getSummary();
  }
}
