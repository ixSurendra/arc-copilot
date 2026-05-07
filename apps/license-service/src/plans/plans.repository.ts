import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { LicensePrismaService } from '../prisma/license-prisma.service';
import { PaginatedResponse } from '@arc/shared';

@Injectable()
export class PlansRepository {

  constructor(private readonly prisma: LicensePrismaService) {}

  async create(data: Prisma.PlanCreateInput) {
    return this.prisma.plan.create({ data });
  }

  async findById(id: number) {
    return this.prisma.plan.findUnique({
      where: { id },
      include: { featureQuotas: true, pricings: true },
    });
  }

  /**
   * Look up a plan by its NAME (e.g. "PROFESSIONAL"). This is the canonical
   * way to resolve plans because TENANTS.PLAN_ID stores plan names (strings),
   * not the numeric Plan.id FK.
   */
  async findByName(planName: string) {
    return this.prisma.plan.findUnique({
      where: { planName },
      include: { featureQuotas: true, pricings: true },
    });
  }

  async update(id: number, data: Prisma.PlanUpdateInput) {
    return this.prisma.plan.update({ where: { id }, data });
  }

  async findWithFilters(query: {
    planName?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    const where: Prisma.PlanWhereInput = {};
    if (query.planName) {
      where.planName = { contains: query.planName, mode: 'insensitive' };
    }
    if (query.status) where.status = query.status as any;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.plan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { pricings: true },
      }),
      this.prisma.plan.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // --- Plan Feature Quotas ---

  async getQuotasByPlanId(planId: number) {
    return this.prisma.planFeatureQuota.findMany({
      where: { planId },
      include: { feature: true },
    });
  }

  async upsertQuota(planId: number, featureId: number, quotaLimit: number | null, isEnabled: boolean) {
    return this.prisma.planFeatureQuota.upsert({
      where: { planId_featureId: { planId, featureId } },
      create: { planId, featureId, quotaLimit, isEnabled },
      update: { quotaLimit, isEnabled },
    });
  }

  async deleteQuota(planId: number, featureId: number) {
    return this.prisma.planFeatureQuota.delete({
      where: { planId_featureId: { planId, featureId } },
    });
  }
}
