import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule, HealthModule, JwtAuthGuard, OnPremLicenseGuard } from '@arc/shared';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditPrismaService } from '../prisma/audit-prisma.service';
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
      prismaServiceClass: AuditPrismaService,
      isGlobal: true,
    }),
    HealthModule.forRootAsync({
      serviceName: 'audit-service',
      prismaClass: AuditPrismaService,
    }),
    AuditModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: OnPremLicenseGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
