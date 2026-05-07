import { IsString, IsBoolean, IsOptional, IsInt, IsArray, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SsoProviderType } from '../../enums/sso-provider-type.enum';

export class CreateAuthConfigDto {
  @ApiProperty({ description: 'Tenant ID', example: 1 })
  @IsInt()
  tenantId!: number;

  @ApiPropertyOptional({ description: 'MFA mandatory', default: false })
  @IsBoolean()
  @IsOptional()
  isMfaMandatory?: boolean = false;

  @ApiPropertyOptional({ description: 'Allowed auth types', example: ['PASSWORD', 'SSO_GOOGLE'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedAuthTypes?: string[];

  @ApiPropertyOptional({ description: 'Minimum password length', default: 8 })
  @IsInt()
  @Min(6)
  @IsOptional()
  passwordMinLength?: number = 8;

  @ApiPropertyOptional({ description: 'Max failed login attempts', default: 5 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxFailedAttempts?: number = 5;

  @ApiPropertyOptional({ description: 'Max concurrent sessions', default: 5 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxConcurrentSessions?: number = 5;
}

export class CreateSsoProviderDto {
  @ApiProperty({ description: 'Tenant ID', example: 1 })
  @IsInt()
  tenantId!: number;

  @ApiProperty({ description: 'SSO provider type', enum: SsoProviderType })
  @IsEnum(SsoProviderType)
  providerType!: SsoProviderType;

  @ApiProperty({ description: 'OAuth client ID' })
  @IsString()
  clientId!: string;

  @ApiProperty({ description: 'OAuth client secret' })
  @IsString()
  clientSecret!: string;

  @ApiPropertyOptional({ description: 'Redirect URL' })
  @IsString()
  @IsOptional()
  redirectUrl?: string;

  @ApiPropertyOptional({ description: 'Metadata URL' })
  @IsString()
  @IsOptional()
  metadataUrl?: string;
}
