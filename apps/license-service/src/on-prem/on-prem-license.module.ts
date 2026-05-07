import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { AUDIT_SERVICE, AUDIT_SERVICE_PORT } from '@org/shared';
import { OnPremLicenseController } from './on-prem-license.controller';
import { OnPremLicenseService } from './on-prem-license.service';
import { OnPremGuard } from './on-prem.guard';
import { LicenseCronService } from './license-cron.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ClientsModule.register([
      {
        name: AUDIT_SERVICE,
        transport: Transport.TCP,
        options: {
          host: process.env['AUDIT_SERVICE_HOST'] || 'localhost',
          port: AUDIT_SERVICE_PORT,
        },
      },
    ]),
  ],
  controllers: [OnPremLicenseController],
  providers: [OnPremLicenseService, OnPremGuard, LicenseCronService],
  exports: [OnPremLicenseService],
})
export class OnPremLicenseModule {}
