import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import {
  CreateGroupDto,
  QueryGroupDto,
  AssignGroupRolesDto,
  AssignGroupUsersDto,
  Group,
  PaginatedResponse,
  TenantAdminGuard,
  TenantScopeInterceptor,
} from '@arc/shared';

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(TenantAdminGuard)
@UseInterceptors(TenantScopeInterceptor)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  // --- TCP Message Patterns ---

  @MessagePattern({ cmd: 'query_groups' })
  async queryGroupsTcp(@Payload() query: QueryGroupDto): Promise<PaginatedResponse<Group>> {
    return this.groupsService.queryGroups(query);
  }

  @MessagePattern({ cmd: 'create_group' })
  async createGroupTcp(@Payload() dto: CreateGroupDto): Promise<Group> {
    return this.groupsService.createGroup(dto);
  }

  @MessagePattern({ cmd: 'get_group' })
  async getGroupTcp(@Payload() data: { id: number; requestingTenantId?: number }): Promise<Group> {
    return this.groupsService.getGroupById(data.id, data.requestingTenantId);
  }

  @MessagePattern({ cmd: 'update_group' })
  async updateGroupTcp(@Payload() data: { id: number; requestingTenantId?: number } & Partial<CreateGroupDto & { status: string }>): Promise<Group> {
    const { id, requestingTenantId, ...dto } = data;
    return this.groupsService.updateGroup(id, dto, requestingTenantId);
  }

  @MessagePattern({ cmd: 'get_group_roles' })
  async getGroupRolesTcp(@Payload() data: { id: number }) {
    return this.groupsService.getGroupRoles(data.id);
  }

  @MessagePattern({ cmd: 'assign_group_roles' })
  async assignGroupRolesTcp(@Payload() data: { id: number; roleIds: number[] }): Promise<void> {
    await this.groupsService.assignRoles(data.id, data.roleIds);
  }

  @MessagePattern({ cmd: 'remove_group_roles' })
  async removeGroupRolesTcp(@Payload() data: { id: number; roleIds: number[] }): Promise<void> {
    await this.groupsService.removeRoles(data.id, data.roleIds);
  }

  @MessagePattern({ cmd: 'get_group_users' })
  async getGroupUsersTcp(@Payload() data: { id: number }) {
    return this.groupsService.getGroupUsers(data.id);
  }

  @MessagePattern({ cmd: 'assign_group_users' })
  async assignGroupUsersTcp(@Payload() data: { id: number; userIds: number[] }): Promise<void> {
    await this.groupsService.assignUsers(data.id, data.userIds);
  }

  @MessagePattern({ cmd: 'remove_group_users' })
  async removeGroupUsersTcp(@Payload() data: { id: number; userIds: number[] }): Promise<void> {
    await this.groupsService.removeUsers(data.id, data.userIds);
  }

  // --- HTTP Endpoints ---

  @Post()
  @ApiOperation({ summary: 'Create a group' })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  async create(@Body() dto: CreateGroupDto): Promise<Group> {
    return this.groupsService.createGroup(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Query groups', description: 'Returns a paginated list of groups' })
  @ApiResponse({ status: 200, description: 'Paginated list of groups' })
  async findAll(@Query() query: QueryGroupDto): Promise<PaginatedResponse<Group>> {
    return this.groupsService.queryGroups(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'The group' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Group> {
    return this.groupsService.getGroupById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Group updated' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateGroupDto & { status: string }>,
  ): Promise<Group> {
    return this.groupsService.updateGroup(id, dto);
  }

  @Get(':id/roles')
  @ApiOperation({ summary: 'Get group with roles' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Group with assigned roles' })
  async getRoles(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.getGroupRoles(id);
  }

  @Post(':id/roles')
  @ApiOperation({ summary: 'Assign roles to a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 204, description: 'Roles assigned' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignGroupRolesDto,
  ): Promise<void> {
    await this.groupsService.assignRoles(id, dto.roleIds);
  }

  @Delete(':id/roles')
  @ApiOperation({ summary: 'Remove roles from a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 204, description: 'Roles removed' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignGroupRolesDto,
  ): Promise<void> {
    await this.groupsService.removeRoles(id, dto.roleIds);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Get users assigned to a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'List of users in this group' })
  async getGroupUsers(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.getGroupUsers(id);
  }

  @Post(':id/users')
  @ApiOperation({ summary: 'Assign users to a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 204, description: 'Users assigned' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignUsers(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignGroupUsersDto,
  ): Promise<void> {
    await this.groupsService.assignUsers(id, dto.userIds);
  }

  @Delete(':id/users')
  @ApiOperation({ summary: 'Remove users from a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 204, description: 'Users removed' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeGroupUsers(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignGroupUsersDto,
  ): Promise<void> {
    await this.groupsService.removeUsers(id, dto.userIds);
  }
}
