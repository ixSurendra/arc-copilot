import { cookies } from 'next/headers';

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('__session_token')?.value;
}

export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString(),
    );
    return {
      id: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles || [],
    };
  } catch {
    return null;
  }
}

/** Check if a user is a super admin (tenantId === 0 and has SUPER_ADMIN role) */
export function isSuperAdminUser(
  user: { tenantId: number; roles: string[] } | null,
): boolean {
  return (
    user?.roles?.includes('SUPER_ADMIN') === true && user?.tenantId === 0
  );
}

/** Check if a user is a tenant admin (has TENANT_ADMIN role, not system tenant) */
export function isTenantAdminUser(
  user: { tenantId: number; roles: string[] } | null,
): boolean {
  return (
    user?.roles?.includes('TENANT_ADMIN') === true && user?.tenantId !== 0
  );
}
