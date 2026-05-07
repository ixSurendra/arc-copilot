import { IsOptional, IsDateString, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle } from '@arc/shared';

export class GenerateLicenseDto {
  @ApiProperty({ description: 'Tenant ID for which to generate the license' })
  @IsInt()
  tenantId!: number;

  @ApiPropertyOptional({
    description: 'License start date (ISO 8601). Defaults to today if omitted.',
    example: '2026-03-01',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Billing cycle. Defaults to ANNUALLY if omitted.',
    enum: BillingCycle,
    example: BillingCycle.ANNUALLY,
  })
  @IsEnum(BillingCycle)
  @IsOptional()
  cycle?: BillingCycle;

  @ApiPropertyOptional({
    description: 'Maximum number of users allowed. Null means unlimited.',
    example: 50,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUsers?: number;
}
