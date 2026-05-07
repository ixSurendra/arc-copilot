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
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  QueryUserDto,
  AssignUserRolesDto,
  AssignUserGroupsDto,
  User,
  Group,
  UserWithRoles,
  PaginatedResponse,
  TenantAdminGuard,
  TenantScopeInterceptor,
} from '@arc/shared';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(TenantAdminGuard)
@UseInterceptors(TenantScopeInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // --- TCP Message Patterns ---

  @MessagePattern({ cmd: 'get_user_by_id' })
  async getUserByIdTcp(@Payload() data: { id: number; requestingTenantId?: number }): Promise<User> {
    return this.usersService.getUserById(data.id, data.requestingTenantId);
  }

  @MessagePattern({ cmd: 'get_user_by_email' })
  async getUserByEmailTcp(
    @Payload() data: { tenantId: string; email: string },
  ): Promise<User> {
    return this.usersService.getUserByEmail(Number(data.tenantId), data.email);
  }

  @MessagePattern({ cmd: 'get_user_by_email_global' })
  async getUserByEmailGlobalTcp(
    @Payload() data: { email: string },
  ): Promise<User> {
    return this.usersService.getUserByEmailGlobal(data.email);
  }

  @MessagePattern({ cmd: 'get_user_roles' })
  async getUserRolesTcp(
    @Payload() data: { id: number; requestingTenantId?: number },
  ): Promise<UserWithRoles> {
    return this.usersService.getUserRoles(data.id, data.requestingTenantId);
  }

  @MessagePattern({ cmd: 'query_users' })
  async queryUsersTcp(@Payload() query: QueryUserDto): Promise<PaginatedResponse<User>> {
    return this.usersService.queryUsers(query);
  }

  @MessagePattern({ cmd: 'create_user' })
  async createUserTcp(@Payload() dto: CreateUserDto): Promise<User> {
    return this.usersService.createUser(dto);
  }

  @MessagePattern({ cmd: 'update_user' })
  async updateUserTcp(@Payload() data: { id: number; requestingTenantId?: number } & UpdateUserDto): Promise<User> {
    const { id, requestingTenantId, ...dto } = data;
    return this.usersService.updateUser(id, dto, requestingTenantId);
  }

  @MessagePattern({ cmd: 'assign_user_roles' })
  async assignUserRolesTcp(@Payload() data: { id: number; roleIds: number[]; requestingTenantId?: number }): Promise<void> {
    await this.usersService.assignRoles(data.id, data.roleIds, data.requestingTenantId);
  }

  @MessagePattern({ cmd: 'remove_user_roles' })
  async removeUserRolesTcp(@Payload() data: { id: number; roleIds: number[]; requestingTenantId?: number }): Promise<void> {
    await this.usersService.removeRoles(data.id, data.roleIds, data.requestingTenantId);
  }

  @MessagePattern({ cmd: 'get_effective_roles' })
  async getEffectiveRolesTcp(
    @Payload() data: { id: number },
  ): Promise<{ roles: Array<{ id: number; roleName: string }> }> {
    return this.usersService.getEffectiveRoles(data.id);
  }

  @MessagePattern({ cmd: 'get_user_effective_permissions' })
  async getEffectivePermissionsTcp(@Payload() data: { userId: number }) {
    return this.usersService.getEffectivePermissions(data.userId);
  }

  @MessagePattern({ cmd: 'get_user_groups' })
  async getUserGroupsTcp(
    @Payload() data: { id: number; requestingTenantId?: number },
  ): Promise<Group[]> {
    return this.usersService.getUserGroups(data.id, data.requestingTenantId);
  }

  @MessagePattern({ cmd: 'assign_user_groups' })
  async assignUserGroupsTcp(@Payload() data: { id: number; groupIds: number[]; requestingTenantId?: number }): Promise<void> {
    await this.usersService.assignGroups(data.id, data.groupIds, data.requestingTenantId);
  }

  @MessagePattern({ cmd: 'remove_user_groups' })
  async removeUserGroupsTcp(@Payload() data: { id: number; groupIds: number[]; requestingTenantId?: number }): Promise<void> {
    await this.usersService.removeGroups(data.id, data.groupIds, data.requestingTenantId);
  }

  @MessagePattern({ cmd: 'count_users' })
  async countUsersTcp(@Payload() data: { tenantId?: string | number }): Promise<{ count: number }> {
    const tenantId = data.tenantId != null ? Number(data.tenantId) : undefined;
    const count = await this.usersService.countUsers(tenantId);
    return { count };
  }

  @MessagePattern({ cmd: 'count_users_by_tenant' })
  async countUsersByTenantTcp(): Promise<Array<{ tenantId: number; count: number }>> {
    return this.usersService.countUsersByTenant();
  }

  @MessagePattern({ cmd: 'monthly_user_registrations' })
  async monthlyUserRegistrationsTcp(
    @Payload() data: { year: number; tenantId?: number },
  ): Promise<Array<{ month: number; count: number }>> {
    return this.usersService.getMonthlyRegistrations(data.year, data.tenantId);
  }

  // --- HTTP Endpoints ---

  @Post()
  @ApiOperation({ summary: 'Create a user', description: 'Creates a new user within a tenant' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async create(@Body() dto: CreateUserDto): Promise<User> {
    return this.usersService.createUser(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Query users', description: 'Returns a paginated list of users with optional filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  async findAll(@Query() query: QueryUserDto): Promise<PaginatedResponse<User>> {
    return this.usersService.queryUsers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'The user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return this.usersService.getUserById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.updateUser(id, dto);
  }

  @Get(':id/roles')
  @ApiOperation({ summary: 'Get user with roles' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User with assigned roles' })
  async getRoles(@Param('id', ParseIntPipe) id: number): Promise<UserWithRoles> {
    return this.usersService.getUserRoles(id);
  }

  @Post(':id/roles')
  @ApiOperation({ summary: 'Assign roles to a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'Roles assigned' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignUserRolesDto,
  ): Promise<void> {
    await this.usersService.assignRoles(id, dto.roleIds);
  }

  @Delete(':id/roles')
  @ApiOperation({ summary: 'Remove roles from a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'Roles removed' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignUserRolesDto,
  ): Promise<void> {
    await this.usersService.removeRoles(id, dto.roleIds);
  }

  @Get(':id/groups')
  @ApiOperation({ summary: 'Get user groups' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of groups assigned to the user' })
  async getGroups(@Param('id', ParseIntPipe) id: number): Promise<Group[]> {
    return this.usersService.getUserGroups(id);
  }

  @Post(':id/groups')
  @ApiOperation({ summary: 'Assign groups to a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'Groups assigned' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignGroups(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignUserGroupsDto,
  ): Promise<void> {
    await this.usersService.assignGroups(id, dto.groupIds);
  }

  @Delete(':id/groups')
  @ApiOperation({ summary: 'Remove groups from a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'Groups removed' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeGroups(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignUserGroupsDto,
  ): Promise<void> {
    await this.usersService.removeGroups(id, dto.groupIds);
  }
}
