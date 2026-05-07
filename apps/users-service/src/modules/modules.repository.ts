import { Injectable } from '@nestjs/common';
import { UsersPrismaService } from '../prisma/users-prisma.service';
import { CreateModuleDto, ModuleMaster, PaginatedResponse } from '@arc/shared';

@Injectable()
export class ModulesRepository {

  constructor(private readonly prisma: UsersPrismaService) {}

  async create(dto: CreateModuleDto): Promise<ModuleMaster> {
    const record = await this.prisma.moduleMaster.create({
      data: {
        moduleName: dto.moduleName,
        moduleKey: dto.moduleKey,
        description: dto.description,
      },
    });
    return record as unknown as ModuleMaster;
  }

  async findById(id: number): Promise<ModuleMaster | null> {
    const record = await this.prisma.moduleMaster.findUnique({ where: { id } });
    if (!record) return null;
    return record as unknown as ModuleMaster;
  }

  async update(id: number, data: Partial<CreateModuleDto & { status: string }>): Promise<ModuleMaster> {
    const record = await this.prisma.moduleMaster.update({
      where: { id },
      data: {
        ...(data.moduleName !== undefined && { moduleName: data.moduleName }),
        ...(data.moduleKey !== undefined && { moduleKey: data.moduleKey }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status as any }),
      },
    });
    return record as unknown as ModuleMaster;
  }

  async findAll(page: number, limit: number): Promise<PaginatedResponse<ModuleMaster>> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.moduleMaster.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.moduleMaster.count(),
    ]);

    return {
      data: data as unknown as ModuleMaster[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAllWithPermissions() {
    return this.prisma.moduleMaster.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { moduleName: 'asc' },
      include: {
        modulePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async findByIdWithPermissions(id: number) {
    return this.prisma.moduleMaster.findUnique({
      where: { id },
      include: {
        modulePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async assignPermissions(moduleId: number, permissionIds: number[]) {
    await this.prisma.modulePermission.createMany({
      data: permissionIds.map((permissionId) => ({ moduleId, permissionId })),
      skipDuplicates: true,
    });
  }

  async removePermission(moduleId: number, permissionId: number) {
    await this.prisma.modulePermission.delete({
      where: {
        moduleId_permissionId: { moduleId, permissionId },
      },
    });
  }
}
