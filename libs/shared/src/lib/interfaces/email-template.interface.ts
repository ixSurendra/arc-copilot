import { NotificationType } from '../enums/notification-type.enum';

export interface EmailTemplate {
  id: number;
  tenantId: number;
  type: NotificationType;
  subject: string;
  htmlBody: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
