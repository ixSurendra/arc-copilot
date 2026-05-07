import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsInt,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationStatus } from '../../enums/notification-status.enum';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';

export class CreateNotificationLogDto {
  @ApiProperty({ description: 'Tenant identifier', example: 1 })
  @IsInt()
  tenantId!: number;

  @ApiPropertyOptional({ description: 'Recipient email address (required for EMAIL channel, optional for IN_APP)', example: 'user@example.com' })
  @IsEmail()
  @IsOptional()
  recipientEmail?: string;

  @ApiProperty({ description: 'Notification type', enum: NotificationType })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ description: 'Delivery channel', enum: NotificationChannel, default: NotificationChannel.EMAIL })
  @IsString()
  @IsOptional()
  channel?: string = NotificationChannel.EMAIL;

  @ApiProperty({ description: 'Email subject line or notification title', example: 'Welcome to IX Platform' })
  @IsString()
  subject!: string;

  @ApiProperty({ description: 'Delivery status', enum: NotificationStatus })
  @IsEnum(NotificationStatus)
  status!: NotificationStatus;

  @ApiPropertyOptional({ description: 'Error message if delivery failed' })
  @IsString()
  @IsOptional()
  errorMessage?: string;

  @ApiPropertyOptional({ description: 'Additional metadata (e.g. userId, templateId)', example: { userId: 5 } })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Source system (e.g. "platform", "dms")', example: 'platform' })
  @IsString()
  @IsOptional()
  source?: string;
}
