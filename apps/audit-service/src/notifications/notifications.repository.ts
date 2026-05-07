import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { AuditPrismaService } from '../prisma/audit-prisma.service';
import {
  CreateNotificationLogDto,
  QueryNotificationLogDto,
  NotificationLog,
  PaginatedResponse,
  NotificationChannel,
} from '@arc/shared';

@Injectable()
export class NotificationsRepository {

  constructor(private readonly prisma: AuditPrismaService) {}

  async create(dto: CreateNotificationLogDto): Promise<NotificationLog> {
    const record = await this.prisma.notificationLog.create({
      data: {
        tenantId: dto.tenantId,
        recipientEmail: dto.recipientEmail ?? null,
        type: dto.type as any,
        channel: (dto.channel ?? NotificationChannel.EMAIL) as any,
        subject: dto.subject,
        status: dto.status as any,
        errorMessage: dto.errorMessage ?? null,
        metadata: (dto.metadata ?? Prisma.JsonNull) as any,
        source: dto.source ?? null,
      },
    });

    return record as unknown as NotificationLog;
  }

  async findById(id: number): Promise<NotificationLog | null> {
    const record = await this.prisma.notificationLog.findUnique({
      where: { id },
    });

    if (!record) return null;
    return record as unknown as NotificationLog;
  }

  async findWithFilters(
    query: QueryNotificationLogDto,
  ): Promise<PaginatedResponse<NotificationLog>> {
    const where: Prisma.NotificationLogWhereInput = {};

    if (query.tenantId != null) where.tenantId = query.tenantId;
    if (query.recipientEmail)
      where.recipientEmail = {
        contains: query.recipientEmail,
        mode: 'insensitive',
      };
    if (query.type) where.type = query.type as any;
    if (query.channel) where.channel = query.channel as any;
    if (query.status) where.status = query.status as any;
    if (query.source) where.source = query.source;

    if (query.startDate || query.endDate) {
      where.sentAt = {};
      if (query.startDate) where.sentAt.gte = new Date(query.startDate);
      if (query.endDate) where.sentAt.lte = new Date(query.endDate);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notificationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sentAt: 'desc' },
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return {
      data: data as unknown as NotificationLog[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
