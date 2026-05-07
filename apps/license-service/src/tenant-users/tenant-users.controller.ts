import { Controller, Get, Query, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { sendWithTimeout } from '@org/shared';

/**
 * Proxies user count requests to users-service.
 * DMS calls this endpoint via HTTP with x-internal-api-key header,
 * which is validated by the global JwtAuthGuard.
 */
@ApiTags('Tenant Users')
@ApiBearerAuth()
@Controller('tenant-users')
export class TenantUsersController {
  private readonly logger = new Logger(TenantUsersController.name);

  constructor(
    @Inject('USERS_SERVICE') private readonly usersService: ClientProxy,
  ) {}

  @Get('count')
  @ApiOperation({
    summary: 'Get user count for a tenant',
    description:
      'Proxies to users-service to return the number of active users for a given tenant. ' +
      'Used by DMS for usage reporting.',
  })
  @ApiQuery({ name: 'tenantId', required: true, type: Number, description: 'Tenant ID to count users for' })
  @ApiResponse({ status: 200, description: 'User count', schema: { properties: { count: { type: 'number' } } } })
  async getUserCount(@Query('tenantId') tenantId: string) {
    try {
      const result = await sendWithTimeout<{ count: number }>(
        this.usersService,
        { cmd: 'count_users' },
        { tenantId: Number(tenantId) },
        5000,
      );
      return { count: result?.count ?? 0 };
    } catch (error: any) {
      this.logger.warn(`Failed to get user count for tenant ${tenantId}: ${error.message}`);
      return { count: 0 };
    }
  }
}
