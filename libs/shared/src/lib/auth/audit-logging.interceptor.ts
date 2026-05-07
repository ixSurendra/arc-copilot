import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable, tap, catchError } from 'rxjs';

/** Maps URL path segments to uppercase resource names */
const RESOURCE_MAP: Record<string, string> = {
  tenants: 'TENANT',
  users: 'USER',
  roles: 'ROLE',
  groups: 'GROUP',
  modules: 'MODULE',
  permissions: 'PERMISSION',
  plans: 'PLAN',
  features: 'FEATURE',
  pricing: 'PRICING',
  quota: 'QUOTA',
  usage: 'USAGE',
  dashboard: 'DASHBOARD',
  audit: 'AUDIT',
  system: 'SYSTEM',
};

/** Maps HTTP method to base action verb */
const METHOD_ACTION_MAP: Record<string, string> = {
  POST: 'CREATE',
  PATCH: 'UPDATE',
  PUT: 'UPDATE',
  DELETE: 'DELETE',
};

/** Write HTTP methods that should be audited */
const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * Parses a URL path like /admin/users/5/roles into structured components.
 *
 * Returns { resource, resourceId, subResource, action } where:
 *  - POST /admin/users         → { resource: USER, action: USER_CREATE }
 *  - PATCH /admin/users/5      → { resource: USER, resourceId: 5, action: USER_UPDATE }
 *  - POST /admin/users/5/roles → { resource: USER, resourceId: 5, subResource: roles, action: USER_ROLES_ASSIGN }
 *  - DELETE /admin/users/5/roles → { resource: USER, resourceId: 5, subResource: roles, action: USER_ROLES_REMOVE }
 *  - DELETE /admin/roles/1/permissions/2/3 → { resource: ROLE, resourceId: 1, subResource: permissions, action: ROLE_PERMISSIONS_REMOVE }
 *  - POST /admin/pricing/plan  → { resource: PRICING, subResource: plan, action: PRICING_PLAN_CREATE }
 *  - POST /admin/quota/top-up  → { resource: QUOTA, subResource: top-up, action: QUOTA_TOP-UP_CREATE }
 *  - POST /admin/quota/check   → skipped (GET-like)
 */
function parseAdminPath(
  path: string,
  method: string,
): {
  resource: string;
  resourceId: string | undefined;
  action: string;
} | null {
  // Strip query string and split path
  const cleanPath = path.split('?')[0];
  const segments = cleanPath.split('/').filter(Boolean);

  // Expect /admin/{resource}/...
  const adminIdx = segments.indexOf('admin');
  if (adminIdx === -1 || adminIdx + 1 >= segments.length) {
    return null;
  }

  const parts = segments.slice(adminIdx + 1); // everything after 'admin'
  const resourceSlug = parts[0]; // e.g., 'users', 'tenants', 'pricing'
  const resource = RESOURCE_MAP[resourceSlug];
  if (!resource) return null;

  const baseVerb = METHOD_ACTION_MAP[method];
  if (!baseVerb) return null;

  // Case 1: POST /admin/resource (create) or GET-like write
  if (parts.length === 1) {
    return { resource, resourceId: undefined, action: `${resource}_${baseVerb}` };
  }

  // Case 2: Check if second segment is numeric (resourceId) or a sub-path
  const secondPart = parts[1];
  const isNumericId = /^\d+$/.test(secondPart);

  if (!isNumericId) {
    // Sub-path without ID: e.g., POST /admin/pricing/plan, POST /admin/quota/top-up
    const subResource = secondPart.toUpperCase().replace(/-/g, '_');
    return {
      resource,
      resourceId: parts[2], // may be an id for PATCH /admin/pricing/plan/:id
      action: `${resource}_${subResource}_${baseVerb}`,
    };
  }

  // Second part is a numeric ID
  const resourceId = secondPart;

  // Case 3: PATCH/DELETE /admin/resource/:id
  if (parts.length === 2) {
    return { resource, resourceId, action: `${resource}_${baseVerb}` };
  }

  // Case 4: POST/DELETE /admin/resource/:id/sub (e.g., /admin/users/5/roles)
  const subResource = parts[2].toUpperCase().replace(/-/g, '_');
  const subVerb =
    method === 'POST' ? 'ASSIGN' : method === 'DELETE' ? 'REMOVE' : baseVerb;
  return {
    resource,
    resourceId,
    action: `${resource}_${subResource}_${subVerb}`,
  };
}

/**
 * Global interceptor that logs all write operations (POST, PATCH, PUT, DELETE)
 * to the audit service via fire-and-forget event emission.
 *
 * - Runs after the handler completes (success or error)
 * - Never blocks or affects the primary response
 * - Extracts user info from JWT (set by JwtAuthGuard)
 * - Derives action/resource from the URL pattern
 */
@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLoggingInterceptor.name);

  constructor(
    @Inject('AUDIT_SERVICE') private readonly auditClient: ClientProxy,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase();

    // Only audit write operations
    if (!WRITE_METHODS.has(method)) {
      return next.handle();
    }

    // Skip auth endpoints (login, refresh, etc.)
    const url: string = request.url || '';
    if (url.startsWith('/auth/') || url.startsWith('/health')) {
      return next.handle();
    }

    const parsed = parseAdminPath(url, method);
    if (!parsed) {
      return next.handle();
    }

    const startTime = Date.now();
    const user = request.user;

    return next.handle().pipe(
      tap(() => {
        this.emitAuditLog(request, parsed, user, startTime, 'SUCCESS');
      }),
      catchError((error) => {
        this.emitAuditLog(request, parsed, user, startTime, 'FAILURE');
        throw error;
      }),
    );
  }

  private emitAuditLog(
    request: any,
    parsed: { resource: string; resourceId?: string; action: string },
    user: any,
    startTime: number,
    status: 'SUCCESS' | 'FAILURE',
  ): void {
    try {
      const duration = Date.now() - startTime;
      const ip =
        request.headers?.['x-forwarded-for'] ||
        request.ip ||
        request.connection?.remoteAddress;

      const payload = {
        tenantId: user?.tenantId ?? 0,
        userId: user?.sub ?? 0,
        action: parsed.action,
        resource: parsed.resource,
        resourceId: parsed.resourceId ?? null,
        status,
        ipAddress: typeof ip === 'string' ? ip.split(',')[0].trim() : null,
        userAgent: request.headers?.['user-agent'] ?? null,
        duration,
        source: 'admin-portal',
        newValue: status === 'SUCCESS' ? this.sanitizeBody(request.body) : null,
      };

      this.auditClient.emit('audit_log_created', payload);
    } catch (err) {
      // Never let audit failures affect the primary operation
      this.logger.warn(`Failed to emit audit log: ${err}`);
    }
  }

  /** Remove sensitive fields from request body before logging */
  private sanitizeBody(
    body: Record<string, unknown> | undefined,
  ): Record<string, unknown> | null {
    if (!body || typeof body !== 'object') return null;
    const sanitized = { ...body };
    const sensitiveKeys = [
      'password',
      'passwordHash',
      'token',
      'secret',
      'accessToken',
      'refreshToken',
    ];
    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '***';
      }
    }
    return sanitized;
  }
}
