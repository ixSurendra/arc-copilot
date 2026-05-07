import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Req,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TenantAdminGuard, TenantScopeInterceptor, UpsertTenantBrandingDto } from '@org/shared';
import { AdminBrandingService } from './branding.service';

@ApiTags('Admin Branding')
@ApiBearerAuth()
@UseGuards(TenantAdminGuard)
@UseInterceptors(TenantScopeInterceptor)
@Controller('admin/branding')
export class AdminBrandingController {
  constructor(private readonly brandingService: AdminBrandingService) {}

  @Get(':tenantId')
  @ApiOperation({ summary: 'Get branding for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  async getBranding(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Req() req: any,
  ) {
    const userTenantId = req.user?.tenantId;
    const isSuperAdmin =
      userTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');

    if (!isSuperAdmin && userTenantId !== tenantId) {
      throw new ForbiddenException('Access denied to this tenant branding');
    }

    return this.brandingService.getBranding(tenantId);
  }

  @Put(':tenantId')
  @ApiOperation({ summary: 'Upsert branding for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  async upsertBranding(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() dto: UpsertTenantBrandingDto,
    @Req() req: any,
  ) {
    const userTenantId = req.user?.tenantId;
    const isSuperAdmin =
      userTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');

    if (!isSuperAdmin && userTenantId !== tenantId) {
      throw new ForbiddenException('Access denied to this tenant branding');
    }

    return this.brandingService.upsertBranding(tenantId, dto as unknown as Record<string, unknown>);
  }
}
