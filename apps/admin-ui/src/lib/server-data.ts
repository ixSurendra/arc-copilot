import { apiFetch } from './api-client';
import { getSessionToken } from './auth';
import type { PaginatedResponse, Tenant } from '@/types';

/**
 * Fetch a map of tenantId -> tenantName for use in tenant-grouped list views.
 * Only needed by SUPER_ADMIN to label accordion sections.
 */
export async function fetchTenantMap(): Promise<Record<number, string>> {
  try {
    const token = await getSessionToken();
    const result = await apiFetch<PaginatedResponse<Tenant>>(
      '/admin/tenants?page=1&limit=1000',
      { token },
    );
    return Object.fromEntries(
      result.data.map((t) => [t.id, t.tenantName]),
    );
  } catch {
    return {};
  }
}
