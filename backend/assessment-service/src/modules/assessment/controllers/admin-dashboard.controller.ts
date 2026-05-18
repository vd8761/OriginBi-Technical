import { Controller, Get, UseGuards } from '@nestjs/common';
import { CognitoAuthGuard } from '../../../auth/cognito-auth.guard';
import { AdminDashboardService, DashboardSummaryResponse } from '../services/admin-dashboard.service';

@Controller('admin/dashboard-summary')
@UseGuards(CognitoAuthGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  async getSummary(): Promise<DashboardSummaryResponse> {
    return this.adminDashboardService.getSummary();
  }
}
