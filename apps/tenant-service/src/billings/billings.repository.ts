import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import {
  CreateBillingDto,
  QueryBillingDto,
  TenantBilling,
  PaginatedResponse,
} from '@org/shared';

@Injectable()
export class BillingsRepository {

  constructor(private readonly prisma: TenantPrismaService) {}

  async create(dto: CreateBillingDto): Promise<TenantBilling> {
    const record = await this.prisma.tenantBilling.create({
      data: {
        tenantId: dto.tenantId,
        billingType: dto.billingType,
        referenceId: dto.referenceId,
        amount: dto.amount,
        currency: dto.currency,
        billingDate: new Date(dto.billingDate),
        nextBillingDate: dto.nextBillingDate
          ? new Date(dto.nextBillingDate)
          : null,
        paymentMethod: dto.paymentMethod,
        transactionId: dto.transactionId,
      },
    });

    return record as unknown as TenantBilling;
  }

  async findById(id: number): Promise<TenantBilling | null> {
    const record = await this.prisma.tenantBilling.findUnique({
      where: { id },
    });

    if (!record) return null;
    return record as unknown as TenantBilling;
  }

  async findWithFilters(
    query: QueryBillingDto,
  ): Promise<PaginatedResponse<TenantBilling>> {
    const where: Prisma.TenantBillingWhereInput = {};

    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tenantBilling.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenantBilling.count({ where }),
    ]);

    return {
      data: data as unknown as TenantBilling[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
