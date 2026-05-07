import { Injectable, Logger } from '@nestjs/common';
import { EmailTemplatesRepository } from './email-templates.repository';
import {
  UpsertEmailTemplateDto,
  QueryEmailTemplateDto,
  EmailTemplate,
  PaginatedResponse,
  NotificationType,
} from '@arc/shared';

@Injectable()
export class EmailTemplatesService {
  private readonly logger = new Logger(EmailTemplatesService.name);

  constructor(
    private readonly emailTemplatesRepository: EmailTemplatesRepository,
  ) {}

  async upsertTemplate(dto: UpsertEmailTemplateDto): Promise<EmailTemplate> {
    this.logger.log(
      `Upserting email template type=${dto.type} for tenant ${dto.tenantId}`,
    );
    return this.emailTemplatesRepository.upsert(dto.tenantId, dto.type, dto);
  }

  async getTemplatesByTenant(tenantId: number): Promise<EmailTemplate[]> {
    return this.emailTemplatesRepository.findByTenant(tenantId);
  }

  async getEffectiveTemplate(
    tenantId: number,
    type: NotificationType,
  ): Promise<EmailTemplate | null> {
    return this.emailTemplatesRepository.getEffectiveTemplate(tenantId, type);
  }

  async queryTemplates(
    dto: QueryEmailTemplateDto,
  ): Promise<PaginatedResponse<EmailTemplate>> {
    return this.emailTemplatesRepository.query(dto);
  }

  async deleteTemplate(
    tenantId: number,
    type: NotificationType,
  ): Promise<{ count: number }> {
    this.logger.log(
      `Deleting email template type=${type} for tenant ${tenantId}`,
    );
    return this.emailTemplatesRepository.deleteByTenantAndType(tenantId, type);
  }
}
