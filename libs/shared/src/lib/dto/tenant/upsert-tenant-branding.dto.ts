import {
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertTenantBrandingDto {
  @ApiProperty({ description: 'Company or organization name', example: 'Innovatechs' })
  @IsString()
  @MaxLength(200)
  companyName!: string;

  @ApiPropertyOptional({
    description: 'Logo image URL (https:// URL or data: base64 URI)',
    example: 'https://cdn.example.com/logo.png',
  })
  @IsString()
  @MaxLength(2097152) // 2MB max for base64-encoded images
  @Matches(/^(https?:\/\/.+|data:image\/.+)$/, {
    message: 'logoUrl must be a valid https URL or an image data URI (data:image/...)',
  })
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Primary brand color (hex)', example: '#2563eb', default: '#18181b' })
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'primaryColor must be a valid hex color (e.g. #2563eb)' })
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Secondary brand color (hex)', example: '#f4f4f5' })
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'secondaryColor must be a valid hex color (e.g. #f4f4f5)' })
  @IsOptional()
  secondaryColor?: string;

  @ApiPropertyOptional({ description: 'Custom footer text for emails', example: 'Powered by Innovatechs' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  footerText?: string;

  @ApiPropertyOptional({ description: 'Use primary color as DMS app theme', example: false, default: false })
  @IsBoolean()
  @IsOptional()
  usePrimaryAsTheme?: boolean;
}
