import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationStatus } from '../../enums/notification-status.enum';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';

// Enums imported for Swagger docs reference; query uses string to support extensible types

export class QueryNotificationLogDto {
  @ApiPropertyOptional({ description: 'Filter by tenant ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  tenantId?: number;

  @ApiPropertyOptional({ description: 'Filter by recipient email', example: 'user@example.com' })
  @IsString()
  @IsOptional()
  recipientEmail?: string;

  @ApiPropertyOptional({ description: 'Filter by notification type', enum: NotificationType })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by delivery channel', enum: NotificationChannel })
  @IsString()
  @IsOptional()
  channel?: string;

  @ApiPropertyOptional({ description: 'Filter by delivery status', enum: NotificationStatus })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by source system (e.g. "platform", "dms")' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ description: 'Start date filter (ISO 8601)', example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO 8601)', example: '2026-12-31T23:59:59.999Z' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number (1-indexed)', default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Results per page', default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
