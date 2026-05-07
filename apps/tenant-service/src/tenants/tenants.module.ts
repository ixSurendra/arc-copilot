import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantsRepository } from './tenants.repository';
import { USERS_SERVICE_PORT, LICENSE_SERVICE_PORT } from '@org/shared';
import { PlanHistoryModule } from '../plan-history/plan-history.module';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USERS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env['USERS_SERVICE_HOST'] || 'localhost',
          port: USERS_SERVICE_PORT,
          retryAttempts: 0,
        },
      },
      {
        name: 'LICENSE_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env['LICENSE_SERVICE_HOST'] || 'localhost',
          port: LICENSE_SERVICE_PORT,
          retryAttempts: 0,
        },
      },
    ]),
    PlanHistoryModule,
  ],
  controllers: [TenantsController],
  providers: [TenantsService, TenantsRepository],
  exports: [TenantsService],
})
export class TenantsModule {}
