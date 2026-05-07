import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { sendWithTimeout } from '@org/shared';

@Injectable()
export class AdminUsageService {
  constructor(
    @Inject('LICENSE_SERVICE') private readonly licenseService: ClientProxy,
    @Inject('TENANT_SERVICE') private readonly tenantService: ClientProxy,
  ) {}

  async queryUsage(query: Record<string, unknown>) {
    return sendWithTimeout<any>(this.licenseService, { cmd: 'query_usage' }, query);
  }

  async recordUsage(dto: Record<string, unknown>) {
    return sendWithTimeout<any>(this.licenseService, { cmd: 'record_usage' }, dto);
  }

  /**
   * Get usage summary with aggregated stats across all tenants.
   * Fetches all usage records (large limit), groups by feature,
   * and computes top consumers.
   */
  async getUsageSummary() {
    // Fetch all usage records (no pagination limit for summary)
    const allUsage = await sendWithTimeout<any>(
      this.licenseService,
      { cmd: 'query_usage' },
      { limit: 1000 },
    );

    const records = allUsage?.data || [];

    // Aggregate by feature
    const byFeature = new Map<number, { featureId: number; featureName: string; featureKey: string; totalConsumed: number; tenantCount: number; tenants: Set<number> }>();
    // Aggregate by tenant
    const byTenant = new Map<number, { tenantId: number; totalConsumed: number; featureCount: number; features: Set<number> }>();

    let totalConsumed = 0;
    let totalRecords = allUsage?.total || records.length;

    for (const record of records) {
      totalConsumed += record.consumed || 0;

      // By feature
      const fId = record.featureId;
      if (!byFeature.has(fId)) {
        byFeature.set(fId, {
          featureId: fId,
          featureName: record.feature?.featureName || `Feature #${fId}`,
          featureKey: record.feature?.featureKey || '',
          totalConsumed: 0,
          tenantCount: 0,
          tenants: new Set(),
        });
      }
      const fEntry = byFeature.get(fId)!;
      fEntry.totalConsumed += record.consumed || 0;
      fEntry.tenants.add(record.tenantId);

      // By tenant
      const tId = record.tenantId;
      if (!byTenant.has(tId)) {
        byTenant.set(tId, {
          tenantId: tId,
          totalConsumed: 0,
          featureCount: 0,
          features: new Set(),
        });
      }
      const tEntry = byTenant.get(tId)!;
      tEntry.totalConsumed += record.consumed || 0;
      tEntry.features.add(fId);
    }

    // Convert to arrays
    const topFeatures = Array.from(byFeature.values())
      .map(({ tenants, ...rest }) => ({ ...rest, tenantCount: tenants.size }))
      .sort((a, b) => b.totalConsumed - a.totalConsumed)
      .slice(0, 10);

    const topTenants = Array.from(byTenant.values())
      .map(({ features, ...rest }) => ({ ...rest, featureCount: features.size }))
      .sort((a, b) => b.totalConsumed - a.totalConsumed)
      .slice(0, 10);

    return {
      totalRecords,
      totalConsumed,
      uniqueFeatures: byFeature.size,
      uniqueTenants: byTenant.size,
      topFeatures,
      topTenants,
    };
  }

  /**
   * Get per-tenant feature consumption with quota limits.
   * For each tenant, checks each feature's consumed/limit/remaining.
   * Returns a detailed breakdown for super admin dashboard.
   */
  async getTenantFeatureBreakdown(tenantId?: number) {
    // Get all tenants (or specific one)
    let tenants: any[] = [];
    if (tenantId) {
      const tenant = await sendWithTimeout<any>(
        this.tenantService,
        { cmd: 'get_tenant' },
        { id: tenantId },
      ).catch(() => null);
      if (tenant) tenants = [tenant];
    } else {
      const tenantsResult = await sendWithTimeout<any>(
        this.tenantService,
        { cmd: 'query_tenants' },
        { limit: 100 },
      ).catch(() => ({ data: [] as any[] }));
      tenants = tenantsResult?.data || tenantsResult || [];
    }

    // Filter out system tenant
    tenants = tenants.filter((t: any) => t.id !== 0);

    // Get all active features
    const featuresResult = await sendWithTimeout<any>(
      this.licenseService,
      { cmd: 'query_features' },
      { limit: 200, status: 'ACTIVE' },
    );
    const features = featuresResult?.data || featuresResult || [];

    // For each tenant, check quota for all features
    const breakdown: any[] = [];

    for (const tenant of tenants) {
      const featureStatuses: any[] = [];

      const quotaResults = await Promise.allSettled(
        features.map(async (feature: any) => {
          try {
            const quota = await sendWithTimeout<any>(
              this.licenseService,
              { cmd: 'check_quota' },
              { tenantId: tenant.id, featureKey: feature.featureKey },
            );
            return {
              featureId: feature.id,
              featureKey: feature.featureKey,
              featureName: feature.featureName,
              category: feature.category,
              valueType: feature.valueType,
              enabled: quota.allowed || (quota.limit === null && quota.allowed !== false),
              consumed: quota.consumed ?? 0,
              limit: quota.limit,
              remaining: quota.remaining,
              source: quota.source,
            };
          } catch {
            return {
              featureId: feature.id,
              featureKey: feature.featureKey,
              featureName: feature.featureName,
              category: feature.category,
              valueType: feature.valueType,
              enabled: false,
              consumed: 0,
              limit: 0,
              remaining: 0,
              source: 'plan',
            };
          }
        }),
      );

      for (const r of quotaResults) {
        if (r.status === 'fulfilled') featureStatuses.push(r.value);
      }

      breakdown.push({
        tenantId: tenant.id,
        tenantName: tenant.tenantName,
        planId: tenant.planId,
        status: tenant.status,
        features: featureStatuses,
        summary: {
          totalFeatures: featureStatuses.length,
          enabledFeatures: featureStatuses.filter((f: any) => f.enabled).length,
          quotaFeatures: featureStatuses.filter((f: any) => f.enabled && f.limit !== null && f.limit > 0).length,
          nearLimitFeatures: featureStatuses.filter((f: any) =>
            f.enabled && f.limit !== null && f.limit > 0 && f.remaining !== null && f.remaining / f.limit < 0.2,
          ).length,
        },
      });
    }

    return breakdown;
  }
}
