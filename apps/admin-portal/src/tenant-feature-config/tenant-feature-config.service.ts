import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { sendWithTimeout } from '@org/shared';

@Injectable()
export class TenantFeatureConfigService {
  constructor(
    @Inject('LICENSE_SERVICE') private readonly licenseService: ClientProxy,
  ) {}

  async getConfigs(tenantId: number, category?: string) {
    return sendWithTimeout(
      this.licenseService,
      { cmd: 'get_tenant_feature_configs' },
      { tenantId, category },
    );
  }

  async setConfig(tenantId: number, featureId: number, data: any) {
    return sendWithTimeout(
      this.licenseService,
      { cmd: 'set_tenant_feature_config' },
      { tenantId, featureId, ...data },
    );
  }

  async deleteConfig(tenantId: number, featureId: number) {
    return sendWithTimeout(
      this.licenseService,
      { cmd: 'delete_tenant_feature_config' },
      { tenantId, featureId },
    );
  }
}
