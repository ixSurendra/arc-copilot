import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @MaxLength(254)
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ example: 'example.com' })
  @MaxLength(253)
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiPropertyOptional({ description: 'Override base URL for the reset link (used by external apps like DMS)', example: 'http://localhost:5173' })
  @MaxLength(500)
  @IsString()
  @IsOptional()
  appUrl?: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token received via email' })
  @MaxLength(500)
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'NewSecureP@ss1', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
