import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard that allows requests with a valid x-internal-api-key header.
 * Used for service-to-service HTTP calls (e.g., DMS → license-service).
 *
 * This guard returns true if the request has a valid internal API key,
 * or false if it doesn't (letting subsequent guards handle auth).
 * Designed to be used in a composite guard or OR-logic pattern.
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true; // TCP = trusted

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-internal-api-key'];
    const internalKey =
      this.configService.get<string>('INTERNAL_API_KEY') ||
      this.configService.get<string>('JWT_SECRET') ||
      'internal-service-key';

    if (apiKey && apiKey === internalKey) {
      // Mark the request as service-to-service authenticated
      request.isInternalService = true;
      return true;
    }

    return false;
  }
}
