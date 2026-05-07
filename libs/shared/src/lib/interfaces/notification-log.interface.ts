import { NotificationStatus } from '../enums/notification-status.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';

export interface NotificationLog {
  id: number;
  tenantId: number;
  recipientEmail?: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  subject: string;
  status: NotificationStatus;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  source?: string | null;
  sentAt: Date;
}
