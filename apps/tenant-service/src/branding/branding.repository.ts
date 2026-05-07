import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { UpsertTenantBrandingDto, TenantBranding } from '@arc/shared';

@Injectable()
export class BrandingRepository {

  constructor(private readonly prisma: TenantPrismaService) {}

  async upsert(
    tenantId: number,
    dto: UpsertTenantBrandingDto,
  ): Promise<TenantBranding> {
    const record = await this.prisma.tenantBranding.upsert({
      where: { tenantId },
      create: { tenantId, ...dto },
      update: { ...dto },
    });

    return record as unknown as TenantBranding;
  }

  async findByTenantId(tenantId: number): Promise<TenantBranding | null> {
    const record = await this.prisma.tenantBranding.findUnique({
      where: { tenantId },
    });

    if (!record) return null;
    return record as unknown as TenantBranding;
  }

  async getEffectiveBranding(tenantId: number): Promise<TenantBranding> {
    // Try tenant-specific branding first
    const tenantBranding = await this.findByTenantId(tenantId);
    if (tenantBranding) return tenantBranding;

    // Fall back to global default (tenantId=0) if not the system tenant
    if (tenantId !== 0) {
      const globalBranding = await this.findByTenantId(0);
      if (globalBranding) return globalBranding;
    }

    // Return hardcoded default
    return {
      id: 0,
      tenantId,
      companyName: 'IX Platform',
      primaryColor: '#18181b',
      logoUrl: null,
      secondaryColor: null,
      footerText: null,
      usePrimaryAsTheme: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
