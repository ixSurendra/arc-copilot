import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, ParseIntPipe, HttpCode, HttpStatus, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TenantAdminGuard, TenantScopeInterceptor } from '@org/shared';
import { AdminUsersService } from './users.service';

@ApiTags('Admin Users')
@ApiBearerAuth()
@UseGuards(TenantAdminGuard)
@UseInterceptors(TenantScopeInterceptor)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  async findAll(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('email') email?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('searchTenantIds') searchTenantIds?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // For tenant admin, force tenantId from JWT (don't rely on interceptor for @Query)
    const userTenantId = req.user?.tenantId;
    const isSuperAdmin =
      userTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    const effectiveTenantId = isSuperAdmin
      ? (tenantId ? Number(tenantId) : undefined)
      : userTenantId;

    // Parse comma-separated tenant IDs (resolved from tenant names by the frontend)
    const parsedSearchTenantIds = isSuperAdmin && searchTenantIds
      ? searchTenantIds.split(',').map(Number).filter((n) => !isNaN(n))
      : undefined;

    return this.usersService.queryUsers({
      tenantId: effectiveTenantId,
      email,
      search,
      status,
      sortBy,
      ...(parsedSearchTenantIds?.length && { searchTenantIds: parsedSearchTenantIds }),
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('me/permissions')
  @ApiOperation({ summary: 'Get effective permissions for the current logged-in user' })
  @ApiResponse({ status: 200, description: 'Modules and permission map for sidebar/access control' })
  async getMyPermissions(@Req() req: any) {
    const userId = req.user?.id;
    return this.usersService.getEffectivePermissions(userId);
  }

  @Get('count-by-tenant')
  @ApiOperation({ summary: 'Get user counts grouped by tenant (super admin only)' })
  @ApiResponse({ status: 200, description: 'Array of { tenantId, count }' })
  async countByTenant() {
    return this.usersService.countUsersByTenant();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const requestingTenantId = req.user?.tenantId;
    const isSuperAdmin = requestingTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    return this.usersService.getUserById(id, isSuperAdmin ? undefined : requestingTenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  @ApiResponse({ status: 201, description: 'User created' })
  async create(@Body() dto: Record<string, unknown>) {
    return this.usersService.createUser(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>, @Req() req: any) {
    const requestingTenantId = req.user?.tenantId;
    const isSuperAdmin = requestingTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    return this.usersService.updateUser(id, dto, isSuperAdmin ? undefined : requestingTenantId);
  }

  @Get(':id/roles')
  @ApiOperation({ summary: 'Get user roles' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async getRoles(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const requestingTenantId = req.user?.tenantId;
    const isSuperAdmin = requestingTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    return this.usersService.getUserRoles(id, isSuperAdmin ? undefined : requestingTenantId);
  }

  @Post(':id/roles')
  @ApiOperation({ summary: 'Assign roles to user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignRoles(@Param('id', ParseIntPipe) id: number, @Body() body: { roleIds: number[] }, @Req() req: any) {
    const requestingTenantId = req.user?.tenantId;
    const isSuperAdmin = requestingTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    await this.usersService.assignRoles(id, body.roleIds, isSuperAdmin ? undefined : requestingTenantId);
  }

  @Delete(':id/roles')
  @ApiOperation({ summary: 'Remove roles from user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRoles(@Param('id', ParseIntPipe) id: number, @Body() body: { roleIds: number[] }, @Req() req: any) {
    const requestingTenantId = req.user?.tenantId;
    const isSuperAdmin = requestingTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    await this.usersService.removeRoles(id, body.roleIds, isSuperAdmin ? undefined : requestingTenantId);
  }

  @Get(':id/groups')
  @ApiOperation({ summary: 'Get user groups' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async getGroups(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const requestingTenantId = req.user?.tenantId;
    const isSuperAdmin = requestingTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    return this.usersService.getUserGroups(id, isSuperAdmin ? undefined : requestingTenantId);
  }

  @Post(':id/groups')
  @ApiOperation({ summary: 'Assign groups to user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignGroups(@Param('id', ParseIntPipe) id: number, @Body() body: { groupIds: number[] }, @Req() req: any) {
    const requestingTenantId = req.user?.tenantId;
    const isSuperAdmin = requestingTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    await this.usersService.assignGroups(id, body.groupIds, isSuperAdmin ? undefined : requestingTenantId);
  }

  @Delete(':id/groups')
  @ApiOperation({ summary: 'Remove groups from user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeGroups(@Param('id', ParseIntPipe) id: number, @Body() body: { groupIds: number[] }, @Req() req: any) {
    const requestingTenantId = req.user?.tenantId;
    const isSuperAdmin = requestingTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    await this.usersService.removeGroups(id, body.groupIds, isSuperAdmin ? undefined : requestingTenantId);
  }
}
