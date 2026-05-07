import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PermissionsRepository } from './permissions.repository';
import { CreatePermissionDto, PermissionMaster, PaginatedResponse } from '@org/shared';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  async createPermission(dto: CreatePermissionDto): Promise<PermissionMaster> {
    this.logger.log(`Creating permission: ${dto.permissionName} (${dto.permissionKey})`);
    return this.permissionsRepository.create(dto);
  }

  async getPermissionById(id: number): Promise<PermissionMaster> {
    const perm = await this.permissionsRepository.findById(id);
    if (!perm) {
      throw new NotFoundException(`Permission with id ${id} not found`);
    }
    return perm;
  }

  async updatePermission(id: number, data: Partial<CreatePermissionDto & { status: string }>): Promise<PermissionMaster> {
    this.logger.log(`Updating permission: ${id}`);
    await this.getPermissionById(id);
    return this.permissionsRepository.update(id, data);
  }

  async queryPermissions(page = 1, limit = 20): Promise<PaginatedResponse<PermissionMaster>> {
    return this.permissionsRepository.findAll(page, limit);
  }
}
