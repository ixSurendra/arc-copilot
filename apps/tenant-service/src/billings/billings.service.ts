import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BillingsRepository } from './billings.repository';
import {
  CreateBillingDto,
  QueryBillingDto,
  TenantBilling,
  PaginatedResponse,
} from '@org/shared';

@Injectable()
export class BillingsService {
  private readonly logger = new Logger(BillingsService.name);

  constructor(private readonly billingsRepository: BillingsRepository) {}

  async createBilling(dto: CreateBillingDto): Promise<TenantBilling> {
    this.logger.log(
      `Creating billing for tenant ${dto.tenantId}: ${dto.billingType}`,
    );
    return this.billingsRepository.create(dto);
  }

  async getBillingById(id: number): Promise<TenantBilling> {
    const billing = await this.billingsRepository.findById(id);
    if (!billing) {
      throw new NotFoundException(`Billing with id ${id} not found`);
    }
    return billing;
  }

  async queryBillings(
    query: QueryBillingDto,
  ): Promise<PaginatedResponse<TenantBilling>> {
    return this.billingsRepository.findWithFilters(query);
  }
}
