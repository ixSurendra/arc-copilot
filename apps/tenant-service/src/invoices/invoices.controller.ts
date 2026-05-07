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
import { InvoicesService } from './invoices.service';
import {
  CreateInvoiceDto,
  QueryInvoiceDto,
  Invoice,
  PaginatedResponse,
} from '@org/shared';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // --- Microservice Patterns (not exposed via Swagger) ---

  @MessagePattern({ cmd: 'get_invoice' })
  async getInvoice(@Payload() data: { id: number }): Promise<Invoice> {
    return this.invoicesService.getInvoiceById(data.id);
  }

  @MessagePattern({ cmd: 'create_invoice' })
  async createInvoiceTcp(
    @Payload() data: CreateInvoiceDto,
  ): Promise<Invoice> {
    return this.invoicesService.createInvoice(data);
  }

  // --- HTTP Endpoints ---

  @Post()
  @ApiOperation({ summary: 'Create an invoice', description: 'Creates a new invoice for a billing record' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  async create(@Body() dto: CreateInvoiceDto): Promise<Invoice> {
    return this.invoicesService.createInvoice(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Query invoices', description: 'Returns a paginated list of invoices with optional filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of invoices' })
  async findAll(
    @Query() query: QueryInvoiceDto,
  ): Promise<PaginatedResponse<Invoice>> {
    return this.invoicesService.queryInvoices(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID', description: 'Returns a single invoice by its ID' })
  @ApiParam({ name: 'id', description: 'Invoice ID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'The invoice' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Invoice> {
    return this.invoicesService.getInvoiceById(id);
  }
}
