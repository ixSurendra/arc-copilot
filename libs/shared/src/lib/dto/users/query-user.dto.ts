import { IsString, IsOptional, IsEnum, IsInt, IsIn, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../enums/user-status.enum';

export class QueryUserDto {
  @ApiPropertyOptional({ description: 'Filter by tenant ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  tenantId?: number;

  @ApiPropertyOptional({ description: 'Filter by email' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: UserStatus })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Tenant IDs whose users should also be included when searching (OR with text search). Resolved from tenant names by the BFF.',
  })
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  @IsOptional()
  searchTenantIds?: number[];

  @ApiPropertyOptional({
    description: 'Sort field — "tenantId" groups by tenant, default is "createdAt"',
    enum: ['createdAt', 'tenantId'],
  })
  @IsString()
  @IsIn(['createdAt', 'tenantId'])
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Results per page', default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
