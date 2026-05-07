import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateLicenseFile } from './license-validator';
import { LicenseValidationResult } from './license-validator.interfaces';

/**
 * Global guard for on-prem deployments.
 *
 * Usage in your main app's AppModule:
 *
 *   import { OnPremLicenseGuard } from '@org/shared';
 *
 *   @Module({
 *     providers: [
 *       { provide: APP_GUARD, useClass: OnPremLicenseGuard },
 *     ],
 *   })
 *
 * Behaviour:
 * - Cloud mode (ON_PREM !== 'true'): always allows requests
 * - On-prem mode: validates the license file and blocks if expired/invalid
 * - Whitelisted paths (health, license status) are always allowed
 *
 * Caches the validation result for 5 minutes to avoid reading the file on every request.
 */
@Injectable()
export class OnPremLicenseGuard implements CanActivate {
  private readonly logger = new Logger(OnPremLicenseGuard.name);
  private cachedResult: LicenseValidationResult | null = null;
  private lastCheckTime = 0;
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  /** Paths that are always allowed even when license is expired */
  private readonly whitelistedPaths = [
    '/health',
    '/on-prem/license/status',
    '/auth/login',
    '/auth/logout',
    '/auth/refresh',
    '/auth/validate',
    '/usage/record',
    '/tenant-feature-config/',
  ];

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip guard for TCP/RPC requests (inter-service calls are trusted)
    if (context.getType() !== 'http') {
      return true;
    }

    // Cloud mode — skip license check
    if (this.configService.get<string>('ON_PREM') !== 'true') {
      return true;
    }

    // Check whitelisted paths
    const request = context.switchToHttp().getRequest();
    const url: string = request?.url || '';
    if (this.whitelistedPaths.some((path) => url.startsWith(path))) {
      return true;
    }

    // Validate license (with caching)
    const result = this.getCachedValidation();

    if (!result.isValid) {
      this.logger.error(`License check failed: ${result.message}`);
      throw new ForbiddenException({
        statusCode: 403,
        error: 'LICENSE_EXPIRED',
        licenseExpired: true,
        licenseStatus: result.status,
        message:
          'Your license has expired or is invalid. Please contact your administrator to renew the license.',
        expiresAt: result.expiresAt,
      });
    }

    return true;
  }

  private getCachedValidation(): LicenseValidationResult {
    const now = Date.now();
    if (this.cachedResult && now - this.lastCheckTime < this.cacheTtlMs) {
      return this.cachedResult;
    }

    const licenseFilePath = this.configService.get<string>(
      'LICENSE_FILE_PATH',
      '/opt/ix-copilot/license/license.lic',
    );
    const publicKey = this.configService.get<string>('ONPREM_LICENSE_PUBLIC_KEY', '');

    this.cachedResult = validateLicenseFile(licenseFilePath, publicKey);
    this.lastCheckTime = now;

    return this.cachedResult;
  }
}
