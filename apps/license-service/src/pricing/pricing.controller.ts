import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { CreatePlanPricingDto, SuperAdminGuard } from '@arc/shared';

@ApiTags('Pricing')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  // --- TCP Patterns ---

  @MessagePattern({ cmd: 'get_plan_pricing' })
  async getPlanPricingTcp(@Payload() data: { planId: number }) {
    return this.pricingService.getPlanPricingsByPlanId(data.planId);
  }

  @MessagePattern({ cmd: 'query_plan_pricings' })
  async queryPlanPricingsTcp(@Payload() data: { planId?: string; billingCycle?: string; status?: string; page?: number; limit?: number }) {
    return this.pricingService.queryPlanPricings({
      planId: data.planId !== undefined ? Number(data.planId) : undefined,
      billingCycle: data.billingCycle,
      status: data.status,
      page: data.page,
      limit: data.limit,
    });
  }

  @MessagePattern({ cmd: 'create_plan_pricing' })
  async createPlanPricingTcp(@Payload() dto: CreatePlanPricingDto) {
    return this.pricingService.createPlanPricing(dto);
  }

  @MessagePattern({ cmd: 'update_plan_pricing' })
  async updatePlanPricingTcp(@Payload() data: { id: number } & Partial<CreatePlanPricingDto> & { status?: string }) {
    const { id, ...dto } = data;
    return this.pricingService.updatePlanPricing(id, dto);
  }

  @MessagePattern({ cmd: 'query_topup_pricings' })
  async queryTopUpPricingsTcp(@Payload() data: { featureId?: string; status?: string; page?: number; limit?: number }) {
    return this.pricingService.queryTopUpPricings({
      featureId: data.featureId !== undefined ? Number(data.featureId) : undefined,
      status: data.status,
      page: data.page,
      limit: data.limit,
    });
  }

  @MessagePattern({ cmd: 'create_topup_pricing' })
  async createTopUpPricingTcp(@Payload() dto: { featureId: number; quotaAmount: number; price: number; currency: string; validityDays: number }) {
    return this.pricingService.createTopUpPricing(dto);
  }

  @MessagePattern({ cmd: 'update_topup_pricing' })
  async updateTopUpPricingTcp(@Payload() data: { id: number } & Partial<{ quotaAmount: number; price: number; currency: string; validityDays: number; status: string }>) {
    const { id, ...dto } = data;
    return this.pricingService.updateTopUpPricing(id, dto);
  }

  // --- Plan Pricing HTTP ---

  @Post('plan')
  @ApiOperation({ summary: 'Create plan pricing' })
  @ApiResponse({ status: 201, description: 'Plan pricing created' })
  async createPlanPricing(@Body() dto: CreatePlanPricingDto) {
    return this.pricingService.createPlanPricing(dto);
  }

  @Get('plan')
  @ApiOperation({ summary: 'Query plan pricings' })
  @ApiResponse({ status: 200, description: 'Paginated list of plan pricings' })
  async findAllPlanPricings(
    @Query('planId') planId?: string,
    @Query('billingCycle') billingCycle?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.pricingService.queryPlanPricings({
      planId: planId !== undefined ? Number(planId) : undefined,
      billingCycle,
      status,
      page,
      limit,
    });
  }

  @Get('plan/:id')
  @ApiOperation({ summary: 'Get plan pricing by ID' })
  @ApiParam({ name: 'id', description: 'Plan pricing ID' })
  @ApiResponse({ status: 200, description: 'The plan pricing' })
  async findOnePlanPricing(@Param('id', ParseIntPipe) id: number) {
    return this.pricingService.getPlanPricingById(id);
  }

  @Patch('plan/:id')
  @ApiOperation({ summary: 'Update plan pricing' })
  @ApiParam({ name: 'id', description: 'Plan pricing ID' })
  @ApiResponse({ status: 200, description: 'Plan pricing updated' })
  async updatePlanPricing(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreatePlanPricingDto> & { status?: string },
  ) {
    return this.pricingService.updatePlanPricing(id, dto);
  }

  // --- Top-Up Pricing HTTP ---

  @Post('top-up')
  @ApiOperation({ summary: 'Create top-up pricing' })
  @ApiResponse({ status: 201, description: 'Top-up pricing created' })
  async createTopUpPricing(
    @Body() dto: { featureId: number; quotaAmount: number; price: number; currency: string; validityDays: number },
  ) {
    return this.pricingService.createTopUpPricing(dto);
  }

  @Get('top-up')
  @ApiOperation({ summary: 'Query top-up pricings' })
  @ApiResponse({ status: 200, description: 'Paginated list of top-up pricings' })
  async findAllTopUpPricings(
    @Query('featureId') featureId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.pricingService.queryTopUpPricings({
      featureId: featureId !== undefined ? Number(featureId) : undefined,
      status,
      page,
      limit,
    });
  }

  @Get('top-up/:id')
  @ApiOperation({ summary: 'Get top-up pricing by ID' })
  @ApiParam({ name: 'id', description: 'Top-up pricing ID' })
  @ApiResponse({ status: 200, description: 'The top-up pricing' })
  async findOneTopUpPricing(@Param('id', ParseIntPipe) id: number) {
    return this.pricingService.getTopUpPricingById(id);
  }

  @Patch('top-up/:id')
  @ApiOperation({ summary: 'Update top-up pricing' })
  @ApiParam({ name: 'id', description: 'Top-up pricing ID' })
  @ApiResponse({ status: 200, description: 'Top-up pricing updated' })
  async updateTopUpPricing(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<{ quotaAmount: number; price: number; currency: string; validityDays: number; status: string }>,
  ) {
    return this.pricingService.updateTopUpPricing(id, dto);
  }
}
