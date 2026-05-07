import { Module } from '@nestjs/common';
import { TenantFeatureConfigController } from './tenant-feature-config.controller';
import { TenantFeatureConfigService } from './tenant-feature-config.service';
import { TenantFeatureConfigRepository } from './tenant-feature-config.repository';

@Module({
  controllers: [TenantFeatureConfigController],
  providers: [TenantFeatureConfigService, TenantFeatureConfigRepository],
  exports: [TenantFeatureConfigService],
})
export class TenantFeatureConfigModule {}
