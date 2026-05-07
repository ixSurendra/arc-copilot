import { Injectable, Logger, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { RolesRepository } from './roles.repository';
import {
  CreateRoleDto,
  QueryRoleDto,
  AssignRolePermissionsDto,
  Role,
  PaginatedResponse,
  RESERVED_ROLES,
} from '@org/shared';

const RESERVED_ROLE_NAMES = Object.values(RESERVED_ROLES);

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly rolesRepository: RolesRepository) {}

  async createRole(dto: CreateRoleDto): Promise<Role> {
    if (RESERVED_ROLE_NAMES.includes(dto.roleName as any)) {
      throw new ForbiddenException(`Cannot create reserved role: ${dto.roleName}`);
    }
    this.logger.log(`Creating role: ${dto.roleName} for tenant ${dto.tenantId}`);
    try {
      return await this.rolesRepository.create(dto);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          `A role with name "${dto.roleName}" already exists in this tenant`,
        );
      }
      throw error;
    }
  }

  async getRoleById(id: number, requestingTenantId?: number): Promise<Role> {
    const role = await this.rolesRepository.findById(id, requestingTenantId);
    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }
    return role;
  }

  async updateRole(id: number, data: Partial<CreateRoleDto & { status: string }>, requestingTenantId?: number): Promise<Role> {
    this.logger.log(`Updating role: ${id}`);
    const role = await this.getRoleById(id, requestingTenantId);

    // Block renaming or deactivation of reserved roles
    if (RESERVED_ROLE_NAMES.includes(role.roleName as any)) {
      if (data.roleName && data.roleName !== role.roleName) {
        throw new ForbiddenException('Cannot rename a reserved role');
      }
      if (data.status && data.status !== role.status) {
        throw new ForbiddenException('Cannot change status of a reserved role');
      }
    }

    // Block renaming to a reserved role name
    if (data.roleName && RESERVED_ROLE_NAMES.includes(data.roleName as any)) {
      throw new ForbiddenException(`Cannot rename role to reserved name: ${data.roleName}`);
    }

    return this.rolesRepository.update(id, data);
  }

  async queryRoles(query: QueryRoleDto): Promise<PaginatedResponse<Role>> {
    return this.rolesRepository.findWithFilters(query);
  }

  async getRolePermissions(id: number) {
    const record = await this.rolesRepository.findByIdWithPermissions(id);
    if (!record) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }
    // Transform nested Prisma result to a flat AssignedPermission[] array
    return record.roleModulePermissions.map((rmp) => ({
      moduleId: rmp.moduleId,
      moduleName: rmp.modulePermission?.module?.moduleName ?? '',
      permissionId: rmp.permissionId,
      permissionName: rmp.modulePermission?.permission?.permissionName ?? '',
    }));
  }

  async assignPermissions(roleId: number, permissions: AssignRolePermissionsDto[]): Promise<void> {
    await this.getRoleById(roleId);
    await this.rolesRepository.assignPermissions(roleId, permissions);
  }

  async removePermission(roleId: number, moduleId: number, permissionId: number): Promise<void> {
    await this.rolesRepository.removePermissions(roleId, moduleId, permissionId);
  }

  async checkPermission(roleId: number, moduleId: number, permissionId: number): Promise<boolean> {
    return this.rolesRepository.checkPermission(roleId, moduleId, permissionId);
  }

  async findRolesByIds(ids: number[]): Promise<Role[]> {
    return this.rolesRepository.findByIds(ids);
  }

  async createDefaultRoles(tenantId: number): Promise<void> {
    this.logger.log(`Creating default TENANT_ADMIN role for tenant ${tenantId}`);
    const role = await this.rolesRepository.createIfNotExists({
      tenantId,
      roleName: RESERVED_ROLES.TENANT_ADMIN,
      description: 'Default tenant administrator role',
    });

    // Grant the TENANT_ADMIN role every ACTIVE (module, permission) pair for
    // DMS modules. Idempotent — adds only newly-seeded pairs on re-run. If
    // the DMS module/permission seed hasn't run yet this returns 0, and a
    // later seed or the backfill script will fill them in.
    try {
      const added = await this.rolesRepository.grantAllModulePermissionsByPrefix(
        role.id,
        'dms_',
      );
      if (added > 0) {
        this.logger.log(
          `Granted ${added} DMS module permission(s) to TENANT_ADMIN role ${role.id} for tenant ${tenantId}`,
        );
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to grant DMS permissions to TENANT_ADMIN role for tenant ${tenantId}: ${err.message}`,
      );
    }
  }

  async getRoleUsers(id: number) {
    await this.getRoleById(id);
    return this.rolesRepository.findRoleUsers(id);
  }

  async assignUsers(roleId: number, userIds: number[]): Promise<void> {
    await this.getRoleById(roleId);
    await this.rolesRepository.assignUsers(roleId, userIds);
  }

  async removeUsers(roleId: number, userIds: number[]): Promise<void> {
    await this.rolesRepository.removeUsers(roleId, userIds);
  }
}
