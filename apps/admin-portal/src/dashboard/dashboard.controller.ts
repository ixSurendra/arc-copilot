import { Controller, Get, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantAdminGuard, TenantScopeInterceptor, SuperAdminGuard } from '@org/shared';
import { DashboardService } from './dashboard.service';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @UseGuards(TenantAdminGuard)
  @UseInterceptors(TenantScopeInterceptor)
  @ApiOperation({ summary: 'Get dashboard overview stats' })
  @ApiResponse({ status: 200, description: 'Aggregated dashboard statistics' })
  async getDashboard(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    const isSuperAdmin =
      tenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    return this.dashboardService.getDashboardStats(
      isSuperAdmin ? undefined : tenantId,
    );
  }

  @Get('analytics')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Get dashboard analytics (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Analytics data for charts' })
  async getAnalytics() {
    return this.dashboardService.getDashboardAnalytics();
  }

  @Get('monthly-users')
  @UseGuards(TenantAdminGuard)
  @UseInterceptors(TenantScopeInterceptor)
  @ApiOperation({ summary: 'Get monthly user registrations' })
  @ApiResponse({ status: 200, description: 'Monthly user registration counts' })
  async getMonthlyUsers(
    @Req() req: any,
    @Query('year') year?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const y = year ? Number(year) : new Date().getFullYear();
    // Read tenantId directly from JWT — interceptor-modified @Query is unreliable
    const userTenantId = req.user?.tenantId;
    const isSuperAdmin =
      userTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    const tid = isSuperAdmin
      ? (tenantId ? Number(tenantId) : undefined)
      : userTenantId;
    return this.dashboardService.getMonthlyUserRegistrations(y, tid);
  }
}
