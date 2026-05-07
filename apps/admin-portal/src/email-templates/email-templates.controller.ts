import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Req,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import {
  TenantAdminGuard,
  TenantScopeInterceptor,
  UpsertEmailTemplateDto,
  QueryEmailTemplateDto,
} from '@org/shared';
import { AdminEmailTemplatesService } from './email-templates.service';

@ApiTags('Admin Email Templates')
@ApiBearerAuth()
@UseGuards(TenantAdminGuard)
@UseInterceptors(TenantScopeInterceptor)
@Controller('admin/email-templates')
export class AdminEmailTemplatesController {
  constructor(
    private readonly emailTemplatesService: AdminEmailTemplatesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Query email templates' })
  async findAll(
    @Req() req: any,
    @Query() query: QueryEmailTemplateDto,
  ) {
    const userTenantId = req.user?.tenantId;
    const isSuperAdmin =
      userTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');

    // Tenant admin can only see their own templates
    if (!isSuperAdmin) {
      query.tenantId = userTenantId;
    }

    return this.emailTemplatesService.queryTemplates(
      query as unknown as Record<string, unknown>,
    );
  }

  @Get('tenant/:tenantId')
  @ApiOperation({ summary: 'Get all email templates for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  async getByTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Req() req: any,
  ) {
    const userTenantId = req.user?.tenantId;
    const isSuperAdmin =
      userTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');

    if (!isSuperAdmin && userTenantId !== tenantId) {
      throw new ForbiddenException('Access denied to this tenant templates');
    }

    return this.emailTemplatesService.getTemplatesByTenant(tenantId);
  }

  @Put()
  @ApiOperation({ summary: 'Upsert an email template' })
  async upsertTemplate(
    @Body() dto: UpsertEmailTemplateDto,
    @Req() req: any,
  ) {
    const userTenantId = req.user?.tenantId;
    const isSuperAdmin =
      userTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');

    if (!isSuperAdmin && userTenantId !== dto.tenantId) {
      throw new ForbiddenException('Access denied to this tenant templates');
    }

    return this.emailTemplatesService.upsertTemplate(
      dto as unknown as Record<string, unknown>,
    );
  }

  @Get('preview')
  @ApiOperation({ summary: 'Get effective email template (with fallback to global)' })
  @ApiQuery({ name: 'tenantId', description: 'Tenant ID', required: true })
  @ApiQuery({ name: 'type', description: 'Template type', required: true })
  async getEffectiveTemplate(
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('type') type: string,
    @Req() req: any,
  ) {
    const userTenantId = req.user?.tenantId;
    const isSuperAdmin =
      userTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');

    if (!isSuperAdmin && userTenantId !== tenantId) {
      throw new ForbiddenException('Access denied to this tenant templates');
    }

    return this.emailTemplatesService.getEffectiveTemplate(tenantId, type);
  }

  @Delete(':tenantId/:type')
  @ApiOperation({ summary: 'Delete an email template' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'type', description: 'Template type' })
  async deleteTemplate(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('type') type: string,
    @Req() req: any,
  ) {
    const userTenantId = req.user?.tenantId;
    const isSuperAdmin =
      userTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');

    if (!isSuperAdmin && userTenantId !== tenantId) {
      throw new ForbiddenException('Access denied to this tenant templates');
    }

    return this.emailTemplatesService.deleteTemplate(tenantId, type);
  }
}
