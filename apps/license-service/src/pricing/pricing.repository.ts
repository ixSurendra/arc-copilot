import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { LicensePrismaService } from '../prisma/license-prisma.service';
import { PaginatedResponse } from '@arc/shared';

@Injectable()
export class PricingRepository {

  constructor(private readonly prisma: LicensePrismaService) {}

  // --- Plan Pricing ---

  async createPlanPricing(data: Prisma.PlanPricingUncheckedCreateInput) {
    try {
      return await this.prisma.planPricing.create({ data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Plan pricing for this plan, billing cycle and currency already exists`);
      }
      throw e;
    }
  }

  async findPlanPricingById(id: number) {
    return this.prisma.planPricing.findUnique({
      where: { id },
      include: { plan: true },
    });
  }

  async findPlanPricingsByPlanId(planId: number) {
    return this.prisma.planPricing.findMany({
      where: { planId },
      orderBy: { billingCycle: 'asc' },
    });
  }

  async updatePlanPricing(id: number, data: Prisma.PlanPricingUpdateInput) {
    return this.prisma.planPricing.update({ where: { id }, data });
  }

  async queryPlanPricings(query: {
    planId?: number;
    billingCycle?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    const where: Prisma.PlanPricingWhereInput = {};
    if (query.planId) where.planId = query.planId;
    if (query.billingCycle) where.billingCycle = query.billingCycle as any;
    if (query.status) where.status = query.status as any;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.planPricing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { plan: true },
      }),
      this.prisma.planPricing.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // --- Top-Up Pricing ---

  async createTopUpPricing(data: Prisma.TopUpPricingUncheckedCreateInput) {
    try {
      return await this.prisma.topUpPricing.create({ data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Top-up pricing for this feature already exists`);
      }
      throw e;
    }
  }

  async findTopUpPricingById(id: number) {
    return this.prisma.topUpPricing.findUnique({
      where: { id },
      include: { feature: true },
    });
  }

  async updateTopUpPricing(id: number, data: Prisma.TopUpPricingUpdateInput) {
    return this.prisma.topUpPricing.update({ where: { id }, data });
  }

  async queryTopUpPricings(query: {
    featureId?: number;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    const where: Prisma.TopUpPricingWhereInput = {};
    if (query.featureId) where.featureId = query.featureId;
    if (query.status) where.status = query.status as any;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.topUpPricing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { feature: true },
      }),
      this.prisma.topUpPricing.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
