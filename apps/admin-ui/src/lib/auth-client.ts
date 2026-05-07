/**
 * Client-side auth helpers.
 * Reads JWT payload from the cookie to get user info without a server round-trip.
 */

interface ClientUser {
  id: number;
  email: string;
  tenantId: number;
  roles: string[];
}

export function getClientUser(): ClientUser | null {
  if (typeof document === 'undefined') return null;

  // The __session_token is httpOnly, so we can't read it from JS.
  // Instead, we expose a non-httpOnly mirror cookie __user_info set at login.
  // Fallback: read from a hidden DOM element or use the server-side approach.
  return null;
}

/**
 * Check if the current user is a super admin.
 * For client components that receive isSuperAdmin as a prop.
 */
export function isSuperAdmin(user: { tenantId: number; roles: string[] } | null): boolean {
  return user?.roles?.includes('SUPER_ADMIN') === true && user?.tenantId === 0;
}

/**
 * Check if the current user is a tenant admin (not system tenant).
 */
export function isTenantAdmin(user: { tenantId: number; roles: string[] } | null): boolean {
  return user?.roles?.includes('TENANT_ADMIN') === true && user?.tenantId !== 0;
}
