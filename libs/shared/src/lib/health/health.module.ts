import { DynamicModule, Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health-indicator';
import { HEALTH_OPTIONS } from './health.constants';

export interface HealthModuleOptions {
  /**
   * The service name shown in health check responses.
   */
  serviceName: string;
  /**
   * Optional PrismaClient instance for database health checks.
   * If not provided, the database check is skipped.
   */
  prisma?: { $queryRaw: (query: TemplateStringsArray) => Promise<unknown> };
}

@Module({})
export class HealthModule {
  /**
   * Register the health module with service-specific options.
   */
  static forRoot(options: HealthModuleOptions): DynamicModule {
    return {
      module: HealthModule,
      controllers: [HealthController],
      providers: [
        PrismaHealthIndicator,
        {
          provide: HEALTH_OPTIONS,
          useValue: options,
        },
      ],
    };
  }

  /**
   * Register with a factory for options that depend on injected services.
   *
   * @example
   * HealthModule.forRootAsync({
   *   serviceName: 'audit-service',
   *   prismaClass: AuditPrismaService,
   * })
   */
  static forRootAsync(config: {
    serviceName: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaClass?: new (...args: any[]) => {
      $queryRaw: (query: TemplateStringsArray) => Promise<unknown>;
    };
  }): DynamicModule {
    const providers = [PrismaHealthIndicator];

    if (config.prismaClass) {
      providers.push({
        provide: HEALTH_OPTIONS,
        useFactory: (prisma: {
          $queryRaw: (query: TemplateStringsArray) => Promise<unknown>;
        }) => ({
          serviceName: config.serviceName,
          prisma,
        }),
        inject: [config.prismaClass],
      } as never);
    } else {
      providers.push({
        provide: HEALTH_OPTIONS,
        useValue: { serviceName: config.serviceName },
      } as never);
    }

    return {
      module: HealthModule,
      controllers: [HealthController],
      providers,
    };
  }
}
