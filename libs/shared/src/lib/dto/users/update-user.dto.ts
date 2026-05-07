import { IsString, IsOptional, IsEnum, IsEmail, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../enums/user-status.enum';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Email' })
  @MaxLength(254)
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'First name' })
  @MaxLength(100)
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @MaxLength(100)
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @MaxLength(20)
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'User status', enum: UserStatus })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}
