import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { sendWithTimeout } from '@org/shared';

@Injectable()
export class AdminBrandingService {
  constructor(
    @Inject('TENANT_SERVICE') private readonly tenantService: ClientProxy,
  ) {}

  async getBranding(tenantId: number) {
    return sendWithTimeout(this.tenantService, { cmd: 'get_tenant_branding' }, { tenantId });
  }

  async upsertBranding(tenantId: number, dto: Record<string, unknown>) {
    return sendWithTimeout(
      this.tenantService,
      { cmd: 'upsert_tenant_branding' },
      { tenantId, ...dto },
    );
  }

  async getEffectiveBranding(tenantId: number) {
    return sendWithTimeout(this.tenantService, { cmd: 'get_effective_branding' }, { tenantId });
  }
}
