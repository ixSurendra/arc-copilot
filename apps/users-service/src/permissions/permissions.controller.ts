import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
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
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto, PermissionMaster, PaginatedResponse, SuperAdminGuard } from '@arc/shared';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // --- TCP Message Patterns ---

  @MessagePattern({ cmd: 'query_permissions' })
  async queryPermissionsTcp(@Payload() data: { page?: number; limit?: number }): Promise<PaginatedResponse<PermissionMaster>> {
    return this.permissionsService.queryPermissions(data.page ?? 1, data.limit ?? 20);
  }

  @MessagePattern({ cmd: 'get_permission' })
  async getPermissionTcp(@Payload() data: { id: number }): Promise<PermissionMaster> {
    return this.permissionsService.getPermissionById(data.id);
  }

  @MessagePattern({ cmd: 'create_permission' })
  async createPermissionTcp(@Payload() dto: CreatePermissionDto): Promise<PermissionMaster> {
    return this.permissionsService.createPermission(dto);
  }

  @MessagePattern({ cmd: 'update_permission' })
  async updatePermissionTcp(@Payload() data: { id: number } & Partial<CreatePermissionDto & { status: string }>): Promise<PermissionMaster> {
    const { id, ...dto } = data;
    return this.permissionsService.updatePermission(id, dto);
  }

  // --- HTTP Endpoints ---

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Create a permission', description: 'Creates a new global permission (not tenant-scoped)' })
  @ApiResponse({ status: 201, description: 'Permission created' })
  async create(@Body() dto: CreatePermissionDto): Promise<PermissionMaster> {
    return this.permissionsService.createPermission(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List permissions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of permissions' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResponse<PermissionMaster>> {
    return this.permissionsService.queryPermissions(page ?? 1, limit ?? 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get permission by ID' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({ status: 200, description: 'The permission' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<PermissionMaster> {
    return this.permissionsService.getPermissionById(id);
  }

  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Update a permission' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({ status: 200, description: 'Permission updated' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreatePermissionDto & { status: string }>,
  ): Promise<PermissionMaster> {
    return this.permissionsService.updatePermission(id, dto);
  }
}
