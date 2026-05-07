import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminGuard } from '@org/shared';
import { AdminPlansService } from './plans.service';

@ApiTags('Admin Plans')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('admin/plans')
export class AdminPlansController {
  constructor(private readonly plansService: AdminPlansService) {}

  @Get()
  @ApiOperation({ summary: 'List plans' })
  async findAll(
    @Query('planName') planName?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.plansService.queryPlans({
      planName,
      status,
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.plansService.getPlanById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a plan' })
  async create(@Body() dto: Record<string, unknown>) {
    return this.plansService.createPlan(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>) {
    return this.plansService.updatePlan(id, dto);
  }

  @Get(':id/quotas')
  @ApiOperation({ summary: 'Get plan feature quotas' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  async getQuotas(@Param('id', ParseIntPipe) id: number) {
    return this.plansService.getPlanQuotas(id);
  }

  @Post(':id/quotas')
  @ApiOperation({ summary: 'Set a feature quota for a plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  async setQuota(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>) {
    return this.plansService.setPlanQuota(id, dto);
  }

  @Delete(':id/quotas/:featureId')
  @ApiOperation({ summary: 'Remove a feature quota from a plan' })
  async removeQuota(
    @Param('id', ParseIntPipe) id: number,
    @Param('featureId', ParseIntPipe) featureId: number,
  ) {
    return this.plansService.removePlanQuota(id, featureId);
  }
}
