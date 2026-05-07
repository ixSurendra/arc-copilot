import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RESERVED_ROLES } from './auth.constants';
import { SYSTEM_TENANT_ID } from '../constants/services';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip guard for TCP/RPC requests (inter-service calls are trusted)
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Allow service-to-service calls authenticated via x-internal-api-key
    const apiKey = request.headers?.['x-internal-api-key'];
    if (apiKey) {
      const internalKey =
        this.configService.get<string>('INTERNAL_API_KEY') ||
        this.configService.get<string>('JWT_SECRET') ||
        'internal-service-key';
      if (apiKey === internalKey) {
        request.isInternalService = true;
        return true;
      }
    }

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    // 1. On-prem mode: TENANT_ADMIN is the highest authority
    const isOnPrem = this.configService.get<string>('ON_PREM') === 'true';
    if (isOnPrem) {
      if (!user.roles?.includes(RESERVED_ROLES.TENANT_ADMIN)) {
        throw new ForbiddenException(
          'Access denied — tenant admin role required',
        );
      }
      return true;
    }

    // 2. Cloud mode: Must belong to system tenant
    if (user.tenantId !== SYSTEM_TENANT_ID) {
      throw new ForbiddenException('Access denied — not a system tenant user');
    }

    // 3. Cloud mode: Must have SUPER_ADMIN role
    if (!user.roles?.includes(RESERVED_ROLES.SUPER_ADMIN)) {
      throw new ForbiddenException('Access denied — super admin role required');
    }

    return true;
  }
}
