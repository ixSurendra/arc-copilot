import { Inject, Injectable, HttpException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { sendWithTimeout, rpcStatusCode, rpcMessage } from '@arc/shared';

@Injectable()
export class AdminGroupsService {
  constructor(
    @Inject('USERS_SERVICE') private readonly usersService: ClientProxy,
  ) {}

  async queryGroups(query: Record<string, unknown>) {
    return sendWithTimeout(this.usersService, { cmd: 'query_groups' }, query);
  }

  async getGroupById(id: number, requestingTenantId?: number) {
    return sendWithTimeout(this.usersService, { cmd: 'get_group' }, { id, requestingTenantId });
  }

  async createGroup(dto: Record<string, unknown>) {
    try {
      return await sendWithTimeout(this.usersService, { cmd: 'create_group' }, dto);
    } catch (err: unknown) {
      throw new HttpException(rpcMessage(err, 'Failed to create group'), rpcStatusCode(err));
    }
  }

  async updateGroup(id: number, dto: Record<string, unknown>, requestingTenantId?: number) {
    try {
      return await sendWithTimeout(this.usersService, { cmd: 'update_group' }, { id, ...dto, requestingTenantId });
    } catch (err: unknown) {
      throw new HttpException(rpcMessage(err, 'Failed to update group'), rpcStatusCode(err));
    }
  }

  async getGroupRoles(id: number) {
    return sendWithTimeout(this.usersService, { cmd: 'get_group_roles' }, { id });
  }

  async assignRoles(id: number, roleIds: number[]) {
    await sendWithTimeout(this.usersService, { cmd: 'assign_group_roles' }, { id, roleIds }).catch(() => undefined);
  }

  async removeRoles(id: number, roleIds: number[]) {
    await sendWithTimeout(this.usersService, { cmd: 'remove_group_roles' }, { id, roleIds }).catch(() => undefined);
  }

  async getGroupUsers(id: number) {
    return sendWithTimeout(this.usersService, { cmd: 'get_group_users' }, { id });
  }

  async assignUsers(id: number, userIds: number[]) {
    await sendWithTimeout(this.usersService, { cmd: 'assign_group_users' }, { id, userIds }).catch(() => undefined);
  }

  async removeUsers(id: number, userIds: number[]) {
    await sendWithTimeout(this.usersService, { cmd: 'remove_group_users' }, { id, userIds }).catch(() => undefined);
  }
}
