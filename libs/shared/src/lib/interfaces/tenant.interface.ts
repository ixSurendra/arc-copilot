import { TenantStatus } from '../enums/tenant-status.enum';
import { QuotaType } from '../enums/quota-type.enum';
import { BillingCycle } from '../enums/billing-cycle.enum';
import { BillingType } from '../enums/billing-type.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { PlanChangeType } from '../enums/plan-change-type.enum';

export interface Tenant {
  id: number;
  planId: string;
  nextPlanId?: string | null;
  quotaType: QuotaType;
  maxUsers?: number | null;
  billingCycle: BillingCycle | null;
  cycleStartDate: Date | null;
  tenantName: string;
  domain: string;
  isOnPrem: boolean;
  licenseExpiryDate: Date | null;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantAnalytics {
  byStatus: Array<{ status: string; count: number }>;
  byBillingCycle: Array<{ cycle: string; count: number }>;
  byDeploymentType: Array<{ type: string; count: number }>;
  byPlan: Array<{ planId: string; count: number }>;
  onPremTenants: Array<{ id: number; tenantName: string; domain: string; licenseExpiryDate: string | null }>;
  totalTenants: number;
}

export interface TenantPlanHistory {
  id: number;
  tenantId: number;
  planId: string;
  changeType: PlanChangeType;
  startDate: Date;
  endDate?: Date | null;
  createdAt: Date;
}

export interface TenantBilling {
  id: number;
  tenantId: number;
  billingType: BillingType;
  referenceId: string;
  amount: number;
  currency: string;
  billingDate: Date;
  nextBillingDate?: Date | null;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  transactionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: number;
  tenantId: number;
  billingId: number;
  invoiceNumber: string;
  amount: number;
  currency: string;
  taxAmount: number;
  totalAmount: number;
  invoiceDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  pdfUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
