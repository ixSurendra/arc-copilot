import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  USERS_SERVICE_PORT,
  AUTH_SERVICE_PORT,
  TENANT_SERVICE_PORT,
  AUDIT_SERVICE_PORT,
  MailModule,
} from '@org/shared';
import { AdminUsersController } from './users.controller';
import { AdminUsersService } from './users.service';

/** Shared client registrations used by both this module and MailModule */
const tenantClient = {
  name: 'TENANT_SERVICE',
  transport: Transport.TCP,
  options: {
    host: process.env['TENANT_SERVICE_HOST'] || 'localhost',
    port: TENANT_SERVICE_PORT,
    retryAttempts: 0,
  },
} as const;

const auditClient = {
  name: 'AUDIT_SERVICE',
  transport: Transport.TCP,
  options: {
    host: process.env['AUDIT_SERVICE_HOST'] || 'localhost',
    port: AUDIT_SERVICE_PORT,
    retryAttempts: 0,
  },
} as const;

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
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env['AUTH_SERVICE_HOST'] || 'localhost',
          port: AUTH_SERVICE_PORT,
        },
      },
      tenantClient,
      auditClient,
    ]),
    MailModule.forRootAsync(
      {
        imports: [ClientsModule.register([tenantClient, auditClient])],
        useFactory: (config: ConfigService) => ({
          host: config.get<string>('SMTP_HOST', 'localhost'),
          port: config.get<number>('SMTP_PORT', 587),
          secure: config.get<string>('SMTP_SECURE', 'false') === 'true',
          user: config.get<string>('SMTP_USER', ''),
          pass: config.get<string>('SMTP_PASS', ''),
          from: config.get<string>('SMTP_FROM', 'IX Platform <noreply@example.com>'),
        }),
        inject: [ConfigService],
      },
      {
        tenantClientToken: 'TENANT_SERVICE',
        auditClientToken: 'AUDIT_SERVICE',
      },
    ),
  ],
  controllers: [AdminUsersController],
  providers: [AdminUsersService],
})
export class AdminUsersModule {}
