import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { CreatePlanDto, SetPlanQuotaDto, SuperAdminGuard } from '@arc/shared';

@ApiTags('Plans')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  // --- TCP Patterns ---

  @MessagePattern({ cmd: 'get_plan' })
  async getPlanTcp(@Payload() data: { id: number }) {
    return this.plansService.getPlanById(Number(data.id));
  }

  /**
   * Look up a plan by its name (e.g. "PROFESSIONAL").
   * This is the canonical resolver used by tenant-service and admin-portal
   * because TENANTS.PLAN_ID stores plan names, not numeric IDs.
   */
  @MessagePattern({ cmd: 'get_plan_by_name' })
  async getPlanByNameTcp(@Payload() data: { planName: string }) {
    return this.plansService.getPlanByName(data.planName);
  }

  @MessagePattern({ cmd: 'get_plan_quotas' })
  async getPlanQuotasTcp(@Payload() data: { planId: number }) {
    return this.plansService.getPlanQuotas(Number(data.planId));
  }

  @MessagePattern({ cmd: 'query_plans' })
  async queryPlansTcp(@Payload() data: { planName?: string; status?: string; page?: number; limit?: number }) {
    return this.plansService.queryPlans({
      ...data,
      page: data.page ? Number(data.page) : undefined,
      limit: data.limit ? Number(data.limit) : undefined,
    });
  }

  @MessagePattern({ cmd: 'create_plan' })
  async createPlanTcp(@Payload() dto: CreatePlanDto) {
    return this.plansService.createPlan(dto);
  }

  @MessagePattern({ cmd: 'update_plan' })
  async updatePlanTcp(@Payload() data: { id: number } & Partial<CreatePlanDto> & { status?: string }) {
    const { id, ...dto } = data;
    return this.plansService.updatePlan(Number(id), dto);
  }

  @MessagePattern({ cmd: 'set_plan_quota' })
  async setPlanQuotaTcp(@Payload() data: { planId: number } & SetPlanQuotaDto) {
    const { planId, ...dto } = data;
    return this.plansService.setPlanQuota(Number(planId), dto);
  }

  @MessagePattern({ cmd: 'remove_plan_quota' })
  async removePlanQuotaTcp(@Payload() data: { planId: number; featureId: number }) {
    return this.plansService.removePlanQuota(Number(data.planId), Number(data.featureId));
  }

  // --- HTTP Endpoints ---

  @Post()
  @ApiOperation({ summary: 'Create a plan' })
  @ApiResponse({ status: 201, description: 'Plan created' })
  async create(@Body() dto: CreatePlanDto) {
    return this.plansService.createPlan(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Query plans' })
  @ApiResponse({ status: 200, description: 'Paginated list of plans' })
  async findAll(
    @Query('planName') planName?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.plansService.queryPlans({ planName, status, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'The plan with quotas and pricings' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.plansService.getPlanById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Plan updated' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreatePlanDto> & { status?: string },
  ) {
    return this.plansService.updatePlan(id, dto);
  }

  // --- Plan Quotas Sub-resource ---

  @Get(':id/quotas')
  @ApiOperation({ summary: 'Get feature quotas for a plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'List of plan feature quotas' })
  async getQuotas(@Param('id', ParseIntPipe) id: number) {
    return this.plansService.getPlanQuotas(id);
  }

  @Post(':id/quotas')
  @ApiOperation({ summary: 'Set a feature quota for a plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({ status: 201, description: 'Quota set' })
  async setQuota(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetPlanQuotaDto,
  ) {
    return this.plansService.setPlanQuota(id, dto);
  }

  @Delete(':id/quotas/:featureId')
  @ApiOperation({ summary: 'Remove a feature quota from a plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiParam({ name: 'featureId', description: 'Feature ID' })
  @ApiResponse({ status: 200, description: 'Quota removed' })
  async removeQuota(
    @Param('id', ParseIntPipe) id: number,
    @Param('featureId', ParseIntPipe) featureId: number,
  ) {
    return this.plansService.removePlanQuota(id, featureId);
  }
}
