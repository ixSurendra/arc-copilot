import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TENANT_SERVICE_PORT } from '@org/shared';
import { AdminBrandingController } from './branding.controller';
import { AdminBrandingService } from './branding.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'TENANT_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env['TENANT_SERVICE_HOST'] || 'localhost',
          port: TENANT_SERVICE_PORT,
        },
      },
    ]),
  ],
  controllers: [AdminBrandingController],
  providers: [AdminBrandingService],
})
export class AdminBrandingModule {}
