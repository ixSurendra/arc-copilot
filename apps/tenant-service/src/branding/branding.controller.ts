import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BrandingService } from './branding.service';
import { UpsertTenantBrandingDto, TenantBranding } from '@arc/shared';

@ApiTags('Branding')
@ApiBearerAuth()
@Controller('branding')
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  // --- Microservice Patterns (not exposed via Swagger) ---

  @MessagePattern({ cmd: 'upsert_tenant_branding' })
  async upsertBrandingTcp(
    @Payload() data: { tenantId: number } & UpsertTenantBrandingDto,
  ): Promise<TenantBranding> {
    const { tenantId, ...brandingData } = data;
    return this.brandingService.upsertBranding(tenantId, brandingData as UpsertTenantBrandingDto);
  }

  @MessagePattern({ cmd: 'get_tenant_branding' })
  async getBrandingTcp(
    @Payload() data: { tenantId: number },
  ): Promise<TenantBranding | null> {
    return this.brandingService.getBranding(data.tenantId);
  }

  @MessagePattern({ cmd: 'get_effective_branding' })
  async getEffectiveBrandingTcp(
    @Payload() data: { tenantId: number },
  ): Promise<TenantBranding> {
    return this.brandingService.getEffectiveBranding(data.tenantId);
  }

  // --- HTTP Endpoints ---

  @Put(':tenantId')
  @ApiOperation({ summary: 'Upsert tenant branding', description: 'Create or update branding for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Branding upserted successfully' })
  async upsert(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() dto: UpsertTenantBrandingDto,
  ): Promise<TenantBranding> {
    return this.brandingService.upsertBranding(tenantId, dto);
  }

  @Get(':tenantId')
  @ApiOperation({ summary: 'Get tenant branding', description: 'Returns branding for a specific tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID', example: 1 })
  @ApiResponse({ status: 200, description: 'The tenant branding' })
  async findByTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ): Promise<TenantBranding | null> {
    return this.brandingService.getBranding(tenantId);
  }
}
