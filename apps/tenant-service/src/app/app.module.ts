import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule, HealthModule, JwtAuthGuard, OnPremLicenseGuard } from '@arc/shared';
import { TenantsModule } from '../tenants/tenants.module';
import { BillingsModule } from '../billings/billings.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PlanHistoryModule } from '../plan-history/plan-history.module';
import { BrandingModule } from '../branding/branding.module';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { databaseConfig, validationSchema } from '../config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      validationSchema,
      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
      },
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule.forRoot({
      prismaServiceClass: TenantPrismaService,
      isGlobal: true,
    }),
    HealthModule.forRootAsync({
      serviceName: 'tenant-service',
      prismaClass: TenantPrismaService,
    }),
    TenantsModule,
    BillingsModule,
    InvoicesModule,
    PlanHistoryModule,
    BrandingModule,
    EmailTemplatesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: OnPremLicenseGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
