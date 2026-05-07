import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { sendWithTimeout } from '@arc/shared';

@Injectable()
export class AdminEmailTemplatesService {
  constructor(
    @Inject('TENANT_SERVICE') private readonly tenantService: ClientProxy,
  ) {}

  async queryTemplates(query: Record<string, unknown>) {
    return sendWithTimeout(this.tenantService, { cmd: 'query_email_templates' }, query);
  }

  async getTemplatesByTenant(tenantId: number) {
    return sendWithTimeout(
      this.tenantService,
      { cmd: 'get_tenant_email_templates' },
      { tenantId },
    );
  }

  async upsertTemplate(dto: Record<string, unknown>) {
    return sendWithTimeout(this.tenantService, { cmd: 'upsert_email_template' }, dto);
  }

  async getEffectiveTemplate(tenantId: number, type: string) {
    return sendWithTimeout(
      this.tenantService,
      { cmd: 'get_effective_email_template' },
      { tenantId, type },
    );
  }

  async deleteTemplate(tenantId: number, type: string) {
    return sendWithTimeout(
      this.tenantService,
      { cmd: 'delete_email_template' },
      { tenantId, type },
    );
  }
}
