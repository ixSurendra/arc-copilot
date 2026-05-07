import { Controller, Get, Post, Patch, Param, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminGuard } from '@arc/shared';
import { AdminPricingService } from './pricing.service';

@ApiTags('Admin Pricing')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('admin/pricing')
export class AdminPricingController {
  constructor(private readonly pricingService: AdminPricingService) {}

  @Get('plan')
  @ApiOperation({ summary: 'List plan pricings' })
  async findAllPlanPricings(
    @Query('planId') planId?: string,
    @Query('billingCycle') billingCycle?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.pricingService.queryPlanPricings({
      planId,
      billingCycle,
      status,
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
    });
  }

  @Post('plan')
  @ApiOperation({ summary: 'Create plan pricing' })
  async createPlanPricing(@Body() dto: Record<string, unknown>) {
    return this.pricingService.createPlanPricing(dto);
  }

  @Patch('plan/:id')
  @ApiOperation({ summary: 'Update plan pricing' })
  @ApiParam({ name: 'id', description: 'Plan pricing ID' })
  async updatePlanPricing(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>) {
    return this.pricingService.updatePlanPricing(id, dto);
  }

  @Get('top-up')
  @ApiOperation({ summary: 'List top-up pricings' })
  async findAllTopUpPricings(
    @Query('featureId') featureId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.pricingService.queryTopUpPricings({
      featureId,
      status,
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
    });
  }

  @Post('top-up')
  @ApiOperation({ summary: 'Create top-up pricing' })
  async createTopUpPricing(@Body() dto: Record<string, unknown>) {
    return this.pricingService.createTopUpPricing(dto);
  }

  @Patch('top-up/:id')
  @ApiOperation({ summary: 'Update top-up pricing' })
  @ApiParam({ name: 'id', description: 'Top-up pricing ID' })
  async updateTopUpPricing(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>) {
    return this.pricingService.updateTopUpPricing(id, dto);
  }
}
