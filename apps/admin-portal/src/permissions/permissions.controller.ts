import { Controller, Get, Post, Patch, Param, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminGuard, TenantAdminGuard } from '@arc/shared';
import { AdminPermissionsService } from './permissions.service';

@ApiTags('Admin Permissions')
@ApiBearerAuth()
@UseGuards(TenantAdminGuard)
@Controller('admin/permissions')
export class AdminPermissionsController {
  constructor(private readonly permissionsService: AdminPermissionsService) {}

  @Get()
  @ApiOperation({ summary: 'List permissions' })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.permissionsService.queryPermissions(
      page !== undefined ? Number(page) : undefined,
      limit !== undefined ? Number(limit) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get permission by ID' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.getPermissionById(id);
  }

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Create a permission' })
  async create(@Body() dto: Record<string, unknown>) {
    return this.permissionsService.createPermission(dto);
  }

  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Update a permission' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>) {
    return this.permissionsService.updatePermission(id, dto);
  }
}
