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
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ModulesService } from './modules.service';
import { CreateModuleDto, ModuleMaster, PaginatedResponse, SuperAdminGuard } from '@org/shared';

@ApiTags('Modules')
@ApiBearerAuth()
@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  // --- TCP Message Patterns ---

  @MessagePattern({ cmd: 'query_modules' })
  async queryModulesTcp(@Payload() data: { page?: number; limit?: number }): Promise<PaginatedResponse<ModuleMaster>> {
    return this.modulesService.queryModules(data.page ?? 1, data.limit ?? 20);
  }

  @MessagePattern({ cmd: 'get_module' })
  async getModuleTcp(@Payload() data: { id: number }): Promise<ModuleMaster> {
    return this.modulesService.getModuleById(data.id);
  }

  @MessagePattern({ cmd: 'create_module' })
  async createModuleTcp(@Payload() dto: CreateModuleDto): Promise<ModuleMaster> {
    return this.modulesService.createModule(dto);
  }

  @MessagePattern({ cmd: 'update_module' })
  async updateModuleTcp(@Payload() data: { id: number } & Partial<CreateModuleDto & { status: string }>): Promise<ModuleMaster> {
    const { id, ...dto } = data;
    return this.modulesService.updateModule(id, dto);
  }

  @MessagePattern({ cmd: 'get_all_modules_with_permissions' })
  async getAllModulesWithPermissionsTcp() {
    return this.modulesService.getAllModulesWithPermissions();
  }

  @MessagePattern({ cmd: 'get_module_permissions' })
  async getModulePermissionsTcp(@Payload() data: { id: number }) {
    return this.modulesService.getModulePermissions(data.id);
  }

  @MessagePattern({ cmd: 'assign_module_permissions' })
  async assignModulePermissionsTcp(@Payload() data: { id: number; permissionIds: number[] }): Promise<void> {
    await this.modulesService.assignPermissions(data.id, data.permissionIds);
  }

  @MessagePattern({ cmd: 'remove_module_permission' })
  async removeModulePermissionTcp(@Payload() data: { id: number; permissionId: number }): Promise<void> {
    await this.modulesService.removePermission(data.id, data.permissionId);
  }

  // --- HTTP Endpoints ---

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Create a module', description: 'Creates a new global module (not tenant-scoped)' })
  @ApiResponse({ status: 201, description: 'Module created' })
  async create(@Body() dto: CreateModuleDto): Promise<ModuleMaster> {
    return this.modulesService.createModule(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List modules' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of modules' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResponse<ModuleMaster>> {
    return this.modulesService.queryModules(page ?? 1, limit ?? 20);
  }

  @Get('with-permissions')
  @ApiOperation({ summary: 'Get all modules with their assigned permissions' })
  @ApiResponse({ status: 200, description: 'Modules with permissions' })
  async findAllWithPermissions() {
    return this.modulesService.getAllModulesWithPermissions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get module by ID' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  @ApiResponse({ status: 200, description: 'The module' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ModuleMaster> {
    return this.modulesService.getModuleById(id);
  }

  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Update a module' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  @ApiResponse({ status: 200, description: 'Module updated' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateModuleDto & { status: string }>,
  ): Promise<ModuleMaster> {
    return this.modulesService.updateModule(id, dto);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Get module with its permissions' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  @ApiResponse({ status: 200, description: 'Module with permissions' })
  async getPermissions(@Param('id', ParseIntPipe) id: number) {
    return this.modulesService.getModulePermissions(id);
  }

  @Post(':id/permissions')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Assign permissions to a module' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  @ApiResponse({ status: 204, description: 'Permissions assigned' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { permissionIds: number[] },
  ): Promise<void> {
    await this.modulesService.assignPermissions(id, body.permissionIds);
  }

  @Delete(':id/permissions/:permissionId')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Remove a permission from a module' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  @ApiParam({ name: 'permissionId', description: 'Permission ID' })
  @ApiResponse({ status: 204, description: 'Permission removed' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ): Promise<void> {
    await this.modulesService.removePermission(id, permissionId);
  }
}
