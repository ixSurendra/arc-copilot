import { z } from 'zod';

export const createPermissionSchema = z.object({
  permissionName: z.string().min(1, 'Permission name is required'),
  permissionKey: z.string().min(1, 'Permission key is required'),
  description: z.string().optional(),
});

export type CreatePermissionValues = z.infer<typeof createPermissionSchema>;

export const updatePermissionSchema = z.object({
  permissionName: z.string().min(1, 'Permission name is required'),
  permissionKey: z.string().min(1, 'Permission key is required'),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type UpdatePermissionValues = z.infer<typeof updatePermissionSchema>;
