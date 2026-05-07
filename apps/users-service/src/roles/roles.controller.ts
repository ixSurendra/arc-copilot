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
import { RolesService } from './roles.service';
import {
  CreateRoleDto,
  QueryRoleDto,
  AssignRolePermissionsDto,
  AssignRoleUsersDto,
  Role,
  PaginatedResponse,
  TenantAdminGuard,
  TenantScopeInterceptor,
} from '@arc/shared';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(TenantAdminGuard)
@UseInterceptors(TenantScopeInterceptor)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // --- TCP Message Patterns ---

  @MessagePattern({ cmd: 'check_permission' })
  async checkPermissionTcp(
    @Payload() data: { roleId: string; moduleId: number; permissionId: number },
  ): Promise<{ hasPermission: boolean }> {
    const hasPermission = await this.rolesService.checkPermission(
      Number(data.roleId),
      data.moduleId,
      data.permissionId,
    );
    return { hasPermission };
  }

  @MessagePattern({ cmd: 'create_default_roles' })
  async createDefaultRolesTcp(
    @Payload() data: { tenantId: string },
  ): Promise<void> {
    await this.rolesService.createDefaultRoles(Number(data.tenantId));
  }

  @MessagePattern({ cmd: 'query_roles' })
  async queryRolesTcp(@Payload() query: QueryRoleDto): Promise<PaginatedResponse<Role>> {
    return this.rolesService.queryRoles(query);
  }

  @MessagePattern({ cmd: 'create_role' })
  async createRoleTcp(@Payload() dto: CreateRoleDto): Promise<Role> {
    return this.rolesService.createRole(dto);
  }

  @MessagePattern({ cmd: 'get_role' })
  async getRoleTcp(@Payload() data: { id: number; requestingTenantId?: number }): Promise<Role> {
    return this.rolesService.getRoleById(data.id, data.requestingTenantId);
  }

  @MessagePattern({ cmd: 'update_role' })
  async updateRoleTcp(@Payload() data: { id: number; requestingTenantId?: number } & Partial<CreateRoleDto & { status: string }>): Promise<Role> {
    const { id, requestingTenantId, ...dto } = data;
    return this.rolesService.updateRole(id, dto, requestingTenantId);
  }

  @MessagePattern({ cmd: 'get_role_permissions' })
  async getRolePermissionsTcp(@Payload() data: { id: number }) {
    return this.rolesService.getRolePermissions(data.id);
  }

  @MessagePattern({ cmd: 'assign_role_permissions' })
  async assignRolePermissionsTcp(@Payload() data: { id: number; permissions: AssignRolePermissionsDto[] }): Promise<void> {
    await this.rolesService.assignPermissions(data.id, data.permissions);
  }

  @MessagePattern({ cmd: 'remove_role_permission' })
  async removeRolePermissionTcp(@Payload() data: { id: number; moduleId: number; permissionId: number }): Promise<void> {
    await this.rolesService.removePermission(data.id, data.moduleId, data.permissionId);
  }

  @MessagePattern({ cmd: 'get_role_users' })
  async getRoleUsersTcp(@Payload() data: { id: number }) {
    return this.rolesService.getRoleUsers(data.id);
  }

  @MessagePattern({ cmd: 'assign_role_users' })
  async assignRoleUsersTcp(@Payload() data: { id: number; userIds: number[] }): Promise<void> {
    await this.rolesService.assignUsers(data.id, data.userIds);
  }

  @MessagePattern({ cmd: 'remove_role_users' })
  async removeRoleUsersTcp(@Payload() data: { id: number; userIds: number[] }): Promise<void> {
    await this.rolesService.removeUsers(data.id, data.userIds);
  }

  // --- HTTP Endpoints ---

  @Post()
  @ApiOperation({ summary: 'Create a role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  async create(@Body() dto: CreateRoleDto): Promise<Role> {
    return this.rolesService.createRole(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Query roles', description: 'Returns a paginated list of roles' })
  @ApiResponse({ status: 200, description: 'Paginated list of roles' })
  async findAll(@Query() query: QueryRoleDto): Promise<PaginatedResponse<Role>> {
    return this.rolesService.queryRoles(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'The role' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Role> {
    return this.rolesService.getRoleById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateRoleDto & { status: string }>,
  ): Promise<Role> {
    return this.rolesService.updateRole(id, dto);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Get role permissions', description: 'Returns the role with all assigned module-permissions' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role with permissions' })
  async getPermissions(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.getRolePermissions(id);
  }

  @Post(':id/permissions')
  @ApiOperation({ summary: 'Assign permissions to a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 204, description: 'Permissions assigned' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRolePermissionsDto[],
  ): Promise<void> {
    await this.rolesService.assignPermissions(id, dto);
  }

  @Delete(':id/permissions/:moduleId/:permissionId')
  @ApiOperation({ summary: 'Remove a permission from a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiParam({ name: 'permissionId', description: 'Permission ID' })
  @ApiResponse({ status: 204, description: 'Permission removed' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ): Promise<void> {
    await this.rolesService.removePermission(id, moduleId, permissionId);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Get users assigned to a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'List of users assigned to this role' })
  async getRoleUsers(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.getRoleUsers(id);
  }

  @Post(':id/users')
  @ApiOperation({ summary: 'Assign users to a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 204, description: 'Users assigned' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignUsers(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRoleUsersDto,
  ): Promise<void> {
    await this.rolesService.assignUsers(id, dto.userIds);
  }

  @Delete(':id/users')
  @ApiOperation({ summary: 'Remove users from a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 204, description: 'Users removed' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRoleUsers(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRoleUsersDto,
  ): Promise<void> {
    await this.rolesService.removeUsers(id, dto.userIds);
  }
}
