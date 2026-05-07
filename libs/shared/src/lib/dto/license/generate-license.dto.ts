import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle } from '../../enums/billing-cycle.enum';

export class GenerateLicenseDto {
  @ApiProperty({ description: 'Tenant ID for which to generate the license' })
  @IsInt()
  tenantId!: number;

  @ApiProperty({ description: 'Plan ID to base the license features on' })
  @IsInt()
  planId!: number;

  @ApiProperty({
    description: 'License expiry date (ISO 8601)',
    example: '2027-03-01',
  })
  @IsDateString()
  @IsNotEmpty()
  expiresAt!: string;

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

  @ApiPropertyOptional({
    description: 'User ID of the admin who generated the license',
  })
  @IsInt()
  @IsOptional()
  issuedBy?: number;
}
