import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { sendWithTimeout } from '@org/shared';

@Injectable()
export class AdminPricingService {
  constructor(
    @Inject('LICENSE_SERVICE') private readonly licenseService: ClientProxy,
  ) {}

  async queryPlanPricings(query: Record<string, unknown>) {
    return sendWithTimeout(this.licenseService, { cmd: 'query_plan_pricings' }, query);
  }

  async createPlanPricing(dto: Record<string, unknown>) {
    return sendWithTimeout(this.licenseService, { cmd: 'create_plan_pricing' }, {
      ...dto,
      planId: Number(dto['planId']),
      price: Number(dto['price']),
    });
  }

  async updatePlanPricing(id: number, dto: Record<string, unknown>) {
    return sendWithTimeout(this.licenseService, { cmd: 'update_plan_pricing' }, { id, ...dto });
  }

  async queryTopUpPricings(query: Record<string, unknown>) {
    return sendWithTimeout(this.licenseService, { cmd: 'query_topup_pricings' }, query);
  }

  async createTopUpPricing(dto: Record<string, unknown>) {
    return sendWithTimeout(this.licenseService, { cmd: 'create_topup_pricing' }, {
      ...dto,
      featureId: Number(dto['featureId']),
      quotaAmount: Number(dto['quotaAmount']),
      price: Number(dto['price']),
      validityDays: Number(dto['validityDays']),
    });
  }

  async updateTopUpPricing(id: number, dto: Record<string, unknown>) {
    return sendWithTimeout(this.licenseService, { cmd: 'update_topup_pricing' }, { id, ...dto });
  }
}
