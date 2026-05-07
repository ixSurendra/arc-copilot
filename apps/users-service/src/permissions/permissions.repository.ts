import { Injectable } from '@nestjs/common';
import { UsersPrismaService } from '../prisma/users-prisma.service';
import { CreatePermissionDto, PermissionMaster, PaginatedResponse } from '@org/shared';

@Injectable()
export class PermissionsRepository {

  constructor(private readonly prisma: UsersPrismaService) {}

  async create(dto: CreatePermissionDto): Promise<PermissionMaster> {
    const record = await this.prisma.permissionMaster.create({
      data: {
        permissionName: dto.permissionName,
        permissionKey: dto.permissionKey,
        description: dto.description,
      },
    });
    return record as unknown as PermissionMaster;
  }

  async findById(id: number): Promise<PermissionMaster | null> {
    const record = await this.prisma.permissionMaster.findUnique({ where: { id } });
    if (!record) return null;
    return record as unknown as PermissionMaster;
  }

  async update(id: number, data: Partial<CreatePermissionDto & { status: string }>): Promise<PermissionMaster> {
    const record = await this.prisma.permissionMaster.update({
      where: { id },
      data: {
        ...(data.permissionName !== undefined && { permissionName: data.permissionName }),
        ...(data.permissionKey !== undefined && { permissionKey: data.permissionKey }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status as any }),
      },
    });
    return record as unknown as PermissionMaster;
  }

  async findAll(page: number, limit: number): Promise<PaginatedResponse<PermissionMaster>> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.permissionMaster.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.permissionMaster.count(),
    ]);

    return {
      data: data as unknown as PermissionMaster[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
