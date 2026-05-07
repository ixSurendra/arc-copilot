import { AuditLogStatus } from '../enums/audit-log-status.enum';

/**
 * Lightweight audit log record (no JSON payloads).
 * Returned by list/filter queries.
 */
export interface AuditLog {
  id: number;
  tenantId: number;
  userId: number;
  action: string;
  resource: string;
  resourceId?: string | null;
  status: AuditLogStatus;
  ipAddress?: string | null;
  userAgent?: string | null;
  duration?: number | null;
  source?: string | null;
  timestamp: Date;
}

/**
 * Heavy detail payload stored in the audit_log_details table.
 * Only data fields are exposed — internal keys (auditLogId) are stripped.
 */
export interface AuditLogDetail {
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Full audit log with detail payload included.
 * Returned by getById queries.
 */
export interface AuditLogWithDetail extends AuditLog {
  detail: AuditLogDetail | null;
}