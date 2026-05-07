import { IsString, IsOptional, IsEnum, IsInt, Min, IsBoolean, IsDateString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus } from '../../enums/tenant-status.enum';
import { QuotaType } from '../../enums/quota-type.enum';
import { BillingCycle } from '../../enums/billing-cycle.enum';

/**
 * Valid plan-name pattern. TENANTS.PLAN_ID stores the plan NAME (e.g. "PROFESSIONAL"),
 * not the numeric Plan.id FK. Numeric IDs are rejected to prevent the data-integrity
 * bug where admin-ui dropdowns accidentally send `"3"` instead of `"PROFESSIONAL"`.
 * Allows "ON_PREM" and "SYSTEM" which are also valid plan names.
 */
const PLAN_NAME_PATTERN = /^[A-Z][A-Z_]*$/;
const PLAN_NAME_MESSAGE =
  'planId must be a plan name (uppercase letters/underscores, e.g., "PROFESSIONAL") — numeric IDs are not accepted';

export class UpdateTenantDto {
  @ApiPropertyOptional({ description: 'Tenant name', example: 'Acme Corp' })
  @IsString()
  @IsOptional()
  tenantName?: string;

  @ApiPropertyOptional({ description: 'Domain', example: 'acme.com' })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiPropertyOptional({
    description: 'Plan name (not numeric ID). Must be an existing plan like "PROFESSIONAL", "BUSINESS", etc.',
    example: 'PROFESSIONAL',
  })
  @IsString()
  @Matches(PLAN_NAME_PATTERN, { message: PLAN_NAME_MESSAGE })
  @IsOptional()
  planId?: string;

  @ApiPropertyOptional({
    description: 'Next plan name for the next billing cycle (not numeric ID)',
    example: 'ENTERPRISE',
  })
  @IsString()
  @Matches(PLAN_NAME_PATTERN, { message: PLAN_NAME_MESSAGE.replace('planId', 'nextPlanId') })
  @IsOptional()
  nextPlanId?: string;

  @ApiPropertyOptional({ description: 'Quota type', enum: QuotaType })
  @IsEnum(QuotaType)
  @IsOptional()
  quotaType?: QuotaType;

  @ApiPropertyOptional({ description: 'Billing cycle', enum: BillingCycle })
  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @ApiPropertyOptional({ description: 'Max users', example: 100 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUsers?: number;

  @ApiPropertyOptional({ description: 'Tenant status', enum: TenantStatus })
  @IsEnum(TenantStatus)
  @IsOptional()
  status?: TenantStatus;

  @ApiPropertyOptional({ description: 'Whether this is an on-premises deployment', example: false })
  @IsBoolean()
  @IsOptional()
  isOnPrem?: boolean;

  @ApiPropertyOptional({ description: 'License expiry date for on-prem tenants', example: '2027-03-01' })
  @IsDateString()
  @IsOptional()
  licenseExpiryDate?: string;
}
