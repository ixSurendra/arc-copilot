import { Controller, Get, Put, Delete, Param, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantFeatureConfigService } from './tenant-feature-config.service';
import { SetTenantFeatureConfigDto, QueryTenantFeatureConfigDto, SuperAdminGuard } from '@arc/shared';

@ApiTags('Tenant Feature Config')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('tenant-feature-config')
export class TenantFeatureConfigController {
  constructor(private readonly service: TenantFeatureConfigService) {}

  // ─── TCP ────────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_tenant_feature_configs' })
  async tcpGetConfigs(@Payload() data: QueryTenantFeatureConfigDto) {
    return this.service.getConfigs(data.tenantId, data.category);
  }

  @MessagePattern({ cmd: 'set_tenant_feature_config' })
  async tcpSetConfig(@Payload() data: SetTenantFeatureConfigDto) {
    return this.service.setConfig(data);
  }

  @MessagePattern({ cmd: 'delete_tenant_feature_config' })
  async tcpDeleteConfig(@Payload() data: { tenantId: number; featureId: number }) {
    return this.service.deleteConfig(data.tenantId, data.featureId);
  }

  // ─── HTTP ───────────────────────────────────────────────

  @Get(':tenantId')
  @ApiOperation({ summary: 'Get all feature configs for a tenant' })
  async getConfigs(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Query('category') category?: string,
  ) {
    return this.service.getConfigs(tenantId, category);
  }

  @Put(':tenantId/:featureId')
  @ApiOperation({ summary: 'Set feature config for a tenant (upsert)' })
  async setConfig(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('featureId', ParseIntPipe) featureId: number,
    @Body() body: Partial<SetTenantFeatureConfigDto>,
  ) {
    return this.service.setConfig({
      tenantId,
      featureId,
      configValue: body.configValue,
      isEnabled: body.isEnabled ?? true,
      setBy: body.setBy ?? 0,
    });
  }

  @Delete(':tenantId/:featureId')
  @ApiOperation({ summary: 'Delete feature config for a tenant' })
  async deleteConfig(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('featureId', ParseIntPipe) featureId: number,
  ) {
    return this.service.deleteConfig(tenantId, featureId);
  }
}
