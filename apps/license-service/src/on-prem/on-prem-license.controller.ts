import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BillingCycle, Public, GenerateLicenseDto } from '@arc/shared';
import type { LicenseValidationResult } from '@arc/shared';
import { OnPremLicenseService } from './on-prem-license.service';
import { OnPremGuard } from './on-prem.guard';

@ApiTags('On-Prem License')
@Controller('on-prem')
export class OnPremLicenseController {
  constructor(private readonly onPremLicenseService: OnPremLicenseService) {}

  @UseGuards(OnPremGuard)
  @Post('license')
  @HttpCode(201)
  @ApiOperation({ summary: 'Generate a signed on-prem license file for a tenant' })
  @ApiResponse({ status: 201, description: 'Signed license with persisted record' })
  @ApiResponse({ status: 403, description: 'Not available outside on-premise deployments' })
  generateLicense(@Body() dto: GenerateLicenseDto) {
    return this.onPremLicenseService.generateLicense(
      dto.tenantId,
      dto.planId,
      dto.expiresAt,
      dto.startDate,
      dto.cycle,
      dto.maxUsers,
      dto.issuedBy,
    );
  }

  @UseGuards(OnPremGuard)
  @Public()
  @Get('license/status')
  @ApiOperation({ summary: 'Check current on-prem license status' })
  @ApiResponse({ status: 200, description: 'License validation result with expiry info' })
  @ApiResponse({ status: 403, description: 'Not available outside on-premise deployments' })
  getLicenseStatus(): LicenseValidationResult {
    return this.onPremLicenseService.validateCurrentLicense();
  }

  // ── TCP Patterns ────────────────────────────────────────

  @MessagePattern({ cmd: 'validate_license' })
  validateLicenseTcp(): LicenseValidationResult {
    return this.onPremLicenseService.validateCurrentLicense();
  }

  @MessagePattern({ cmd: 'generate_license' })
  async generateLicenseTcp(
    @Payload()
    data: {
      tenantId: number;
      planId: number;
      expiresAt: string;
      startDate?: string;
      cycle?: string;
      maxUsers?: number;
      issuedBy?: number;
    },
  ) {
    return this.onPremLicenseService.generateLicense(
      Number(data.tenantId),
      Number(data.planId),
      data.expiresAt,
      data.startDate,
      (data.cycle as BillingCycle) || BillingCycle.ANNUALLY,
      data.maxUsers ? Number(data.maxUsers) : undefined,
      data.issuedBy ? Number(data.issuedBy) : undefined,
    );
  }

  @MessagePattern({ cmd: 'get_tenant_licenses' })
  async getTenantLicensesTcp(
    @Payload() data: { tenantId: number; page?: number; limit?: number },
  ) {
    return this.onPremLicenseService.getTenantLicenses(
      Number(data.tenantId),
      data.page ? Number(data.page) : undefined,
      data.limit ? Number(data.limit) : undefined,
    );
  }

  @MessagePattern({ cmd: 'get_tenant_license' })
  async getTenantLicenseTcp(@Payload() data: { licenseId: number }) {
    return this.onPremLicenseService.getTenantLicenseById(Number(data.licenseId));
  }

  @MessagePattern({ cmd: 'query_licenses' })
  async queryLicensesTcp(
    @Payload()
    data: {
      tenantId?: number;
      planId?: number;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    return this.onPremLicenseService.queryAllLicenses(data);
  }
}
