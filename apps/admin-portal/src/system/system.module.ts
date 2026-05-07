import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LICENSE_SERVICE_PORT, TENANT_SERVICE_PORT } from '@org/shared';
import { AdminSystemController } from './system.controller';
import { AdminSystemService } from './system.service';

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
  controllers: [AdminSystemController],
  providers: [AdminSystemService],
})
export class AdminSystemModule {}
