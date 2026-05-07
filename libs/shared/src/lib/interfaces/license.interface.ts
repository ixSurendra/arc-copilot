import { FeatureStatus } from '../enums/feature-status.enum';
import { TopUpStatus } from '../enums/top-up-status.enum';

export interface FeatureRegistry {
  id: number;
  featureKey: string;
  featureName: string;
  description?: string | null;
  status: FeatureStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: number;
  planName: string;
  description?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanFeatureQuota {
  planId: number;
  featureId: number;
  quotaLimit?: number | null;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanPricing {
  id: number;
  planId: number;
  billingCycle: string;
  price: number;
  currency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TopUpPricing {
  id: number;
  featureId: number;
  quotaAmount: number;
  price: number;
  currency: string;
  validityDays: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotaTopUp {
  id: number;
  tenantId: number;
  userId?: number | null;
  featureId: number;
  additionalQuota: number;
  consumed: number;
  purchasedDate: Date;
  expiryDate: Date;
  status: TopUpStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageLedger {
  id: number;
  tenantId: number;
  featureId: number;
  userId?: number | null;
  consumed: number;
  cycleStartDate: Date;
  cycleEndDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotaCheckResult {
  allowed: boolean;
  consumed: number;
  limit: number | null;
  remaining: number | null;
  source: 'plan' | 'top_up';
}
