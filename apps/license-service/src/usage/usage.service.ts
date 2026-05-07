import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import { UsageRepository } from './usage.repository';
import { REDIS_CLIENT } from '../redis/redis.module';
import type { RecordUsageDto, PaginatedResponse } from '@arc/shared';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    private readonly usageRepository: UsageRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject('TENANT_SERVICE') private readonly tenantClient: ClientProxy,
  ) {}

  async recordUsage(dto: RecordUsageDto) {
    // 1. Resolve feature
    const feature = await this.usageRepository.findFeatureByKey(dto.featureKey);
    if (!feature) {
      throw new NotFoundException(`Feature ${dto.featureKey} not found`);
    }

    // 2. Get tenant cycle info
    const tenant = await firstValueFrom(
      this.tenantClient.send({ cmd: 'get_tenant' }, { id: dto.tenantId }),
    ).catch(() => null);

    if (!tenant) {
      throw new NotFoundException(`Tenant ${dto.tenantId} not found`);
    }

    // 3. Increment Redis counter
    const redisKey = `quota:${dto.tenantId}:${dto.featureKey}`;
    await this.redis.incr(redisKey).catch(() => {});

    // 4. Write to usage ledger
    const cycleStart = new Date(tenant.cycleStartDate);
    const cycleEnd = this.computeCycleEnd(cycleStart, tenant.billingCycle);

    await this.usageRepository.upsertUsageLedger(
      dto.tenantId,
      feature.id,
      cycleStart,
      cycleEnd,
      1,
      dto.userId,
    );

    this.logger.log(`Usage recorded: tenant=${dto.tenantId}, feature=${dto.featureKey}`);

    return { recorded: true };
  }

  async queryUsage(query: {
    tenantId?: number;
    featureId?: number;
    userId?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    return this.usageRepository.queryUsage(query);
  }

  private computeCycleEnd(cycleStart: Date, billingCycle: string): Date {
    const end = new Date(cycleStart);
    if (billingCycle === 'ANNUALLY') {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    return end;
  }
}
