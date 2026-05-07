import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditLogStatus } from '../enums/audit-log-status.enum';

export class CreateAuditLogDto {
  @ApiProperty({ description: 'Tenant identifier for multitenancy isolation', example: 1 })
  @IsInt()
  tenantId!: number;

  @ApiProperty({ description: 'ID of the user performing the action', example: 1 })
  @IsInt()
  userId!: number;

  @ApiProperty({ description: 'Action performed', example: 'USER_LOGIN' })
  @IsString()
  action!: string;

  @ApiProperty({ description: 'Resource being acted upon', example: 'auth' })
  @IsString()
  resource!: string;

  @ApiPropertyOptional({ description: 'ID of the specific resource', example: 'res-456' })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Previous state of the resource', example: { role: 'user' } })
  @IsObject()
  @IsOptional()
  oldValue?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'New state of the resource', example: { role: 'admin' } })
  @IsObject()
  @IsOptional()
  newValue?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Additional metadata', example: { browser: 'Chrome' } })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Outcome status', enum: AuditLogStatus, default: AuditLogStatus.SUCCESS })
  @IsEnum(AuditLogStatus)
  @IsOptional()
  status?: AuditLogStatus;

  @ApiPropertyOptional({ description: 'IP address of the client', example: '192.168.1.1' })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent string', example: 'Mozilla/5.0' })
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Duration of the action in milliseconds', example: 150 })
  @IsInt()
  @Min(0)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ description: 'Source system or module', example: 'web-app' })
  @IsString()
  @IsOptional()
  source?: string;
}
