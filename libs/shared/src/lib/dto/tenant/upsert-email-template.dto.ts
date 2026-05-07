import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../../enums/notification-type.enum';

export class UpsertEmailTemplateDto {
  @ApiProperty({ description: 'Tenant ID (0 for global defaults)', example: 1 })
  @IsInt()
  tenantId!: number;

  @ApiProperty({ description: 'Template type', enum: NotificationType })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({ description: 'Email subject line (supports Handlebars variables)', example: 'Welcome to {{companyName}}' })
  @IsString()
  subject!: string;

  @ApiProperty({ description: 'HTML body template (Handlebars format)' })
  @IsString()
  htmlBody!: string;

  @ApiPropertyOptional({ description: 'Whether this template is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
