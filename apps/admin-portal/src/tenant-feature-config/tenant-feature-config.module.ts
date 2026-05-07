import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LICENSE_SERVICE_PORT } from '@arc/shared';
import { TenantFeatureConfigController } from './tenant-feature-config.controller';
import { TenantFeatureConfigService } from './tenant-feature-config.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'LICENSE_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env['LICENSE_SERVICE_HOST'] || 'localhost',
          port: LICENSE_SERVICE_PORT,
        },
      },
    ]),
  ],
  controllers: [TenantFeatureConfigController],
  providers: [TenantFeatureConfigService],
})
export class TenantFeatureConfigModule {}
