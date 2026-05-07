import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { GroupsRepository } from './groups.repository';
import {
  CreateGroupDto,
  QueryGroupDto,
  Group,
  PaginatedResponse,
} from '@org/shared';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(private readonly groupsRepository: GroupsRepository) {}

  async createGroup(dto: CreateGroupDto): Promise<Group> {
    this.logger.log(`Creating group: ${dto.groupName} for tenant ${dto.tenantId}`);
    try {
      return await this.groupsRepository.create(dto);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          `A group with name "${dto.groupName}" already exists in this tenant`,
        );
      }
      throw error;
    }
  }

  async getGroupById(id: number, requestingTenantId?: number): Promise<Group> {
    const group = await this.groupsRepository.findById(id, requestingTenantId);
    if (!group) {
      throw new NotFoundException(`Group with id ${id} not found`);
    }
    return group;
  }

  async updateGroup(id: number, data: Partial<CreateGroupDto & { status: string }>, requestingTenantId?: number): Promise<Group> {
    this.logger.log(`Updating group: ${id}`);
    await this.getGroupById(id, requestingTenantId);
    return this.groupsRepository.update(id, data);
  }

  async queryGroups(query: QueryGroupDto): Promise<PaginatedResponse<Group>> {
    return this.groupsRepository.findWithFilters(query);
  }

  async getGroupRoles(id: number) {
    const record = await this.groupsRepository.findByIdWithRoles(id);
    if (!record) {
      throw new NotFoundException(`Group with id ${id} not found`);
    }
    // Transform to flat Role[] array matching frontend expectation
    return record.groupRoles.map((gr) => gr.role as any);
  }

  async assignRoles(groupId: number, roleIds: number[]): Promise<void> {
    await this.getGroupById(groupId);
    await this.groupsRepository.assignRoles(groupId, roleIds);
  }

  async removeRoles(groupId: number, roleIds: number[]): Promise<void> {
    await this.groupsRepository.removeRoles(groupId, roleIds);
  }

  async getGroupUsers(id: number) {
    await this.getGroupById(id);
    return this.groupsRepository.findGroupUsers(id);
  }

  async assignUsers(groupId: number, userIds: number[]): Promise<void> {
    await this.getGroupById(groupId);
    await this.groupsRepository.assignUsers(groupId, userIds);
  }

  async removeUsers(groupId: number, userIds: number[]): Promise<void> {
    await this.groupsRepository.removeUsers(groupId, userIds);
  }
}
