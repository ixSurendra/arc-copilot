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

export class QueryLicenseDto {
  @ApiPropertyOptional({ description: 'Filter by tenant ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  tenantId?: number;

  @ApiPropertyOptional({ description: 'Filter by plan ID', example: 5 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  planId?: number;

  @ApiPropertyOptional({
    description: 'Filter by license status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'REVOKED', 'EXPIRED'],
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Start date filter — issuedAt >= this (ISO 8601)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date filter — issuedAt <= this (ISO 8601)',
    example: '2026-12-31T23:59:59.999Z',
  })
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
