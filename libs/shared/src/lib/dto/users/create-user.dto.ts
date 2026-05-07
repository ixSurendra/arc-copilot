import { IsString, IsOptional, IsEmail, IsInt, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Tenant ID', example: 1 })
  @IsInt()
  tenantId!: number;

  @ApiProperty({ description: 'User email', example: 'john@acme.com' })
  @MaxLength(254)
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  @MaxLength(100)
  @IsString()
  firstName!: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @MaxLength(100)
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+1234567890' })
  @MaxLength(20)
  @IsString()
  @IsOptional()
  phone?: string;
}
