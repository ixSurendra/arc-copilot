import { BillingCycle } from '../enums/billing-cycle.enum';

export interface LicenseFeatureEntry {
  featureKey: string;
  featureName: string;
  quotaLimit: number | null;
}

export interface LicensePayload {
  tenantId: number;
  planId?: number;
  startDate: string;
  issuedAt: string;
  expiresAt: string;
  cycle: BillingCycle;
  maxUsers?: number | null;
  features: LicenseFeatureEntry[];
}

export interface LicenseFile {
  payload: LicensePayload;
  signature: string;
}

export enum LicenseStatus {
  VALID = 'VALID',
  EXPIRED = 'EXPIRED',
  EXPIRING_SOON = 'EXPIRING_SOON',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  MALFORMED = 'MALFORMED',
}

export interface LicenseValidationResult {
  status: LicenseStatus;
  isValid: boolean;
  tenantId?: number;
  expiresAt?: string;
  daysRemaining?: number;
  maxUsers?: number | null;
  features?: LicenseFeatureEntry[];
  message: string;
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
