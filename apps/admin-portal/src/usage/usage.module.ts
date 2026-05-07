import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LICENSE_SERVICE_PORT, TENANT_SERVICE_PORT } from '@arc/shared';
import { AdminUsageController } from './usage.controller';
import { AdminUsageService } from './usage.service';

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
  controllers: [AdminUsageController],
  providers: [AdminUsageService],
})
export class AdminUsageModule {}
