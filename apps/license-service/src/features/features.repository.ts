import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { LicensePrismaService } from '../prisma/license-prisma.service';
import { PaginatedResponse } from '@arc/shared';

@Injectable()
export class FeaturesRepository {

  constructor(private readonly prisma: LicensePrismaService) {}

  async create(data: Prisma.FeatureRegistryCreateInput) {
    return this.prisma.featureRegistry.create({ data });
  }

  async findById(id: number) {
    return this.prisma.featureRegistry.findUnique({ where: { id } });
  }

  async findByKey(featureKey: string) {
    return this.prisma.featureRegistry.findUnique({ where: { featureKey } });
  }

  async update(id: number, data: Prisma.FeatureRegistryUpdateInput) {
    return this.prisma.featureRegistry.update({ where: { id }, data });
  }

  async findWithFilters(query: {
    featureKey?: string;
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    const where: Prisma.FeatureRegistryWhereInput = {};
    if (query.featureKey) {
      where.featureKey = { contains: query.featureKey, mode: 'insensitive' };
    }
    if (query.status) where.status = query.status as any;
    if (query.category) where.category = query.category;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.featureRegistry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.featureRegistry.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
