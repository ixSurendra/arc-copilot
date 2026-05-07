import { Controller, Get, Post, Patch, Param, Body, Query, Req, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminGuard } from '@arc/shared';
import { AdminTenantsService } from './tenants.service';

@ApiTags('Admin Tenants')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('admin/tenants')
export class AdminTenantsController {
  constructor(private readonly tenantsService: AdminTenantsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tenants' })
  @ApiResponse({ status: 200, description: 'Paginated list of tenants' })
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('isOnPrem') isOnPrem?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.tenantsService.queryTenants({
      tenantName: search,
      status,
      ...(isOnPrem !== undefined && { isOnPrem: isOnPrem === 'true' }),
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
    });
  }

  @Get('licenses')
  @ApiOperation({ summary: 'List all on-prem tenant licenses (cross-tenant)' })
  @ApiResponse({ status: 200, description: 'Paginated list of all licenses' })
  async queryAllLicenses(
    @Query('tenantId') tenantId?: string,
    @Query('planId') planId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantsService.queryAllLicenses({
      ...(tenantId && { tenantId: Number(tenantId) }),
      ...(planId && { planId: Number(planId) }),
      ...(status && { status }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID with enriched data' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant with user count and plan details' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const requestingTenantId = req.user?.tenantId;
    const isSuperAdmin = requestingTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    return this.tenantsService.getTenantEnriched(id, isSuperAdmin ? undefined : requestingTenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({ status: 201, description: 'Tenant created' })
  async create(@Body() dto: Record<string, unknown>) {
    return this.tenantsService.createTenant(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>, @Req() req: any) {
    const requestingTenantId = req.user?.tenantId;
    const isSuperAdmin = requestingTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    return this.tenantsService.updateTenant(id, dto, isSuperAdmin ? undefined : requestingTenantId);
  }

  // ── License endpoints (on-prem tenants) ────────────────

  @Post(':id/license')
  @ApiOperation({ summary: 'Generate license for an on-prem tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 201, description: 'License generated and persisted' })
  async generateLicense(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
    @Req() req: any,
  ) {
    return this.tenantsService.generateTenantLicense(id, dto, req.user?.sub);
  }

  @Get(':id/licenses')
  @ApiOperation({ summary: 'Get license history for a tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Paginated license history' })
  async getLicenses(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.tenantsService.getTenantLicenses(
      id,
      page !== undefined ? Number(page) : undefined,
      limit !== undefined ? Number(limit) : undefined,
    );
  }

  @Get(':id/licenses/:licenseId')
  @ApiOperation({ summary: 'Get a specific license for download' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiParam({ name: 'licenseId', description: 'License ID' })
  async getLicense(
    @Param('id', ParseIntPipe) id: number,
    @Param('licenseId', ParseIntPipe) licenseId: number,
  ) {
    return this.tenantsService.getTenantLicense(licenseId);
  }
}
