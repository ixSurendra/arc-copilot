import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { sendWithTimeout } from '@org/shared';

@Injectable()
export class AdminModulesService {
  constructor(
    @Inject('USERS_SERVICE') private readonly usersService: ClientProxy,
  ) {}

  async queryModules(page?: number, limit?: number) {
    return sendWithTimeout(this.usersService, { cmd: 'query_modules' }, { page, limit });
  }

  async getModuleById(id: number) {
    return sendWithTimeout(this.usersService, { cmd: 'get_module' }, { id });
  }

  async createModule(dto: Record<string, unknown>) {
    return sendWithTimeout(this.usersService, { cmd: 'create_module' }, dto);
  }

  async updateModule(id: number, dto: Record<string, unknown>) {
    return sendWithTimeout(this.usersService, { cmd: 'update_module' }, { id, ...dto });
  }

  async getAllModulesWithPermissions() {
    return sendWithTimeout(this.usersService, { cmd: 'get_all_modules_with_permissions' }, {});
  }

  async getModulePermissions(id: number) {
    return sendWithTimeout(this.usersService, { cmd: 'get_module_permissions' }, { id });
  }

  async assignPermissions(id: number, permissionIds: number[]) {
    await sendWithTimeout(this.usersService, { cmd: 'assign_module_permissions' }, { id, permissionIds }).catch(() => undefined);
  }

  async removePermission(id: number, permissionId: number) {
    await sendWithTimeout(this.usersService, { cmd: 'remove_module_permission' }, { id, permissionId }).catch(() => undefined);
  }
}
