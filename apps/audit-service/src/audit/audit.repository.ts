import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { AuditPrismaService } from '../prisma/audit-prisma.service';
import {
  CreateAuditLogDto,
  QueryAuditLogDto,
  AuditLog,
  AuditLogWithDetail,
  AuditLogStatus,
  PaginatedResponse,
} from '@org/shared';

@Injectable()
export class AuditRepository {

  constructor(private readonly prisma: AuditPrismaService) {}

  private toAuditLogWithDetail(record: Record<string, unknown>): AuditLogWithDetail {
    const { detail, ...log } = record as Record<string, unknown> & { detail: Record<string, unknown> | null };
    return {
      ...log,
      detail: detail
        ? { oldValue: detail.oldValue, newValue: detail.newValue, metadata: detail.metadata } as AuditLogWithDetail['detail']
        : null,
    } as AuditLogWithDetail;
  }

  async create(dto: CreateAuditLogDto): Promise<AuditLogWithDetail> {
    const record = await this.prisma.auditLog.create({
      data: {
        tenantId: dto.tenantId,
        userId: dto.userId,
        action: dto.action,
        resource: dto.resource,
        resourceId: dto.resourceId,
        status: dto.status ?? AuditLogStatus.SUCCESS,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        duration: dto.duration,
        source: dto.source,
        detail: {
          create: {
            oldValue: (dto.oldValue ?? Prisma.JsonNull) as any,
            newValue: (dto.newValue ?? Prisma.JsonNull) as any,
            metadata: (dto.metadata ?? Prisma.JsonNull) as any,
          },
        },
      },
      include: { detail: true },
    });

    return this.toAuditLogWithDetail(record as unknown as Record<string, unknown>);
  }

  async createMany(dtos: CreateAuditLogDto[]): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const auditLogs = await tx.auditLog.createManyAndReturn({
        data: dtos.map((dto) => ({
          tenantId: dto.tenantId,
          userId: dto.userId,
          action: dto.action,
          resource: dto.resource,
          resourceId: dto.resourceId,
          status: dto.status ?? AuditLogStatus.SUCCESS,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          duration: dto.duration,
          source: dto.source,
        })),
      });

      await tx.auditLogDetail.createMany({
        data: auditLogs.map((log, index) => ({
          auditLogId: log.id,
          oldValue: (dtos[index].oldValue ?? Prisma.JsonNull) as any,
          newValue: (dtos[index].newValue ?? Prisma.JsonNull) as any,
          metadata: (dtos[index].metadata ?? Prisma.JsonNull) as any,
        })) as any,
      });

      return auditLogs.length;
    });
  }

  async findById(id: number): Promise<AuditLogWithDetail | null> {
    const record = await this.prisma.auditLog.findUnique({
      where: { id },
      include: { detail: true },
    });

    if (!record) return null;
    return this.toAuditLogWithDetail(record as unknown as Record<string, unknown>);
  }

  async findWithFilters(
    query: QueryAuditLogDto,
  ): Promise<PaginatedResponse<AuditLog>> {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.tenantId != null) where.tenantId = query.tenantId;
    if (query.userId != null) where.userId = query.userId;
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.resource) where.resource = { contains: query.resource, mode: 'insensitive' };
    if (query.resourceId) where.resourceId = query.resourceId;
    if (query.status) where.status = query.status;

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = new Date(query.startDate);
      if (query.endDate) where.timestamp.lte = new Date(query.endDate);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: data as unknown as AuditLog[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}