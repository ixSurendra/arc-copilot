import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUDIT_SERVICE_PORT } from '@arc/shared';
import { AdminAuditController } from './audit.controller';
import { AdminAuditService } from './audit.service';

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
  controllers: [AdminAuditController],
  providers: [AdminAuditService],
})
export class AdminAuditModule {}
