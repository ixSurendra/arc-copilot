import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TENANT_SERVICE_PORT } from '@org/shared';
import { QuotaController } from './quota.controller';
import { QuotaService } from './quota.service';
import { QuotaRepository } from './quota.repository';

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
  controllers: [QuotaController],
  providers: [QuotaService, QuotaRepository],
  exports: [QuotaService],
})
export class QuotaModule {}
