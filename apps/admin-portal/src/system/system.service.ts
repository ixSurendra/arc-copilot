import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { sendWithTimeout } from '@arc/shared';
import { GenerateLicenseDto } from '@arc/shared';

@Injectable()
export class AdminSystemService {
  constructor(
    @Inject('LICENSE_SERVICE') private readonly licenseService: ClientProxy,
    @Inject('TENANT_SERVICE') private readonly tenantService: ClientProxy,
  ) {}

  async getLicenseStatus() {
    return sendWithTimeout<any>(this.licenseService, { cmd: 'validate_license' }, {});
  }

  async generateLicense(dto: GenerateLicenseDto) {
    return sendWithTimeout<any>(this.licenseService, { cmd: 'generate_license' }, dto);
  }

  async getTenantInfo(tenantId: number) {
    return sendWithTimeout<any>(this.tenantService, { cmd: 'get_tenant' }, { id: tenantId });
  }

  /**
   * Get usage history for a specific tenant.
   */
  async getTenantUsage(tenantId: number, page = 1, limit = 20) {
    return sendWithTimeout<any>(
      this.licenseService,
      { cmd: 'query_usage' },
      { tenantId, page, limit },
    );
  }

  /**
   * Get all features with quota status for a tenant.
   * Fetches feature registry, then checks quota for each feature.
   */
  async getTenantFeatures(tenantId: number) {
    // Get all active features
    const featuresResult = await sendWithTimeout<any>(
      this.licenseService,
      { cmd: 'query_features' },
      { limit: 100, status: 'ACTIVE' },
    );

    const features = featuresResult?.data || featuresResult || [];

    // Check quota for each feature in parallel
    const quotaResults = await Promise.allSettled(
      features.map(async (feature: any) => {
        try {
          const quota = await sendWithTimeout<any>(
            this.licenseService,
            { cmd: 'check_quota' },
            { tenantId, featureKey: feature.featureKey },
          );
          return {
            featureId: feature.id,
            featureKey: feature.featureKey,
            featureName: feature.featureName,
            description: feature.description,
            category: feature.category,
            valueType: feature.valueType,
            enabled: quota.allowed || (quota.limit === null && quota.allowed !== false),
            quota: {
              allowed: quota.allowed,
              consumed: quota.consumed,
              limit: quota.limit,
              remaining: quota.remaining,
              source: quota.source,
            },
          };
        } catch {
          return {
            featureId: feature.id,
            featureKey: feature.featureKey,
            featureName: feature.featureName,
            description: feature.description,
            category: feature.category,
            valueType: feature.valueType,
            enabled: false,
            quota: { allowed: false, consumed: 0, limit: 0, remaining: 0, source: 'plan' },
          };
        }
      }),
    );

    return quotaResults
      .filter((r: PromiseSettledResult<any>) => r.status === 'fulfilled')
      .map((r: PromiseSettledResult<any>) => (r as PromiseFulfilledResult<any>).value);
  }

  /**
   * Get on-prem license status with licensed features and their usage.
   * Returns license validity, expiry, and for each licensed feature the usage count.
   */
  async getOnPremStatus(tenantId: number) {
    // 1. Validate current license file
    const license = await sendWithTimeout<any>(
      this.licenseService,
      { cmd: 'validate_license' },
      {},
    );

    // 2. Get usage records for this tenant (all features, large limit)
    let usageRecords: any[] = [];
    try {
      const usageResult = await sendWithTimeout<any>(
        this.licenseService,
        { cmd: 'query_usage' },
        { tenantId, limit: 500 },
      );
      usageRecords = usageResult?.data || [];
    } catch {
      // Usage query may fail if no records — that's OK
    }

    // Build usage map: featureKey → total consumed
    // First get feature ID → key mapping
    const featureIdToKey = new Map<number, string>();
    if (license?.features) {
      // License features don't have IDs, so we also need the registry
      try {
        const featuresResult = await sendWithTimeout<any>(
          this.licenseService,
          { cmd: 'query_features' },
          { limit: 200, status: 'ACTIVE' },
        );
        const allFeatures = featuresResult?.data || featuresResult || [];
        for (const f of allFeatures) {
          featureIdToKey.set(f.id, f.featureKey);
        }
      } catch {
        // Proceed without mapping
      }
    }

    // Aggregate usage by feature key
    const usageByKey = new Map<string, number>();
    for (const record of usageRecords) {
      const key = featureIdToKey.get(record.featureId) || `feature_${record.featureId}`;
      usageByKey.set(key, (usageByKey.get(key) || 0) + (record.consumed || 0));
    }

    // 3. Combine license features with usage
    const features = (license?.features || []).map((f: any) => ({
      featureKey: f.featureKey,
      featureName: f.featureName,
      quotaLimit: f.quotaLimit, // null = unlimited (always for on-prem)
      consumed: usageByKey.get(f.featureKey) || 0,
    }));

    return {
      isOnPrem: true,
      license: {
        status: license?.status || 'MALFORMED',
        isValid: license?.isValid || false,
        expiresAt: license?.expiresAt || null,
        daysRemaining: license?.daysRemaining ?? null,
        maxUsers: license?.maxUsers ?? null,
        message: license?.message || 'Unable to validate license',
        tenantId: license?.tenantId ?? tenantId,
      },
      features,
      totalLicensedFeatures: features.length,
      totalUsed: features.filter((f: any) => f.consumed > 0).length,
    };
  }
}
