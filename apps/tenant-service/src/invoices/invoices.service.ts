import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InvoicesRepository } from './invoices.repository';
import {
  CreateInvoiceDto,
  QueryInvoiceDto,
  Invoice,
  PaginatedResponse,
} from '@arc/shared';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private readonly invoicesRepository: InvoicesRepository) {}

  async createInvoice(dto: CreateInvoiceDto): Promise<Invoice> {
    this.logger.log(
      `Creating invoice ${dto.invoiceNumber} for tenant ${dto.tenantId}`,
    );
    return this.invoicesRepository.create(dto);
  }

  async getInvoiceById(id: number): Promise<Invoice> {
    const invoice = await this.invoicesRepository.findById(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice with id ${id} not found`);
    }
    return invoice;
  }

  async queryInvoices(
    query: QueryInvoiceDto,
  ): Promise<PaginatedResponse<Invoice>> {
    return this.invoicesRepository.findWithFilters(query);
  }
}
