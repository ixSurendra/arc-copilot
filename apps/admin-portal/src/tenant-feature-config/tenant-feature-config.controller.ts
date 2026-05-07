import { Controller, Get, Put, Delete, Param, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminGuard } from '@org/shared';
import { TenantFeatureConfigService } from './tenant-feature-config.service';

@ApiTags('Tenant Feature Config')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('admin/tenant-feature-config')
export class TenantFeatureConfigController {
  constructor(private readonly tenantFeatureConfigService: TenantFeatureConfigService) {}

  @Get(':tenantId')
  @ApiOperation({ summary: 'List tenant feature configs' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  async getConfigs(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Query('category') category?: string,
  ) {
    return this.tenantFeatureConfigService.getConfigs(tenantId, category);
  }

  @Put(':tenantId/:featureId')
  @ApiOperation({ summary: 'Upsert tenant feature config' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'featureId', description: 'Feature ID' })
  async setConfig(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('featureId', ParseIntPipe) featureId: number,
    @Body() data: Record<string, unknown>,
  ) {
    return this.tenantFeatureConfigService.setConfig(tenantId, featureId, data);
  }

  @Delete(':tenantId/:featureId')
  @ApiOperation({ summary: 'Delete tenant feature config' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'featureId', description: 'Feature ID' })
  async deleteConfig(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('featureId', ParseIntPipe) featureId: number,
  ) {
    return this.tenantFeatureConfigService.deleteConfig(tenantId, featureId);
  }
}
