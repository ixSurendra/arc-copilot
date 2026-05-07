import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, ParseIntPipe, HttpCode, HttpStatus, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TenantAdminGuard, TenantScopeInterceptor } from '@arc/shared';
import { AdminRolesService } from './roles.service';

@ApiTags('Admin Roles')
@ApiBearerAuth()
@UseGuards(TenantAdminGuard)
@UseInterceptors(TenantScopeInterceptor)
@Controller('admin/roles')
export class AdminRolesController {
  constructor(private readonly rolesService: AdminRolesService) {}

  @Get()
  @ApiOperation({ summary: 'List roles' })
  async findAll(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('roleName') roleName?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Read tenantId directly from JWT — interceptor-modified @Query is unreliable
    const userTenantId = req.user?.tenantId;
    const isSuperAdmin =
      userTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    const effectiveTenantId = isSuperAdmin
      ? (tenantId ? Number(tenantId) : undefined)
      : userTenantId;

    return this.rolesService.queryRoles({
      tenantId: effectiveTenantId,
      roleName: roleName || search,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const requestingTenantId = req.user?.tenantId;
    const isSuperAdmin = requestingTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    return this.rolesService.getRoleById(id, isSuperAdmin ? undefined : requestingTenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a role' })
  async create(@Body() dto: Record<string, unknown>) {
    return this.rolesService.createRole(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>, @Req() req: any) {
    const requestingTenantId = req.user?.tenantId;
    const isSuperAdmin = requestingTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    return this.rolesService.updateRole(id, dto, isSuperAdmin ? undefined : requestingTenantId);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Get role permissions' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  async getPermissions(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.getRolePermissions(id);
  }

  @Post(':id/permissions')
  @ApiOperation({ summary: 'Assign permissions to role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignPermissions(@Param('id', ParseIntPipe) id: number, @Body() permissions: Record<string, unknown>[]) {
    await this.rolesService.assignPermissions(id, permissions);
  }

  @Delete(':id/permissions/:moduleId/:permissionId')
  @ApiOperation({ summary: 'Remove a permission from role' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    await this.rolesService.removePermission(id, moduleId, permissionId);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Get users assigned to a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  async getRoleUsers(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.getRoleUsers(id);
  }

  @Post(':id/users')
  @ApiOperation({ summary: 'Assign users to a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignUsers(@Param('id', ParseIntPipe) id: number, @Body() body: { userIds: number[] }) {
    await this.rolesService.assignUsers(id, body.userIds);
  }

  @Delete(':id/users')
  @ApiOperation({ summary: 'Remove users from a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeUsers(@Param('id', ParseIntPipe) id: number, @Body() body: { userIds: number[] }) {
    await this.rolesService.removeUsers(id, body.userIds);
  }
}
