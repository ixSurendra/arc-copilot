import { Injectable } from '@nestjs/common';
import { Prisma, NotificationType as PrismaNotificationType } from '../../generated/prisma';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import {
  UpsertEmailTemplateDto,
  QueryEmailTemplateDto,
  EmailTemplate,
  PaginatedResponse,
  NotificationType,
  DEFAULT_TEMPLATES,
} from '@arc/shared';

@Injectable()
export class EmailTemplatesRepository {

  constructor(private readonly prisma: TenantPrismaService) {}

  async upsert(
    tenantId: number,
    type: NotificationType,
    dto: UpsertEmailTemplateDto,
  ): Promise<EmailTemplate> {
    const prismaType = type as unknown as PrismaNotificationType;
    const record = await this.prisma.emailTemplate.upsert({
      where: { tenantId_type: { tenantId, type: prismaType } },
      create: {
        tenantId,
        type: prismaType,
        subject: dto.subject,
        htmlBody: dto.htmlBody,
        isActive: dto.isActive ?? true,
      },
      update: {
        subject: dto.subject,
        htmlBody: dto.htmlBody,
        isActive: dto.isActive,
      },
    });

    return record as unknown as EmailTemplate;
  }

  async findByTenantAndType(
    tenantId: number,
    type: NotificationType,
  ): Promise<EmailTemplate | null> {
    const prismaType = type as unknown as PrismaNotificationType;
    const record = await this.prisma.emailTemplate.findUnique({
      where: { tenantId_type: { tenantId, type: prismaType } },
    });

    if (!record) return null;
    return record as unknown as EmailTemplate;
  }

  async findByTenant(tenantId: number): Promise<EmailTemplate[]> {
    const records = await this.prisma.emailTemplate.findMany({
      where: { tenantId },
      orderBy: { type: 'asc' },
    });

    return records as unknown as EmailTemplate[];
  }

  async getEffectiveTemplate(
    tenantId: number,
    type: NotificationType,
  ): Promise<EmailTemplate | null> {
    // Try tenant-specific template first
    const tenantTemplate = await this.findByTenantAndType(tenantId, type);
    if (tenantTemplate) return tenantTemplate;

    // Fall back to global default (tenantId=0) if not the system tenant
    if (tenantId !== 0) {
      const globalTemplate = await this.findByTenantAndType(0, type);
      if (globalTemplate) return globalTemplate;
    }

    // Fall back to hardcoded default templates
    const defaultTemplate = DEFAULT_TEMPLATES[type];
    if (defaultTemplate) {
      return {
        id: 0,
        tenantId,
        type,
        subject: defaultTemplate.subject,
        htmlBody: defaultTemplate.htmlBody,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as EmailTemplate;
    }

    return null;
  }

  async query(
    dto: QueryEmailTemplateDto,
  ): Promise<PaginatedResponse<EmailTemplate>> {
    const where: Prisma.EmailTemplateWhereInput = {};

    if (dto.tenantId !== undefined) where.tenantId = dto.tenantId;
    if (dto.type) where.type = dto.type as unknown as PrismaNotificationType;

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.emailTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.emailTemplate.count({ where }),
    ]);

    return {
      data: data as unknown as EmailTemplate[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteByTenantAndType(
    tenantId: number,
    type: NotificationType,
  ): Promise<{ count: number }> {
    const prismaType = type as unknown as PrismaNotificationType;
    const result = await this.prisma.emailTemplate.deleteMany({
      where: { tenantId, type: prismaType },
    });

    return { count: result.count };
  }
}
