import { IsString, IsOptional, IsEnum, MinLength, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthType } from '../../enums/auth-type.enum';

export class RegisterCredentialsDto {
  @ApiProperty({ description: 'User ID', example: 1 })
  @IsInt()
  userId!: number;

  @ApiProperty({ description: 'Tenant ID', example: 1 })
  @IsInt()
  tenantId!: number;

  @ApiProperty({ description: 'Authentication type', enum: AuthType, default: AuthType.PASSWORD })
  @IsEnum(AuthType)
  authType!: AuthType;

  @ApiPropertyOptional({ description: 'Password (required for PASSWORD auth type)', minLength: 8 })
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'SSO provider config ID' })
  @IsString()
  @IsOptional()
  ssoProviderId?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ description: 'New password', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
