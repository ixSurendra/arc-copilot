import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantFeatureConfigRepository } from './tenant-feature-config.repository';

@Injectable()
export class TenantFeatureConfigService {
  constructor(private readonly repository: TenantFeatureConfigRepository) {}

  async getConfigs(tenantId: number, category?: string) {
    return this.repository.findByTenant(tenantId, category);
  }

  async getConfig(tenantId: number, featureId: number) {
    const config = await this.repository.findOne(tenantId, featureId);
    if (!config) {
      throw new NotFoundException(`Config not found for tenant ${tenantId}, feature ${featureId}`);
    }
    return config;
  }

  async setConfig(data: { tenantId: number; featureId: number; configValue?: string; isEnabled: boolean; setBy: number }) {
    return this.repository.upsert(data.tenantId, data.featureId, {
      configValue: data.configValue,
      isEnabled: data.isEnabled,
      setBy: data.setBy,
    });
  }

  async deleteConfig(tenantId: number, featureId: number) {
    return this.repository.delete(tenantId, featureId);
  }
}
