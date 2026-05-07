import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateModuleDto {
  @ApiProperty({ description: 'Module name', example: 'User Management' })
  @MaxLength(100)
  @IsString()
  moduleName!: string;

  @ApiProperty({ description: 'Unique module key', example: 'USER_MANAGEMENT' })
  @MaxLength(50)
  @IsString()
  moduleKey!: string;

  @ApiPropertyOptional({ description: 'Module description' })
  @MaxLength(500)
  @IsString()
  @IsOptional()
  description?: string;
}
