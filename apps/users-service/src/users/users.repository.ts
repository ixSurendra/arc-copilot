import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { UsersPrismaService } from '../prisma/users-prisma.service';
import {
  CreateUserDto,
  UpdateUserDto,
  QueryUserDto,
  User,
  PaginatedResponse,
} from '@org/shared';

@Injectable()
export class UsersRepository {

  constructor(private readonly prisma: UsersPrismaService) {}

  async create(dto: CreateUserDto): Promise<User> {
    const record = await this.prisma.userTable.create({
      data: {
        tenantId: dto.tenantId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
    });
    return record as unknown as User;
  }

  async findById(id: number, tenantId?: number): Promise<User | null> {
    const record = await this.prisma.userTable.findFirst({
      where: {
        id,
        ...(tenantId !== undefined && { tenantId }),
      },
    });
    if (!record) return null;
    return record as unknown as User;
  }

  async findByEmail(tenantId: number, email: string): Promise<User | null> {
    const record = await this.prisma.userTable.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
    if (!record) return null;
    return record as unknown as User;
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const record = await this.prisma.userTable.update({
      where: { id },
      data: {
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
    return record as unknown as User;
  }

  async findWithFilters(query: QueryUserDto): Promise<PaginatedResponse<User>> {
    const where: Prisma.UserTableWhereInput = {};

    if (query.tenantId !== undefined) where.tenantId = query.tenantId;
    if (query.email) where.email = { contains: query.email, mode: 'insensitive' };
    if (query.status) where.status = query.status;
    if (query.search) {
      // Split multi-word searches so each word must match at least one field.
      // e.g. "Grace Wilson" → "Grace" matches firstName AND "Wilson" matches lastName.
      const terms = query.search.trim().split(/\s+/).filter(Boolean);
      const textConditions = terms.map((term) => ({
        OR: [
          { firstName: { contains: term, mode: 'insensitive' as const } },
          { lastName: { contains: term, mode: 'insensitive' as const } },
          { email: { contains: term, mode: 'insensitive' as const } },
        ],
      }));

      // When searchTenantIds is provided (resolved from tenant names by the BFF),
      // include users from those tenants as well: (match text) OR (belongs to matching tenant).
      if (query.searchTenantIds?.length) {
        where.OR = [
          { AND: textConditions },
          { tenantId: { in: query.searchTenantIds } },
        ];
      } else {
        where.AND = textConditions;
      }
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // When sorting by tenantId, group tenants together then sort within each tenant by newest first
    const orderBy =
      query.sortBy === 'tenantId'
        ? [{ tenantId: 'asc' as const }, { createdAt: 'desc' as const }]
        : [{ createdAt: 'desc' as const }];

    const [data, total] = await this.prisma.$transaction([
      this.prisma.userTable.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.userTable.count({ where }),
    ]);

    return {
      data: data as unknown as User[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByIdWithRoles(id: number, tenantId?: number) {
    return this.prisma.userTable.findFirst({
      where: {
        id,
        ...(tenantId !== undefined && { tenantId }),
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async assignRoles(userId: number, roleIds: number[]) {
    await this.prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
      skipDuplicates: true,
    });
  }

  async removeRoles(userId: number, roleIds: number[]) {
    await this.prisma.userRole.deleteMany({
      where: {
        userId,
        roleId: { in: roleIds },
      },
    });
  }

  async findByIdWithGroups(id: number, tenantId?: number) {
    return this.prisma.userTable.findFirst({
      where: {
        id,
        ...(tenantId !== undefined && { tenantId }),
      },
      include: {
        userGroups: {
          include: {
            group: true,
          },
        },
      },
    });
  }

  async assignGroups(userId: number, groupIds: number[]) {
    await this.prisma.userGroup.createMany({
      data: groupIds.map((groupId) => ({ userId, groupId })),
      skipDuplicates: true,
    });
  }

  async removeGroups(userId: number, groupIds: number[]) {
    await this.prisma.userGroup.deleteMany({
      where: {
        userId,
        groupId: { in: groupIds },
      },
    });
  }

  async countByTenant(tenantId: number): Promise<number> {
    return this.prisma.userTable.count({
      where: { tenantId, status: 'ACTIVE' },
    });
  }

  async findByEmailGlobal(email: string): Promise<User | null> {
    const record = await this.prisma.userTable.findFirst({
      where: { email, status: 'ACTIVE' },
    });
    if (!record) return null;
    return record as unknown as User;
  }

  async countAll(): Promise<number> {
    return this.prisma.userTable.count({
      where: { status: 'ACTIVE' },
    });
  }

  async countByTenantGrouped(): Promise<Array<{ tenantId: number; count: number }>> {
    const result = await this.prisma.userTable.groupBy({
      by: ['tenantId'],
      _count: { id: true },
      where: { status: 'ACTIVE' },
    });
    return result.map((r) => ({ tenantId: r.tenantId, count: r._count.id }));
  }

  async getMonthlyRegistrations(
    year: number,
    tenantId?: number,
  ): Promise<Array<{ month: number; count: number }>> {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const where: any = { createdAt: { gte: start, lt: end } };
    if (tenantId !== undefined) where.tenantId = tenantId;

    const result = await this.prisma.$queryRawUnsafe<
      Array<{ month: number; count: bigint }>
    >(
      `SELECT EXTRACT(MONTH FROM "CREATED_AT")::int AS month, COUNT(*)::bigint AS count
       FROM "USERS" WHERE "CREATED_AT" >= $1 AND "CREATED_AT" < $2
       ${tenantId !== undefined ? `AND "TENANT_ID" = $3` : ''}
       GROUP BY month ORDER BY month`,
      start,
      end,
      ...(tenantId !== undefined ? [tenantId] : []),
    );

    // Fill all 12 months (missing months get 0)
    const monthMap = new Map(result.map((r) => [r.month, Number(r.count)]));
    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      count: monthMap.get(i + 1) ?? 0,
    }));
  }

  /**
   * Returns the user with both direct roles and group-inherited roles
   * in a single query. Used to build the effective (merged) role list.
   */
  async findByIdWithEffectiveRoles(id: number, tenantId?: number) {
    return this.prisma.userTable.findFirst({
      where: {
        id,
        ...(tenantId !== undefined && { tenantId }),
      },
      include: {
        userRoles: {
          include: { role: { select: { id: true, roleName: true } } },
        },
        userGroups: {
          include: {
            group: {
              include: {
                groupRoles: {
                  include: { role: { select: { id: true, roleName: true } } },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Fetches all module-permission assignments for the given role IDs.
   * Returns rows with full module (key + name) and permission (key + name) info.
   * Only returns enabled assignments (isEnabled = true).
   */
  async findPermissionsByRoleIds(roleIds: number[]) {
    return this.prisma.roleModulePermission.findMany({
      where: {
        roleId: { in: roleIds },
        isEnabled: true,
      },
      include: {
        modulePermission: {
          include: {
            module: { select: { id: true, moduleName: true, moduleKey: true } },
            permission: { select: { id: true, permissionName: true, permissionKey: true } },
          },
        },
      },
    });
  }

  async findRolesByIds(roleIds: number[]) {
    return this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, roleName: true },
    });
  }
}
