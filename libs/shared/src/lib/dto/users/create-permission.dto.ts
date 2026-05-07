import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ description: 'Permission name', example: 'Create User' })
  @MaxLength(100)
  @IsString()
  permissionName!: string;

  @ApiProperty({ description: 'Unique permission key', example: 'CREATE_USER' })
  @MaxLength(50)
  @IsString()
  permissionKey!: string;

  @ApiPropertyOptional({ description: 'Permission description' })
  @MaxLength(500)
  @IsString()
  @IsOptional()
  description?: string;
}
