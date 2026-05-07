import { Controller, Get, Query } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PlanHistoryService } from './plan-history.service';
import {
  CreatePlanHistoryDto,
  QueryPlanHistoryDto,
  TenantPlanHistory,
  PaginatedResponse,
} from '@org/shared';

@ApiTags('Plan History')
@Controller('plan-history')
export class PlanHistoryController {
  constructor(private readonly planHistoryService: PlanHistoryService) {}

  // --- Microservice Patterns (not exposed via Swagger) ---

  @MessagePattern({ cmd: 'get_plan_history' })
  async getPlanHistory(
    @Payload() query: QueryPlanHistoryDto,
  ): Promise<PaginatedResponse<TenantPlanHistory>> {
    return this.planHistoryService.queryPlanHistory(query);
  }

  @MessagePattern({ cmd: 'create_plan_history' })
  async createPlanHistoryTcp(
    @Payload() data: CreatePlanHistoryDto,
  ): Promise<TenantPlanHistory> {
    return this.planHistoryService.createPlanHistory(data);
  }

  // --- HTTP Endpoints ---

  @Get()
  @ApiOperation({ summary: 'Query plan history', description: 'Returns a paginated list of plan history records filtered by tenant ID' })
  @ApiResponse({ status: 200, description: 'Paginated list of plan history records' })
  async findAll(
    @Query() query: QueryPlanHistoryDto,
  ): Promise<PaginatedResponse<TenantPlanHistory>> {
    return this.planHistoryService.queryPlanHistory(query);
  }
}
