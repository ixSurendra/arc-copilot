import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import {
  CreatePlanHistoryDto,
  QueryPlanHistoryDto,
  TenantPlanHistory,
  PaginatedResponse,
} from '@org/shared';

@Injectable()
export class PlanHistoryRepository {

  constructor(private readonly prisma: TenantPrismaService) {}

  async create(dto: CreatePlanHistoryDto): Promise<TenantPlanHistory> {
    const record = await this.prisma.tenantPlanHistory.create({
      data: {
        tenantId: dto.tenantId,
        planId: dto.planId,
        changeType: dto.changeType,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });

    return record as unknown as TenantPlanHistory;
  }

  async findWithFilters(
    query: QueryPlanHistoryDto,
  ): Promise<PaginatedResponse<TenantPlanHistory>> {
    const where: Prisma.TenantPlanHistoryWhereInput = {};

    if (query.tenantId) where.tenantId = query.tenantId;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tenantPlanHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenantPlanHistory.count({ where }),
    ]);

    return {
      data: data as unknown as TenantPlanHistory[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
