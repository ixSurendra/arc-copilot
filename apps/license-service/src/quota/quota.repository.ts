import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { LicensePrismaService } from '../prisma/license-prisma.service';

@Injectable()
export class QuotaRepository {

  constructor(private readonly prisma: LicensePrismaService) {}

  async findFeatureByKey(featureKey: string) {
    return this.prisma.featureRegistry.findUnique({ where: { featureKey } });
  }

  async findPlanQuota(planId: number, featureId: number) {
    return this.prisma.planFeatureQuota.findUnique({
      where: { planId_featureId: { planId, featureId } },
    });
  }

  async findPlanByName(planName: string) {
    return this.prisma.plan.findUnique({ where: { planName } });
  }

  async findActiveTopUps(tenantId: number, featureId: number) {
    return this.prisma.quotaTopUp.findMany({
      where: {
        tenantId,
        featureId,
        status: 'ACTIVE',
        expiryDate: { gt: new Date() },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async createTopUp(data: Prisma.QuotaTopUpUncheckedCreateInput) {
    return this.prisma.quotaTopUp.create({ data });
  }

  async incrementTopUpConsumed(topUpId: number, amount: number) {
    return this.prisma.quotaTopUp.update({
      where: { id: topUpId },
      data: { consumed: { increment: amount } },
    });
  }

  async markTopUpFullyConsumed(topUpId: number) {
    return this.prisma.quotaTopUp.update({
      where: { id: topUpId },
      data: { status: 'FULLY_CONSUMED' },
    });
  }

  async getCurrentCycleUsage(tenantId: number, featureId: number, cycleStart: Date, userId?: number) {
    const where: Prisma.UsageLedgerWhereInput = {
      tenantId,
      featureId,
      cycleStartDate: cycleStart,
    };
    if (userId) where.userId = userId;

    const ledger = await this.prisma.usageLedger.findFirst({ where });
    return ledger?.consumed ?? 0;
  }
}
