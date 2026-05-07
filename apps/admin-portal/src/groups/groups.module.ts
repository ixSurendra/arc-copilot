import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USERS_SERVICE_PORT } from '@arc/shared';
import { AdminGroupsController } from './groups.controller';
import { AdminGroupsService } from './groups.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USERS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env['USERS_SERVICE_HOST'] || 'localhost',
          port: USERS_SERVICE_PORT,
        },
      },
    ]),
  ],
  controllers: [AdminGroupsController],
  providers: [AdminGroupsService],
})
export class AdminGroupsModule {}
