import { IsString, IsOptional, IsInt, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ description: 'Tenant ID', example: 1 })
  @IsInt()
  tenantId!: number;

  @ApiProperty({ description: 'Group name', example: 'Operations Team' })
  @MaxLength(100)
  @IsString()
  groupName!: string;

  @ApiPropertyOptional({ description: 'Group description' })
  @MaxLength(500)
  @IsString()
  @IsOptional()
  description?: string;
}
