import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { sendWithTimeout } from '@org/shared';

@Injectable()
export class AdminPlansService {
  constructor(
    @Inject('LICENSE_SERVICE') private readonly licenseService: ClientProxy,
  ) {}

  async queryPlans(query: Record<string, unknown>) {
    return sendWithTimeout(this.licenseService, { cmd: 'query_plans' }, query);
  }

  async getPlanById(id: number) {
    return sendWithTimeout(this.licenseService, { cmd: 'get_plan' }, { id });
  }

  async createPlan(dto: Record<string, unknown>) {
    return sendWithTimeout(this.licenseService, { cmd: 'create_plan' }, dto);
  }

  async updatePlan(id: number, dto: Record<string, unknown>) {
    return sendWithTimeout(this.licenseService, { cmd: 'update_plan' }, { id, ...dto });
  }

  async getPlanQuotas(planId: number) {
    return sendWithTimeout(this.licenseService, { cmd: 'get_plan_quotas' }, { planId });
  }

  async setPlanQuota(planId: number, dto: Record<string, unknown>) {
    return sendWithTimeout(this.licenseService, { cmd: 'set_plan_quota' }, { planId, ...dto });
  }

  async removePlanQuota(planId: number, featureId: number) {
    return sendWithTimeout(this.licenseService, { cmd: 'remove_plan_quota' }, { planId, featureId });
  }
}
