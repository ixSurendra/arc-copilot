import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FeaturesRepository } from './features.repository';
import { CreateFeatureDto, PaginatedResponse } from '@arc/shared';

@Injectable()
export class FeaturesService {
  private readonly logger = new Logger(FeaturesService.name);

  constructor(private readonly featuresRepository: FeaturesRepository) {}

  async createFeature(dto: CreateFeatureDto) {
    this.logger.log(`Creating feature: ${dto.featureKey}`);
    return this.featuresRepository.create({
      featureKey: dto.featureKey,
      featureName: dto.featureName,
      description: dto.description,
      category: dto.category,
      ...(dto.valueType !== undefined && { valueType: dto.valueType }),
    });
  }

  async getFeatureById(id: number) {
    const feature = await this.featuresRepository.findById(id);
    if (!feature) {
      throw new NotFoundException(`Feature with id ${id} not found`);
    }
    return feature;
  }

  async getFeatureByKey(featureKey: string) {
    const feature = await this.featuresRepository.findByKey(featureKey);
    if (!feature) {
      throw new NotFoundException(`Feature with key ${featureKey} not found`);
    }
    return feature;
  }

  async updateFeature(id: number, dto: Partial<CreateFeatureDto> & { status?: string }) {
    await this.getFeatureById(id);
    return this.featuresRepository.update(id, {
      ...(dto.featureKey !== undefined && { featureKey: dto.featureKey }),
      ...(dto.featureName !== undefined && { featureName: dto.featureName }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.valueType !== undefined && { valueType: dto.valueType }),
      ...(dto.status !== undefined && { status: dto.status as any }),
    });
  }

  async queryFeatures(query: {
    featureKey?: string;
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    return this.featuresRepository.findWithFilters(query);
  }
}
