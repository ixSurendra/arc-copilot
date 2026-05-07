import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeatureDto {
  @ApiProperty({ description: 'Unique feature key', example: 'ai_queries' })
  @IsString()
  featureKey!: string;

  @ApiProperty({ description: 'Feature display name', example: 'AI Queries' })
  @IsString()
  featureName!: string;

  @ApiPropertyOptional({ description: 'Feature description' })
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Feature category for grouping (e.g., "ai", "storage")' })
  category?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Value type: boolean, integer, string, json', default: 'boolean' })
  valueType?: string;
}
