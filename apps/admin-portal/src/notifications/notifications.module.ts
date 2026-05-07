import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUDIT_SERVICE_PORT } from '@arc/shared';
import { AdminNotificationsController } from './notifications.controller';
import { AdminNotificationsService } from './notifications.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUDIT_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env['AUDIT_SERVICE_HOST'] || 'localhost',
          port: AUDIT_SERVICE_PORT,
        },
      },
    ]),
  ],
  controllers: [AdminNotificationsController],
  providers: [AdminNotificationsService],
})
export class AdminNotificationsModule {}
