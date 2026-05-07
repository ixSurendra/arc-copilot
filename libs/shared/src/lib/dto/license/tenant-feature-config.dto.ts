import { IsNumber, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetTenantFeatureConfigDto {
  @ApiProperty()
  @IsNumber()
  tenantId!: number;

  @ApiProperty()
  @IsNumber()
  featureId!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  configValue?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  isEnabled!: boolean;

  @ApiProperty({ description: 'userId of the admin setting this config' })
  @IsNumber()
  setBy!: number;
}

export class QueryTenantFeatureConfigDto {
  @ApiProperty()
  @IsNumber()
  tenantId!: number;

  @ApiPropertyOptional({ description: 'Filter by feature category' })
  @IsString()
  @IsOptional()
  category?: string;
}
