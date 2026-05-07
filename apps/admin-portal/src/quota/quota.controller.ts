import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminGuard } from '@arc/shared';
import { AdminQuotaService } from './quota.service';

@ApiTags('Admin Quota')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('admin/quota')
export class AdminQuotaController {
  constructor(private readonly quotaService: AdminQuotaService) {}

  @Get('check')
  @ApiOperation({ summary: 'Check quota for a tenant/feature' })
  async checkQuota(
    @Query('tenantId') tenantId: string,
    @Query('featureKey') featureKey: string,
    @Query('userId') userId?: string,
  ) {
    return this.quotaService.checkQuota({
      tenantId: Number(tenantId),
      featureKey,
      ...(userId !== undefined && { userId: Number(userId) }),
    });
  }

  @Post('top-up')
  @ApiOperation({ summary: 'Purchase a quota top-up' })
  async purchaseTopUp(@Body() dto: Record<string, unknown>) {
    return this.quotaService.purchaseTopUp(dto);
  }
}
