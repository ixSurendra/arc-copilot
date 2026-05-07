import { IsString, IsNumber, IsEnum, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BillingCycle } from '../../enums/billing-cycle.enum';

export class CreatePlanPricingDto {
  @ApiProperty({ description: 'Plan ID', example: 1 })
  @IsInt()
  planId!: number;

  @ApiProperty({ description: 'Billing cycle', enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @ApiProperty({ description: 'Price', example: 29.99 })
  @IsNumber()
  price!: number;

  @ApiProperty({ description: 'Currency', example: 'USD' })
  @IsString()
  currency!: string;
}
