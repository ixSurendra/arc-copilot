import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EmailTemplatesService } from './email-templates.service';
import {
  UpsertEmailTemplateDto,
  QueryEmailTemplateDto,
  EmailTemplate,
  PaginatedResponse,
  NotificationType,
} from '@org/shared';

@ApiTags('Email Templates')
@ApiBearerAuth()
@Controller('email-templates')
export class EmailTemplatesController {
  constructor(
    private readonly emailTemplatesService: EmailTemplatesService,
  ) {}

  // --- Microservice Patterns (not exposed via Swagger) ---

  @MessagePattern({ cmd: 'upsert_email_template' })
  async upsertTemplateTcp(
    @Payload() data: UpsertEmailTemplateDto,
  ): Promise<EmailTemplate> {
    return this.emailTemplatesService.upsertTemplate(data);
  }

  @MessagePattern({ cmd: 'get_tenant_email_templates' })
  async getTemplatesByTenantTcp(
    @Payload() data: { tenantId: number },
  ): Promise<EmailTemplate[]> {
    return this.emailTemplatesService.getTemplatesByTenant(data.tenantId);
  }

  @MessagePattern({ cmd: 'get_effective_email_template' })
  async getEffectiveTemplateTcp(
    @Payload() data: { tenantId: number; type: NotificationType },
  ): Promise<EmailTemplate | null> {
    return this.emailTemplatesService.getEffectiveTemplate(
      data.tenantId,
      data.type,
    );
  }

  @MessagePattern({ cmd: 'query_email_templates' })
  async queryTemplatesTcp(
    @Payload() data: QueryEmailTemplateDto,
  ): Promise<PaginatedResponse<EmailTemplate>> {
    return this.emailTemplatesService.queryTemplates(data);
  }

  @MessagePattern({ cmd: 'delete_email_template' })
  async deleteTemplateTcp(
    @Payload() data: { tenantId: number; type: NotificationType },
  ): Promise<{ count: number }> {
    return this.emailTemplatesService.deleteTemplate(data.tenantId, data.type);
  }

  // --- HTTP Endpoints ---

  @Put()
  @ApiOperation({ summary: 'Upsert email template', description: 'Create or update an email template for a tenant' })
  @ApiResponse({ status: 200, description: 'Template upserted successfully' })
  async upsert(
    @Body() dto: UpsertEmailTemplateDto,
  ): Promise<EmailTemplate> {
    return this.emailTemplatesService.upsertTemplate(dto);
  }

  @Get('tenant/:tenantId')
  @ApiOperation({ summary: 'Get templates by tenant', description: 'Returns all email templates for a specific tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID', example: 1 })
  @ApiResponse({ status: 200, description: 'List of email templates' })
  async findByTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ): Promise<EmailTemplate[]> {
    return this.emailTemplatesService.getTemplatesByTenant(tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Query email templates', description: 'Returns a paginated list of email templates with optional filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of email templates' })
  async query(
    @Query() dto: QueryEmailTemplateDto,
  ): Promise<PaginatedResponse<EmailTemplate>> {
    return this.emailTemplatesService.queryTemplates(dto);
  }

  @Delete(':tenantId/:type')
  @ApiOperation({ summary: 'Delete email template', description: 'Reset a template to default by deleting the tenant override' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID', example: 1 })
  @ApiParam({ name: 'type', description: 'Notification type', enum: NotificationType })
  @ApiResponse({ status: 200, description: 'Template deleted (reset to default)' })
  async remove(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('type') type: NotificationType,
  ): Promise<{ count: number }> {
    return this.emailTemplatesService.deleteTemplate(tenantId, type);
  }
}
