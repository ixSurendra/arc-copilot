export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface User {
  id: number;
  tenantId: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: number;
  planId: string;
  nextPlanId?: string | null;
  quotaType: 'SHARED' | 'INDIVIDUAL';
  maxUsers?: number | null;
  billingCycle: 'MONTHLY' | 'ANNUALLY' | null;
  cycleStartDate: string | null;
  tenantName: string;
  domain: string;
  isOnPrem: boolean;
  licenseExpiryDate: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: number;
  tenantId: number;
  roleName: string;
  description?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: number;
  tenantId: number;
  groupName: string;
  description?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleMaster {
  id: number;
  moduleName: string;
  moduleKey: string;
  description?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionMaster {
  id: number;
  permissionName: string;
  permissionKey: string;
  description?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  id: number;
  planName: string;
  description?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureRegistry {
  id: number;
  featureKey: string;
  featureName: string;
  description?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'DEPRECATED';
  createdAt: string;
  updatedAt: string;
}

export interface PlanFeatureQuota {
  planId: number;
  featureId: number;
  quotaLimit?: number | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanPricing {
  id: number;
  planId: number;
  billingCycle: string;
  price: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopUpPricing {
  id: number;
  featureId: number;
  quotaAmount: number;
  price: number;
  currency: string;
  validityDays: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageLedger {
  id: number;
  tenantId: number;
  featureId: number;
  userId?: number | null;
  consumed: number;
  cycleStartDate: string;
  cycleEndDate: string;
  createdAt: string;
  updatedAt: string;
  feature?: {
    id: number;
    featureKey: string;
    featureName: string;
    category?: string;
    valueType?: string;
  };
}

export interface QuotaCheckResult {
  allowed: boolean;
  consumed: number;
  limit: number | null;
  remaining: number | null;
  source: 'plan' | 'top_up';
}

export interface TenantFeatureStatus {
  featureId: number;
  featureKey: string;
  featureName: string;
  description?: string | null;
  category?: string;
  valueType?: string;
  enabled: boolean;
  quota: QuotaCheckResult;
}

export interface UsageSummary {
  totalRecords: number;
  totalConsumed: number;
  uniqueFeatures: number;
  uniqueTenants: number;
  topFeatures: Array<{
    featureId: number;
    featureName: string;
    featureKey: string;
    totalConsumed: number;
    tenantCount: number;
  }>;
  topTenants: Array<{
    tenantId: number;
    totalConsumed: number;
    featureCount: number;
  }>;
}

export interface OnPremStatus {
  isOnPrem: true;
  license: {
    status: string;
    isValid: boolean;
    expiresAt: string | null;
    daysRemaining: number | null;
    maxUsers: number | null;
    message: string;
    tenantId: number;
  };
  features: OnPremFeature[];
  totalLicensedFeatures: number;
  totalUsed: number;
}

export interface OnPremFeature {
  featureKey: string;
  featureName: string;
  quotaLimit: number | null;
  consumed: number;
}

export interface TenantFeatureBreakdown {
  tenantId: number;
  tenantName: string;
  planId: string;
  status: string;
  features: TenantFeatureDetail[];
  summary: {
    totalFeatures: number;
    enabledFeatures: number;
    quotaFeatures: number;
    nearLimitFeatures: number;
  };
}

export interface TenantFeatureDetail {
  featureId: number;
  featureKey: string;
  featureName: string;
  category?: string;
  valueType?: string;
  enabled: boolean;
  consumed: number;
  limit: number | null;
  remaining: number | null;
  source: string;
}

export interface AuditLog {
  id: number;
  tenantId: number;
  userId: number;
  action: string;
  resource: string;
  resourceId?: string | null;
  status: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  ipAddress?: string | null;
  userAgent?: string | null;
  duration?: number | null;
  source?: string | null;
  timestamp: string;
}

export interface AuditLogDetail {
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogWithDetail extends AuditLog {
  detail: AuditLogDetail | null;
}

export interface DashboardStats {
  tenants?: { total: number };
  users: { total: number };
  roles: { total: number };
  groups: { total: number };
  plans?: { active: number };
  recentAudit: AuditLog[];
}

export interface AuthUser {
  id: number;
  email: string;
  tenantId: number;
  roles: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface TenantAnalytics {
  byStatus: Array<{ status: string; count: number }>;
  byBillingCycle: Array<{ cycle: string; count: number }>;
  byDeploymentType: Array<{ type: string; count: number }>;
  byPlan: Array<{ planId: string; count: number }>;
  onPremTenants: Array<{
    id: number;
    tenantName: string;
    domain: string;
    licenseExpiryDate: string | null;
    updatedAt: string;
  }>;
  totalTenants: number;
}

export interface DashboardAnalytics {
  tenantAnalytics: TenantAnalytics;
  usersByTenant: Array<{ tenantId: number; tenantName: string; count: number }>;
}

export interface LicensePayload {
  tenantId: number;
  planId?: number;
  startDate: string;
  issuedAt: string;
  expiresAt: string;
  cycle: string;
  maxUsers: number | null;
  features: Array<{
    featureKey: string;
    featureName: string;
    quotaLimit: number | null;
  }>;
}

export interface LicenseFile {
  payload: LicensePayload;
  signature: string;
}

export interface TenantLicenseRecord {
  id: number;
  tenantId: number;
  planId: number;
  cycle: string;
  maxUsers: number | null;
  startDate: string;
  expiresAt: string;
  issuedAt: string;
  signatureHash: string;
  issuedBy: number;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  version: number;
  createdAt: string;
  updatedAt: string;
  plan?: { id: number; planName: string };
  licenseData?: LicenseFile;
}

export interface GenerateLicenseResponse {
  license: LicenseFile;
  record: TenantLicenseRecord;
}

export type NotificationTypePlatform = 'WELCOME' | 'PASSWORD_RESET' | 'PASSWORD_CHANGED';
export type NotificationTypeDMS =
  | 'CONNECTION_UNHEALTHY' | 'MIGRATION_COMPLETE' | 'QUOTA_WARNING'
  | 'CREDENTIAL_EXPIRING' | 'PULL_COMPLETE' | 'PULL_FAILED'
  | 'OBJECT_LINK_COMPLETE' | 'COMMENT_ADDED' | 'ANNOTATION_ADDED'
  | 'AI_PROCESSING_COMPLETE' | 'AI_PROCESSING_FAILED';

export interface NotificationLog {
  id: number;
  tenantId: number;
  recipientEmail?: string | null;
  type: NotificationTypePlatform | NotificationTypeDMS | string;
  channel: 'EMAIL' | 'IN_APP';
  subject: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  source?: string | null;
  sentAt: string;
}

export interface TenantBranding {
  id: number;
  tenantId: number;
  companyName: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor?: string | null;
  footerText?: string | null;
  usePrimaryAsTheme: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id: number;
  tenantId: number;
  type: 'WELCOME' | 'PASSWORD_RESET' | 'PASSWORD_CHANGED';
  subject: string;
  htmlBody: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
