import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuditLogStatus } from '../enums/audit-log-status.enum';

export class QueryAuditLogDto {
  @ApiPropertyOptional({ description: 'Filter by tenant ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  tenantId?: number;

  @ApiPropertyOptional({ description: 'Filter by user ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({ description: 'Filter by action', example: 'USER_LOGIN' })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ description: 'Filter by resource type', example: 'auth' })
  @IsString()
  @IsOptional()
  resource?: string;

  @ApiPropertyOptional({ description: 'Filter by resource ID', example: 'res-456' })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: AuditLogStatus })
  @IsEnum(AuditLogStatus)
  @IsOptional()
  status?: AuditLogStatus;

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
