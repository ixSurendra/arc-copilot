import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminGuard, TenantAdminGuard } from '@org/shared';
import { AdminModulesService } from './modules.service';

@ApiTags('Admin Modules')
@ApiBearerAuth()
@UseGuards(TenantAdminGuard)
@Controller('admin/modules')
export class AdminModulesController {
  constructor(private readonly modulesService: AdminModulesService) {}

  @Get()
  @ApiOperation({ summary: 'List modules' })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.modulesService.queryModules(
      page !== undefined ? Number(page) : undefined,
      limit !== undefined ? Number(limit) : undefined,
    );
  }

  @Get('with-permissions')
  @ApiOperation({ summary: 'Get all modules with their assigned permissions' })
  async findAllWithPermissions() {
    return this.modulesService.getAllModulesWithPermissions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get module by ID' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.modulesService.getModuleById(id);
  }

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Create a module' })
  async create(@Body() dto: Record<string, unknown>) {
    return this.modulesService.createModule(dto);
  }

  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Update a module' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>) {
    return this.modulesService.updateModule(id, dto);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Get module permissions' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  async getPermissions(@Param('id', ParseIntPipe) id: number) {
    return this.modulesService.getModulePermissions(id);
  }

  @Post(':id/permissions')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Assign permissions to module' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignPermissions(@Param('id', ParseIntPipe) id: number, @Body() body: { permissionIds: number[] }) {
    await this.modulesService.assignPermissions(id, body.permissionIds);
  }

  @Delete(':id/permissions/:permissionId')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Remove permission from module' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    await this.modulesService.removePermission(id, permissionId);
  }
}
