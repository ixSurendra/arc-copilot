import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  TENANT_SERVICE_PORT,
  USERS_SERVICE_PORT,
  LICENSE_SERVICE_PORT,
} from '@arc/shared';
import { AdminTenantsController } from './tenants.controller';
import { AdminTenantsService } from './tenants.service';

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
      {
        name: 'USERS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env['USERS_SERVICE_HOST'] || 'localhost',
          port: USERS_SERVICE_PORT,
        },
      },
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
  controllers: [AdminTenantsController],
  providers: [AdminTenantsService],
})
export class AdminTenantsModule {}
