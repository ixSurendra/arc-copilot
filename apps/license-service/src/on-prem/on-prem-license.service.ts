import { Injectable, Logger, InternalServerErrorException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import * as crypto from 'crypto';
import {
  AUDIT_SERVICE,
  AuditLogStatus,
  BillingCycle,
  LicenseFile,
  LicensePayload,
  LicenseValidationResult,
  validateLicenseFile,
} from '@arc/shared';
import { LicensePrismaService } from '../prisma/license-prisma.service';

@Injectable()
export class OnPremLicenseService {
  private readonly logger = new Logger(OnPremLicenseService.name);

  constructor(
    private readonly prisma: LicensePrismaService,
    private readonly configService: ConfigService,
    @Inject(AUDIT_SERVICE) private readonly auditClient: ClientProxy,
  ) {}

  /**
   * Generate a signed on-prem license file.
   * Called from cloud admin portal — produces a .lic file for the customer.
   * Features are sourced from the selected plan's PlanFeatureQuota.
   */
  async generateLicense(
    tenantId: number,
    planId: number,
    expiresAt: string,
    startDate?: string,
    cycle: BillingCycle = BillingCycle.ANNUALLY,
    maxUsers?: number | null,
    issuedBy?: number,
  ): Promise<{ license: LicenseFile; record: any }> {
    try {
      // Fetch features from the plan (not all features)
      const planQuotas = await this.prisma.planFeatureQuota.findMany({
        where: { planId, isEnabled: true },
        include: { feature: { select: { featureKey: true, featureName: true } } },
        orderBy: { feature: { featureKey: 'asc' } },
      });

      const now = new Date();
      const start = startDate ? new Date(startDate) : now;
      const expires = new Date(expiresAt);

      const payload: LicensePayload = {
        tenantId,
        planId,
        startDate: start.toISOString(),
        issuedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        cycle,
        maxUsers: maxUsers ?? null,
        features: planQuotas.map((q) => ({
          featureKey: q.feature.featureKey,
          featureName: q.feature.featureName,
          quotaLimit: null, // unlimited for on-prem
        })),
      };

      const signature = this.signPayload(payload);
      const signatureHash = crypto
        .createHash('sha256')
        .update(signature)
        .digest('hex');

      // Compute version
      const latestLicense = await this.prisma.tenantLicense.findFirst({
        where: { tenantId },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const version = (latestLicense?.version ?? 0) + 1;

      // Mark previous ACTIVE licenses as EXPIRED
      await this.prisma.tenantLicense.updateMany({
        where: { tenantId, status: 'ACTIVE' },
        data: { status: 'EXPIRED' },
      });

      // Persist the license record
      const record = await this.prisma.tenantLicense.create({
        data: {
          tenantId,
          planId,
          cycle,
          maxUsers: maxUsers ?? null,
          startDate: start,
          expiresAt: expires,
          signatureHash,
          licenseData: { payload, signature } as any,
          issuedBy: issuedBy ?? 0,
          version,
        },
        include: { plan: { select: { id: true, planName: true } } },
      });

      this.logger.log(
        `Generated on-prem license v${version} for tenant ${tenantId} | plan: ${planId} | cycle: ${cycle} | expires: ${expires.toISOString()} | features: ${planQuotas.length}`,
      );

      this.auditClient.emit('audit_log_created', {
        tenantId,
        userId: issuedBy ?? 0,
        action: 'ON_PREM_LICENSE_GENERATED',
        resource: 'on-prem-license',
        resourceId: String(tenantId),
        status: AuditLogStatus.SUCCESS,
        metadata: {
          version,
          planId,
          featureCount: planQuotas.length,
          startDate: start.toISOString(),
          expiresAt: expires.toISOString(),
          cycle,
        },
      });

      return { license: { payload, signature }, record };
    } catch (error) {
      this.auditClient.emit('audit_log_created', {
        tenantId,
        userId: issuedBy ?? 0,
        action: 'ON_PREM_LICENSE_GENERATED',
        resource: 'on-prem-license',
        resourceId: String(tenantId),
        status: AuditLogStatus.FAILURE,
        metadata: { error: (error as Error).message },
      });
      throw error;
    }
  }

  /**
   * Get paginated license history for a tenant.
   */
  async getTenantLicenses(tenantId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.tenantLicense.findMany({
        where: { tenantId },
        orderBy: { version: 'desc' },
        skip,
        take: limit,
        include: { plan: { select: { id: true, planName: true } } },
      }),
      this.prisma.tenantLicense.count({ where: { tenantId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get a single license record by ID (includes licenseData for download).
   */
  async getTenantLicenseById(licenseId: number) {
    return this.prisma.tenantLicense.findUnique({
      where: { id: licenseId },
      include: { plan: { select: { id: true, planName: true } } },
    });
  }

  /**
   * Query all licenses across tenants (paginated with filters).
   * Used by the standalone Licenses list page for super admins.
   */
  async queryAllLicenses(query: {
    tenantId?: number;
    planId?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page && query.page >= 1 ? query.page : 1;
    const limit = query.limit && query.limit >= 1 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.tenantId) where['tenantId'] = Number(query.tenantId);
    if (query.planId) where['planId'] = Number(query.planId);
    if (query.status) where['status'] = query.status;
    if (query.startDate || query.endDate) {
      const issuedAt: Record<string, Date> = {};
      if (query.startDate) issuedAt['gte'] = new Date(query.startDate);
      if (query.endDate) issuedAt['lte'] = new Date(query.endDate);
      where['issuedAt'] = issuedAt;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tenantLicense.findMany({
        where,
        orderBy: { issuedAt: 'desc' },
        skip,
        take: limit,
        include: { plan: { select: { id: true, planName: true } } },
      }),
      this.prisma.tenantLicense.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Validate the current on-prem license file from disk.
   * Used by GET /on-prem/license/status and TCP validate_license.
   */
  validateCurrentLicense(): LicenseValidationResult {
    const licenseFilePath = this.configService.get<string>(
      'LICENSE_FILE_PATH',
      '/opt/ix-copilot/license/license.lic',
    );
    const publicKey = this.configService.get<string>('ONPREM_LICENSE_PUBLIC_KEY', '');

    if (!publicKey) {
      return {
        status: 'MALFORMED' as any,
        isValid: false,
        message: 'ONPREM_LICENSE_PUBLIC_KEY is not configured',
      };
    }

    return validateLicenseFile(licenseFilePath, publicKey);
  }

  private signPayload(payload: LicensePayload): string {
    const privateKeyBase64 = this.configService.get<string>('ONPREM_LICENSE_PRIVATE_KEY');
    if (!privateKeyBase64) {
      throw new InternalServerErrorException('ONPREM_LICENSE_PRIVATE_KEY is not configured');
    }

    const privateKeyPem = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');
    const keyObject = crypto.createPrivateKey({ key: privateKeyPem, format: 'pem', type: 'pkcs8' });

    const sign = crypto.createSign('SHA256');
    sign.update(JSON.stringify(payload));
    sign.end();

    return sign.sign(keyObject, 'base64');
  }
}
