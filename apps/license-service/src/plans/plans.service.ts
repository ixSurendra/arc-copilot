import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PlansRepository } from './plans.repository';
import { CreatePlanDto, SetPlanQuotaDto, PaginatedResponse } from '@arc/shared';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(private readonly plansRepository: PlansRepository) {}

  async createPlan(dto: CreatePlanDto) {
    this.logger.log(`Creating plan: ${dto.planName}`);
    return this.plansRepository.create({
      planName: dto.planName,
      description: dto.description,
    });
  }

  async getPlanById(id: number) {
    const plan = await this.plansRepository.findById(id);
    if (!plan) {
      throw new NotFoundException(`Plan with id ${id} not found`);
    }
    return plan;
  }

  /**
   * Look up a plan by name (e.g. "PROFESSIONAL"). Used by tenant-service to
   * validate that a tenant's planId (plan name string) refers to an existing,
   * active plan before writing to TENANTS.PLAN_ID.
   */
  async getPlanByName(planName: string) {
    const plan = await this.plansRepository.findByName(planName);
    if (!plan) {
      throw new NotFoundException(`Plan with name "${planName}" not found`);
    }
    return plan;
  }

  async updatePlan(id: number, dto: Partial<CreatePlanDto> & { status?: string }) {
    await this.getPlanById(id);
    return this.plansRepository.update(id, {
      ...(dto.planName !== undefined && { planName: dto.planName }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.status !== undefined && { status: dto.status as any }),
    });
  }

  async queryPlans(query: {
    planName?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    return this.plansRepository.findWithFilters(query);
  }

  // --- Plan Feature Quotas ---

  async getPlanQuotas(planId: number) {
    await this.getPlanById(planId);
    return this.plansRepository.getQuotasByPlanId(planId);
  }

  async setPlanQuota(planId: number, dto: SetPlanQuotaDto) {
    await this.getPlanById(planId);
    this.logger.log(`Setting quota for plan ${planId}, feature ${dto.featureId}`);
    return this.plansRepository.upsertQuota(
      planId,
      dto.featureId,
      dto.quotaLimit ?? null,
      dto.isEnabled ?? true,
    );
  }

  async removePlanQuota(planId: number, featureId: number) {
    await this.getPlanById(planId);
    return this.plansRepository.deleteQuota(planId, featureId);
  }
}
