import { Injectable } from '@nestjs/common';

export interface PrismaHealthResult {
  responseTime: string;
}

/**
 * Health indicator for Prisma database connections.
 *
 * Accepts any PrismaClient-like object that supports `$queryRaw`.
 * This avoids coupling to a specific generated PrismaClient.
 */
@Injectable()
export class PrismaHealthIndicator {
  /**
   * Checks that the database is reachable via a lightweight query.
   *
   * @param prisma Any PrismaClient instance with `$queryRaw`
   * @returns Response time measurement
   * @throws Error if database is unreachable
   */
  async isHealthy(prisma: {
    $queryRaw: (query: TemplateStringsArray) => Promise<unknown>;
  }): Promise<PrismaHealthResult> {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;
    return { responseTime: `${responseTime}ms` };
  }
}
