import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USERS_SERVICE_PORT } from '@org/shared';
import { TenantUsersController } from './tenant-users.controller';

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
    ]),
  ],
  controllers: [TenantUsersController],
})
export class TenantUsersModule {}
