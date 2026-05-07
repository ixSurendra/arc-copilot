import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { UsersRepository } from './users.repository';
import {
  CreateUserDto,
  UpdateUserDto,
  QueryUserDto,
  User,
  Group,
  UserWithRoles,
  PaginatedResponse,
  RESERVED_ROLES,
} from '@arc/shared';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
    @Inject('TENANT_SERVICE') private readonly tenantClient: ClientProxy,
    @Inject('LICENSE_SERVICE') private readonly licenseClient: ClientProxy,
  ) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    this.logger.log(`Creating user: ${dto.email} for tenant ${dto.tenantId}`);

    await this.enforceMaxUsers(dto.tenantId);

    try {
      return await this.usersRepository.create(dto);
    } catch (error: any) {
      // Prisma P2002: unique constraint violation (e.g., duplicate email in tenant)
      if (error?.code === 'P2002') {
        throw new ConflictException(
          `A user with email "${dto.email}" already exists in this tenant`,
        );
      }
      throw error;
    }
  }

  private async enforceMaxUsers(tenantId: number): Promise<void> {
    const isOnPrem = this.configService.get<string>('ON_PREM') === 'true';

    if (isOnPrem) {
      // On-prem: check license file for maxUsers (tamper-proof)
      try {
        const licenseResult = await firstValueFrom(
          this.licenseClient.send({ cmd: 'validate_license' }, {}),
        );
        if (licenseResult?.maxUsers) {
          const currentCount = await this.usersRepository.countByTenant(tenantId);
          if (currentCount >= licenseResult.maxUsers) {
            throw new ForbiddenException(
              `Maximum user limit (${licenseResult.maxUsers}) reached for this license`,
            );
          }
        }
      } catch (error) {
        if (error instanceof ForbiddenException) throw error;
        this.logger.warn(`Could not validate license for max users: ${(error as Error).message}`);
      }
    } else {
      // Cloud: check tenant.maxUsers from tenant-service
      try {
        const tenant = await firstValueFrom(
          this.tenantClient.send({ cmd: 'get_tenant' }, { id: tenantId }),
        );
        if (tenant?.maxUsers) {
          const currentCount = await this.usersRepository.countByTenant(tenantId);
          if (currentCount >= tenant.maxUsers) {
            throw new ForbiddenException(
              `Maximum user limit (${tenant.maxUsers}) reached for this tenant`,
            );
          }
        }
      } catch (error) {
        if (error instanceof ForbiddenException) throw error;
        this.logger.warn(`Could not check tenant max users: ${(error as Error).message}`);
      }
    }
  }

  async getUserById(id: number, requestingTenantId?: number): Promise<User> {
    const user = await this.usersRepository.findById(id, requestingTenantId);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async getUserByEmail(tenantId: number, email: string): Promise<User> {
    const user = await this.usersRepository.findByEmail(tenantId, email);
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found in tenant ${tenantId}`);
    }
    return user;
  }

  async getUserByEmailGlobal(email: string): Promise<User> {
    const user = await this.usersRepository.findByEmailGlobal(email);
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  async updateUser(id: number, dto: UpdateUserDto, requestingTenantId?: number): Promise<User> {
    this.logger.log(`Updating user: ${id}`);
    await this.getUserById(id, requestingTenantId);
    return this.usersRepository.update(id, dto);
  }

  async queryUsers(query: QueryUserDto): Promise<PaginatedResponse<User>> {
    return this.usersRepository.findWithFilters(query);
  }

  async getUserRoles(id: number, requestingTenantId?: number): Promise<UserWithRoles> {
    const record = await this.usersRepository.findByIdWithRoles(id, requestingTenantId);
    if (!record) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    const { userRoles, ...user } = record;
    return {
      ...(user as unknown as User),
      roles: userRoles.map((ur) => ur.role as any),
    };
  }

  async assignRoles(userId: number, roleIds: number[], requestingTenantId?: number): Promise<void> {
    await this.getUserById(userId, requestingTenantId);

    // Block SUPER_ADMIN role assignment in on-prem mode
    const isOnPrem = this.configService.get<string>('ON_PREM') === 'true';
    if (isOnPrem) {
      const roles = await this.usersRepository.findRolesByIds(roleIds);
      const hasSuperAdmin = roles.some(
        (r) => r.roleName === RESERVED_ROLES.SUPER_ADMIN,
      );
      if (hasSuperAdmin) {
        throw new ForbiddenException(
          'Cannot assign SUPER_ADMIN role in on-prem mode',
        );
      }
    }

    await this.usersRepository.assignRoles(userId, roleIds);
  }

  async removeRoles(userId: number, roleIds: number[], requestingTenantId?: number): Promise<void> {
    await this.getUserById(userId, requestingTenantId);
    await this.usersRepository.removeRoles(userId, roleIds);
  }

  /**
   * Returns deduplicated effective roles for a user by merging:
   * 1. Direct roles (USER_ROLES)
   * 2. Group-inherited roles (USER_GROUPS → GROUP_ROLES)
   *
   * Handles edge cases:
   * - User has no groups → only direct roles returned
   * - Group has no roles → safely skipped (no error)
   * - Duplicate roles across direct + groups → deduplicated by role ID
   */
  async getEffectiveRoles(id: number): Promise<{ roles: Array<{ id: number; roleName: string }> }> {
    const record = await this.usersRepository.findByIdWithEffectiveRoles(id);
    if (!record) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const roleMap = new Map<number, { id: number; roleName: string }>();

    // 1. Collect direct roles
    for (const ur of record.userRoles || []) {
      if (ur.role) {
        roleMap.set(ur.role.id, { id: ur.role.id, roleName: ur.role.roleName });
      }
    }

    // 2. Collect group-inherited roles (groups without roles are safely skipped)
    for (const ug of record.userGroups || []) {
      const group = ug.group;
      if (!group?.groupRoles) continue;
      for (const gr of group.groupRoles) {
        if (gr.role && !roleMap.has(gr.role.id)) {
          roleMap.set(gr.role.id, { id: gr.role.id, roleName: gr.role.roleName });
        }
      }
    }

    return { roles: Array.from(roleMap.values()) };
  }

  /**
   * Returns the effective (additive) permissions for a user across all their
   * effective roles (direct + group-inherited).
   *
   * Output format (Option C — hybrid):
   * - modules[]: for rendering sidebar menus (has names, keys, ordered)
   * - permissionMap: for fast access checks { [moduleKey]: permissionKey[] }
   *
   * Edge cases handled:
   * - User has no roles → empty modules + empty permissionMap
   * - Role has no permissions → safely skipped
   * - Same permission from multiple roles → deduplicated
   */
  async getEffectivePermissions(userId: number): Promise<{
    modules: Array<{
      moduleId: number;
      moduleKey: string;
      moduleName: string;
      permissions: string[];
    }>;
    permissionMap: Record<string, string[]>;
  }> {
    // 1. Get effective roles (direct + group-inherited, deduplicated)
    const { roles } = await this.getEffectiveRoles(userId);

    // No roles → empty permissions
    if (!roles.length) {
      return { modules: [], permissionMap: {} };
    }

    // 2. Fetch all permissions for those roles (additive)
    const roleIds = roles.map((r) => r.id);
    const rolePermissions = await this.usersRepository.findPermissionsByRoleIds(roleIds);

    // 3. Build deduplicated module → permissions map
    // Key: moduleId, Value: { moduleInfo, permissionKeys set }
    const moduleMap = new Map<
      number,
      {
        moduleId: number;
        moduleKey: string;
        moduleName: string;
        permissionKeys: Set<string>;
      }
    >();

    for (const rp of rolePermissions) {
      const mod = rp.modulePermission?.module;
      const perm = rp.modulePermission?.permission;
      if (!mod || !perm) continue;

      let entry = moduleMap.get(mod.id);
      if (!entry) {
        entry = {
          moduleId: mod.id,
          moduleKey: mod.moduleKey,
          moduleName: mod.moduleName,
          permissionKeys: new Set(),
        };
        moduleMap.set(mod.id, entry);
      }
      entry.permissionKeys.add(perm.permissionKey);
    }

    // 4. Build output
    const modules = Array.from(moduleMap.values())
      .sort((a, b) => a.moduleName.localeCompare(b.moduleName))
      .map((entry) => ({
        moduleId: entry.moduleId,
        moduleKey: entry.moduleKey,
        moduleName: entry.moduleName,
        permissions: Array.from(entry.permissionKeys).sort(),
      }));

    const permissionMap: Record<string, string[]> = {};
    for (const mod of modules) {
      permissionMap[mod.moduleKey] = mod.permissions;
    }

    return { modules, permissionMap };
  }

  async getUserGroups(id: number, requestingTenantId?: number): Promise<Group[]> {
    const record = await this.usersRepository.findByIdWithGroups(id, requestingTenantId);
    if (!record) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return record.userGroups.map((ug) => ug.group as unknown as Group);
  }

  async assignGroups(userId: number, groupIds: number[], requestingTenantId?: number): Promise<void> {
    await this.getUserById(userId, requestingTenantId);
    await this.usersRepository.assignGroups(userId, groupIds);
  }

  async removeGroups(userId: number, groupIds: number[], requestingTenantId?: number): Promise<void> {
    await this.getUserById(userId, requestingTenantId);
    await this.usersRepository.removeGroups(userId, groupIds);
  }

  async countUsers(tenantId?: number): Promise<number> {
    if (tenantId !== undefined) {
      return this.usersRepository.countByTenant(tenantId);
    }
    return this.usersRepository.countAll();
  }

  async countUsersByTenant(): Promise<Array<{ tenantId: number; count: number }>> {
    return this.usersRepository.countByTenantGrouped();
  }

  async getMonthlyRegistrations(
    year: number,
    tenantId?: number,
  ): Promise<Array<{ month: number; count: number }>> {
    return this.usersRepository.getMonthlyRegistrations(year, tenantId);
  }
}
