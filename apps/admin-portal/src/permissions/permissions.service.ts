import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { sendWithTimeout } from '@arc/shared';

@Injectable()
export class AdminPermissionsService {
  constructor(
    @Inject('USERS_SERVICE') private readonly usersService: ClientProxy,
  ) {}

  async queryPermissions(page?: number, limit?: number) {
    return sendWithTimeout(this.usersService, { cmd: 'query_permissions' }, { page, limit });
  }

  async getPermissionById(id: number) {
    return sendWithTimeout(this.usersService, { cmd: 'get_permission' }, { id });
  }

  async createPermission(dto: Record<string, unknown>) {
    return sendWithTimeout(this.usersService, { cmd: 'create_permission' }, dto);
  }

  async updatePermission(id: number, dto: Record<string, unknown>) {
    return sendWithTimeout(this.usersService, { cmd: 'update_permission' }, { id, ...dto });
  }
}
