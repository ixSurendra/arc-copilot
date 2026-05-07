import { IsString, IsEnum, IsOptional, IsDateString, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanChangeType } from '../../enums/plan-change-type.enum';

export class CreatePlanHistoryDto {
  @ApiProperty({ description: 'Tenant ID', example: 1 })
  @IsInt()
  tenantId!: number;

  @ApiProperty({ description: 'Plan ID' })
  @IsString()
  planId!: string;

  @ApiProperty({ description: 'Change type', enum: PlanChangeType })
  @IsEnum(PlanChangeType)
  changeType!: PlanChangeType;

  @ApiProperty({ description: 'Start date', example: '2026-01-01' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
