import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingType } from '../../enums/billing-type.enum';
import { PaymentMethod } from '../../enums/payment-method.enum';

export class CreateBillingDto {
  @ApiProperty({ description: 'Tenant ID', example: 1 })
  @IsInt()
  tenantId!: number;

  @ApiProperty({ description: 'Billing type', enum: BillingType })
  @IsEnum(BillingType)
  billingType!: BillingType;

  @ApiProperty({ description: 'Reference ID (plan_pricing_id or top_up_pricing_id)' })
  @IsString()
  referenceId!: string;

  @ApiProperty({ description: 'Amount', example: 99.99 })
  @IsNumber()
  amount!: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  @IsString()
  currency!: string;

  @ApiProperty({ description: 'Billing date', example: '2026-01-01' })
  @IsDateString()
  billingDate!: string;

  @ApiPropertyOptional({ description: 'Next billing date' })
  @IsDateString()
  @IsOptional()
  nextBillingDate?: string;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ description: 'Transaction ID from payment gateway' })
  @IsString()
  @IsOptional()
  transactionId?: string;
}
