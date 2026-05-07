import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TENANT_SERVICE_PORT } from '@arc/shared';
import { AdminEmailTemplatesController } from './email-templates.controller';
import { AdminEmailTemplatesService } from './email-templates.service';

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
  controllers: [AdminEmailTemplatesController],
  providers: [AdminEmailTemplatesService],
})
export class AdminEmailTemplatesModule {}
