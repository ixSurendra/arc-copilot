import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';

/**
 * Base lifecycle class for Prisma services.
 * Each microservice extends its own generated PrismaClient and calls
 * $connect()/$disconnect() directly — this class is kept for reference only.
 *
 * @deprecated Each service implements its own PrismaService extending
 * the locally generated PrismaClient (apps/<service>/generated/prisma).
 */
@Injectable()
export abstract class BasePrismaService implements OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(this.constructor.name);

  abstract onModuleInit(): Promise<void>;
  abstract onModuleDestroy(): Promise<void>;
}
