import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { UsersPrismaService } from '../prisma/users-prisma.service';
import {
  CreateGroupDto,
  QueryGroupDto,
  Group,
  PaginatedResponse,
} from '@org/shared';

@Injectable()
export class GroupsRepository {

  constructor(private readonly prisma: UsersPrismaService) {}

  async create(dto: CreateGroupDto): Promise<Group> {
    const record = await this.prisma.groupTable.create({
      data: {
        tenantId: dto.tenantId,
        groupName: dto.groupName,
        description: dto.description,
      },
    });
    return record as unknown as Group;
  }

  async findById(id: number, tenantId?: number): Promise<Group | null> {
    const record = tenantId !== undefined
      ? await this.prisma.groupTable.findFirst({ where: { id, tenantId } })
      : await this.prisma.groupTable.findUnique({ where: { id } });
    if (!record) return null;
    return record as unknown as Group;
  }

  async update(id: number, data: Partial<CreateGroupDto & { status: string }>): Promise<Group> {
    const record = await this.prisma.groupTable.update({
      where: { id },
      data: {
        ...(data.groupName !== undefined && { groupName: data.groupName }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status as any }),
      },
    });
    return record as unknown as Group;
  }

  async findWithFilters(query: QueryGroupDto): Promise<PaginatedResponse<Group>> {
    const where: Prisma.GroupTableWhereInput = {};

    if (query.tenantId !== undefined) where.tenantId = query.tenantId;
    if (query.groupName) where.groupName = { contains: query.groupName, mode: 'insensitive' };
    if (query.status) where.status = query.status as any;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.groupTable.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.groupTable.count({ where }),
    ]);

    return {
      data: data as unknown as Group[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByIdWithRoles(id: number) {
    return this.prisma.groupTable.findUnique({
      where: { id },
      include: {
        groupRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async assignRoles(groupId: number, roleIds: number[]) {
    await this.prisma.groupRole.createMany({
      data: roleIds.map((roleId) => ({ groupId, roleId })),
      skipDuplicates: true,
    });
  }

  async removeRoles(groupId: number, roleIds: number[]) {
    await this.prisma.groupRole.deleteMany({
      where: {
        groupId,
        roleId: { in: roleIds },
      },
    });
  }

  async findGroupUsers(groupId: number) {
    const userGroups = await this.prisma.userGroup.findMany({
      where: { groupId },
      include: { user: true },
    });
    return userGroups.map((ug) => ug.user);
  }

  async assignUsers(groupId: number, userIds: number[]) {
    await this.prisma.userGroup.createMany({
      data: userIds.map((userId) => ({ userId, groupId })),
      skipDuplicates: true,
    });
  }

  async removeUsers(groupId: number, userIds: number[]) {
    await this.prisma.userGroup.deleteMany({
      where: {
        groupId,
        userId: { in: userIds },
      },
    });
  }
}
