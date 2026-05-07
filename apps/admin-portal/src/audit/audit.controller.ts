import { Controller, Get, Param, Query, Req, ParseIntPipe, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TenantAdminGuard, TenantScopeInterceptor } from '@org/shared';
import { AdminAuditService } from './audit.service';

@ApiTags('Admin Audit Logs')
@ApiBearerAuth()
@UseGuards(TenantAdminGuard)
@UseInterceptors(TenantScopeInterceptor)
@Controller('admin/audit')
export class AdminAuditController {
  constructor(private readonly auditService: AdminAuditService) {}

  @Get()
  @ApiOperation({ summary: 'Query audit logs' })
  async findAll(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Read tenantId directly from JWT — interceptor-modified @Query is unreliable
    const userTenantId = req.user?.tenantId;
    const isSuperAdmin =
      userTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    const effectiveTenantId = isSuperAdmin
      ? (tenantId !== undefined ? Number(tenantId) : undefined)
      : userTenantId;

    return this.auditService.queryAuditLogs({
      ...(effectiveTenantId !== undefined && { tenantId: effectiveTenantId }),
      ...(userId !== undefined && { userId: Number(userId) }),
      action,
      resource,
      status,
      startDate,
      endDate,
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiParam({ name: 'id', description: 'Audit log ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auditService.getAuditLogById(id);
  }
}
