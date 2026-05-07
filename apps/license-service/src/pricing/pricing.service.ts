import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PricingRepository } from './pricing.repository';
import { CreatePlanPricingDto, PaginatedResponse } from '@arc/shared';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private readonly pricingRepository: PricingRepository) {}

  // --- Plan Pricing ---

  async createPlanPricing(dto: CreatePlanPricingDto) {
    this.logger.log(`Creating pricing for plan ${dto.planId}`);
    return this.pricingRepository.createPlanPricing({
      planId: dto.planId,
      billingCycle: dto.billingCycle as any,
      price: dto.price,
      currency: dto.currency,
    });
  }

  async getPlanPricingById(id: number) {
    const pricing = await this.pricingRepository.findPlanPricingById(id);
    if (!pricing) {
      throw new NotFoundException(`Plan pricing with id ${id} not found`);
    }
    return pricing;
  }

  async getPlanPricingsByPlanId(planId: number) {
    return this.pricingRepository.findPlanPricingsByPlanId(planId);
  }

  async updatePlanPricing(id: number, dto: Partial<CreatePlanPricingDto> & { status?: string }) {
    await this.getPlanPricingById(id);
    return this.pricingRepository.updatePlanPricing(id, {
      ...(dto.billingCycle !== undefined && { billingCycle: dto.billingCycle as any }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.status !== undefined && { status: dto.status as any }),
    });
  }

  async queryPlanPricings(query: {
    planId?: number;
    billingCycle?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    return this.pricingRepository.queryPlanPricings(query);
  }

  // --- Top-Up Pricing ---

  async createTopUpPricing(dto: {
    featureId: number;
    quotaAmount: number;
    price: number;
    currency: string;
    validityDays: number;
  }) {
    this.logger.log(`Creating top-up pricing for feature ${dto.featureId}`);
    return this.pricingRepository.createTopUpPricing({
      featureId: dto.featureId,
      quotaAmount: dto.quotaAmount,
      price: dto.price,
      currency: dto.currency,
      validityDays: dto.validityDays,
    });
  }

  async getTopUpPricingById(id: number) {
    const pricing = await this.pricingRepository.findTopUpPricingById(id);
    if (!pricing) {
      throw new NotFoundException(`Top-up pricing with id ${id} not found`);
    }
    return pricing;
  }

  async updateTopUpPricing(id: number, dto: Partial<{
    quotaAmount: number;
    price: number;
    currency: string;
    validityDays: number;
    status: string;
  }>) {
    await this.getTopUpPricingById(id);
    return this.pricingRepository.updateTopUpPricing(id, {
      ...(dto.quotaAmount !== undefined && { quotaAmount: dto.quotaAmount }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.validityDays !== undefined && { validityDays: dto.validityDays }),
      ...(dto.status !== undefined && { status: dto.status as any }),
    });
  }

  async queryTopUpPricings(query: {
    featureId?: number;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    return this.pricingRepository.queryTopUpPricings(query);
  }
}
