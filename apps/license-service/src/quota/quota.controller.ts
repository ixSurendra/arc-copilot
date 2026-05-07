import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QuotaService } from './quota.service';
import { CheckQuotaDto, SuperAdminGuard } from '@org/shared';

@ApiTags('Quota')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('quota')
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

  // --- TCP Patterns ---

  @MessagePattern({ cmd: 'check_quota' })
  async checkQuotaTcp(@Payload() data: CheckQuotaDto) {
    return this.quotaService.checkQuota(data);
  }

  @MessagePattern({ cmd: 'purchase_topup' })
  async purchaseTopUpTcp(@Payload() dto: { tenantId: number; featureId: number; additionalQuota: number; validityDays: number; userId?: number }) {
    return this.quotaService.purchaseTopUp(dto);
  }

  // --- HTTP Endpoints ---

  @Get('check')
  @ApiOperation({ summary: 'Check quota for a tenant/feature' })
  @ApiResponse({ status: 200, description: 'Quota check result' })
  async checkQuota(
    @Query('tenantId') tenantId: number,
    @Query('featureKey') featureKey: string,
    @Query('userId') userId?: number,
  ) {
    return this.quotaService.checkQuota({ tenantId, featureKey, userId });
  }

  @Post('top-up')
  @ApiOperation({ summary: 'Purchase a quota top-up' })
  @ApiResponse({ status: 201, description: 'Top-up purchased' })
  async purchaseTopUp(
    @Body() dto: { tenantId: number; featureId: number; additionalQuota: number; validityDays: number; userId?: number },
  ) {
    return this.quotaService.purchaseTopUp(dto);
  }
}
