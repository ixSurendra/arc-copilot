import { IsString, IsEmail, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'User email', example: 'john@acme.com' })
  @MaxLength(254)
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Password' })
  @MaxLength(128)
  @IsString()
  password!: string;

  @ApiPropertyOptional({ description: 'Tenant domain for multi-tenant login', example: 'acme.com' })
  @MaxLength(253)
  @IsString()
  @IsOptional()
  domain?: string;
}

export class LoginResponseDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number;
  user!: {
    id: number;
    email: string;
    tenantId: number;
    roles: string[];
  };
}
