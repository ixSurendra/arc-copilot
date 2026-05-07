import { Injectable } from '@nestjs/common';
import { LicensePrismaService } from '../prisma/license-prisma.service';

@Injectable()
export class TenantFeatureConfigRepository {
  constructor(private readonly prisma: LicensePrismaService) {}

  async findByTenant(tenantId: number, category?: string) {
    const where: any = { tenantId };
    if (category) {
      where.feature = { category };
    }
    return this.prisma.tenantFeatureConfig.findMany({
      where,
      include: { feature: true },
      orderBy: { feature: { featureKey: 'asc' } },
    });
  }

  async findOne(tenantId: number, featureId: number) {
    return this.prisma.tenantFeatureConfig.findUnique({
      where: { tenantId_featureId: { tenantId, featureId } },
      include: { feature: true },
    });
  }

  async upsert(tenantId: number, featureId: number, data: { configValue?: string; isEnabled: boolean; setBy: number }) {
    return this.prisma.tenantFeatureConfig.upsert({
      where: { tenantId_featureId: { tenantId, featureId } },
      update: { configValue: data.configValue, isEnabled: data.isEnabled, setBy: data.setBy },
      create: { tenantId, featureId, configValue: data.configValue, isEnabled: data.isEnabled, setBy: data.setBy },
      include: { feature: true },
    });
  }

  async delete(tenantId: number, featureId: number) {
    return this.prisma.tenantFeatureConfig.delete({
      where: { tenantId_featureId: { tenantId, featureId } },
    });
  }
}
