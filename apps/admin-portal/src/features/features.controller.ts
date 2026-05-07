import { Controller, Get, Post, Patch, Param, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminGuard } from '@arc/shared';
import { AdminFeaturesService } from './features.service';

@ApiTags('Admin Features')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('admin/features')
export class AdminFeaturesController {
  constructor(private readonly featuresService: AdminFeaturesService) {}

  @Get()
  @ApiOperation({ summary: 'List features' })
  async findAll(
    @Query('featureKey') featureKey?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.featuresService.queryFeatures({
      featureKey,
      status,
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feature by ID' })
  @ApiParam({ name: 'id', description: 'Feature ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.featuresService.getFeatureById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a feature' })
  async create(@Body() dto: Record<string, unknown>) {
    return this.featuresService.createFeature(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a feature' })
  @ApiParam({ name: 'id', description: 'Feature ID' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>) {
    return this.featuresService.updateFeature(id, dto);
  }
}
