import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, IAuthUser } from '@dayaar/shared';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Roles(Role.ADMIN)
  @Get('admin-dashboard')
  async getAdminDashboard(@CurrentUser() user: IAuthUser) {
    return this.analyticsService.getAdminDashboard(user.organizationId);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('manager-dashboard')
  async getManagerDashboard(@CurrentUser() user: IAuthUser) {
    return this.analyticsService.getManagerDashboard(user.id, user.organizationId);
  }

  @Get('my-performance')
  async getMyPerformance(@CurrentUser() user: IAuthUser) {
    return this.analyticsService.getEmployeePerformance(user);
  }
}
