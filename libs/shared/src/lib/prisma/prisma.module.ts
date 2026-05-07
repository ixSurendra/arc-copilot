import { DynamicModule, Module, Type } from '@nestjs/common';
import { PRISMA_SERVICE } from './prisma.constants';

export interface PrismaModuleOptions {
  /**
   * The concrete PrismaService class (app-specific, extends the generated PrismaClient).
   * Must implement OnModuleInit and OnModuleDestroy.
   */
  prismaServiceClass: Type;
  /**
   * Whether this module is global (defaults to true for database access).
   */
  isGlobal?: boolean;
}

@Module({})
export class PrismaModule {
  static forRoot(options: PrismaModuleOptions): DynamicModule {
    const { prismaServiceClass, isGlobal = true } = options;

    return {
      module: PrismaModule,
      global: isGlobal,
      providers: [
        {
          provide: PRISMA_SERVICE,
          useClass: prismaServiceClass,
        },
        prismaServiceClass,
      ],
      exports: [PRISMA_SERVICE, prismaServiceClass],
    };
  }
}
