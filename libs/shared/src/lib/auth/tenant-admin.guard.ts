import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RESERVED_ROLES } from './auth.constants';

@Injectable()
export class TenantAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Skip guard for TCP/RPC requests (inter-service calls are trusted)
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) {
      throw new ForbiddenException('Access denied');
    }

    const hasAdminRole =
      user.roles.includes(RESERVED_ROLES.TENANT_ADMIN) ||
      user.roles.includes(RESERVED_ROLES.SUPER_ADMIN);

    if (!hasAdminRole) {
      throw new ForbiddenException(
        'Access denied — tenant admin or super admin role required',
      );
    }

    return true;
  }
}
