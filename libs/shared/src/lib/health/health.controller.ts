import { Controller, Get, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaHealthIndicator } from './prisma.health-indicator';
import { HEALTH_OPTIONS } from './health.constants';
import type { HealthModuleOptions } from './health.module';

interface HealthCheckResult {
  status: 'ok' | 'error';
  [key: string]: unknown;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prismaHealth: PrismaHealthIndicator,
    @Inject(HEALTH_OPTIONS) private readonly options: HealthModuleOptions,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Returns the health status of the service including memory, database, and uptime' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check() {
    const details: Record<string, HealthCheckResult> = {};
    let overallStatus: 'ok' | 'error' = 'ok';

    // Memory check — heap should not exceed 200MB
    const heapUsed = process.memoryUsage().heapUsed;
    const heapLimit = 200 * 1024 * 1024;
    if (heapUsed > heapLimit) {
      details['memory'] = {
        status: 'error',
        heapUsed: `${Math.round(heapUsed / 1024 / 1024)}MB`,
      };
      overallStatus = 'error';
    } else {
      details['memory'] = {
        status: 'ok',
        heapUsed: `${Math.round(heapUsed / 1024 / 1024)}MB`,
      };
    }

    // Database check — only if Prisma was provided
    if (this.options.prisma) {
      try {
        const result = await this.prismaHealth.isHealthy(this.options.prisma);
        details['database'] = {
          status: 'ok',
          responseTime: result.responseTime,
        };
      } catch (error) {
        details['database'] = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Database unreachable',
        };
        overallStatus = 'error';
      }
    }

    // Uptime
    details['uptime'] = {
      status: 'ok',
      uptime: `${Math.round(process.uptime())}s`,
    };

    const response = {
      status: overallStatus,
      info: details,
      service: this.options.serviceName,
      timestamp: new Date().toISOString(),
    };

    if (overallStatus === 'error') {
      throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return response;
  }
}
