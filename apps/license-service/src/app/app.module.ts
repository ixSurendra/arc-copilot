import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrismaModule, HealthModule, JwtAuthGuard, OnPremLicenseGuard, TENANT_SERVICE_PORT } from '@arc/shared';
import { LicensePrismaService } from '../prisma/license-prisma.service';
import { databaseConfig, redisConfig, validationSchema } from '../config';
import { RedisModule } from '../redis/redis.module';
import { FeaturesModule } from '../features/features.module';
import { PlansModule } from '../plans/plans.module';
import { PricingModule } from '../pricing/pricing.module';
import { QuotaModule } from '../quota/quota.module';
import { UsageModule } from '../usage/usage.module';
import { OnPremLicenseModule } from '../on-prem/on-prem-license.module';
import { TenantFeatureConfigModule } from '../tenant-feature-config/tenant-feature-config.module';
import { TenantUsersModule } from '../tenant-users/tenant-users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig],
      validationSchema,
      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
      },
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule.forRoot({
      prismaServiceClass: LicensePrismaService,
      isGlobal: true,
    }),
    HealthModule.forRootAsync({
      serviceName: 'license-service',
      prismaClass: LicensePrismaService,
    }),
    RedisModule,
    ClientsModule.register([
      {
        name: 'TENANT_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env['TENANT_SERVICE_HOST'] || 'localhost',
          port: TENANT_SERVICE_PORT,
          retryAttempts: 0,
        },
      },
    ]),
    FeaturesModule,
    PlansModule,
    PricingModule,
    QuotaModule,
    UsageModule,
    OnPremLicenseModule,
    TenantFeatureConfigModule,
    TenantUsersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: OnPremLicenseGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
