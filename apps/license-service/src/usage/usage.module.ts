import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TENANT_SERVICE_PORT } from '@org/shared';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';
import { UsageRepository } from './usage.repository';

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
  controllers: [UsageController],
  providers: [UsageService, UsageRepository],
  exports: [UsageService],
})
export class UsageModule {}
