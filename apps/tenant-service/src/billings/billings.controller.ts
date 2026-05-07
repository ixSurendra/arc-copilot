import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { BillingsService } from './billings.service';
import {
  CreateBillingDto,
  QueryBillingDto,
  TenantBilling,
  PaginatedResponse,
} from '@org/shared';

@ApiTags('Billings')
@Controller('billings')
export class BillingsController {
  constructor(private readonly billingsService: BillingsService) {}

  // --- Microservice Patterns (not exposed via Swagger) ---

  @MessagePattern({ cmd: 'get_tenant_billing' })
  async getTenantBilling(
    @Payload() data: { id: number },
  ): Promise<TenantBilling> {
    return this.billingsService.getBillingById(data.id);
  }

  @MessagePattern({ cmd: 'create_billing' })
  async createBillingTcp(
    @Payload() data: CreateBillingDto,
  ): Promise<TenantBilling> {
    return this.billingsService.createBilling(data);
  }

  // --- HTTP Endpoints ---

  @Post()
  @ApiOperation({ summary: 'Create a billing record', description: 'Creates a new billing record for a tenant' })
  @ApiResponse({ status: 201, description: 'Billing record created successfully' })
  async create(@Body() dto: CreateBillingDto): Promise<TenantBilling> {
    return this.billingsService.createBilling(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Query billings', description: 'Returns a paginated list of billing records with optional filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of billing records' })
  async findAll(
    @Query() query: QueryBillingDto,
  ): Promise<PaginatedResponse<TenantBilling>> {
    return this.billingsService.queryBillings(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get billing by ID', description: 'Returns a single billing record by its ID' })
  @ApiParam({ name: 'id', description: 'Billing ID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'The billing record' })
  @ApiResponse({ status: 404, description: 'Billing not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TenantBilling> {
    return this.billingsService.getBillingById(id);
  }
}
