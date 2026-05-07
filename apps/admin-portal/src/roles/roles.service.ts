import { Inject, Injectable, HttpException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { sendWithTimeout, rpcStatusCode, rpcMessage } from '@arc/shared';

@Injectable()
export class AdminRolesService {
  constructor(
    @Inject('USERS_SERVICE') private readonly usersService: ClientProxy,
  ) {}

  async queryRoles(query: Record<string, unknown>) {
    return sendWithTimeout(this.usersService, { cmd: 'query_roles' }, query);
  }

  async getRoleById(id: number, requestingTenantId?: number) {
    return sendWithTimeout(this.usersService, { cmd: 'get_role' }, { id, requestingTenantId });
  }

  async createRole(dto: Record<string, unknown>) {
    try {
      return await sendWithTimeout(this.usersService, { cmd: 'create_role' }, dto);
    } catch (err: unknown) {
      throw new HttpException(rpcMessage(err, 'Failed to create role'), rpcStatusCode(err));
    }
  }

  async updateRole(id: number, dto: Record<string, unknown>, requestingTenantId?: number) {
    try {
      return await sendWithTimeout(this.usersService, { cmd: 'update_role' }, { id, ...dto, requestingTenantId });
    } catch (err: unknown) {
      throw new HttpException(rpcMessage(err, 'Failed to update role'), rpcStatusCode(err));
    }
  }

  async getRolePermissions(id: number) {
    return sendWithTimeout(this.usersService, { cmd: 'get_role_permissions' }, { id });
  }

  async assignPermissions(id: number, permissions: Record<string, unknown>[]) {
    await sendWithTimeout(this.usersService, { cmd: 'assign_role_permissions' }, { id, permissions }).catch(() => undefined);
  }

  async removePermission(id: number, moduleId: number, permissionId: number) {
    await sendWithTimeout(this.usersService, { cmd: 'remove_role_permission' }, { id, moduleId, permissionId }).catch(() => undefined);
  }

  async getRoleUsers(id: number) {
    return sendWithTimeout(this.usersService, { cmd: 'get_role_users' }, { id });
  }

  async assignUsers(id: number, userIds: number[]) {
    await sendWithTimeout(this.usersService, { cmd: 'assign_role_users' }, { id, userIds }).catch(() => undefined);
  }

  async removeUsers(id: number, userIds: number[]) {
    await sendWithTimeout(this.usersService, { cmd: 'remove_role_users' }, { id, userIds }).catch(() => undefined);
  }
}
