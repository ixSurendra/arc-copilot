import { IsString, IsOptional, IsInt, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ description: 'Tenant ID', example: 1 })
  @IsInt()
  tenantId!: number;

  @ApiProperty({ description: 'Role name', example: 'Manager' })
  @MaxLength(100)
  @IsString()
  roleName!: string;

  @ApiPropertyOptional({ description: 'Role description' })
  @MaxLength(500)
  @IsString()
  @IsOptional()
  description?: string;
}
