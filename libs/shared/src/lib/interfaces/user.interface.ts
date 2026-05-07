import { UserStatus } from '../enums/user-status.enum';

export interface User {
  id: number;
  tenantId: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: number;
  tenantId: number;
  roleName: string;
  description?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: number;
  tenantId: number;
  groupName: string;
  description?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModuleMaster {
  id: number;
  moduleName: string;
  moduleKey: string;
  description?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionMaster {
  id: number;
  permissionName: string;
  permissionKey: string;
  description?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithRoles extends User {
  roles: Role[];
}
