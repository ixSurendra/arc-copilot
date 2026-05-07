import { z } from 'zod';

export const createPlanSchema = z.object({
  planName: z.string().min(1, 'Plan name is required'),
  description: z.string().optional(),
});

export type CreatePlanValues = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = z.object({
  planName: z.string().min(1, 'Plan name is required'),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type UpdatePlanValues = z.infer<typeof updatePlanSchema>;
