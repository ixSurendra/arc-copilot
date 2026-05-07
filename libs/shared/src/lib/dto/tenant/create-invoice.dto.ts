import { IsString, IsNumber, IsOptional, IsDateString, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Tenant ID', example: 1 })
  @IsInt()
  tenantId!: number;

  @ApiProperty({ description: 'Billing ID', example: 1 })
  @IsInt()
  billingId!: number;

  @ApiProperty({ description: 'Invoice number', example: 'INV-2026-0001' })
  @IsString()
  invoiceNumber!: string;

  @ApiProperty({ description: 'Subtotal amount', example: 99.99 })
  @IsNumber()
  amount!: number;

  @ApiProperty({ description: 'Currency', example: 'USD' })
  @IsString()
  currency!: string;

  @ApiProperty({ description: 'Tax amount', example: 18.00 })
  @IsNumber()
  taxAmount!: number;

  @ApiProperty({ description: 'Total amount', example: 117.99 })
  @IsNumber()
  totalAmount!: number;

  @ApiProperty({ description: 'Invoice date', example: '2026-01-01' })
  @IsDateString()
  invoiceDate!: string;

  @ApiProperty({ description: 'Due date', example: '2026-01-31' })
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({ description: 'PDF URL' })
  @IsString()
  @IsOptional()
  pdfUrl?: string;
}
