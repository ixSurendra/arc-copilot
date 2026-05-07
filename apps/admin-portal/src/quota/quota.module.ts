import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LICENSE_SERVICE_PORT } from '@org/shared';
import { AdminQuotaController } from './quota.controller';
import { AdminQuotaService } from './quota.service';

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
  controllers: [AdminQuotaController],
  providers: [AdminQuotaService],
})
export class AdminQuotaModule {}
