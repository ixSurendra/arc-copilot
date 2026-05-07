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
import { FeaturesService } from './features.service';
import { CreateFeatureDto, SuperAdminGuard } from '@org/shared';

@ApiTags('Features')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  // --- TCP Patterns ---

  @MessagePattern({ cmd: 'get_feature' })
  async getFeatureTcp(@Payload() data: { id: number }) {
    return this.featuresService.getFeatureById(data.id);
  }

  @MessagePattern({ cmd: 'get_feature_by_key' })
  async getFeatureByKeyTcp(@Payload() data: { featureKey: string }) {
    return this.featuresService.getFeatureByKey(data.featureKey);
  }

  @MessagePattern({ cmd: 'query_features' })
  async queryFeaturesTcp(@Payload() data: { featureKey?: string; status?: string; category?: string; page?: number; limit?: number }) {
    return this.featuresService.queryFeatures(data);
  }

  @MessagePattern({ cmd: 'create_feature' })
  async createFeatureTcp(@Payload() dto: CreateFeatureDto) {
    return this.featuresService.createFeature(dto);
  }

  @MessagePattern({ cmd: 'update_feature' })
  async updateFeatureTcp(@Payload() data: { id: number } & Partial<CreateFeatureDto> & { status?: string }) {
    const { id, ...dto } = data;
    return this.featuresService.updateFeature(id, dto);
  }

  // --- HTTP Endpoints ---

  @Post()
  @ApiOperation({ summary: 'Create a feature' })
  @ApiResponse({ status: 201, description: 'Feature created' })
  async create(@Body() dto: CreateFeatureDto) {
    return this.featuresService.createFeature(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Query features' })
  @ApiResponse({ status: 200, description: 'Paginated list of features' })
  async findAll(
    @Query('featureKey') featureKey?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.featuresService.queryFeatures({ featureKey, status, category, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feature by ID' })
  @ApiParam({ name: 'id', description: 'Feature ID' })
  @ApiResponse({ status: 200, description: 'The feature' })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.featuresService.getFeatureById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a feature' })
  @ApiParam({ name: 'id', description: 'Feature ID' })
  @ApiResponse({ status: 200, description: 'Feature updated' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateFeatureDto> & { status?: string },
  ) {
    return this.featuresService.updateFeature(id, dto);
  }
}
