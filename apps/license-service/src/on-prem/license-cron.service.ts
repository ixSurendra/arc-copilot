import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnPremLicenseService } from './on-prem-license.service';
import { ConfigService } from '@nestjs/config';
import { LicenseStatus } from '@arc/shared';

/**
 * Cron job that re-validates the on-prem license every 24 hours.
 *
 * - Logs warnings 30 days before expiry
 * - Logs errors when license is expired or invalid
 * - Only active when ON_PREM=true
 */
@Injectable()
export class LicenseCronService {
  private readonly logger = new Logger(LicenseCronService.name);
  private readonly isOnPrem: boolean;

  constructor(
    private readonly onPremLicenseService: OnPremLicenseService,
    private readonly configService: ConfigService,
  ) {
    this.isOnPrem = this.configService.get<string>('ON_PREM') === 'true';

    // Run once on startup
    if (this.isOnPrem) {
      this.checkLicense();
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  handleCron() {
    if (!this.isOnPrem) return;
    this.checkLicense();
  }

  private checkLicense(): void {
    const result = this.onPremLicenseService.validateCurrentLicense();

    switch (result.status) {
      case LicenseStatus.VALID:
        this.logger.log(
          `License OK — tenant: ${result.tenantId} | expires: ${result.expiresAt} | days remaining: ${result.daysRemaining}`,
        );
        break;

      case LicenseStatus.EXPIRING_SOON:
        this.logger.warn(
          `LICENSE EXPIRING SOON — tenant: ${result.tenantId} | expires: ${result.expiresAt} | days remaining: ${result.daysRemaining}. Please renew!`,
        );
        break;

      case LicenseStatus.EXPIRED:
        this.logger.error(
          `LICENSE EXPIRED — tenant: ${result.tenantId} | expired: ${result.expiresAt}. Services will be blocked for main app. Contact vendor for renewal.`,
        );
        break;

      case LicenseStatus.INVALID_SIGNATURE:
        this.logger.error(
          `LICENSE INVALID — Signature verification failed. The license file may have been tampered with.`,
        );
        break;

      case LicenseStatus.FILE_NOT_FOUND:
        this.logger.error(`LICENSE FILE NOT FOUND — ${result.message}`);
        break;

      case LicenseStatus.MALFORMED:
        this.logger.error(`LICENSE MALFORMED — ${result.message}`);
        break;
    }
  }
}
