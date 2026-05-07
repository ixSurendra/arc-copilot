import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  QueryTenantDto,
  Tenant,
  TenantAnalytics,
  PaginatedResponse,
} from '@org/shared';

/**
 * Belt-and-braces check that rejects any attempt to write a numeric-only string
 * to TENANTS.PLAN_ID. The column stores plan NAMES (e.g. "PROFESSIONAL"), and
 * accepting numeric IDs leads to the admin-UI bug where "3" overwrites
 * "PROFESSIONAL" and DMS quota lookups return the wrong plan.
 */
function assertPlanIdIsNotNumeric(planId: string | undefined | null, fieldName: string): void {
  if (planId === undefined || planId === null || planId === '') return;
  if (/^\d+$/.test(planId)) {
    throw new BadRequestException(
      `${fieldName} "${planId}" looks like a numeric ID. Expected a plan name string (e.g., "PROFESSIONAL").`,
    );
  }
}

@Injectable()
export class TenantsRepository {

  constructor(private readonly prisma: TenantPrismaService) {}

  async create(dto: CreateTenantDto): Promise<Tenant> {
    assertPlanIdIsNotNumeric(dto.planId, 'planId');
    const record = await this.prisma.tenant.create({
      data: {
        tenantName: dto.tenantName,
        domain: dto.domain,
        planId: dto.planId,
        quotaType: dto.quotaType,
        billingCycle: dto.billingCycle ?? null,
        maxUsers: dto.maxUsers,
        cycleStartDate: dto.cycleStartDate
          ? new Date(dto.cycleStartDate)
          : dto.billingCycle
            ? new Date()
            : null,
        isOnPrem: dto.isOnPrem ?? false,
        licenseExpiryDate: dto.licenseExpiryDate
          ? new Date(dto.licenseExpiryDate)
          : null,
      },
    });

    return record as unknown as Tenant;
  }

  async findById(id: number): Promise<Tenant | null> {
    const record = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!record) return null;
    return record as unknown as Tenant;
  }

  async findByDomain(domain: string): Promise<Tenant | null> {
    const record = await this.prisma.tenant.findFirst({
      where: { domain },
    });
    if (!record) return null;
    return record as unknown as Tenant;
  }

  async update(id: number, dto: UpdateTenantDto): Promise<Tenant> {
    assertPlanIdIsNotNumeric(dto.planId, 'planId');
    assertPlanIdIsNotNumeric(dto.nextPlanId, 'nextPlanId');
    const record = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(dto.tenantName !== undefined && { tenantName: dto.tenantName }),
        ...(dto.domain !== undefined && { domain: dto.domain }),
        ...(dto.planId !== undefined && { planId: dto.planId }),
        ...(dto.nextPlanId !== undefined && { nextPlanId: dto.nextPlanId }),
        ...(dto.quotaType !== undefined && { quotaType: dto.quotaType }),
        ...(dto.billingCycle !== undefined && { billingCycle: dto.billingCycle }),
        ...(dto.maxUsers !== undefined && { maxUsers: dto.maxUsers }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.isOnPrem !== undefined && { isOnPrem: dto.isOnPrem }),
        ...(dto.licenseExpiryDate !== undefined && {
          licenseExpiryDate: dto.licenseExpiryDate
            ? new Date(dto.licenseExpiryDate)
            : null,
        }),
      },
    });

    return record as unknown as Tenant;
  }

  async findWithFilters(
    query: QueryTenantDto,
  ): Promise<PaginatedResponse<Tenant>> {
    const where: Prisma.TenantWhereInput = {};

    if (query.tenantName) {
      where.tenantName = { contains: query.tenantName, mode: 'insensitive' };
    }
    if (query.domain) where.domain = query.domain;
    if (query.status) where.status = query.status;
    if (query.planId) where.planId = query.planId;
    if (query.isOnPrem !== undefined) where.isOnPrem = query.isOnPrem;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await (this.prisma.$transaction as any)([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      data: data as unknown as Tenant[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAnalytics(): Promise<TenantAnalytics> {
    const [
      byStatusRaw,
      byBillingCycleRaw,
      byDeploymentRaw,
      byPlanRaw,
      onPremTenants,
      totalTenants,
    ] = await (this.prisma.$transaction as any)([
      this.prisma.tenant.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.tenant.groupBy({
        by: ['billingCycle'],
        _count: { id: true },
        where: { billingCycle: { not: null } },
      }),
      this.prisma.tenant.groupBy({
        by: ['isOnPrem'],
        _count: { id: true },
      }),
      this.prisma.tenant.groupBy({
        by: ['planId'],
        _count: { id: true },
      }),
      this.prisma.tenant.findMany({
        where: { isOnPrem: true },
        select: { id: true, tenantName: true, domain: true, licenseExpiryDate: true, updatedAt: true },
        orderBy: { licenseExpiryDate: 'asc' },
      }),
      this.prisma.tenant.count(),
    ]);

    return {
      byStatus: (byStatusRaw as { status: string; _count: { id: number } }[]).map((r) => ({ status: r.status, count: r._count.id })),
      byBillingCycle: (byBillingCycleRaw as { billingCycle: string | null; _count: { id: number } }[]).map((r) => ({
        cycle: r.billingCycle ?? 'NONE',
        count: r._count.id,
      })),
      byDeploymentType: (byDeploymentRaw as { isOnPrem: boolean; _count: { id: number } }[]).map((r) => ({
        type: r.isOnPrem ? 'On-Prem' : 'Cloud',
        count: r._count.id,
      })),
      byPlan: (byPlanRaw as { planId: number | null; _count: { id: number } }[]).map((r) => ({ planId: r.planId !== null ? String(r.planId) : 'NONE', count: r._count.id })),
      onPremTenants: (onPremTenants as { id: number; tenantName: string; domain: string; licenseExpiryDate: Date | null; updatedAt: Date }[]).map((t) => ({
        id: t.id,
        tenantName: t.tenantName,
        domain: t.domain,
        licenseExpiryDate: t.licenseExpiryDate?.toISOString() ?? null,
        updatedAt: t.updatedAt.toISOString(),
      })),
      totalTenants,
    };
  }
}
