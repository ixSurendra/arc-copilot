import { DynamicModule, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MAIL_OPTIONS, MAIL_TENANT_CLIENT, MAIL_AUDIT_CLIENT } from './mail.constants';
import type { MailModuleOptions, MailModuleAsyncOptions } from './mail.interfaces';

export interface MailModuleExtraOptions {
  /** Injection token name for the tenant-service ClientProxy (e.g. 'TENANT_SERVICE') */
  tenantClientToken?: string;
  /** Injection token name for the audit-service ClientProxy (e.g. 'AUDIT_SERVICE') */
  auditClientToken?: string;
}

@Module({})
export class MailModule {
  static forRoot(options: MailModuleOptions): DynamicModule {
    return {
      module: MailModule,
      providers: [
        {
          provide: MAIL_OPTIONS,
          useValue: options,
        },
        MailService,
      ],
      exports: [MailService],
    };
  }

  static forRootAsync(
    options: MailModuleAsyncOptions,
    extra?: MailModuleExtraOptions,
  ): DynamicModule {
    const providers: any[] = [
      {
        provide: MAIL_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
      MailService,
    ];

    // Wire optional tenant-service ClientProxy for template/branding lookups
    if (extra?.tenantClientToken) {
      providers.push({
        provide: MAIL_TENANT_CLIENT,
        useExisting: extra.tenantClientToken,
      });
    }

    // Wire optional audit-service ClientProxy for notification logging
    if (extra?.auditClientToken) {
      providers.push({
        provide: MAIL_AUDIT_CLIENT,
        useExisting: extra.auditClientToken,
      });
    }

    return {
      module: MailModule,
      imports: (options.imports || []) as never[],
      providers,
      exports: [MailService],
    };
  }
}
