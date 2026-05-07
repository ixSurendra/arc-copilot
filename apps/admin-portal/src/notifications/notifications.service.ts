import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { sendWithTimeout } from '@org/shared';

@Injectable()
export class AdminNotificationsService {
  constructor(
    @Inject('AUDIT_SERVICE') private readonly auditService: ClientProxy,
  ) {}

  async queryNotificationLogs(query: Record<string, unknown>) {
    return sendWithTimeout(this.auditService, { cmd: 'get_notification_logs' }, query);
  }

  async getNotificationLogById(id: number) {
    return sendWithTimeout(this.auditService, { cmd: 'get_notification_log_by_id' }, { id });
  }
}
