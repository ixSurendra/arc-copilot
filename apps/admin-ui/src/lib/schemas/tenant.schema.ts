import { z } from 'zod';

/**
 * planId must be a plan NAME (e.g., "PROFESSIONAL", "BUSINESS") — not a numeric ID.
 * The TENANTS.PLAN_ID column stores plan names as strings; numeric IDs are an
 * internal FK inside license-service only.
 */
const planNameSchema = z
  .string()
  .min(1, 'Plan is required')
  .regex(
    /^[A-Z_]+$/,
    'planId must be a plan name (e.g., "PROFESSIONAL") — numeric IDs are not accepted',
  );

export const createTenantSchema = z.object({
  tenantName: z.string().min(1, 'Tenant name is required'),
  domain: z.string().min(1, 'Domain is required'),
  planId: planNameSchema,
  quotaType: z.enum(['SHARED', 'INDIVIDUAL']),
  billingCycle: z.enum(['MONTHLY', 'ANNUALLY'], { required_error: 'Billing cycle is required' }),
  maxUsers: z.number().positive().optional(),
  isOnPrem: z.boolean().optional(),
  licenseExpiryDate: z.string().optional(),
});

export type CreateTenantValues = z.infer<typeof createTenantSchema>;

export const updateTenantSchema = z.object({
  tenantName: z.string().min(1, 'Tenant name is required').optional(),
  domain: z.string().min(1, 'Domain is required').optional(),
  planId: planNameSchema.optional(),
  quotaType: z.enum(['SHARED', 'INDIVIDUAL']).optional(),
  billingCycle: z.enum(['MONTHLY', 'ANNUALLY']).optional(),
  maxUsers: z.number().positive().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  isOnPrem: z.boolean().optional(),
  licenseExpiryDate: z.string().optional(),
});

export type UpdateTenantValues = z.infer<typeof updateTenantSchema>;
