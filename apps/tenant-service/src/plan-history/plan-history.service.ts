import { Injectable, Logger } from '@nestjs/common';
import { PlanHistoryRepository } from './plan-history.repository';
import {
  CreatePlanHistoryDto,
  QueryPlanHistoryDto,
  TenantPlanHistory,
  PaginatedResponse,
} from '@arc/shared';

@Injectable()
export class PlanHistoryService {
  private readonly logger = new Logger(PlanHistoryService.name);

  constructor(private readonly planHistoryRepository: PlanHistoryRepository) {}

  async createPlanHistory(
    dto: CreatePlanHistoryDto,
  ): Promise<TenantPlanHistory> {
    this.logger.log(
      `Creating plan history for tenant ${dto.tenantId}: ${dto.changeType}`,
    );
    return this.planHistoryRepository.create(dto);
  }

  async queryPlanHistory(
    query: QueryPlanHistoryDto,
  ): Promise<PaginatedResponse<TenantPlanHistory>> {
    return this.planHistoryRepository.findWithFilters(query);
  }
}
