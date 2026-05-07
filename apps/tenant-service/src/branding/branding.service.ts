import { Injectable, Logger } from '@nestjs/common';
import { BrandingRepository } from './branding.repository';
import { UpsertTenantBrandingDto, TenantBranding } from '@arc/shared';

@Injectable()
export class BrandingService {
  private readonly logger = new Logger(BrandingService.name);

  constructor(private readonly brandingRepository: BrandingRepository) {}

  async upsertBranding(
    tenantId: number,
    dto: UpsertTenantBrandingDto,
  ): Promise<TenantBranding> {
    this.logger.log(`Upserting branding for tenant ${tenantId}`);
    return this.brandingRepository.upsert(tenantId, dto);
  }

  async getBranding(tenantId: number): Promise<TenantBranding | null> {
    return this.brandingRepository.findByTenantId(tenantId);
  }

  async getEffectiveBranding(tenantId: number): Promise<TenantBranding> {
    return this.brandingRepository.getEffectiveBranding(tenantId);
  }
}
