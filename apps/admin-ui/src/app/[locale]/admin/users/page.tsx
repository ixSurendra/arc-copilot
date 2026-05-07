import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getSessionToken, getCurrentUser, isSuperAdminUser } from '@/lib/auth';
import { fetchTenantMap } from '@/lib/server-data';
import type { PaginatedResponse, User } from '@/types';
import { UserListClient } from './_components/user-list-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'users' });
  return { title: `${t('title')} | IX Admin` };
}

interface UsersPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    groupByTenant?: string;
  }>;
}

/** Fetch user counts grouped by tenant (active users only). */
async function fetchTenantUserCounts(): Promise<Record<number, number>> {
  try {
    const token = await getSessionToken();
    const data = await apiFetch<Array<{ tenantId: number; count: number }>>(
      '/admin/users/count-by-tenant',
      { token },
    );
    return Object.fromEntries(data.map((r) => [r.tenantId, r.count]));
  } catch {
    return {};
  }
}

/** Fetch total user stats (unfiltered) for the page header. */
async function getUserStats(): Promise<{
  total: number;
  active: number;
  tenants: number;
  latestSignup: string;
}> {
  try {
    const token = await getSessionToken();
    const res = await apiFetch<PaginatedResponse<User>>(
      '/admin/users?page=1&limit=1000',
      { token },
    );
    const all = res.data;
    const latestSignup = all.length > 0
      ? new Date(
          Math.max(...all.map((u) => new Date(u.createdAt).getTime())),
        ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '—';
    return {
      total: res.total,
      active: all.filter((u) => u.status === 'ACTIVE').length,
      tenants: new Set(all.map((u) => u.tenantId)).size,
      latestSignup,
    };
  } catch {
    return { total: 0, active: 0, tenants: 0, latestSignup: '—' };
  }
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const resolvedParams = await searchParams;
  const { page = '1', search, status } = resolvedParams;
  const user = await getCurrentUser();
  const isSuperAdmin = isSuperAdminUser(user);

  // When grouped view is active, use a higher default limit and sort by tenantId
  // so tenant groups stay contiguous across pages
  const isGrouped = resolvedParams.groupByTenant === 'true';
  const limit = resolvedParams.limit || (isGrouped ? '50' : '10');

  // Fetch tenantMap first — needed to resolve search term → matching tenant IDs
  const tenantMap = isSuperAdmin ? await fetchTenantMap() : {};

  const queryParams = new URLSearchParams({ page, limit });
  if (search) queryParams.set('search', search);
  if (status && status !== 'ALL') queryParams.set('status', status);
  if (isGrouped) queryParams.set('sortBy', 'tenantId');

  // For super admins: resolve search term to matching tenant IDs so searching
  // "Acme" also returns users belonging to tenants named "Acme" (not just users
  // with "acme" in their name/email).
  if (search && isSuperAdmin) {
    const searchLower = search.toLowerCase();
    const matchingTenantIds = Object.entries(tenantMap)
      .filter(([, name]) => name.toLowerCase().includes(searchLower))
      .map(([id]) => id);
    if (matchingTenantIds.length > 0) {
      queryParams.set('searchTenantIds', matchingTenantIds.join(','));
    }
  }

  let result: PaginatedResponse<User> = {
    data: [],
    total: 0,
    page: Number(page),
    limit: Number(limit),
    totalPages: 0,
  };

  const token = await getSessionToken();

  // Parallel fetches: users + stats + (when grouped) tenant user counts
  const [usersResult, tenantUserCounts, userStats] = await Promise.all([
    apiFetch<PaginatedResponse<User>>(
      `/admin/users?${queryParams.toString()}`,
      { token },
    ).catch(() => result),
    isSuperAdmin && isGrouped ? fetchTenantUserCounts() : Promise.resolve({}),
    getUserStats(),
  ]);

  return (
    <UserListClient
      initialData={usersResult}
      initialFilters={{
        search: resolvedParams.search || '',
        status: resolvedParams.status || '',
        groupByTenant: resolvedParams.groupByTenant || '',
      }}
      isSuperAdmin={isSuperAdmin}
      canCreate={true}
      tenantMap={tenantMap}
      tenantUserCounts={tenantUserCounts}
      stats={userStats}
    />
  );
}
