import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import {
  HealthModule,
  JwtAuthGuard,
  OnPremLicenseGuard,
  AuditLoggingInterceptor,
  TENANT_SERVICE_PORT,
  USERS_SERVICE_PORT,
  LICENSE_SERVICE_PORT,
  AUTH_SERVICE_PORT,
  AUDIT_SERVICE_PORT,
} from '@arc/shared';
import { validationSchema } from '../config';
import { DashboardModule } from '../dashboard/dashboard.module';
import { AdminTenantsModule } from '../tenants/tenants.module';
import { AdminUsersModule } from '../users/users.module';
import { AdminRolesModule } from '../roles/roles.module';
import { AdminGroupsModule } from '../groups/groups.module';
import { AdminModulesModule } from '../modules/modules.module';
import { AdminPermissionsModule } from '../permissions/permissions.module';
import { AdminPlansModule } from '../plans/plans.module';
import { AdminFeaturesModule } from '../features/features.module';
import { AdminPricingModule } from '../pricing/pricing.module';
import { AdminQuotaModule } from '../quota/quota.module';
import { AdminUsageModule } from '../usage/usage.module';
import { AdminAuditModule } from '../audit/audit.module';
import { AdminSystemModule } from '../system/system.module';
import { BffAuthModule } from '../auth/auth.module';
import { AdminNotificationsModule } from '../notifications/notifications.module';
import { AdminBrandingModule } from '../branding/branding.module';
import { AdminEmailTemplatesModule } from '../email-templates/email-templates.module';
import { TenantFeatureConfigModule } from '../tenant-feature-config/tenant-feature-config.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
      },
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,     // 1 second
        limit: 20,     // 20 requests per second per IP
      },
      {
        name: 'medium',
        ttl: 60000,    // 1 minute
        limit: 300,    // 300 requests per minute per IP
      },
    ]),
    HealthModule.forRootAsync({
      serviceName: 'admin-portal',
    }),
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
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env['AUTH_SERVICE_HOST'] || 'localhost',
          port: AUTH_SERVICE_PORT,
          retryAttempts: 0,
        },
      },
      {
        name: 'AUDIT_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env['AUDIT_SERVICE_HOST'] || 'localhost',
          port: AUDIT_SERVICE_PORT,
          retryAttempts: 0,
        },
      },
    ]),
    DashboardModule,
    AdminTenantsModule,
    AdminUsersModule,
    AdminRolesModule,
    AdminGroupsModule,
    AdminModulesModule,
    AdminPermissionsModule,
    AdminPlansModule,
    AdminFeaturesModule,
    AdminPricingModule,
    AdminQuotaModule,
    AdminUsageModule,
    AdminAuditModule,
    AdminSystemModule,
    BffAuthModule,
    AdminNotificationsModule,
    AdminBrandingModule,
    AdminEmailTemplatesModule,
    TenantFeatureConfigModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: OnPremLicenseGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLoggingInterceptor },
  ],
})
export class AppModule {}
