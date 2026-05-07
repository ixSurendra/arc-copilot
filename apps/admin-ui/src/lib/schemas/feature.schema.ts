import { z } from 'zod';

export const createFeatureSchema = z.object({
  featureKey: z.string().min(1, 'Feature key is required'),
  featureName: z.string().min(1, 'Feature name is required'),
  description: z.string().optional(),
});

export type CreateFeatureValues = z.infer<typeof createFeatureSchema>;

export const updateFeatureSchema = z.object({
  featureKey: z.string().min(1, 'Feature key is required'),
  featureName: z.string().min(1, 'Feature name is required'),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DEPRECATED']).optional(),
});

export type UpdateFeatureValues = z.infer<typeof updateFeatureSchema>;
