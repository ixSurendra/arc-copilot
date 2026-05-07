import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import { QuotaRepository } from './quota.repository';
import { REDIS_CLIENT } from '../redis/redis.module';
import type { CheckQuotaDto, QuotaCheckResult } from '@org/shared';

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    private readonly quotaRepository: QuotaRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject('TENANT_SERVICE') private readonly tenantClient: ClientProxy,
  ) {}

  async checkQuota(dto: CheckQuotaDto): Promise<QuotaCheckResult> {
    // 1. Resolve feature
    const feature = await this.quotaRepository.findFeatureByKey(dto.featureKey);
    if (!feature) {
      throw new NotFoundException(`Feature ${dto.featureKey} not found`);
    }

    // 2. Get tenant's plan from tenant service
    const tenant = await firstValueFrom(
      this.tenantClient.send({ cmd: 'get_tenant' }, { id: dto.tenantId }),
    ).catch(() => null);

    if (!tenant || !tenant.planId) {
      return { allowed: false, consumed: 0, limit: 0, remaining: 0, source: 'plan' };
    }

    // Resolve planId: canonical format is plan NAME (string), but we keep a
    // numeric fallback for backward compatibility with legacy data. Log a
    // warning whenever the numeric branch fires so we can detect and migrate
    // stragglers. The repository/DTO validation layers prevent new numeric
    // writes, so this branch should only hit during the grace period before
    // tools/fix-tenant-plan-ids.ts runs.
    let numericPlanId: number;
    if (/^\d+$/.test(String(tenant.planId))) {
      numericPlanId = Number(tenant.planId);
      this.logger.warn(
        `Tenant ${dto.tenantId} has legacy numeric planId "${tenant.planId}" — ` +
          `expected plan name (e.g. "PROFESSIONAL"). Run tools/fix-tenant-plan-ids.ts to migrate.`,
      );
    } else {
      // Canonical path: plan name → resolve to numeric ID
      const plan = await this.quotaRepository.findPlanByName(tenant.planId);
      if (!plan) {
        this.logger.error(
          `Tenant ${dto.tenantId} planId "${tenant.planId}" does not match any plan name`,
        );
        return { allowed: false, consumed: 0, limit: 0, remaining: 0, source: 'plan' };
      }
      numericPlanId = plan.id;
    }

    // 3. Get plan quota for feature
    const planQuota = await this.quotaRepository.findPlanQuota(numericPlanId, feature.id);
    if (!planQuota || !planQuota.isEnabled) {
      return { allowed: false, consumed: 0, limit: 0, remaining: 0, source: 'plan' };
    }

    // 4. Try Redis first for current consumption
    const redisKey = `quota:${dto.tenantId}:${dto.featureKey}`;
    let consumed = 0;

    const redisValue = await this.redis.get(redisKey).catch(() => null);
    if (redisValue !== null) {
      consumed = parseInt(redisValue, 10);
    } else {
      // Fallback to DB — get current cycle usage
      const cycleStart = new Date(tenant.cycleStartDate);
      consumed = await this.quotaRepository.getCurrentCycleUsage(
        dto.tenantId,
        feature.id,
        cycleStart,
        dto.userId,
      );
      // Warm Redis cache
      await this.redis.set(redisKey, consumed.toString()).catch(() => {});
    }

    // 5. Unlimited quota (null limit)
    if (planQuota.quotaLimit === null) {
      return { allowed: true, consumed, limit: null, remaining: null, source: 'plan' };
    }

    // 6. Check plan quota
    if (consumed < planQuota.quotaLimit) {
      return {
        allowed: true,
        consumed,
        limit: planQuota.quotaLimit,
        remaining: planQuota.quotaLimit - consumed,
        source: 'plan',
      };
    }

    // 7. Check active top-ups
    const topUps = await this.quotaRepository.findActiveTopUps(dto.tenantId, feature.id);
    let topUpRemaining = 0;
    for (const topUp of topUps) {
      topUpRemaining += topUp.additionalQuota - topUp.consumed;
    }

    if (topUpRemaining > 0) {
      return {
        allowed: true,
        consumed,
        limit: planQuota.quotaLimit + topUpRemaining,
        remaining: topUpRemaining,
        source: 'top_up',
      };
    }

    return {
      allowed: false,
      consumed,
      limit: planQuota.quotaLimit,
      remaining: 0,
      source: 'plan',
    };
  }

  async purchaseTopUp(dto: {
    tenantId: number;
    featureId: number;
    additionalQuota: number;
    validityDays: number;
    userId?: number;
  }) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + dto.validityDays);

    this.logger.log(`Top-up purchased: tenant=${dto.tenantId}, feature=${dto.featureId}, quota=${dto.additionalQuota}`);

    return this.quotaRepository.createTopUp({
      tenantId: dto.tenantId,
      featureId: dto.featureId,
      additionalQuota: dto.additionalQuota,
      expiryDate,
      userId: dto.userId,
    });
  }
}
