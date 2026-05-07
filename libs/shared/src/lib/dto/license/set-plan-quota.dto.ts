import { IsInt, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetPlanQuotaDto {
  @ApiProperty({ description: 'Feature ID', example: 1 })
  @IsInt()
  featureId!: number;

  @ApiPropertyOptional({ description: 'Quota limit (null = unlimited)', example: 1000 })
  @IsInt()
  @IsOptional()
  quotaLimit?: number;

  @ApiPropertyOptional({ description: 'Whether feature is enabled in this plan', default: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean = true;
}
