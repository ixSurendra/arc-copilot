export interface AuthUser {
  id: number;
  tenantId: number;
  email: string;
  roles: string[];
  status: string;
}
