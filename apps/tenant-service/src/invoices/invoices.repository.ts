import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import {
  CreateInvoiceDto,
  QueryInvoiceDto,
  Invoice,
  PaginatedResponse,
} from '@arc/shared';

@Injectable()
export class InvoicesRepository {

  constructor(private readonly prisma: TenantPrismaService) {}

  async create(dto: CreateInvoiceDto): Promise<Invoice> {
    const record = await this.prisma.invoice.create({
      data: {
        tenantId: dto.tenantId,
        billingId: dto.billingId,
        invoiceNumber: dto.invoiceNumber,
        amount: dto.amount,
        currency: dto.currency,
        taxAmount: dto.taxAmount,
        totalAmount: dto.totalAmount,
        invoiceDate: new Date(dto.invoiceDate),
        dueDate: new Date(dto.dueDate),
        pdfUrl: dto.pdfUrl,
      },
    });

    return record as unknown as Invoice;
  }

  async findById(id: number): Promise<Invoice | null> {
    const record = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!record) return null;
    return record as unknown as Invoice;
  }

  async findWithFilters(
    query: QueryInvoiceDto,
  ): Promise<PaginatedResponse<Invoice>> {
    const where: Prisma.InvoiceWhereInput = {};

    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.status) where.status = query.status;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: data as unknown as Invoice[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
