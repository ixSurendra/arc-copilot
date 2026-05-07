import { IsString, IsOptional, IsEnum, IsInt, Min, IsDateString, IsBoolean, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuotaType } from '../../enums/quota-type.enum';
import { BillingCycle } from '../../enums/billing-cycle.enum';

/**
 * Valid plan-name pattern — must match the plan NAME stored in TENANTS.PLAN_ID
 * (e.g. "PROFESSIONAL"), not the numeric Plan.id FK. Numeric IDs are rejected.
 */
const PLAN_NAME_PATTERN = /^[A-Z][A-Z_]*$/;
const PLAN_NAME_MESSAGE =
  'planId must be a plan name (uppercase letters/underscores, e.g., "PROFESSIONAL") — numeric IDs are not accepted';

export class CreateTenantDto {
  @ApiProperty({ description: 'Tenant organization name', example: 'Acme Corp' })
  @MaxLength(200)
  @IsString()
  tenantName!: string;

  @ApiProperty({ description: 'Tenant domain', example: 'acme.com' })
  @MaxLength(253)
  @IsString()
  domain!: string;

  @ApiProperty({
    description: 'Plan name from license service (e.g., "PROFESSIONAL", "BUSINESS") — NOT the numeric ID',
    example: 'PROFESSIONAL',
  })
  @MaxLength(100)
  @IsString()
  @Matches(PLAN_NAME_PATTERN, { message: PLAN_NAME_MESSAGE })
  planId!: string;

  @ApiProperty({ description: 'Quota type', enum: QuotaType, example: QuotaType.SHARED })
  @IsEnum(QuotaType)
  quotaType!: QuotaType;

  @ApiPropertyOptional({ description: 'Billing cycle (null for non-billing tenants like system)', enum: BillingCycle, example: BillingCycle.MONTHLY })
  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @ApiPropertyOptional({ description: 'Max users allowed (null = unlimited)', example: 50 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUsers?: number;

  @ApiPropertyOptional({ description: 'Billing cycle start date', example: '2026-01-01' })
  @IsDateString()
  @IsOptional()
  cycleStartDate?: string;

  @ApiPropertyOptional({ description: 'Whether this is an on-premises deployment', example: false })
  @IsBoolean()
  @IsOptional()
  isOnPrem?: boolean;

  @ApiPropertyOptional({ description: 'License expiry date for on-prem tenants', example: '2027-03-01' })
  @IsDateString()
  @IsOptional()
  licenseExpiryDate?: string;
}
