import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RESERVED_ROLES } from './auth.constants';
import { SYSTEM_TENANT_ID } from '../constants/services';

/**
 * Automatically injects tenantId from JWT into request body/query
 * for tenant-scoped operations.
 *
 * - Super admin: skips injection (can operate on any tenant via body/query param)
 * - Tenant admin / regular user: forces tenantId from JWT, ignoring any tenantId in body/query
 */
@Injectable()
export class TenantScopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return next.handle();
    }

    // Super admin from system tenant can operate on any tenant
    const isSuperAdmin =
      user.roles?.includes(RESERVED_ROLES.SUPER_ADMIN) &&
      user.tenantId === SYSTEM_TENANT_ID;

    if (isSuperAdmin) {
      return next.handle();
    }

    // For all other users, force tenantId from JWT
    if (request.body && typeof request.body === 'object') {
      request.body.tenantId = user.tenantId;
    }

    if (request.query && typeof request.query === 'object') {
      request.query.tenantId = user.tenantId;
    }

    return next.handle();
  }
}
