import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationLogDto,
  QueryNotificationLogDto,
  NotificationLog,
  PaginatedResponse,
} from '@arc/shared';

@ApiTags('Notification Logs')
@ApiBearerAuth()
@Controller('notification-logs')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // --- Microservice Patterns (not exposed via Swagger) ---

  @EventPattern('notification_log_created')
  async handleNotificationLogCreated(
    @Payload() data: CreateNotificationLogDto,
  ): Promise<void> {
    await this.notificationsService.createNotificationLog(data);
  }

  @MessagePattern({ cmd: 'get_notification_logs' })
  async getNotificationLogs(
    @Payload() query: QueryNotificationLogDto,
  ): Promise<PaginatedResponse<NotificationLog>> {
    return this.notificationsService.queryNotificationLogs(query);
  }

  @MessagePattern({ cmd: 'get_notification_log_by_id' })
  async getNotificationLogById(
    @Payload() data: { id: number },
  ): Promise<NotificationLog> {
    return this.notificationsService.getNotificationLogById(data.id);
  }

  // --- HTTP Endpoints ---

  @Get()
  @ApiOperation({
    summary: 'Query notification logs',
    description:
      'Returns a paginated list of notification logs with optional filters',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of notification logs' })
  async findAll(
    @Query() query: QueryNotificationLogDto,
  ): Promise<PaginatedResponse<NotificationLog>> {
    return this.notificationsService.queryNotificationLogs(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get notification log by ID',
    description: 'Returns a single notification log entry by its ID',
  })
  @ApiParam({ name: 'id', description: 'Notification log ID', example: 1 })
  @ApiResponse({ status: 200, description: 'The notification log entry' })
  @ApiResponse({ status: 404, description: 'Notification log not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<NotificationLog> {
    return this.notificationsService.getNotificationLogById(id);
  }
}
