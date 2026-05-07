import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ModulesRepository } from './modules.repository';
import { CreateModuleDto, ModuleMaster, PaginatedResponse } from '@arc/shared';

@Injectable()
export class ModulesService {
  private readonly logger = new Logger(ModulesService.name);

  constructor(private readonly modulesRepository: ModulesRepository) {}

  async createModule(dto: CreateModuleDto): Promise<ModuleMaster> {
    this.logger.log(`Creating module: ${dto.moduleName} (${dto.moduleKey})`);
    return this.modulesRepository.create(dto);
  }

  async getModuleById(id: number): Promise<ModuleMaster> {
    const mod = await this.modulesRepository.findById(id);
    if (!mod) {
      throw new NotFoundException(`Module with id ${id} not found`);
    }
    return mod;
  }

  async updateModule(id: number, data: Partial<CreateModuleDto & { status: string }>): Promise<ModuleMaster> {
    this.logger.log(`Updating module: ${id}`);
    await this.getModuleById(id);
    return this.modulesRepository.update(id, data);
  }

  async queryModules(page = 1, limit = 20): Promise<PaginatedResponse<ModuleMaster>> {
    return this.modulesRepository.findAll(page, limit);
  }

  async getAllModulesWithPermissions() {
    const modules = await this.modulesRepository.findAllWithPermissions();
    return modules.map((mod) => ({
      moduleId: mod.id,
      moduleName: mod.moduleName,
      permissions: mod.modulePermissions.map((mp) => ({
        permissionId: (mp.permission as any).id,
        permissionName: (mp.permission as any).permissionName,
      })),
    }));
  }

  async getModulePermissions(id: number) {
    const record = await this.modulesRepository.findByIdWithPermissions(id);
    if (!record) {
      throw new NotFoundException(`Module with id ${id} not found`);
    }
    // Transform nested Prisma result to flat PermissionMaster[] array
    return record.modulePermissions.map((mp) => mp.permission);
  }

  async assignPermissions(moduleId: number, permissionIds: number[]): Promise<void> {
    await this.getModuleById(moduleId);
    await this.modulesRepository.assignPermissions(moduleId, permissionIds);
  }

  async removePermission(moduleId: number, permissionId: number): Promise<void> {
    await this.modulesRepository.removePermission(moduleId, permissionId);
  }
}
