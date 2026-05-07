import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminGuard } from '@org/shared';
import { AdminUsageService } from './usage.service';

@ApiTags('Admin Usage')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('admin/usage')
export class AdminUsageController {
  constructor(private readonly usageService: AdminUsageService) {}

  @Get()
  @ApiOperation({ summary: 'Query usage records' })
  async findAll(
    @Query('tenantId') tenantId?: string,
    @Query('featureId') featureId?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usageService.queryUsage({
      ...(tenantId !== undefined && { tenantId: Number(tenantId) }),
      ...(featureId !== undefined && { featureId: Number(featureId) }),
      ...(userId !== undefined && { userId: Number(userId) }),
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get aggregated usage summary stats' })
  async getUsageSummary() {
    return this.usageService.getUsageSummary();
  }

  @Get('tenant-breakdown')
  @ApiOperation({ summary: 'Get per-tenant feature consumption with quota limits' })
  async getTenantFeatureBreakdown(
    @Query('tenantId') tenantId?: string,
  ) {
    return this.usageService.getTenantFeatureBreakdown(
      tenantId ? Number(tenantId) : undefined,
    );
  }

  @Post('record')
  @ApiOperation({ summary: 'Record a usage event' })
  async recordUsage(@Body() dto: Record<string, unknown>) {
    return this.usageService.recordUsage(dto);
  }
}
