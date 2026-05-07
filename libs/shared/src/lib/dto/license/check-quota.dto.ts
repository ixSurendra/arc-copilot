import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckQuotaDto {
  @ApiProperty({ description: 'Tenant ID', example: 1 })
  @IsInt()
  tenantId!: number;

  @ApiProperty({ description: 'Feature key', example: 'ai_queries' })
  @IsString()
  featureKey!: string;

  @ApiPropertyOptional({ description: 'User ID (for INDIVIDUAL quota type)', example: 1 })
  @IsInt()
  @IsOptional()
  userId?: number;
}

export class RecordUsageDto {
  @ApiProperty({ description: 'Tenant ID', example: 1 })
  @IsInt()
  tenantId!: number;

  @ApiProperty({ description: 'Feature key', example: 'ai_queries' })
  @IsString()
  featureKey!: string;

  @ApiPropertyOptional({ description: 'User ID', example: 1 })
  @IsInt()
  @IsOptional()
  userId?: number;
}
