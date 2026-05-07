import { z } from 'zod';

export const createRoleSchema = z.object({
  tenantId: z.coerce.number({ required_error: 'Tenant is required' }).int().positive('Tenant is required'),
  roleName: z.string().min(1, 'Role name is required'),
  description: z.string().optional(),
});

export type CreateRoleValues = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  roleName: z.string().min(1, 'Role name is required'),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type UpdateRoleValues = z.infer<typeof updateRoleSchema>;
