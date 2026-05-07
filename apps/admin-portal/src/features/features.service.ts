import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { sendWithTimeout } from '@org/shared';

@Injectable()
export class AdminFeaturesService {
  constructor(
    @Inject('LICENSE_SERVICE') private readonly licenseService: ClientProxy,
  ) {}

  async queryFeatures(query: Record<string, unknown>) {
    return sendWithTimeout(this.licenseService, { cmd: 'query_features' }, query);
  }

  async getFeatureById(id: number) {
    return sendWithTimeout(this.licenseService, { cmd: 'get_feature' }, { id });
  }

  async createFeature(dto: Record<string, unknown>) {
    return sendWithTimeout(this.licenseService, { cmd: 'create_feature' }, dto);
  }

  async updateFeature(id: number, dto: Record<string, unknown>) {
    return sendWithTimeout(this.licenseService, { cmd: 'update_feature' }, { id, ...dto });
  }
}
