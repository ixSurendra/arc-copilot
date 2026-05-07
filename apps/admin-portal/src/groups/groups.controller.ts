import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, ParseIntPipe, HttpCode, HttpStatus, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TenantAdminGuard, TenantScopeInterceptor } from '@org/shared';
import { AdminGroupsService } from './groups.service';

@ApiTags('Admin Groups')
@ApiBearerAuth()
@UseGuards(TenantAdminGuard)
@UseInterceptors(TenantScopeInterceptor)
@Controller('admin/groups')
export class AdminGroupsController {
  constructor(private readonly groupsService: AdminGroupsService) {}

  @Get()
  @ApiOperation({ summary: 'List groups' })
  async findAll(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('groupName') groupName?: string,
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

    return this.groupsService.queryGroups({
      tenantId: effectiveTenantId,
      groupName: groupName || search,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const requestingTenantId = req.user?.tenantId;
    const isSuperAdmin = requestingTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    return this.groupsService.getGroupById(id, isSuperAdmin ? undefined : requestingTenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a group' })
  async create(@Body() dto: Record<string, unknown>) {
    return this.groupsService.createGroup(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>, @Req() req: any) {
    const requestingTenantId = req.user?.tenantId;
    const isSuperAdmin = requestingTenantId === 0 && req.user?.roles?.includes('SUPER_ADMIN');
    return this.groupsService.updateGroup(id, dto, isSuperAdmin ? undefined : requestingTenantId);
  }

  @Get(':id/roles')
  @ApiOperation({ summary: 'Get group roles' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  async getRoles(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.getGroupRoles(id);
  }

  @Post(':id/roles')
  @ApiOperation({ summary: 'Assign roles to group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignRoles(@Param('id', ParseIntPipe) id: number, @Body() body: { roleIds: number[] }) {
    await this.groupsService.assignRoles(id, body.roleIds);
  }

  @Delete(':id/roles')
  @ApiOperation({ summary: 'Remove roles from group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRoles(@Param('id', ParseIntPipe) id: number, @Body() body: { roleIds: number[] }) {
    await this.groupsService.removeRoles(id, body.roleIds);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Get users assigned to a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  async getGroupUsers(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.getGroupUsers(id);
  }

  @Post(':id/users')
  @ApiOperation({ summary: 'Assign users to a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignUsers(@Param('id', ParseIntPipe) id: number, @Body() body: { userIds: number[] }) {
    await this.groupsService.assignUsers(id, body.userIds);
  }

  @Delete(':id/users')
  @ApiOperation({ summary: 'Remove users from a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeUsers(@Param('id', ParseIntPipe) id: number, @Body() body: { userIds: number[] }) {
    await this.groupsService.removeUsers(id, body.userIds);
  }
}
