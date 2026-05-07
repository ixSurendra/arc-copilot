import { z } from 'zod';

export const createGroupSchema = z.object({
  tenantId: z.coerce.number({ required_error: 'Tenant is required' }).int().positive('Tenant is required'),
  groupName: z.string().min(1, 'Group name is required'),
  description: z.string().optional(),
});

export type CreateGroupValues = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = z.object({
  groupName: z.string().min(1, 'Group name is required'),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type UpdateGroupValues = z.infer<typeof updateGroupSchema>;
