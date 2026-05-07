import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminGuard, TenantAdminGuard } from '@org/shared';
import { AdminSystemService } from './system.service';

@ApiTags('Admin System')
@ApiBearerAuth()
@Controller('admin/system')
export class AdminSystemController {
  constructor(private readonly systemService: AdminSystemService) {}

  @Get('license')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Get on-prem license status' })
  async getLicenseStatus() {
    return this.systemService.getLicenseStatus();
  }

  @Get('tenant-info')
  @UseGuards(TenantAdminGuard)
  @ApiOperation({ summary: 'Get tenant subscription/plan info for current tenant' })
  async getTenantInfo(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    return this.systemService.getTenantInfo(tenantId);
  }

  @Get('features')
  @UseGuards(TenantAdminGuard)
  @ApiOperation({ summary: 'Get all features with quota status for current tenant' })
  async getTenantFeatures(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    return this.systemService.getTenantFeatures(tenantId);
  }

  @Get('usage')
  @UseGuards(TenantAdminGuard)
  @ApiOperation({ summary: 'Get usage history for current tenant' })
  async getTenantUsage(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user?.tenantId;
    return this.systemService.getTenantUsage(
      tenantId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('on-prem-status')
  @UseGuards(TenantAdminGuard)
  @ApiOperation({ summary: 'Get on-prem license status with features and usage' })
  async getOnPremStatus(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    return this.systemService.getOnPremStatus(tenantId);
  }
}
