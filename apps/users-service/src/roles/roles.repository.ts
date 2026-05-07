import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { UsersPrismaService } from '../prisma/users-prisma.service';
import {
  CreateRoleDto,
  QueryRoleDto,
  AssignRolePermissionsDto,
  Role,
  PaginatedResponse,
} from '@arc/shared';

@Injectable()
export class RolesRepository {

  constructor(private readonly prisma: UsersPrismaService) {}

  async create(dto: CreateRoleDto): Promise<Role> {
    const record = await this.prisma.role.create({
      data: {
        tenantId: dto.tenantId,
        roleName: dto.roleName,
        description: dto.description,
      },
    });
    return record as unknown as Role;
  }

  async findById(id: number, tenantId?: number): Promise<Role | null> {
    const record = tenantId !== undefined
      ? await this.prisma.role.findFirst({ where: { id, tenantId } })
      : await this.prisma.role.findUnique({ where: { id } });
    if (!record) return null;
    return record as unknown as Role;
  }

  async update(id: number, data: Partial<CreateRoleDto & { status: string }>): Promise<Role> {
    const record = await this.prisma.role.update({
      where: { id },
      data: {
        ...(data.roleName !== undefined && { roleName: data.roleName }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status as any }),
      },
    });
    return record as unknown as Role;
  }

  async findWithFilters(query: QueryRoleDto): Promise<PaginatedResponse<Role>> {
    const where: Prisma.RoleWhereInput = {};

    if (query.tenantId !== undefined) where.tenantId = query.tenantId;
    if (query.roleName) where.roleName = { contains: query.roleName, mode: 'insensitive' };
    if (query.status) where.status = query.status as any;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      data: data as unknown as Role[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByIdWithPermissions(id: number) {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        roleModulePermissions: {
          include: {
            modulePermission: {
              include: {
                module: true,
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  async assignPermissions(roleId: number, permissions: AssignRolePermissionsDto[]) {
    await this.prisma.roleModulePermission.createMany({
      data: permissions.map((p) => ({
        roleId,
        moduleId: p.moduleId,
        permissionId: p.permissionId,
        isEnabled: p.isEnabled ?? true,
      })),
      skipDuplicates: true,
    });
  }

  async removePermissions(roleId: number, moduleId: number, permissionId: number) {
    await this.prisma.roleModulePermission.delete({
      where: {
        roleId_moduleId_permissionId: { roleId, moduleId, permissionId },
      },
    });
  }

  async checkPermission(
    roleId: number,
    moduleId: number,
    permissionId: number,
  ): Promise<boolean> {
    const record = await this.prisma.roleModulePermission.findUnique({
      where: {
        roleId_moduleId_permissionId: { roleId, moduleId, permissionId },
      },
    });
    return record?.isEnabled ?? false;
  }

  async findByIds(ids: number[]): Promise<Role[]> {
    const records = await this.prisma.role.findMany({
      where: { id: { in: ids } },
    });
    return records as unknown as Role[];
  }

  async createIfNotExists(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.prisma.role.findUnique({
      where: { tenantId_roleName: { tenantId: dto.tenantId, roleName: dto.roleName } },
    });
    if (existing) {
      return existing as unknown as Role;
    }
    return this.create(dto);
  }

  /**
   * Grant every ACTIVE (module, permission) pair for modules whose moduleKey
   * starts with the given prefix to the role. Idempotent — uses
   * `skipDuplicates` so re-running adds any newly-seeded pairs without
   * touching existing grants.
   *
   * Returns the number of newly-assigned permission rows.
   */
  async grantAllModulePermissionsByPrefix(
    roleId: number,
    moduleKeyPrefix: string,
  ): Promise<number> {
    const modulePerms = await this.prisma.modulePermission.findMany({
      where: {
        status: 'ACTIVE',
        module: {
          moduleKey: { startsWith: moduleKeyPrefix },
          status: 'ACTIVE',
        },
      },
      select: { moduleId: true, permissionId: true },
    });

    if (modulePerms.length === 0) return 0;

    const result = await this.prisma.roleModulePermission.createMany({
      data: modulePerms.map((mp) => ({
        roleId,
        moduleId: mp.moduleId,
        permissionId: mp.permissionId,
        isEnabled: true,
      })),
      skipDuplicates: true,
    });

    return result.count;
  }

  async findRoleUsers(roleId: number) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { roleId },
      include: { user: true },
    });
    return userRoles.map((ur) => ur.user);
  }

  async assignUsers(roleId: number, userIds: number[]) {
    await this.prisma.userRole.createMany({
      data: userIds.map((userId) => ({ userId, roleId })),
      skipDuplicates: true,
    });
  }

  async removeUsers(roleId: number, userIds: number[]) {
    await this.prisma.userRole.deleteMany({
      where: {
        roleId,
        userId: { in: userIds },
      },
    });
  }
}
