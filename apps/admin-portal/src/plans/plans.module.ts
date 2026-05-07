import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LICENSE_SERVICE_PORT } from '@arc/shared';
import { AdminPlansController } from './plans.controller';
import { AdminPlansService } from './plans.service';

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
  controllers: [AdminPlansController],
  providers: [AdminPlansService],
})
export class AdminPlansModule {}
