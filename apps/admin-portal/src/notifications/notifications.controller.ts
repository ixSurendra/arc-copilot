import { Controller, Get, Param, Query, Req, ParseIntPipe, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TenantAdminGuard, TenantScopeInterceptor } from '@arc/shared';
import { AdminNotificationsService } from './notifications.service';

@ApiTags('Admin Notification Logs')
@ApiBearerAuth()
@UseGuards(TenantAdminGuard)
@UseInterceptors(TenantScopeInterceptor)
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: AdminNotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Query notification logs' })
  async findAll(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('recipientEmail') recipientEmail?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('source') source?: string,
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

    // Query params arrive as strings from HTTP — cast to correct types before TCP send
    return this.notificationsService.queryNotificationLogs({
      ...(effectiveTenantId !== undefined && { tenantId: effectiveTenantId }),
      ...(recipientEmail && { recipientEmail }),
      ...(type && { type }),
      ...(status && { status }),
      ...(channel && { channel }),
      ...(source && { source }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      page: page !== undefined ? Number(page) : 1,
      limit: limit !== undefined ? Number(limit) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification log by ID' })
  @ApiParam({ name: 'id', description: 'Notification log ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.getNotificationLogById(id);
  }
}
