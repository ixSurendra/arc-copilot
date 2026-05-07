import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { LicensePrismaService } from '../prisma/license-prisma.service';
import { PaginatedResponse } from '@arc/shared';

@Injectable()
export class UsageRepository {

  constructor(private readonly prisma: LicensePrismaService) {}

  async findFeatureByKey(featureKey: string) {
    return this.prisma.featureRegistry.findUnique({ where: { featureKey } });
  }

  async upsertUsageLedger(
    tenantId: number,
    featureId: number,
    cycleStartDate: Date,
    cycleEndDate: Date,
    incrementBy: number,
    userId?: number,
  ) {
    // Find existing ledger entry for this cycle
    const existing = await this.prisma.usageLedger.findFirst({
      where: {
        tenantId,
        featureId,
        cycleStartDate,
        ...(userId ? { userId } : {}),
      },
    });

    if (existing) {
      return this.prisma.usageLedger.update({
        where: { id: existing.id },
        data: { consumed: { increment: incrementBy } },
      });
    }

    return this.prisma.usageLedger.create({
      data: {
        tenantId,
        featureId,
        userId,
        consumed: incrementBy,
        cycleStartDate,
        cycleEndDate,
      },
    });
  }

  async queryUsage(query: {
    tenantId?: number;
    featureId?: number;
    userId?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    const where: Prisma.UsageLedgerWhereInput = {};
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.featureId) where.featureId = query.featureId;
    if (query.userId) where.userId = query.userId;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.usageLedger.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { feature: true },
      }),
      this.prisma.usageLedger.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
