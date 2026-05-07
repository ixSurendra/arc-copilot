import { z } from 'zod';

export const createModuleSchema = z.object({
  moduleName: z.string().min(1, 'Module name is required'),
  moduleKey: z.string().min(1, 'Module key is required'),
  description: z.string().optional(),
});

export type CreateModuleValues = z.infer<typeof createModuleSchema>;

export const updateModuleSchema = z.object({
  moduleName: z.string().min(1, 'Module name is required'),
  moduleKey: z.string().min(1, 'Module key is required'),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type UpdateModuleValues = z.infer<typeof updateModuleSchema>;
