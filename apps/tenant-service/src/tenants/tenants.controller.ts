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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  QueryTenantDto,
  Tenant,
  TenantAnalytics,
  PaginatedResponse,
  SuperAdminGuard,
} from '@org/shared';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // --- Microservice Patterns (not exposed via Swagger) ---

  @MessagePattern({ cmd: 'get_tenant' })
  async getTenant(@Payload() data: { id: number; requestingTenantId?: number }): Promise<Tenant> {
    return this.tenantsService.getTenantById(data.id, data.requestingTenantId);
  }

  @MessagePattern({ cmd: 'get_tenant_by_domain' })
  async getTenantByDomain(@Payload() data: { domain: string }): Promise<Tenant> {
    return this.tenantsService.getTenantByDomain(data.domain);
  }

  @MessagePattern({ cmd: 'get_tenant_status' })
  async getTenantStatus(
    @Payload() data: { id: number },
  ): Promise<{ id: number; status: string }> {
    const tenant = await this.tenantsService.getTenantById(data.id);
    return { id: tenant.id, status: tenant.status };
  }

  @MessagePattern({ cmd: 'create_tenant' })
  async createTenantTcp(
    @Payload() data: CreateTenantDto,
  ): Promise<Tenant> {
    return this.tenantsService.createTenant(data);
  }

  @MessagePattern({ cmd: 'update_tenant' })
  async updateTenantTcp(
    @Payload() data: { id: number; requestingTenantId?: number } & UpdateTenantDto,
  ): Promise<Tenant> {
    const { id, requestingTenantId, ...dto } = data;
    return this.tenantsService.updateTenant(id, dto, requestingTenantId);
  }

  @MessagePattern({ cmd: 'query_tenants' })
  async queryTenantsTcp(
    @Payload() query: QueryTenantDto,
  ): Promise<PaginatedResponse<Tenant>> {
    return this.tenantsService.queryTenants(query);
  }

  @MessagePattern({ cmd: 'get_tenant_analytics' })
  async getTenantAnalytics(): Promise<TenantAnalytics> {
    return this.tenantsService.getTenantAnalytics();
  }

  // --- HTTP Endpoints ---

  @Post()
  @ApiOperation({ summary: 'Create a tenant', description: 'Creates a new tenant' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  async create(@Body() dto: CreateTenantDto): Promise<Tenant> {
    return this.tenantsService.createTenant(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Query tenants', description: 'Returns a paginated list of tenants with optional filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of tenants' })
  async findAll(
    @Query() query: QueryTenantDto,
  ): Promise<PaginatedResponse<Tenant>> {
    return this.tenantsService.queryTenants(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID', description: 'Returns a single tenant by its ID' })
  @ApiParam({ name: 'id', description: 'Tenant ID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'The tenant' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Tenant> {
    return this.tenantsService.getTenantById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tenant', description: 'Updates an existing tenant by its ID' })
  @ApiParam({ name: 'id', description: 'Tenant ID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantDto,
  ): Promise<Tenant> {
    return this.tenantsService.updateTenant(id, dto);
  }
}
