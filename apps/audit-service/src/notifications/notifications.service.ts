import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import {
  CreateNotificationLogDto,
  QueryNotificationLogDto,
  NotificationLog,
  PaginatedResponse,
} from '@org/shared';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async createNotificationLog(
    dto: CreateNotificationLogDto,
  ): Promise<NotificationLog> {
    this.logger.log(
      `Creating notification log: ${dto.type} to ${dto.recipientEmail}`,
    );
    return this.notificationsRepository.create(dto);
  }

  async queryNotificationLogs(
    query: QueryNotificationLogDto,
  ): Promise<PaginatedResponse<NotificationLog>> {
    return this.notificationsRepository.findWithFilters(query);
  }

  async getNotificationLogById(id: number): Promise<NotificationLog> {
    const log = await this.notificationsRepository.findById(id);
    if (!log) {
      throw new NotFoundException(`Notification log with id ${id} not found`);
    }
    return log;
  }
}
